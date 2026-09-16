import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

export function useSmoothProgress() {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const targetRef = useRef(0);
  const displayRef = useRef(0);

  useEffect(() => {
    let animId;
    let isComplete = false;

    // Minimum expected assets across textures and GLB models
    let totalItems = 12;

    const updateTarget = (loaded, total) => {
      totalItems = Math.max(totalItems, total);
      const calculated = Math.min(100, (loaded / totalItems) * 100);
      // Monotonic guarantee: target can never move backwards
      if (calculated > targetRef.current) {
        targetRef.current = calculated;
      }
    };

    const originalOnProgress = THREE.DefaultLoadingManager.onProgress;
    const originalOnLoad = THREE.DefaultLoadingManager.onLoad;

    THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
      updateTarget(loaded, total);
      if (originalOnProgress && originalOnProgress !== THREE.DefaultLoadingManager.onProgress) {
        try { originalOnProgress(url, loaded, total); } catch {}
      }
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      targetRef.current = 100;
      if (originalOnLoad && originalOnLoad !== THREE.DefaultLoadingManager.onLoad) {
        try { originalOnLoad(); } catch {}
      }
    };

    // Smooth animation loop using requestAnimationFrame
    const step = () => {
      const target = targetRef.current;
      const current = displayRef.current;

      if (current < target) {
        const delta = target - current;
        const stepAmount = Math.max(0.3, delta * 0.12);
        displayRef.current = Math.min(target, current + stepAmount);
        setProgress(Math.round(displayRef.current));
      }

      if (displayRef.current >= 99.5 && !isComplete) {
        displayRef.current = 100;
        setProgress(100);
        isComplete = true;
        setTimeout(() => setIsReady(true), 250);
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    // Fallback timer: ensure readiness within 4s max regardless of cache/network quirks
    const fallbackTimer = setTimeout(() => {
      targetRef.current = 100;
    }, 3500);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return { progress, isReady };
}
