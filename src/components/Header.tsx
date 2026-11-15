import React from 'react';
import {
  BatteryCharging,
  Bookmark,
  Bot,
  Compass,
  Footprints,
  Globe,
  Map as MapIcon,
  Radio
} from 'lucide-react';
import { RoverTelemetry } from '../types';

export type ViewMode = '3d-orbital' | '3d-surface' | '2d-grid' | '3d-rover';

interface HeaderProps {
  telemetry: RoverTelemetry;
  isEmergency: boolean;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onToggleBookmarks?: () => void;
  isBookmarksOpen?: boolean;
  onCenterBase: () => void;
  onCenterTarget: () => void;
  onCenterRover?: () => void;
}

const VIEW_OPTIONS: { mode: ViewMode; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { mode: '2d-grid', label: 'Tactical map', shortLabel: 'Map', icon: MapIcon },
  { mode: '3d-rover', label: 'Rover replay', shortLabel: 'Rover', icon: Bot },
  { mode: '3d-orbital', label: 'Mars globe', shortLabel: 'Globe', icon: Globe },
  { mode: '3d-surface', label: 'Surface view', shortLabel: 'Surface', icon: Footprints }
];

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  isEmergency,
  viewMode,
  onChangeViewMode,
  onToggleBookmarks,
  isBookmarksOpen,
  onCenterBase,
  onCenterTarget,
  onCenterRover
}) => {
  return (
    <header className="mission-header">
      <div className="mission-header__primary">
        <div className="mission-brand">
          <div className="mission-brand__mark" aria-hidden="true">
            <Compass className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1>Mars Rover Guardian</h1>
              <span className="mission-version">MVP</span>
            </div>
            <p>Explainable route planning · Gale Crater</p>
          </div>
        </div>

        <nav className="mission-view-switcher" aria-label="Mission view">
          {VIEW_OPTIONS.map(({ mode, label, shortLabel, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={viewMode === mode ? 'is-active' : ''}
              title={label}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden xl:inline">{label}</span>
              <span className="xl:hidden">{shortLabel}</span>
            </button>
          ))}
        </nav>

        <div className="mission-status-cluster">
          <div className={`mission-state ${isEmergency ? 'is-emergency' : ''}`}>
            <span className="mission-state__dot" />
            <span>{isEmergency ? 'Emergency route' : 'Nominal mission'}</span>
          </div>
          <div className="mission-status-item hidden 2xl:flex">
            <Radio className="h-3.5 w-3.5" />
            <span>{telemetry.communicationStatus.signalStrengthPercent}% relay</span>
          </div>
          <div className="mission-status-item">
            <BatteryCharging className="h-3.5 w-3.5" />
            <span>{telemetry.batteryRemainingWh.toFixed(0)} Wh</span>
          </div>
          <span className="mission-sol">Sol {telemetry.missionTime.sol}</span>
        </div>
      </div>

      <div className="mission-header__secondary">
        <div className="mission-mobile-switcher" aria-label="Mission view">
          {VIEW_OPTIONS.map(({ mode, shortLabel, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={viewMode === mode ? 'is-active' : ''}
            >
              <Icon className="h-4 w-4" />
              <span>{shortLabel}</span>
            </button>
          ))}
        </div>

        <div className="mission-quick-actions">
          {onToggleBookmarks && viewMode !== '3d-rover' && (
            <button
              type="button"
              onClick={onToggleBookmarks}
              className={isBookmarksOpen ? 'is-active' : ''}
              title="Mission bookmarks"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>Sites</span>
            </button>
          )}
          {viewMode !== '3d-rover' && (
            <>
              <button className="mission-location-action" type="button" onClick={onCenterBase}>Base</button>
              <button className="mission-location-action" type="button" onClick={onCenterTarget}>Target</button>
              {onCenterRover && <button className="mission-location-action" type="button" onClick={onCenterRover}>Rover</button>}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
