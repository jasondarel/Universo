import React, { useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import CameraController from "./CameraController";
import CelestialObject from "./CelestialObject";
import InfoPanel from "./InfoPanel";
import SpaceMusic from "./SpaceMusic";
import ObjectNavigator from "./ObjectNavigator";
import { EffectComposer, Bloom, Noise, GodRays } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { celestialObjects } from "../data/celestialObjects";
import { useSmoothProgress } from "../hooks/useSmoothProgress";

function Universe({ active = true }) {
  const [selectedObject, setSelectedObject] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [sunMesh, setSunMesh] = useState(null);
  const [isHudExpanded, setIsHudExpanded] = useState(true);
  const { isReady: isSceneReady } = useSmoothProgress();

  // Play whoosh sound effect using audio file with timing adjustment
  const playWhooshSound = () => {
    try {
      const audio = new Audio("/sounds/whoosh-in.wav");
      audio.volume = 0.3;

      // Skip the silent part at the beginning (adjust this value as needed)
      audio.addEventListener("loadeddata", () => {
        audio.currentTime = 0.5; // Skip first 0.5 seconds
        audio.play().catch((error) => {
          console.log("Whoosh sound failed:", error);
        });
      });

      // Fallback if loadeddata doesn't fire
      setTimeout(() => {
        if (audio.paused) {
          audio.currentTime = 0.5;
          audio.play().catch((error) => {
            console.log("Whoosh sound failed:", error);
          });
        }
      }, 100);
    } catch (error) {
      console.log("Whoosh sound failed:", error);
    }
  };

  // Play zoom-out sound with timing adjustment
  const playZoomOutSound = () => {
    try {
      const audio = new Audio("/sounds/whoosh-in.wav");
      audio.volume = 0.2;
      audio.playbackRate = 0.8; // Slightly slower for zoom-out effect

      // Skip the silent part at the beginning
      audio.addEventListener("loadeddata", () => {
        audio.currentTime = 0.5; // Skip first 0.5 seconds
        audio.play().catch((error) => {
          console.log("Zoom-out sound failed:", error);
        });
      });

      // Fallback if loadeddata doesn't fire
      setTimeout(() => {
        if (audio.paused) {
          audio.currentTime = 0.5;
          audio.play().catch((error) => {
            console.log("Zoom-out sound failed:", error);
          });
        }
      }, 100);
    } catch (error) {
      console.log("Zoom-out sound failed:", error);
    }
  };

  // Initialize music when Universe component mounts
  useEffect(() => {
    const initializeMusic = () => {
      // Check if audio already exists
      let audio = document.getElementById("space-music-global");

      if (!audio) {
        audio = document.createElement("audio");
        audio.id = "space-music-global";
        audio.src = "/music/space.mp3";
        audio.loop = true;
        audio.volume = 0.3;
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";

        // Append to body
        document.body.appendChild(audio);
      }

      // Try to start if active
      if (active) {
        audio.play().catch(() => {
          console.log("Autoplay blocked, will start on user interaction");
        });
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(initializeMusic, 500);
  }, []);

  const handleObjectClick = (object) => {
    // Play whoosh sound effect for zoom-in
    playWhooshSound();

    setSelectedObject(object);
    setCameraTarget(object);

    // Ensure music is playing when user interacts with objects
    const audio = document.getElementById("space-music-global");
    if (audio && audio.paused) {
      audio.play().catch((error) => {
        console.log("Music start failed on object click:", error);
      });
    }
  };

  const handleClosePanel = () => {
    // Play zoom-out sound effect
    playZoomOutSound();

    setSelectedObject(null);
  };

  const handleCameraAnimationComplete = () => {
    // Animation completed - camera is now focused on the object
  };

  return (
    <div className="w-full h-screen bg-space-dark">
      <SpaceMusic />
      <div
        className={`w-full h-full transition-opacity duration-1000 ease-out ${
          isSceneReady ? "opacity-100" : "opacity-0"
        }`}
      >
        <Canvas
          camera={{ position: [0, 0, 100], fov: 60 }}
          className="w-full h-full"
          shadows
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
        >
          <Suspense fallback={null}>
            {/* Ambient cosmic starlight */}
            <ambientLight intensity={0.07} />

            <Stars
              radius={300}
              depth={50}
              count={8000}
              factor={6}
              saturation={0}
              fade
              speed={0.5}
            />

            <EffectComposer>
              <Bloom
                intensity={1.4}
                luminanceThreshold={0.7}
                luminanceSmoothing={0.3}
                mipmapBlur
              />
              <Noise
                premultiply
                blendFunction={BlendFunction.SCREEN}
                opacity={0.15}
              />
              {sunMesh && (
                <GodRays
                  sun={sunMesh}
                  samples={60}
                  density={0.96}
                  decay={0.92}
                  weight={0.5}
                  exposure={0.6}
                  clampMax={1}
                  blur
                />
              )}
            </EffectComposer>

            {/* Celestial objects */}
            {celestialObjects.map((object) => (
              <CelestialObject
                key={object.id}
                object={object}
                onClick={handleObjectClick}
                onRegisterSun={setSunMesh}
              />
            ))}

            {/* Camera controls with animation */}
            <CameraController
              target={cameraTarget}
              onComplete={handleCameraAnimationComplete}
              enabled={active}
            />
          </Suspense>
        </Canvas>
      </div>

      <div
        className={`transition-opacity duration-700 ${
          active ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {selectedObject && (
          <InfoPanel object={selectedObject} onClose={handleClosePanel} />
        )}

        {/* Observatory Flight Deck HUD */}
        <div className="absolute top-4 left-4 z-20 font-mono">
          {isHudExpanded ? (
            <div className="bg-neutral-950/85 backdrop-blur-md rounded-xl border border-neutral-800/80 p-3.5 shadow-xl text-neutral-300 max-w-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-space font-semibold text-white tracking-wider uppercase text-[11px]">
                    NAVIGATION HUD
                  </span>
                </div>
                <button
                  onClick={() => setIsHudExpanded(false)}
                  className="text-neutral-500 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
                  title="Collapse HUD"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-neutral-200 font-medium">WASD / Drag</span>
                  <span>Orbit & Roam</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-neutral-200 font-medium">Scroll</span>
                  <span>Zoom Focus</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-neutral-200 font-medium">Click Object</span>
                  <span>Target & Inspect</span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-neutral-200 font-medium">Right-Drag</span>
                  <span>Pan Position</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsHudExpanded(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-neutral-950/85 backdrop-blur-md border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-all cursor-pointer shadow-lg"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="font-space uppercase tracking-wider text-[11px]">CONTROLS</span>
            </button>
          )}
        </div>

        {/* Object Navigator */}
        <ObjectNavigator
          onObjectSelect={handleObjectClick}
          selectedObject={selectedObject}
        />
      </div>
    </div>
  );
}

export default Universe;
