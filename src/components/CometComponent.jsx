import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { getCoronaTexture } from "../utils/coronaTexture";

// Flame tail tuning knobs
const EMIT_RATE = 150; // particles per second (time-based, so the tail is the same at any frame rate)
const LIFETIME = 1.4; // average seconds a particle lives; each gets 0.7x-1.3x of this
const STREAM = 15; // units/s particles are blown back from the head; keeps a tail even when the comet is slow
const SPREAD = 3; // units/s random sideways kick: how wide the flame fans out
const TURBULENCE = 12; // units/s² random wander: how much it licks and flickers
const DRAG = 1.5; // per second: particles slow down and linger
const INTENSITY = 0.25; // brightness per particle (they add up where they overlap)
const PARTICLE_SIZE = 3.5; // particle size relative to object.size
const FLAME_DEEP = "#2f5bff"; // color the flame cools to at its tip
// Ring buffer sized so a slot is never reused while its particle can still be alive
const MAX_PARTICLES = Math.ceil(EMIT_RATE * LIFETIME * 1.3);

const flameVertexShader = /* glsl */ `
  attribute float aAge;   // 0 = just emitted, 1 = dead
  attribute float aSeed;  // per-particle random in [0, 1)
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  varying float vAge;
  void main() {
    vAge = aAge;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Swell right after leaving the head, shrink away at the end, flicker fast
    float life = mix(0.4, 1.0, smoothstep(0.0, 0.15, aAge)) * (1.0 - smoothstep(0.6, 1.0, aAge));
    float flicker = 0.8 + 0.2 * sin(uTime * 25.0 + aSeed * 40.0);
    gl_PointSize = uSize * (0.6 + aSeed) * life * flicker * uScale / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const flameFragmentShader = /* glsl */ `
  uniform vec3 uHot;
  uniform vec3 uCool;
  uniform vec3 uDeep;
  uniform float uIntensity;
  varying float vAge;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float glow = pow(1.0 - d, 1.5);
    // White-hot at the head -> comet color -> deep blue at the tip, fading out
    vec3 color = mix(uHot, uCool, smoothstep(0.0, 0.3, vAge));
    color = mix(color, uDeep, smoothstep(0.3, 0.9, vAge));
    gl_FragColor = vec4(color * glow * (1.0 - vAge) * uIntensity, 1.0);
  }
