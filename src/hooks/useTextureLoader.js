import React, { useState, useEffect } from "react";
import * as THREE from "three";

const textureCache = new Map();

// All explicit textures to preload on application start
export const PRELOAD_TEXTURES = [
  "/textures/sun.jpg",
  "/textures/earth.jpg",
  "/textures/gliese.jpg",
  "/textures/hd.jpg",
  "/textures/hoth.jpg",
  "/textures/vulcan.jpg",
  "/textures/saturn.jpg",
  "/textures/deathstar.jpg",
  "/textures/ring.png",
];

// Preload textures immediately using THREE.DefaultLoadingManager
if (typeof window !== "undefined") {
  const loader = new THREE.TextureLoader();
  PRELOAD_TEXTURES.forEach((path) => {
    loader.load(
      path,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(path, tex);
      },
      undefined,
      (err) => console.warn(`Preload failed for ${path}:`, err)
    );
  });
}

export function useTextureLoader(object, gl) {
  const initialTex = object.texture
    ? textureCache.get(`/textures/${object.texture}`) || null
    : null;
  const [texture, setTexture] = useState(initialTex);
  const [useGeneratedTexture, setUseGeneratedTexture] = useState(false);

  // Helper function to get potential texture filename based on object name
  const getTextureFilename = (object) => {
    // Convert object name to filename-friendly format
    const filename = object.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w\-_]/g, "")
      .replace(/_+/g, "_");

    return filename;
  };

  const generateTexture = (type, color) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 512;

    const getPlanetType = (color) => {
      if (color.includes("#4ecdc4") || color.includes("#00cec9"))
        return "ocean";
      if (color.includes("#fdcb6e")) return "desert";
      if (color.includes("#74b9ff")) return "ice";
      if (color.includes("#e17055") || color.includes("#fd79a8"))
        return "volcanic";
      if (color.includes("#00b894")) return "forest";
      return "ocean";
    };

    if (type === "star") {
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.7, "#ff4444");
      gradient.addColorStop(1, "#331100");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 3;
        ctx.fillStyle = `rgba(255, 255, 100, ${Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === "planet") {
      // Create diverse planet surfaces based on color
      const planetType = getPlanetType(color);

      if (planetType === "ocean") {
        // Ocean world with continents
        ctx.fillStyle = "#1a4d6b";
        ctx.fillRect(0, 0, 512, 512);

        // Add landmasses
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 20 + Math.random() * 80;
          ctx.fillStyle = "#4a7c59";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (planetType === "desert") {
        // Desert world with sand dunes
        ctx.fillStyle = "#d4a574";
        ctx.fillRect(0, 0, 512, 512);

        // Add darker sandy regions
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 30 + Math.random() * 60;
          ctx.fillStyle = "#b8956a";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Add oasis spots
        for (let i = 0; i < 5; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 8 + Math.random() * 15;
          ctx.fillStyle = "#2d8a47";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (planetType === "ice") {
        // Ice world
        ctx.fillStyle = "#e8f4f8";
        ctx.fillRect(0, 0, 512, 512);

        // Add ice formations
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 15 + Math.random() * 40;
          ctx.fillStyle = "#b8d4e3";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Add darker ice patches
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 10 + Math.random() * 25;
          ctx.fillStyle = "#9bc2d1";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (planetType === "volcanic") {
        // Volcanic world
        ctx.fillStyle = "#2d1810";
        ctx.fillRect(0, 0, 512, 512);

        // Add lava flows
        for (let i = 0; i < 25; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 20 + Math.random() * 50;
          ctx.fillStyle = "#ff4500";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Add darker volcanic rock
        for (let i = 0; i < 35; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 15 + Math.random() * 30;
          ctx.fillStyle = "#1a0f08";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (planetType === "forest") {
        // Forest world
        ctx.fillStyle = "#2d5a3d";
        ctx.fillRect(0, 0, 512, 512);

        // Add forest patches
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 10 + Math.random() * 30;
          ctx.fillStyle = "#1e4a2b";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Add clearings
        for (let i = 0; i < 10; i++) {
          const x = Math.random() * 512;
          const y = Math.random() * 512;
          const radius = 8 + Math.random() * 20;
          ctx.fillStyle = "#4a7c59";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Add atmospheric noise for all planet types
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${
          Math.random() * 255
        }, 0.1)`;
        ctx.fillRect(x, y, 1, 1);
      }
    } else if (type === "nebula") {
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 300);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + "80");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    } else if (type === "black_hole") {
      // Create event horizon effect
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, "#000000");
      gradient.addColorStop(0.8, "#1a1a1a");
      gradient.addColorStop(1, "#ff6600");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  };

  // Try to load texture from public/textures, fallback to generated
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();

    const useGenerated = () => {
      if (cancelled) return;
      const generatedTexture = generateTexture(object.type, object.color);
      setTexture(generatedTexture);
      setUseGeneratedTexture(true);
    };

    const onLoad = (tex) => {
      if (cancelled) return;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      // Better quality when zoomed
      try {
        tex.anisotropy = gl.capabilities.getMaxAnisotropy?.() || 1;
      } catch {}
      // Correct color space (newer three.js)
      if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      if (object.texture) {
        textureCache.set(`/textures/${object.texture}`, tex);
      }
      setTexture(tex);
      setUseGeneratedTexture(false);
    };

    // If explicit texture is already in cache, use it immediately
    if (object.texture && textureCache.has(`/textures/${object.texture}`)) {
      setTexture(textureCache.get(`/textures/${object.texture}`));
      return;
    }

    // 1) If an explicit texture is provided, try that first
    if (object.texture) {
      loader.load(`/textures/${object.texture}`, onLoad, undefined, () => {
        console.warn(`Failed to load ${object.texture}, falling back…`);
        // 2) Fallback to name-based guesses
        const base = getTextureFilename(object);
        const exts = [".jpg", ".png", ".jpeg"];
        let i = 0;
        const tryNext = () => {
          if (i >= exts.length) return useGenerated();
          const fname = `${base}${exts[i++]}`;
          loader.load(`/textures/${fname}`, onLoad, undefined, tryNext);
        };
        tryNext();
      });
    } else {
      // No explicit texture—use name-based guesses, then procedural
      const base = getTextureFilename(object);
      const exts = [".jpg", ".png", ".jpeg"];
      let i = 0;
      const tryNext = () => {
        if (i >= exts.length) return useGenerated();
        const fname = `${base}${exts[i++]}`;
        loader.load(`/textures/${fname}`, onLoad, undefined, tryNext);
      };
      tryNext();
    }

    return () => {
      cancelled = true;
    };
  }, [object, gl]);

  return texture;
}
