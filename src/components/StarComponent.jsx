import React, { useState, useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useTextureLoader } from "../hooks/useTextureLoader";

// Texture caches for procedural coronas so canvas textures are generated once per color
const coronaTextureCache = new Map();
const raysTextureCache = new Map();

function getCoronaTexture(colorHex) {
  if (coronaTextureCache.has(colorHex)) {
    return coronaTextureCache.get(colorHex);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  
  const c = new THREE.Color(colorHex);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  
  gradient.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  gradient.addColorStop(0.15, `rgba(${rgb}, 0.95)`);
  gradient.addColorStop(0.45, `rgba(${rgb}, 0.4)`);
  gradient.addColorStop(0.75, `rgba(${rgb}, 0.12)`);
  gradient.addColorStop(1.0, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  coronaTextureCache.set(colorHex, tex);
  return tex;
}

function getRaysTexture(colorHex) {
  if (raysTextureCache.has(colorHex)) {
    return raysTextureCache.get(colorHex);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const center = 256;
  const numRays = 8;
  const c = new THREE.Color(colorHex);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;

  for (let i = 0; i < numRays; i++) {
    const angle = (i * Math.PI) / (numRays / 2);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
    grad.addColorStop(0.2, `rgba(${rgb}, 0.6)`);
    grad.addColorStop(0.65, `rgba(${rgb}, 0.15)`);
    grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(256, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-256, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  raysTextureCache.set(colorHex, tex);
  return tex;
}

function StarComponent({ object, onClick, onRegisterSun }) {
  const { gl } = useThree();
  const meshRef = useRef();
  const coronaRef = useRef();
  const raysRef = useRef();
  const [hovered, setHovered] = useState(false);
  const isSol =
    object.name?.toLowerCase().includes("sol") ||
    object.name?.toLowerCase().includes("sun") ||
    (object.position[0] === 0 && object.position[1] === 0 && object.position[2] === 0);

  // Use authored texture or fallback to solar plasma texture tinted by stellar spectrum color
  const starObject = useMemo(
    () => (object.texture ? object : { ...object, texture: "sun.jpg" }),
    [object]
  );
  const texture = useTextureLoader(starObject, gl);

  const coronaColor = isSol ? "#ffd060" : object.color;
  const coronaTex = useMemo(() => getCoronaTexture(coronaColor), [coronaColor]);
  const raysTex = useMemo(() => getRaysTexture(coronaColor), [coronaColor]);

  // Register sun mesh with Universe for volumetric GodRays effect
  useEffect(() => {
    if (isSol && onRegisterSun && meshRef.current) {
      onRegisterSun(meshRef.current);
    }
  }, [isSol, onRegisterSun]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Rotate star core
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }

    // Breathing pulsation for atmospheric corona
    if (coronaRef.current) {
      const pulse = Math.sin(t * 1.5) * 0.04 + 1.0;
      coronaRef.current.scale.set(pulse, pulse, 1);
    }

    // Subtle drift and shimmering for diffraction rays
    if (raysRef.current) {
      raysRef.current.rotation.z = t * 0.025;
      const rayPulse = Math.sin(t * 2.2 + 0.5) * 0.05 + 1.0;
      raysRef.current.scale.set(rayPulse, rayPulse, 1);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(object);
  };

  return (
    <group position={object.position}>
      {/* Physical PointLight emitting real photons into space */}
      {isSol ? (
        <>
          {/* Main solar illumination across the solar system (illuminates all planets from Sol's center) */}
          <pointLight
            color="#fffaf0"
            intensity={5.5}
            distance={1800}
            decay={0.55}
          />
          {/* Close-range high-temperature furnace glow */}
          <pointLight
            color="#ffaa33"
            intensity={3.5}
            distance={220}
            decay={1.0}
          />
        </>
      ) : (
        /* Individual stellar light field for deep-space stars */
        <pointLight
          color={object.color}
          intensity={2.2}
          distance={450}
          decay={1.0}
        />
      )}

      {/* Incandescent Star Core */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[object.size, 64, 32]} />
        <meshBasicMaterial
          map={texture || null}
          color={isSol ? "#fff8eb" : object.color}
          toneMapped={false}
        />
      </mesh>

      {/* Radiant Atmospheric Corona and Diffraction Rays */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        {/* Inner blazing corona */}
        <mesh
          ref={coronaRef}
          scale={
            isSol
              ? [object.size * 3.2, object.size * 3.2, 1]
              : [object.size * 2.7, object.size * 2.7, 1]
          }
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={coronaTex}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            opacity={isSol ? 0.95 : 0.8}
          />
        </mesh>

        {/* Outer soft atmospheric halo */}
        <mesh
          scale={
            isSol
              ? [object.size * 5.4, object.size * 5.4, 1]
              : [object.size * 4.2, object.size * 4.2, 1]
          }
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={coronaTex}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            opacity={isSol ? 0.45 : 0.35}
          />
        </mesh>

        {/* Rotating diffraction rays / sunbeams */}
        <mesh
          ref={raysRef}
          scale={
            isSol
              ? [object.size * 6.8, object.size * 6.8, 1]
              : [object.size * 5.0, object.size * 5.0, 1]
          }
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={raysTex}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            opacity={isSol ? 0.85 : 0.6}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

export default StarComponent;
