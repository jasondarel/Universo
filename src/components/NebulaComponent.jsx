import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTextureLoader } from "../hooks/useTextureLoader";

// Nebulae are light-years across, so they're a backdrop rather than objects in the scene: the root follows
// the camera's position (not its rotation), so they never shift as you move, and everything passes in front
const BACKDROP_DISTANCE = 1500; // beyond every object, inside the camera's far plane (2000)

// Radial fade so the photo's rectangular edges never show
let vignetteTexture = null;
function getVignetteTexture() {
  if (vignetteTexture) return vignetteTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0.45, "#ffffff");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  vignetteTexture = new THREE.CanvasTexture(canvas);
  return vignetteTexture;
}

function NebulaComponent({ object, onClick }) {
  const { gl } = useThree();
  const rootRef = useRef();
  const texture = useTextureLoader(object, gl);
  const alphaMap = useMemo(getVignetteTexture, []);

  // On the backdrop sphere along the authored direction, facing its center (the camera) with world-up kept,
  // so the photo stays fixed in the sky instead of turning with the view
  const { position, quaternion } = useMemo(() => {
    const position = new THREE.Vector3(...object.position).setLength(BACKDROP_DISTANCE);
    const facing = new THREE.Matrix4().lookAt(new THREE.Vector3(), position, THREE.Object3D.DEFAULT_UP);
    return { position, quaternion: new THREE.Quaternion().setFromRotationMatrix(facing) };
  }, [object.position]);
  const width = 2 * BACKDROP_DISTANCE * Math.tan(THREE.MathUtils.degToRad(object.size / 2));

  useFrame(({ camera }) => rootRef.current.position.copy(camera.position));

  const handleClick = (e) => {
    if (e.delta > 5) return; // ended a drag, not a click
    e.stopPropagation();
    onClick(object);
  };

  return (
    <group ref={rootRef}>
      {texture && (
        <group position={position} quaternion={quaternion}>
          <mesh scale={[width, (width * texture.image.height) / texture.image.width, 1]}>
            <planeGeometry />
            <meshBasicMaterial
              map={texture}
              alphaMap={alphaMap}
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Hit area is the bright core, not the faded edges */}
          <mesh
            visible={false}
            onClick={handleClick}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            <circleGeometry args={[width * 0.3, 32]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default NebulaComponent;
