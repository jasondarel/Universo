import React, { useState, useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Preload once
useGLTF.preload("/models/glb/black_hole.glb");

function BlackHoleComponent({ object, onClick }) {
  const groupRef = useRef();
  const modelRef = useRef();
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF("/models/glb/black_hole.glb");

  // Clone & prepare model only once per mount
  const preparedModel = useMemo(() => {
    if (!scene) return null;
    const cloned = scene.clone(true);

    // Ensure materials are not shared and retain the emissive glow for bloom
    cloned.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      // 232k tris: raycasting them on every pointer move costs 15-45ms; the hit sphere below handles events
      child.raycast = () => {};
      child.castShadow = true;
      child.receiveShadow = true;

      const sourceMaterial = child.material;
      const originalEmissive =
        sourceMaterial.emissive && sourceMaterial.emissive.clone
          ? sourceMaterial.emissive.clone()
          : null;
      const originalIntensity =
        "emissiveIntensity" in sourceMaterial
          ? sourceMaterial.emissiveIntensity
          : null;

      child.material = sourceMaterial.clone();

      if (child.material.emissive) {
        // Preserve authored emissive color or fallback to a warm glow
        if (originalEmissive) {
          child.material.emissive.copy(originalEmissive);
        } else {
          child.material.emissive.set(0xffffcc);
        }
      }

      if ("emissiveIntensity" in child.material) {
        child.material.emissiveIntensity =
          originalIntensity != null ? Math.max(originalIntensity, 1.5) : 1.5;
      }
    });

    return cloned;
  }, [scene]);

  const hitRadius = useMemo(() => {
    if (!preparedModel) return 1;
    const size = new THREE.Box3().setFromObject(preparedModel).getSize(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z) / 2;
  }, [preparedModel]);

  // Keep rotation animation
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.005;
      modelRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  useEffect(() => {
    if (preparedModel && modelRef.current == null) {
      modelRef.current = preparedModel;
    }
  }, [preparedModel]);

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(object);
  };

  if (!preparedModel) return null;

  const baseScale = object?.size || 1;
  const hoverFactor = hovered ? 1.08 : 1; // Slight pop on hover

  return (
    <group
      ref={groupRef}
      position={object.position}
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
      <mesh visible={false} scale={baseScale * hoverFactor}>
        <sphereGeometry args={[hitRadius, 16, 8]} />
      </mesh>
      <primitive
        ref={modelRef}
        object={preparedModel}
        scale={[
          baseScale * hoverFactor,
          baseScale * hoverFactor,
          baseScale * hoverFactor,
        ]}
      />
    </group>
  );
}

export default BlackHoleComponent;