`;

// Point on an elliptical orbit with Sol (origin) at one focus, for eccentric anomaly E
function orbitPosition({ a, e }, euler, E, target) {
  const b = a * Math.sqrt(1 - e * e);
  return target.set(a * (Math.cos(E) - e), 0, b * Math.sin(E)).applyEuler(euler);
}

const _prevPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _spawn = new THREE.Vector3();

function CometComponent({ object, onClick }) {
  const { orbit } = object;
  const headRef = useRef();
  const angleRef = useRef(orbit.startAngle);
  const euler = useMemo(() => new THREE.Euler(orbit.tilt, orbit.spin, 0), [orbit]);
  const startPosition = useMemo(
    () => orbitPosition(orbit, euler, orbit.startAngle, new THREE.Vector3()),
    [orbit, euler]
  );
  const comaTex = useMemo(() => getCoronaTexture(object.color), [object.color]);

  // Particle state lives in typed arrays; only the GPU attributes are re-uploaded each frame
  const flame = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const ages = new Float32Array(MAX_PARTICLES).fill(1); // all start dead
    const seeds = Float32Array.from({ length: MAX_PARTICLES }, () => Math.random());
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aAge", new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return {
      geometry,
      positions,
      ages,
      velocities: new Float32Array(MAX_PARTICLES * 3),
      lifetimes: Float32Array.from({ length: MAX_PARTICLES }, () => LIFETIME * (0.7 + 0.6 * Math.random())),
      next: 0, // ring buffer write index
      carry: 0, // fractional particles owed from previous frames
    };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: object.size * PARTICLE_SIZE },
      uScale: { value: 1 },
      uHot: { value: new THREE.Color("#ffffff") },
      uCool: { value: new THREE.Color(object.color) },
      uDeep: { value: new THREE.Color(FLAME_DEEP) },
      uIntensity: { value: INTENSITY },
    }),
    [object.size, object.color]
  );

  useFrame((state, delta) => {
    const head = headRef.current;
    if (!head) return;
    // Clamped so a backgrounded tab doesn't teleport the comet across the scene
    const dt = Math.min(delta, 0.05);

    // Kepler: dE/dt = n / (1 - e·cos E), so the comet whips past Sol and crawls at aphelion
    _prevPos.copy(head.position);
    const n = (2 * Math.PI) / orbit.period;
    angleRef.current += (n * dt) / (1 - orbit.e * Math.cos(angleRef.current));
    orbitPosition(orbit, euler, angleRef.current, head.position);
    _dir.subVectors(head.position, _prevPos).normalize();

    // Age, wander and move live particles
    const { positions: p, velocities: v, ages, lifetimes } = flame;
    const drag = Math.exp(-DRAG * dt);
    const kick = TURBULENCE * dt * 2;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (ages[i] >= 1) continue;
      ages[i] = Math.min(1, ages[i] + dt / lifetimes[i]);
      for (let j = i * 3, end = j + 3; j < end; j++) {
        v[j] = v[j] * drag + (Math.random() - 0.5) * kick;
        p[j] += v[j] * dt;
      }
    }

    // Emit new particles along the path covered this frame, so fast motion leaves no gaps
    flame.carry += EMIT_RATE * dt;
    const count = Math.floor(flame.carry);
    flame.carry -= count;
    for (let k = 0; k < count; k++) {
      const i = flame.next;
      flame.next = (i + 1) % MAX_PARTICLES;
      _spawn.lerpVectors(_prevPos, head.position, (k + 1) / count);
      const j = i * 3;
      p[j] = _spawn.x;
      p[j + 1] = _spawn.y;
      p[j + 2] = _spawn.z;
      v[j] = -_dir.x * STREAM + (Math.random() - 0.5) * 2 * SPREAD;
      v[j + 1] = -_dir.y * STREAM + (Math.random() - 0.5) * 2 * SPREAD;
      v[j + 2] = -_dir.z * STREAM + (Math.random() - 0.5) * 2 * SPREAD;
      ages[i] = 0;
    }

    flame.geometry.attributes.position.needsUpdate = true;
    flame.geometry.attributes.aAge.needsUpdate = true;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uScale.value = (state.size.height * state.gl.getPixelRatio()) / 2;
  });

  const handleClick = (e) => {
    if (e.delta > 5) return; // ended a drag, not a click
    e.stopPropagation();
    onClick(object);
  };

  return (
    <>
      <group
        ref={headRef}
        position={startPosition}
        userData={{ objectId: object.id, isTrackedRoot: true }}
        onClick={handleClick}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        {/* Small, fast-moving target: generous invisible hit sphere */}
        <mesh visible={false}>
          <sphereGeometry args={[object.size * 4, 12, 6]} />
        </mesh>

        {/* Icy nucleus: kept small so the coma glow reads as the head */}
        <mesh>
          <sphereGeometry args={[object.size * 0.5, 24, 16]} />
          <meshBasicMaterial color="#eaf8ff" toneMapped={false} />
        </mesh>

        {/* Glowing coma */}
        <Billboard>
          <mesh scale={object.size * 7}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={comaTex}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              opacity={0.9}
            />
          </mesh>
        </Billboard>
      </group>

      {/* Flame tail: particles live in world space. Frustum culling is off because the
          particles move every frame, so the geometry's cached bounds would be wrong */}
      <points geometry={flame.geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={flameVertexShader}
          fragmentShader={flameFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

export default CometComponent;
