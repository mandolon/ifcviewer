import React from 'react';

export default function ControlPanel({
  status,
  modelInfo,
  errorMsg,
  wireframeMode,
  showGrid,
  showEdges,
  measureMode,
  measurePoints,
  measurementCount,
  inspectMode,
  sectionActive,
  annotations,
  elementProperties,
  layers,
  layerGroups,
  onFileSelect,
  onToggleWireframe,
  onResetCamera,
  onToggleGrid,
  onToggleEdges,
  onToggleMeasure,
  onToggleInspect,
  onToggleSection,
  onAdjustSection,
  onAddAnnotation,
  onRemoveAnnotation,
  onToggleLayer
}) {
  // Debug: log elementProperties
  console.log('ControlPanel received elementProperties:', elementProperties);
  
  return (
    <div className="control-panel">
      <div className="panel-header">
        <h2 className="panel-title">Controls</h2>
      </div>
      
      <div className="panel-content">
        {/* File Input */}
        <div className="panel-section">
          <label className="file-label">
            📁 Select IFC File
            <input type="file" accept=".ifc" onChange={onFileSelect} />
          </label>
        </div>
        
        {/* Model Info */}
        {modelInfo && (
          <div className="panel-section">
            <div className="model-info">
              <div className="info-row">
                <span className="info-label">Vertices:</span>
                <span className="info-value">{modelInfo.vertices.toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Faces:</span>
                <span className="info-value">{Math.floor(modelInfo.faces).toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Materials:</span>
                <span className="info-value">{modelInfo.materials}</span>
              </div>
            </div>
          </div>
        )}
        
        {errorMsg && (
          <div className="panel-section">
            <div className="error-msg">{errorMsg}</div>
          </div>
        )}

        {/* Element Properties */}
        {(elementProperties || (inspectMode && status === 'loaded')) && (
          <div className="panel-section">
            <h3 className="section-header">📋 Element Properties</h3>
            <div className="properties-container">
              {(() => {
                console.log('Rendering properties panel, elementProperties:', elementProperties);
                
                // If no properties but in inspect mode, show instruction
                if (!elementProperties && inspectMode) {
                  return <div className="info-row">Click on an element in the model to view its properties</div>;
                }
                
                if (!elementProperties) {
                  return null;
                }
                // Helper to extract value from property object
                const getValue = (prop) => {
                  if (prop === null || prop === undefined) return null;
                  if (typeof prop === 'object') {
                    if (prop.value !== undefined) return prop.value;
                    if (prop.type !== undefined) return prop.type;
                    // If it's an array, join it
                    if (Array.isArray(prop)) return prop.join(', ');
                    // If it's an object with nested properties, try to stringify
                    if (Object.keys(prop).length > 0) {
                      return JSON.stringify(prop, null, 2);
                    }
                  }
                  return prop;
                };

                const renderProperty = (key, value) => {
                  const displayValue = getValue(value);
                  if (displayValue === null || displayValue === undefined || displayValue === '') return null;
                  
                  // Special formatting for faceAreaFormatted
                  const label = key === 'faceAreaFormatted' ? 'Face Area' : key;
                  
                  return (
                    <div key={key} className="info-row">
                      <span className="info-label">{label}:</span>
                      <span className="info-value">{String(displayValue)}</span>
                    </div>
                  );
                };

                // Check for error message
                if (elementProperties.error) {
                  return <div className="info-row" style={{color: '#d32f2f'}}>{elementProperties.error}</div>;
                }

                // Check if properties object has any keys
                const keys = Object.keys(elementProperties);
                if (keys.length === 0) {
                  return <div className="info-row">No properties available</div>;
                }

                // Priority properties to show first (faceArea first since it's the clicked face)
                const priorityKeys = ['faceAreaFormatted', 'faceArea', 'type', 'expressID', 'area', 'areaMeters', 'meshCount', 'Name', 'GlobalId', 'Tag', 'ObjectType', 'Description', 'vertices', 'faces'];
                const otherKeys = keys.filter(k => !priorityKeys.includes(k) && k !== 'error');
                
                const priorityProps = priorityKeys
                  .filter(key => elementProperties[key] !== undefined)
                  .map(key => renderProperty(key, elementProperties[key]))
                  .filter(Boolean);
                
                const otherProps = otherKeys
                  .map(key => renderProperty(key, elementProperties[key]))
                  .filter(Boolean);
                
                if (priorityProps.length === 0 && otherProps.length === 0) {
                  return <div className="info-row">No displayable properties found. Check console for details.</div>;
                }
                
                return (
                  <>
                    {priorityProps}
                    {otherProps}
                  </>
                );
              })()}
            </div>
          </div>
        )}
        
        {status === 'loaded' && (
          <>
            {/* View Controls */}
            <div className="panel-section">
              <h3 className="section-header">View</h3>
              <div className="button-group">
                <button className="panel-button" onClick={onToggleWireframe} title="Toggle wireframe (W)">
                  {wireframeMode ? '🔲 Solid' : '⬜ Wireframe'}
                </button>
                <button className="panel-button" onClick={onResetCamera} title="Reset camera view (R)">
                  🎯 Reset View
                </button>
                <button className="panel-button" onClick={onToggleGrid} title="Toggle grid (G)">
                  {showGrid ? '✓ Grid' : '✗ Grid'}
                </button>
                <button className="panel-button" onClick={onToggleEdges} title="Toggle edges">
                  {showEdges ? '✓ Edges' : 'Edges'}
                </button>
              </div>
            </div>

            {/* Inspect Tool */}
            <div className="panel-section">
              <h3 className="section-header">🔍 Inspect</h3>
              <button
                className={`panel-button ${inspectMode ? 'active' : ''}`}
                onClick={onToggleInspect}
                title="Inspect tool - Click elements to view properties"
              >
                {inspectMode ? '✓ Inspect Active' : 'Inspect Element'}
              </button>
            </div>

            {/* Layers */}
            {layers && layers.length > 0 && (
              <div className="panel-section">
                <h3 className="section-header">🏗️ Layers</h3>
                <div className="layers-container">
                  {/* Building Storeys */}
                  {layerGroups?.storeys && layerGroups.storeys.length > 0 && (
                    <div className="layer-group">
                      <h4 className="layer-group-title">Building Storeys</h4>
                      {layerGroups.storeys.map(storey => (
                        <div key={storey.id} className="layer-item">
                          <label className="layer-checkbox">
                            <input
                              type="checkbox"
                              checked={storey.visible}
                              onChange={() => onToggleLayer(storey.id)}
                            />
                            <span>{storey.name}</span>
                            {storey.elevation !== undefined && (
                              <span className="layer-meta">({storey.elevation.toFixed(2)}m)</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Element Types */}
                  {layerGroups?.types && Object.keys(layerGroups.types).length > 0 && (
                    <div className="layer-group">
                      <h4 className="layer-group-title">Element Types</h4>
                      {Object.values(layerGroups.types).map(typeLayer => (
                        <div key={typeLayer.id} className="layer-item">
                          <label className="layer-checkbox">
                            <input
                              type="checkbox"
                              checked={typeLayer.visible}
                              onChange={() => onToggleLayer(typeLayer.id)}
                            />
                            <span>{typeLayer.name}</span>
                            <span className="layer-meta">({typeLayer.elementCount})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="panel-footer">
        <div className="ifc-hint">🖱️ Drag to rotate • 🖱️ Scroll to zoom • Right-click to pan</div>
      </div>
    </div>
  );
}

