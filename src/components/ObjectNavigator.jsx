import React, { useState, useMemo } from "react";
import { celestialObjects } from "../data/celestialObjects";

const GROUP_CONFIG = {
  star: {
    label: "Star Systems",
    dot: "bg-amber-400",
  },
  planet: {
    label: "Planetary Bodies",
    dot: "bg-emerald-400",
  },
  nebula: {
    label: "Diffuse Nebulae",
    dot: "bg-purple-400",
  },
  black_hole: {
    label: "Singularities",
    dot: "bg-cyan-400",
  },
  deathstar: {
    label: "Superstructures",
    dot: "bg-rose-400",
  },
};

function ObjectNavigator({ onObjectSelect, selectedObject }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    star: true,
    planet: true,
    nebula: true,
    black_hole: true,
    deathstar: true,
  });

  // Group objects by type
  const groupedObjects = useMemo(() => {
    const groups = {};
    celestialObjects.forEach((object) => {
      if (!groups[object.type]) {
        groups[object.type] = [];
      }
      groups[object.type].push(object);
    });
    return groups;
  }, []);

  const toggleGroup = (type) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleObjectClick = (object) => {
    onObjectSelect(object);
    setIsMenuOpen(false); // Close menu after selection
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`fixed top-4 right-4 z-40 flex items-center space-x-2.5 px-3.5 py-2 rounded-xl backdrop-blur-md border transition-all duration-300 font-mono text-xs shadow-xl cursor-pointer ${
          isMenuOpen
            ? "bg-neutral-900 border-neutral-700 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            : "bg-neutral-950/85 hover:bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:text-white"
        }`}
        title="Celestial Catalog"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-cyan-400"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        <span className="font-space uppercase tracking-wider font-medium text-[11px]">
          CATALOG
        </span>
        <span className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400 text-[10px]">
          {celestialObjects.length}
        </span>
      </button>

      {/* Navigation Menu */}
      {isMenuOpen && (
        <div className="fixed top-16 right-4 z-40 bg-neutral-950/90 backdrop-blur-md text-neutral-100 rounded-xl border border-neutral-800 shadow-[0_15px_50px_rgba(0,0,0,0.85)] max-h-[75vh] flex flex-col w-84 sm:w-88 overflow-hidden font-sans">
          {/* Header */}
          <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>SECTOR DATABASE</span>
              </div>
              <h2 className="text-lg font-space font-semibold text-white mt-0.5 tracking-tight">
                Celestial Catalog
              </h2>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-800/60 transition-colors cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Grouped Object Lists */}
          <div className="p-3 pr-2.5 overflow-y-auto space-y-2 flex-1">
            {Object.entries(groupedObjects).map(([type, objects]) => {
              const meta = GROUP_CONFIG[type] || {
                label: type,
                dot: "bg-neutral-400",
              };
              const isExpanded = expandedGroups[type];

              return (
                <div key={type} className="rounded-lg bg-neutral-900/30 border border-neutral-800/50 overflow-hidden">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(type)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-900/70 transition-colors text-left font-mono cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      <span className="text-xs uppercase font-medium text-neutral-300 tracking-wider">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        ({objects.length})
                      </span>
                    </div>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`text-neutral-500 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  </button>

                  {/* Group Objects */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1">
                      {objects.map((object) => {
                        const isSelected = selectedObject?.id === object.id;

                        return (
                          <button
                            key={object.id}
                            onClick={() => handleObjectClick(object)}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-all flex items-center justify-between group cursor-pointer ${
                              isSelected
                                ? "bg-neutral-800/80 border-l-2 border-cyan-400 text-white font-medium pl-2.5"
                                : "hover:bg-neutral-800/40 text-neutral-400 hover:text-neutral-200"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: object.color || "#ffffff" }}
                              />
                              <span className="truncate">{object.name}</span>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px] text-neutral-400">
                              <span>Target</span>
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-500 flex items-center justify-between bg-neutral-950">
            <span>SELECT TO ENGAGE CAMERA</span>
            <span className="text-cyan-400/80">SECTOR 01</span>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}

export default ObjectNavigator;
