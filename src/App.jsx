import { useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import IfcViewer from './IfcViewer';
import PointCloudPanoramaViewer from './PointCloudPanoramaViewer';

function App() {
  const [activeViewer, setActiveViewer] = useState(null); // null | 'ifc' | 'pointcloud'

  const handleSelectViewer = (viewerType) => {
    setActiveViewer(viewerType);
  };

  const handleBackToHome = () => {
    setActiveViewer(null);
  };

  return (
    <div className="App" style={{ height: '100vh', position: 'relative' }}>
      {activeViewer === null && (
        <LandingPage onSelectViewer={handleSelectViewer} />
      )}

      {activeViewer === 'ifc' && (
        <>
          <button className="back-button" onClick={handleBackToHome}>
            ← Back to Home
          </button>
          <IfcViewer />
        </>
      )}

      {activeViewer === 'pointcloud' && (
        <>
          <button className="back-button" onClick={handleBackToHome}>
            ← Back to Home
          </button>
          <PointCloudPanoramaViewer />
        </>
      )}
    </div>
  );
}

export default App;
