import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_CONFIG = {
  star: {
    label: "STAR SYSTEM",
    badge: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    dot: "bg-amber-400",
  },
  planet: {
    label: "EXOPLANET",
    badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    dot: "bg-emerald-400",
  },
  nebula: {
    label: "DIFFUSE NEBULA",
    badge: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    dot: "bg-purple-400",
  },
  black_hole: {
    label: "SINGULARITY",
    badge: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    dot: "bg-cyan-400",
  },
  deathstar: {
    label: "ORBITAL SUPERSTRUCTURE",
    badge: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    dot: "bg-rose-400",
  },
};

function InfoPanel({ object, onClose }) {
  const config = TYPE_CONFIG[object.type] || {
    label: "CELESTIAL OBJECT",
    badge: "text-neutral-400 border-neutral-700 bg-neutral-800/40",
    dot: "bg-neutral-400",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed bottom-6 left-6 right-6 md:left-6 md:right-auto md:max-w-md z-30 font-sans"
      >
        <div className="relative bg-neutral-950/90 backdrop-blur-md rounded-xl border border-neutral-800 p-5 text-neutral-100 shadow-[0_12px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Subtle corner reticle accents */}
          <div className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-neutral-500" />
          <div className="pointer-events-none absolute top-0 right-0 w-2 h-2 border-t border-r border-neutral-500" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1.5">
              <div
                className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase border ${config.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                <span>{config.label}</span>
              </div>
              <h3 className="text-2xl font-space font-semibold tracking-tight text-white">
                {object.name}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800/60 cursor-pointer"
              title="Close Dossier"
            >
              <svg
                width="18"
                height="18"
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

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-[10px] text-neutral-500 uppercase block tracking-wider">
                Relative Scale
              </span>
              <span className="text-neutral-200 font-semibold mt-0.5 block">
                {object.size}x units
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
              <span className="text-[10px] text-neutral-500 uppercase block tracking-wider">
                Coordinates
              </span>
              <span className="text-neutral-200 font-semibold mt-0.5 block truncate">
                [{object.position.map((p) => Math.round(p)).join(", ")}]
              </span>
            </div>
          </div>

          {/* Astrophysical Archive Note */}
          <div className="p-3.5 bg-neutral-900/40 rounded-lg border border-neutral-800/60">
            <div className="text-[10px] font-mono tracking-wider uppercase text-neutral-400 mb-1 flex items-center space-x-1.5">
              <span>ASTROPHYSICAL ARCHIVE</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-normal">
              {object.fun_fact}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default InfoPanel;
