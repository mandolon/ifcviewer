import React from 'react';
import './LandingPage.css';

export default function LandingPage({ onSelectViewer }) {
  return (
    <div className="landing-page">
      <div className="landing-container">
        <header className="landing-header">
          <h1 className="landing-title">3D Viewer Suite</h1>
          <p className="landing-subtitle">
            Professional tools for viewing BIM models and point cloud data
          </p>
        </header>

        <div className="viewer-cards">
          {/* IFC Viewer Card */}
          <div className="viewer-card" onClick={() => onSelectViewer('ifc')}>
            <div className="card-icon">🏗️</div>
            <h2 className="card-title">IFC Viewer</h2>
            <p className="card-description">
              View Building Information Models (BIM) in IFC format. Explore architectural designs, structural elements, and building components in 3D.
            </p>
            <ul className="card-features">
              <li>Load IFC files (Industry Foundation Classes)</li>
              <li>3D navigation and inspection</li>
              <li>Building element visualization</li>
              <li>Architectural model viewing</li>
            </ul>
            <button className="card-button">
              Open IFC Viewer
            </button>
          </div>

          {/* Point Cloud Panorama Viewer Card */}
          <div className="viewer-card featured" onClick={() => onSelectViewer('pointcloud')}>
            <div className="card-badge">New</div>
            <div className="card-icon">📸</div>
            <h2 className="card-title">Point Cloud + Panorama Viewer</h2>
            <p className="card-description">
              View LiDAR point clouds and 360° panoramic images from Leica BLK360 scanners. Navigate scan locations and measure distances in 3D space.
            </p>
            <ul className="card-features">
              <li>Load E57 files (point clouds + images)</li>
              <li>360° panoramic image viewing</li>
              <li>Interactive scan location hotspots</li>
              <li>3D distance measurement tool</li>
              <li>Split view (point cloud + panorama)</li>
            </ul>
            <button className="card-button primary">
              Open Point Cloud Viewer
            </button>
          </div>
        </div>

        <footer className="landing-footer">
          <p className="footer-text">
            <strong>IFC Viewer:</strong> Best for architectural BIM models exported from Revit, ArchiCAD, or similar software.
          </p>
          <p className="footer-text">
            <strong>Point Cloud Viewer:</strong> Best for reality capture data from laser scanners like Leica BLK360.
          </p>
        </footer>
      </div>
    </div>
  );
}
