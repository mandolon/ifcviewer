import React from 'react';
import './SplitViewContainer.css';
import PointCloudView from './PointCloudView';
import PanoramaView from './PanoramaView';

export default function SplitViewContainer({
  pointCloudData,
  scanMetadata,
  panoramaBlobs,
  activeLocationId,
  onLocationSelect,
  measurementMode,
  measurementPoints,
  measurementResult,
  onMeasurementPoint,
  viewMode,
  hotspotVisibility,
  sidebarCollapsed
}) {
  const activeLocation = scanMetadata?.scans?.find(
    scan => scan.id === activeLocationId
  );

  const activePanoramaBlob = activeLocation
    ? panoramaBlobs.get(activeLocation.imageFile) || panoramaBlobs.get(activeLocationId)
    : null;

  return (
    <div className={`split-view-container ${viewMode} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {(viewMode === 'split' || viewMode === 'pointcloud-only') && (
        <div className="view-panel pointcloud-panel">
          <PointCloudView
            pointCloudData={pointCloudData}
            scanMetadata={scanMetadata}
            activeLocationId={activeLocationId}
            onLocationSelect={onLocationSelect}
            measurementMode={measurementMode}
            measurementPoints={measurementPoints}
            measurementResult={measurementResult}
            onMeasurementPoint={onMeasurementPoint}
            hotspotVisibility={hotspotVisibility}
          />
        </div>
      )}

      {(viewMode === 'split' || viewMode === 'panorama-only') && (
        <div className="view-panel panorama-panel">
          <PanoramaView
            panoramaBlob={activePanoramaBlob}
            location={activeLocation}
            totalLocations={scanMetadata?.scans?.length || 0}
            currentIndex={
              scanMetadata?.scans?.findIndex(s => s.id === activeLocationId) ?? -1
            }
          />
        </div>
      )}
    </div>
  );
}
