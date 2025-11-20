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

  // Require point cloud and scan metadata - panoramas optional for diagnostic viewing
  const hasMinimumData = pointCloudData && scanMetadata;
  const hasPanoramas = panoramaBlobs.size > 0;
  const isFullyLoaded = hasMinimumData && hasPanoramas;

  // Auto-switch to point cloud only mode when no panoramas
  React.useEffect(() => {
    if (hasMinimumData && !hasPanoramas && viewMode !== 'pointcloud-only') {
      console.log('📍 No panoramas available - switching to point cloud only view');
      setViewMode('pointcloud-only');
    }
  }, [hasMinimumData, hasPanoramas, viewMode]);

  // Debug logging - always log state
  console.log('Loading state:', {
    hasPointCloud: !!pointCloudData,
    pointCount: pointCloudData?.pointCount,
    hasScanMetadata: !!scanMetadata,
    scanCount: scanMetadata?.scans?.length,
    hasPanoramas: panoramaBlobs.size > 0,
    panoramaCount: panoramaBlobs.size,
    hasMinimumData,
    isFullyLoaded
  });

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
        hasPanoramas={hasPanoramas}
      />

      <div className="pcpv-main-content">
        {!hasMinimumData && (
          <FileUploadPanel
            onPointCloudLoaded={handlePointCloudLoaded}
            onMetadataLoaded={handleMetadataLoaded}
            onPanoramasLoaded={handlePanoramasLoaded}
            onError={handleError}
            isLoading={isLoading}
            error={fileLoadingError}
          />
        )}

        {hasMinimumData && (
          <>
            {/* Warning banner when panoramas are missing */}
            {!hasPanoramas && (
              <div style={{
                position: 'absolute',
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                background: '#ff9800',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                maxWidth: '600px',
                textAlign: 'center'
              }}>
                ⚠️ <strong>No Panoramic Images Found</strong> - This E57 file contains point cloud data but no panoramic images.
                Viewing point cloud only. Check server terminal for detailed extraction logs.
              </div>
            )}

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
