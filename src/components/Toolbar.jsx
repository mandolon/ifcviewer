import React from 'react';
import './Toolbar.css';

export default function Toolbar({
  measurementMode,
  onMeasurementToggle,
  onMeasurementReset,
  measurementResult,
  viewMode,
  onViewModeChange,
  hotspotVisibility,
  onHotspotVisibilityToggle,
  isFullyLoaded
}) {
  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${(distance * 100).toFixed(2)} cm`;
    }
    return `${distance.toFixed(3)} m`;
  };

  return (
    <div className="toolbar">
      <div className="toolbar-section toolbar-left">
        <h2 className="toolbar-title">Point Cloud + Panorama Viewer</h2>
      </div>

      {isFullyLoaded && (
        <>
          <div className="toolbar-section toolbar-center">
            {/* View Mode Selector */}
            <div className="toolbar-group">
              <label className="toolbar-label">View:</label>
              <div className="button-group">
                <button
                  className={`toolbar-button ${viewMode === 'split' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('split')}
                  title="Split View"
                >
                  <span className="icon">⚌</span> Split
                </button>
                <button
                  className={`toolbar-button ${viewMode === 'pointcloud-only' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('pointcloud-only')}
                  title="Point Cloud Only"
                >
                  <span className="icon">•</span> Cloud
                </button>
                <button
                  className={`toolbar-button ${viewMode === 'panorama-only' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('panorama-only')}
                  title="Panorama Only"
                >
                  <span className="icon">◐</span> Pano
                </button>
              </div>
            </div>

            {/* Measurement Controls */}
            <div className="toolbar-group">
              <label className="toolbar-label">Measure:</label>
              <button
                className={`toolbar-button measurement-toggle ${measurementMode ? 'active' : ''}`}
                onClick={onMeasurementToggle}
                title={measurementMode ? 'Stop Measuring' : 'Start Measuring'}
              >
                <span className="icon">📏</span>
                {measurementMode ? 'ON' : 'OFF'}
              </button>
              {measurementResult && (
                <button
                  className="toolbar-button"
                  onClick={onMeasurementReset}
                  title="Clear Measurement"
                >
                  <span className="icon">✕</span> Clear
                </button>
              )}
            </div>

            {/* Measurement Result */}
            {measurementResult && (
              <div className="measurement-result">
                <span className="measurement-label">Distance:</span>
                <span className="measurement-value">
                  {formatDistance(measurementResult.distance)}
                </span>
              </div>
            )}
          </div>

          <div className="toolbar-section toolbar-right">
            {/* Hotspot Visibility Toggle */}
            <button
              className={`toolbar-button icon-button ${hotspotVisibility ? 'active' : ''}`}
              onClick={onHotspotVisibilityToggle}
              title={hotspotVisibility ? 'Hide Hotspots' : 'Show Hotspots'}
            >
              <span className="icon">{hotspotVisibility ? '👁' : '👁‍🗨'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
