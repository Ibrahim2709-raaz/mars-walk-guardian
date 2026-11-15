import React from 'react';
import { Bookmark, Bot, Home, Microscope } from 'lucide-react';

interface MapToolbarProps {
  showSites: boolean;
  sitesOpen: boolean;
  onToggleSites: () => void;
  onCenterBase: () => void;
  onCenterTarget: () => void;
  onCenterRover: () => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  showSites,
  sitesOpen,
  onToggleSites,
  onCenterBase,
  onCenterTarget,
  onCenterRover
}) => (
  <div className="map-toolbar" aria-label="Map focus controls">
    {showSites && (
      <button type="button" onClick={onToggleSites} className={sitesOpen ? 'is-active' : ''} title="Mission sites">
        <Bookmark className="h-3.5 w-3.5" />
        <span>Sites</span>
      </button>
    )}
    <button type="button" onClick={onCenterBase} title="Center simulated base">
      <Home className="h-3.5 w-3.5" />
      <span>Base</span>
    </button>
    <button type="button" onClick={onCenterTarget} title="Center science target">
      <Microscope className="h-3.5 w-3.5" />
      <span>Target</span>
    </button>
    <button type="button" onClick={onCenterRover} title="Center rover">
      <Bot className="h-3.5 w-3.5" />
      <span>Rover</span>
    </button>
  </div>
);
