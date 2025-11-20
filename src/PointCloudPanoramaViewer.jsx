import React, { useState } from 'react';
import './PointCloudPanoramaViewer.css';
import FileUploadPanel from './components/FileUploadPanel';
import SplitViewContainer from './components/SplitViewContainer';
import Toolbar from './components/Toolbar';
import LocationSidebar from './components/LocationSidebar';

export default function PointCloudPanoramaViewer() {
  // File data state
  const [pointCloudData, setPointCloudData] = useState(null);
  const [scanMetadata, setScanMetadata] = useState(null);
  const [panoramaBlobs, setPanoramaBlobs] = useState(new Map());

  // UI state
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Measurement state
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState([]);
  const [measurementResult, setMeasurementResult] = useState(null);

  // View state
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'pointcloud-only' | 'panorama-only'
  const [hotspotVisibility, setHotspotVisibility] = useState(true);

  // Loading/error state
  const [isLoading, setIsLoading] = useState(false);
  const [fileLoadingError, setFileLoadingError] = useState(null);

  // Handlers
  const handlePointCloudLoaded = (data) => {
    setPointCloudData(data);
    setFileLoadingError(null);
  };

  const handleMetadataLoaded = (metadata) => {
    setScanMetadata(metadata);
    // Auto-select first location
    if (metadata.scans && metadata.scans.length > 0) {
      setActiveLocationId(metadata.scans[0].id);
    }
    setFileLoadingError(null);
  };

  const handlePanoramasLoaded = (blobs) => {
    setPanoramaBlobs(blobs);
    setFileLoadingError(null);
  };

  const handleLocationSelect = (locationId) => {
    setActiveLocationId(locationId);
    // Clear measurement when switching locations (optional)
    // setMeasurementPoints([]);
    // setMeasurementResult(null);
  };

  const handleMeasurementToggle = () => {
    setMeasurementMode(!measurementMode);
    if (measurementMode) {
      // Turning off measurement mode - reset
      setMeasurementPoints([]);
      setMeasurementResult(null);
    }
  };

  const handleMeasurementReset = () => {
    setMeasurementPoints([]);
    setMeasurementResult(null);
  };

  const handleMeasurementPoint = (point) => {
    if (measurementPoints.length < 2) {
      const newPoints = [...measurementPoints, point];
      setMeasurementPoints(newPoints);

      // Calculate distance if we have 2 points
      if (newPoints.length === 2) {
        const distance = newPoints[0].distanceTo(newPoints[1]);
        setMeasurementResult({
          distance,
          startPoint: newPoints[0],
          endPoint: newPoints[1]
        });
      }
    }
  };

  const handleError = (error) => {
    setFileLoadingError(error);
    setIsLoading(false);
  };

  // Show viewer if we have point cloud and scan metadata (panoramas optional)
  const isFullyLoaded = pointCloudData && scanMetadata;

  // Log for debugging
  if (isFullyLoaded) {
    console.log('Viewer loaded:', {
      pointCount: pointCloudData?.pointCount,
      scanCount: scanMetadata?.scans?.length,
      panoramaCount: panoramaBlobs.size
    });
  }

  return (
    <div className="pcpv-root">
      <Toolbar
        measurementMode={measurementMode}
        onMeasurementToggle={handleMeasurementToggle}
        onMeasurementReset={handleMeasurementReset}
        measurementResult={measurementResult}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hotspotVisibility={hotspotVisibility}
        onHotspotVisibilityToggle={() => setHotspotVisibility(!hotspotVisibility)}
        isFullyLoaded={isFullyLoaded}
      />

      <div className="pcpv-main-content">
        {!isFullyLoaded && (
          <FileUploadPanel
            onPointCloudLoaded={handlePointCloudLoaded}
            onMetadataLoaded={handleMetadataLoaded}
            onPanoramasLoaded={handlePanoramasLoaded}
            onError={handleError}
            isLoading={isLoading}
            error={fileLoadingError}
          />
        )}

        {isFullyLoaded && (
          <>
            <LocationSidebar
              scans={scanMetadata?.scans || []}
              activeLocationId={activeLocationId}
              onLocationSelect={handleLocationSelect}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <SplitViewContainer
              pointCloudData={pointCloudData}
              scanMetadata={scanMetadata}
              panoramaBlobs={panoramaBlobs}
              activeLocationId={activeLocationId}
              onLocationSelect={handleLocationSelect}
              measurementMode={measurementMode}
              measurementPoints={measurementPoints}
              measurementResult={measurementResult}
              onMeasurementPoint={handleMeasurementPoint}
              viewMode={viewMode}
              hotspotVisibility={hotspotVisibility}
              sidebarCollapsed={sidebarCollapsed}
            />
          </>
        )}
      </div>
    </div>
  );
}
