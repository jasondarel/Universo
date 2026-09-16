import React, { useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import CameraController from "./CameraController";
import CelestialObject from "./CelestialObject";
import InfoPanel from "./InfoPanel";
import SpaceMusic from "./SpaceMusic";
import ObjectNavigator from "./ObjectNavigator";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { celestialObjects } from "../data/celestialObjects";
import { useSmoothProgress } from "../hooks/useSmoothProgress";

function Universe({ active = true }) {
  const [selectedObject, setSelectedObject] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null);
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
            <ambientLight intensity={0.15} />
            <pointLight position={[10, 10, 10]} intensity={0.8} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.3} />

            <directionalLight
              position={[50, 50, 50]}
              intensity={0.5}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />

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
                intensity={1.2}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
              />
              <Noise
                premultiply
                blendFunction={BlendFunction.SCREEN}
                opacity={0.25}
              />
            </EffectComposer>

            {/* Celestial objects */}
            {celestialObjects.map((object) => (
              <CelestialObject
                key={object.id}
                object={object}
                onClick={handleObjectClick}
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

        {/* Enhanced UI Instructions */}
        <div className="absolute top-4 left-4 text-white/70 text-sm z-10">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-white/20">
            <p className="mb-2 text-yellow-300">
              🌌 Enhanced 3D Interactive Universe
            </p>
            <p className="text-xs mb-1">
              ✨ Realistic textures and lighting effects
            </p>
            <p className="text-xs mb-1">
              🖱️ Click on celestial objects to focus and learn more!
            </p>
            <p className="text-xs mb-1">
              🎬 Smooth camera animations to selected objects
            </p>
            <p className="text-xs">
              🎮 Drag to rotate • Scroll to zoom • Right-click + drag to pan
            </p>
          </div>
        </div>

        {/* Performance info */}
        <div className="absolute top-4 right-20 text-white/50 text-xs z-10">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-white/10">
            <p>Enhanced Visuals Active</p>
            <p>Procedural Textures • Glow Effects</p>
          </div>
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
