import React, { useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTextureLoader } from "../hooks/useTextureLoader";

function DeathStarComponent({ object, onClick }) {
  const { gl } = useThree();
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const texture = useTextureLoader(object, gl);

  // Slow rotation like the Death Star
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002; // Slow rotation
    }
  });

  const handleClick = (e) => {
    if (e.delta > 5) return; // ended a drag, not a click
    e.stopPropagation();
    onClick(object);
  };

  // Don't render until texture is loaded
  if (!texture) {
    return null;
  }

  return (
    <group position={object.position}>
      {/* Main Death Star sphere */}
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
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[object.size, 64, 32]} />
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0.3} />
      </mesh>
    </group>
  );
}

export default DeathStarComponent;
