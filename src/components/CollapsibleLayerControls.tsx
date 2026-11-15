import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { LayerVisibility } from '../types';
import { LayerControls } from './LayerControls';

interface CollapsibleLayerControlsProps {
  layers: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

export const CollapsibleLayerControls: React.FC<CollapsibleLayerControlsProps> = ({ layers, onToggleLayer }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="collapsed-layers tactical-panel rounded-xl">
      <button type="button" onClick={() => setIsExpanded((previous) => !previous)} aria-expanded={isExpanded}>
        <span><Layers className="h-4 w-4 text-orange-400" /> Terrain layers</span>
        <span className="collapsed-layers__hint">
          NASA basemap + simulated overlays
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {isExpanded && <LayerControls layers={layers} onToggleLayer={onToggleLayer} />}
    </section>
  );
};
