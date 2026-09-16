import React, { useState, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTextureLoader } from "../hooks/useTextureLoader";

function PlanetComponent({ object, onClick }) {
  const { gl } = useThree();
  const meshRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();
  const ringRef3 = useRef();
  const [hovered, setHovered] = useState(false);
  const texture = useTextureLoader(object, gl);

  // Generate normal map for surface detail
  const generateNormalMap = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 256;

    const imageData = ctx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const height = Math.random();
      imageData.data[i] = height * 128 + 127;
      imageData.data[i + 1] = height * 128 + 127;
      imageData.data[i + 2] = 255;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
  };

  // Helper function to get atmosphere color based on planet color
  const getPlanetAtmosphereColor = (planetColor) => {
    if (planetColor.includes("#4ecdc4") || planetColor.includes("#00cec9"))
      return "#4da6ff"; // Blue for ocean worlds
    if (planetColor.includes("#fdcb6e")) return "#ffcc80"; // Orange for desert worlds
    if (planetColor.includes("#74b9ff")) return "#b3e5fc"; // Light blue for ice worlds
    if (planetColor.includes("#e17055") || planetColor.includes("#fd79a8"))
      return "#ff6666"; // Red for volcanic worlds
    if (planetColor.includes("#00b894")) return "#66bb6a"; // Green for forest worlds
    if (planetColor.includes("#D3D3D3") || planetColor.includes("#d3d3d3"))
      return "#e0e0e0"; // Light gray atmosphere for gray planets
    return "#cccccc"; // Default neutral gray instead of blue
  };

  const normalMap = generateNormalMap();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.005;
    }

    // Animate planetary rings
    if (object.hasRings) {
      if (ringRef1.current) {
        ringRef1.current.rotation.z += 0.002;
      }
      if (ringRef2.current) {
        ringRef2.current.rotation.z += 0.001;
      }
      if (ringRef3.current) {
        ringRef3.current.rotation.z += 0.0015;
      }
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    onClick(object);
  };

  // Don't render until texture is loaded
  if (!texture) {
    return null;
  }

  return (
    <group position={object.position}>
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
        <sphereGeometry args={[object.size, 32, 32]} />
        <meshStandardMaterial
          map={texture}
          normalMap={normalMap}
          normalScale={[0.3, 0.3]}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Planet atmosphere */}
      <mesh scale={1.05}>
        <sphereGeometry args={[object.size, 32, 32]} />
        <meshBasicMaterial
          color={getPlanetAtmosphereColor(object.color)}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Planetary rings for planets with hasRings property */}
      {object.hasRings && (
        <>
          {/* Main ring system with multiple layers */}
          <mesh ref={ringRef1} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[object.size * 1.3, object.size * 2.5, 64]} />
            <meshStandardMaterial
              color="#e6d7c1"
              roughness={0.6}
              metalness={0.1}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Secondary ring layer */}
          <mesh ref={ringRef2} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[object.size * 1.4, object.size * 2.2, 64]} />
            <meshStandardMaterial
              color="#d4c5a8"
              roughness={0.6}
              metalness={0.1}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Outer ring layer */}
          <mesh ref={ringRef3} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[object.size * 2.6, object.size * 3.2, 64]} />
            <meshStandardMaterial
              color="#f0e6d2"
              roughness={0.6}
              metalness={0.1}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

export default PlanetComponent;
