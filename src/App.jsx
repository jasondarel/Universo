import React, { useState } from "react";
import StartScreen from "./components/StartScreen";
import Universe from "./components/Universe";

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isOverlayMounted, setIsOverlayMounted] = useState(true);

  const handleStart = () => {
    setHasStarted(true);
    // Smooth fade-out duration is 800ms; unmount overlay afterwards
    setTimeout(() => {
      setIsOverlayMounted(false);
    }, 850);
  };

  return (
    <div className="relative w-full h-screen bg-space-dark overflow-hidden">
      {/* 3D Universe mounts immediately in background so models & textures load during landing */}
      <Universe active={hasStarted} />

      {/* Start screen overlay with smooth fade-out */}
      {isOverlayMounted && (
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-700 ease-in-out ${
            hasStarted
              ? "opacity-0 pointer-events-none"
              : "opacity-100 pointer-events-auto"
          }`}
        >
          <StartScreen onStart={handleStart} isStarted={hasStarted} />
        </div>
      )}
    </div>
  );
}

export default App;
