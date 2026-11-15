import React, { useState } from 'react';
import { Bookmark, Compass, Footprints, Mountain, Rocket, Search, ChevronRight, X } from 'lucide-react';
import { MARS_BOOKMARKS, MarsBookmark } from '../data/mars3DData';

interface OrbitalBookmarksProps {
  onFlyTo: (bookmark: MarsBookmark) => void;
  onSelectTarget?: (bookmark: MarsBookmark) => void;
  activeTargetId?: string;
  onDropHereMode: () => void;
  isDropModeActive: boolean;
  onClose?: () => void;
}

export const OrbitalBookmarks: React.FC<OrbitalBookmarksProps> = ({
  onFlyTo,
  onSelectTarget,
  activeTargetId,
  onDropHereMode,
  isDropModeActive,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'feature' | 'mission' | 'base'>('all');

  const filteredBookmarks = MARS_BOOKMARKS.filter((b) => {
    const matchesTab = activeTab === 'all' || b.category === activeTab;
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <aside className="w-80 md:w-96 flex flex-col bg-slate-950/95 border border-orange-500/30 rounded-xl shadow-2xl backdrop-blur max-h-[85vh] overflow-hidden z-20 text-xs font-mono select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-orange-400" />
          <span className="font-aerospace font-bold text-sm tracking-wider text-slate-100">
            MARTIAN LOCATIONS &amp; LANDMARKS
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* "Drop Me Here" Action Card */}
      <div className="p-3 bg-gradient-to-r from-orange-950/40 to-slate-900 border-b border-orange-500/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-aerospace font-bold text-orange-300 flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-emerald-400 animate-pulse" />
              FIRST-PERSON SURFACE MODE
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Drop camera to 1.7 m above terrain &amp; walk with W/A/S/D
            </p>
          </div>
        </div>
        <button
          onClick={onDropHereMode}
          className={`w-full py-2 px-3 rounded-lg font-aerospace font-bold tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
            isDropModeActive
              ? 'bg-emerald-600 text-white border border-emerald-400 animate-pulse'
              : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border border-orange-400/40'
          }`}
        >
          <Footprints className="w-4 h-4" />
          <span>{isDropModeActive ? 'CLICK GLOBE TO DROP' : 'DROP ME ANYWHERE ON MARS'}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-950">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search craters, mons, rovers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-orange-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              activeTab === 'all'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            ALL ({MARS_BOOKMARKS.length})
          </button>
          <button
            onClick={() => setActiveTab('base')}
            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              activeTab === 'base'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            GALE BASE
          </button>
          <button
            onClick={() => setActiveTab('mission')}
            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              activeTab === 'mission'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            ROVERS
          </button>
          <button
            onClick={() => setActiveTab('feature')}
            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
              activeTab === 'feature'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            MONS &amp; CANYONS
          </button>
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
        {filteredBookmarks.map((bookmark) => {
          const isCurrentTarget = activeTargetId === bookmark.id;

          return (
            <div
              key={bookmark.id}
              className={`p-2.5 rounded-lg border transition-all flex flex-col gap-2 group ${
                isCurrentTarget
                  ? 'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-950/50'
                  : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/80 hover:border-orange-500/40'
              }`}
            >
              <div
                onClick={() => {
                  onFlyTo(bookmark);
                  onSelectTarget?.(bookmark);
                }}
                className="flex items-start justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                      bookmark.category === 'base'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                        : bookmark.category === 'mission'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    }`}
                  >
                    {bookmark.category === 'base' ? (
                      <Compass className="w-3.5 h-3.5" />
                    ) : bookmark.category === 'mission' ? (
                      <Rocket className="w-3.5 h-3.5" />
                    ) : (
                      <Mountain className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-aerospace font-bold text-slate-200 group-hover:text-orange-300 truncate transition-colors">
                        {bookmark.name}
                      </span>
                      {isCurrentTarget && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-300 text-[8px] font-bold border border-cyan-400/50">
                          ACTIVE TARGET
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {bookmark.description}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      {bookmark.coordinates[0].toFixed(2)}°E, {bookmark.coordinates[1].toFixed(2)}°N
                      {bookmark.groundElevationApproxM !== undefined && (
                        <span className="ml-1 text-slate-400">
                          • Elev: {bookmark.groundElevationApproxM >= 0 ? '+' : ''}
                          {bookmark.groundElevationApproxM} m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 shrink-0 mt-1 transition-colors" />
              </div>

              {/* Action Buttons: Set as Target vs Fly to View */}
              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTarget?.(bookmark);
                    onFlyTo(bookmark);
                  }}
                  className={`flex-1 py-1 px-2 rounded text-[10px] font-aerospace font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                    isCurrentTarget
                      ? 'bg-cyan-600/40 text-cyan-200 border-cyan-400/60'
                      : 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/30 hover:border-cyan-400'
                  }`}
                >
                  <span>🧭 {isCurrentTarget ? 'ACTIVE DESTINATION' : 'SET AS ROVER TARGET'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlyTo(bookmark);
                  }}
                  className="py-1 px-2 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                  title="Fly camera to view this landmark"
                >
                  <span>👁️ VIEW</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
