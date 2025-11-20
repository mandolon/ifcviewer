import React, { useRef, useEffect, useState } from 'react';
import './PanoramaView.css';
import 'pannellum/build/pannellum.css';
import * as pannellumModule from 'pannellum';

// Extract pannellum from the module
const pannellum = pannellumModule.default || pannellumModule.pannellum || pannellumModule;

export default function PanoramaView({
  panoramaBlob,
  location,
  totalLocations,
  currentIndex
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const imageUrlRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize/update panorama viewer
  useEffect(() => {
    console.log('PanoramaView effect running', {
      hasContainer: !!containerRef.current,
      hasPannellum: !!pannellum,
      hasBlob: !!panoramaBlob,
      pannellumType: typeof pannellum
    });

    if (!containerRef.current || !pannellum || !panoramaBlob) {
      if (!pannellum) {
        setError('Pannellum library not loaded');
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    // Clean up previous viewer
    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying viewer:', e);
      }
      viewerRef.current = null;
    }

    // Clean up previous image URL
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }

    // Create new image URL from blob
    const imageUrl = URL.createObjectURL(panoramaBlob);
    imageUrlRef.current = imageUrl;
    console.log('Created blob URL:', imageUrl);

    // Calculate initial yaw from compass heading
    let initialYaw = 0;
    if (location && location.compassHeading !== undefined) {
      // Convert compass heading to panorama yaw
      // Compass: 0° = North, 90° = East, 180° = South, 270° = West
      // Pannellum yaw: 0° = forward, positive = clockwise
      initialYaw = location.compassHeading;
    }

    // Initialize Pannellum viewer
    try {
      console.log('Initializing Pannellum viewer...', {
        viewerFunction: typeof pannellum.viewer,
        imageUrl
      });

      if (typeof pannellum.viewer !== 'function') {
        throw new Error(`Pannellum.viewer is not a function (type: ${typeof pannellum.viewer}). Module structure: ${Object.keys(pannellum).join(', ')}`);
      }

      const viewer = pannellum.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: imageUrl,
        autoLoad: true,
        showControls: true,
        showFullscreenCtrl: true,
        showZoomCtrl: true,
        mouseZoom: true,
        draggable: true,
        hfov: 90, // Horizontal field of view
        pitch: 0, // Look straight ahead
        yaw: initialYaw,
        minHfov: 50,
        maxHfov: 120,
        hotSpotDebug: false,
        onLoad: () => {
          console.log('Pannellum loaded successfully');
          setIsLoading(false);
        },
        onError: (err) => {
          console.error('Pannellum error:', err);
          setError('Failed to load panorama image');
          setIsLoading(false);
        }
      });

      viewerRef.current = viewer;
      console.log('Pannellum viewer created');
    } catch (err) {
      console.error('Error initializing Pannellum:', err);
      setError(`Failed to initialize panorama viewer: ${err.message}`);
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying viewer:', e);
        }
        viewerRef.current = null;
      }
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, [panoramaBlob, location]);

  if (!panoramaBlob) {
    return (
      <div className="panorama-view">
        <div className="panorama-placeholder">
          <div className="placeholder-icon">◐</div>
          <div className="placeholder-text">
            {location
              ? 'No panorama image available for this location'
              : 'Select a scan location to view panorama'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panorama-view">
      {location && (
        <div className="panorama-info">
          <div className="info-header">
            <h3 className="location-name">{location.name}</h3>
            <div className="location-ordinal">
              Scan {currentIndex + 1} of {totalLocations}
            </div>
          </div>
          <div className="info-details">
            <div className="detail-item">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{location.id}</span>
            </div>
            {location.position && (
              <div className="detail-item">
                <span className="detail-label">Position:</span>
                <span className="detail-value">
                  [{location.position[0].toFixed(2)}, {location.position[1].toFixed(2)}, {location.position[2].toFixed(2)}]
                </span>
              </div>
            )}
            {location.compassHeading !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Heading:</span>
                <span className="detail-value">{location.compassHeading}°</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="panorama-container"
        style={{ width: '100%', height: '100%' }}
      />

      {isLoading && (
        <div className="panorama-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading panorama...</div>
        </div>
      )}

      {error && (
        <div className="panorama-error">
          <div className="error-icon">⚠</div>
          <div className="error-text">{error}</div>
        </div>
      )}

      <div className="panorama-hint">
        Drag to pan • Scroll to zoom • Double-click to reset
      </div>
    </div>
  );
}
