import React, { useState, useEffect } from "react";

function StartScreen({ onStart }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stars, setStars] = useState([]);

  // Generate random stars for background animation
  useEffect(() => {
    const generateStars = () => {
      const starArray = [];
      for (let i = 0; i < 200; i++) {
        starArray.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.8 + 0.2,
          twinkleDelay: Math.random() * 4,
        });
      }
      setStars(starArray);
    };

    generateStars();
  }, []);

  const handleStart = async () => {
    setIsLoading(true);

    // Start the music with user interaction
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
      console.log("✅ Space music started from start screen");
    } catch (error) {
      console.log("❌ Music start failed:", error.message);
    }

    // Simulate loading time for dramatic effect
    setTimeout(() => {
      onStart();
    }, 2000);
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-black via-purple-900/20 to-black overflow-hidden flex items-center justify-center">
      {/* Animated star field background */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `${star.twinkleDelay}s`,
              animationDuration: "3s",
            }}
          />
        ))}
      </div>

      {/* Cosmic gradient overlay */}
      <div className="absolute inset-0 bg-black" />

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8 px-8">
        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold bg-white bg-clip-text text-transparent">
            Universo
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" />
        </div>

        {/* Subtitle */}
        <p className="text-2xl md:text-3xl text-blue-100 font-light tracking-wide">
          Begin space experience?
        </p>

        {/* Description */}
        <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Journey through a breathtaking 3D cosmos filled with stars, planets,
          nebulas, and black holes.
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Immersive space music included.
          </span>
        </p>

        {/* Start button */}
        {!isLoading ? (
          <button
            onClick={handleStart}
            className="group relative px-12 py-4 text-xl font-semibold text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400/50"
          >
            {/* Button background with cosmic effect */}
            <div className="absolute inset-0 bg-white rounded-full group-hover:from-blue-400 group-hover:via-purple-400 group-hover:to-pink-400 transition-all duration-300" />

            {/* Button content */}
            <span className="relative flex items-center justify-center space-x-3 text-black">
              <span>START JOURNEY</span>
            </span>

            {/* Glowing ring effect */}
            <div className="absolute inset-0 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-all duration-300" />
            <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-white/20 transition-all duration-300 animate-pulse" />
          </button>
        ) : (
          /* Loading state */
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div
                className="w-3 h-3 bg-blue-100 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-3 h-3 bg-blue-100 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-3 h-3 bg-blue-100 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <p className="text-blue-100 text-lg">
              Initializing cosmic experience...
            </p>
          </div>
        )}

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/60 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default StartScreen;
