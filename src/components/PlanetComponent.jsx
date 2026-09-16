import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTextureLoader } from "../hooks/useTextureLoader";

// Cloud texture cache
const cloudTextureCache = new Map();

function getCloudTexture(type = "standard") {
  if (cloudTextureCache.has(type)) {
    return cloudTextureCache.get(type);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Multi-octave pseudo-random noise permutation table
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = p[i];
    p[i] = p[j];
    p[j] = temp;
  }
  for (let i = 0; i < 256; i++) p[256 + i] = p[i];

  function grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  function noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];

    const g1 = grad(aa, xf, yf);
    const g2 = grad(ba, xf - 1, yf);
    const g3 = grad(ab, xf, yf - 1);
    const g4 = grad(bb, xf - 1, yf - 1);

    const x1 = g1 + u * (g2 - g1);
    const x2 = g3 + u * (g4 - g3);
    return x1 + v * (x2 - x1);
  }

  function fbm(x, y) {
    let total = 0;
    let amplitude = 0.55;
    let frequency = 1.0;
    for (let o = 0; o < 4; o++) {
      total += noise(x * frequency, y * frequency) * amplitude;
      frequency *= 2.1;
      amplitude *= 0.5;
    }
    return total;
  }

  const imgData = ctx.createImageData(1024, 512);
  const data = imgData.data;

  // Cloud tint based on world type
  let r = 255, g = 255, b = 255;
  if (type === "volcanic") {
    r = 160; g = 120; b = 100; // ash & sulfur clouds
  } else if (type === "desert") {
    r = 240; g = 220; b = 190; // dust & sand haze
  } else if (type === "ice") {
    r = 235; g = 248; b = 255; // frozen cirrus
  }

  for (let y = 0; y < 512; y++) {
    const lat = (y / 512 - 0.5) * Math.PI;
    const cosLat = Math.cos(lat);
    for (let x = 0; x < 1024; x++) {
      const u = (x / 1024) * 6.5;
      const v = (y / 512) * 3.2;
      const swirl = Math.sin(v * 3.5 + u * 1.8) * 0.25;
      const val = fbm(u + swirl, v) * 0.5 + 0.5;

      const threshold = 0.44;
      let alpha = 0;
      if (val > threshold) {
        alpha = Math.min(1, ((val - threshold) / (1 - threshold)) * 1.6);
        alpha = alpha * alpha * (3 - 2 * alpha);
      }

      alpha *= Math.min(1.0, cosLat * 1.3 + 0.15);

      const idx = (y * 1024 + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.floor(alpha * 225);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cloudTextureCache.set(type, tex);
  return tex;
}

// Shared procedural normal map cache for planet surface detail
let sharedNormalMap = null;

function getSharedNormalMap() {
  if (sharedNormalMap) {
    return sharedNormalMap;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const imageData = ctx.createImageData(256, 256);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const height = Math.random();
    imageData.data[i] = height * 128 + 127;
    imageData.data[i + 1] = height * 128 + 127;
    imageData.data[i + 2] = 255;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  sharedNormalMap = tex;
  return sharedNormalMap;
}

function PlanetComponent({ object, onClick }) {
  const { gl } = useThree();
  const meshRef = useRef();
  const cloudsRef = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();
  const ringRef3 = useRef();
  const texture = useTextureLoader(object, gl);

  const isGasGiant =
    object.hasRings || object.name?.toLowerCase().includes("saturn");
  const hasClouds = !isGasGiant;

  const cloudType = object.color.includes("#e17055")
    ? "volcanic"
    : object.color.includes("#fdcb6e")
    ? "desert"
    : object.color.includes("#74b9ff")
    ? "ice"
    : "standard";

  const cloudTexture = useMemo(
    () => (hasClouds ? getCloudTexture(cloudType) : null),
    [hasClouds, cloudType]
  );

  const normalMap = useMemo(() => getSharedNormalMap(), []);

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

  useFrame(() => {
    // Planet terrain rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }

    // Independent cloud wind movement with parallax drift
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0029;
      cloudsRef.current.rotation.x += 0.0001;
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
      {/* Surface Terrain */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[object.size, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          normalMap={normalMap}
          normalScale={[0.3, 0.3]}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Independent Floating Cloud Layer */}
      {hasClouds && cloudTexture && (
        <mesh ref={cloudsRef} scale={1.018}>
          <sphereGeometry args={[object.size, 64, 64]} />
          <meshStandardMaterial
            map={cloudTexture}
            transparent
            opacity={0.88}
            roughness={0.9}
            metalness={0.0}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Planet atmosphere */}
      <mesh scale={1.038}>
        <sphereGeometry args={[object.size, 32, 32]} />
        <meshBasicMaterial
          color={getPlanetAtmosphereColor(object.color)}
          transparent
          opacity={0.15}
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
