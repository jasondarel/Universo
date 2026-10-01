import * as THREE from "three";

// Texture cache for procedural coronas so canvas textures are generated once per color
const coronaTextureCache = new Map();

export function getCoronaTexture(colorHex) {
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
