import React, { useState, useMemo, useRef, useEffect } from "react";
import { celestialObjects } from "../data/celestialObjects";

const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

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
  comet: {
    label: "Comets",
    dot: "bg-sky-300",
  },
};

function ObjectNavigator({ onObjectSelect, selectedObject, active = true }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const [expandedGroups, setExpandedGroups] = useState({
    star: true,
    planet: true,
    nebula: true,
    black_hole: true,
    deathstar: true,
    comet: true,
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

  // Match on name or group label, so "nebula" lists every nebula
  const q = query.trim().toLowerCase();
  const visibleGroups = Object.entries(groupedObjects)
    .map(([type, objects]) => [
      type,
      q
        ? objects.filter(
            (o) =>
              o.name.toLowerCase().includes(q) ||
              (GROUP_CONFIG[type]?.label ?? type).toLowerCase().includes(q)
          )
        : objects,
    ])
    .filter(([, objects]) => objects.length > 0);

  // Ctrl+F / Cmd+F opens the catalog search instead of the browser's find bar
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "f") return;
      e.preventDefault();
      setIsMenuOpen(true);
      searchRef.current?.select(); // already open; a fresh open focuses via autoFocus
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setQuery("");
  };

  const toggleGroup = (type) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleObjectClick = (object) => {
    onObjectSelect(object);
    closeMenu(); // Close menu after selection
  };

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && visibleGroups.length) handleObjectClick(visibleGroups[0][1][0]);
    if (e.key === "Escape") {
      if (query) setQuery("");
      else closeMenu();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => (isMenuOpen ? closeMenu() : setIsMenuOpen(true))}
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
              onClick={closeMenu}
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

          {/* Search */}
          <div className="px-3 pt-3">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900/60 border border-neutral-800 focus-within:border-cyan-400/60 transition-colors">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-neutral-500 flex-shrink-0"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search objects..."
                aria-label="Search celestial catalog"
                className="flex-1 min-w-0 bg-transparent outline-none text-xs text-neutral-100 placeholder:text-neutral-500"
              />
              <kbd className="font-mono text-[10px] text-neutral-500">{MOD_KEY} F</kbd>
            </label>
          </div>

          {/* Grouped Object Lists */}
          <div className="p-3 pr-2.5 overflow-y-auto space-y-2 flex-1">
            {visibleGroups.length === 0 && (
              <div className="px-3 py-6 text-center text-xs font-mono text-neutral-500">
                NO MATCHES FOR "{query.trim()}"
              </div>
            )}
            {visibleGroups.map(([type, objects]) => {
              const meta = GROUP_CONFIG[type] || {
                label: type,
                dot: "bg-neutral-400",
              };
              const isExpanded = q ? true : expandedGroups[type]; // searching shows every hit

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
          onClick={closeMenu}
        />
      )}
    </>
  );
}

export default ObjectNavigator;
