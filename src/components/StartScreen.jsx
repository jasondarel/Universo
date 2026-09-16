import React, { useState } from "react";
import { useSmoothProgress } from "../hooks/useSmoothProgress";

function StartScreen({ onStart, isStarted }) {
  const { progress, isReady } = useSmoothProgress();

  const handleStart = async () => {
    if (!isReady || isStarted) return;

    // Start ambient music with user interaction
    try {
      let audio = document.getElementById("space-music-global");

      if (!audio) {
        audio = document.createElement("audio");
        audio.id = "space-music-global";
        audio.src = "/music/space.mp3";
        audio.loop = true;
        audio.volume = 0.3;
        audio.preload = "auto";
        audio.style.display = "none";
        document.body.appendChild(audio);
      }

      await audio.play();
    } catch (error) {
      console.log("Audio playback error:", error?.message);
    }

    // Preload whoosh audio effect
    try {
      const whoosh = new Audio("/sounds/whoosh-in.wav");
      whoosh.preload = "auto";
      whoosh.load();
    } catch {}

    onStart();
  };

  return (
    <div
      className={`relative w-full h-screen transition-colors duration-1000 ease-out text-neutral-100 flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans ${
        isReady ? "bg-black/75 backdrop-blur-[2px]" : "bg-black"
      }`}
    >
      {/* Subtle corner crosshairs / viewfinder framing */}
      <div className="pointer-events-none absolute inset-6 sm:inset-10 border border-neutral-800/60 rounded-xl">
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-neutral-500" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-neutral-500" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-neutral-500" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-neutral-500" />
      </div>

      {/* Center Hero Section */}
      <main className="relative z-10 max-w-2xl mx-auto text-center my-auto space-y-6 px-4">
        {/* Title */}
        <div className="space-y-3">
          <h1 className="font-space text-6xl sm:text-7xl md:text-8xl font-light tracking-tight text-white uppercase">
            Universo
          </h1>
          <p className="font-sans text-sm sm:text-base text-neutral-400 max-w-md mx-auto font-normal leading-relaxed">
            An interactive 3D simulation of celestial systems, stellar nurseries, and gravitational singularities.
          </p>
        </div>

        {/* Action Button or Real-Time Loader */}
        <div className="pt-2">
          {isReady ? (
            <button
              onClick={handleStart}
              className="group relative inline-flex items-center space-x-3 px-8 py-3.5 rounded-lg bg-white text-neutral-950 font-space font-semibold text-sm tracking-wider uppercase transition-all duration-300 hover:bg-neutral-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>ENTER OBSERVATORY</span>
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <div className="max-w-xs sm:max-w-sm mx-auto space-y-2.5 font-mono">
              <div className="flex justify-between text-xs text-neutral-400 tracking-wider">
                <span className="uppercase text-[11px]">CALIBRATING TELEMETRY</span>
                <span className="text-cyan-400 font-semibold">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                  style={{ width: `${Math.max(6, Math.min(100, progress))}%` }}
                />
              </div>
              <div className="text-[10px] text-neutral-500 tracking-wide uppercase">
                Loading models, textures & orbital coordinates...
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Controls / Status Footer */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-neutral-500 pt-4 border-t border-neutral-900/60 gap-2 sm:gap-0">
        <div className="flex items-center space-x-2 tracking-wider">
          <span className="text-neutral-400 font-medium">[ CONTROLS ]</span>
          <span className="text-neutral-500">WASD: Roam • Click: Focus • Scroll: Zoom</span>
        </div>

        <div className="flex items-center space-x-3 text-neutral-500 tracking-widest text-[11px]">
          <span>ATMOSPHERE AUDIO: READY</span>
          <span className="text-neutral-700">•</span>
          <span>SPATIAL COORD: [0, 0, 100]</span>
        </div>
      </footer>
    </div>
  );
}

export default StartScreen;
