import React from 'react';
import './LocationSidebar.css';

export default function LocationSidebar({
  scans,
  activeLocationId,
  onLocationSelect,
  collapsed,
  onToggleCollapse
}) {
  const totalScans = scans.length;

  const getOrdinal = (index) => {
    return index + 1;
  };

  return (
    <div className={`location-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? '→' : '←'}
      </button>

      {!collapsed && (
        <>
          <div className="sidebar-header">
            <h3 className="sidebar-title">Scan Locations</h3>
            <div className="sidebar-count">{totalScans} locations</div>
          </div>

          <div className="sidebar-content">
            {scans.map((scan, index) => {
              const isActive = scan.id === activeLocationId;
              const ordinal = getOrdinal(index);

              return (
                <div
                  key={scan.id}
                  className={`location-item ${isActive ? 'active' : ''}`}
                  onClick={() => onLocationSelect(scan.id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onLocationSelect(scan.id);
                    }
                  }}
                >
                  <div className="location-ordinal">{ordinal}</div>
                  <div className="location-info">
                    <div className="location-name">{scan.name}</div>
                    <div className="location-id">ID: {scan.id}</div>
                    {scan.position && (
                      <div className="location-position">
                        [{scan.position[0].toFixed(2)}, {scan.position[1].toFixed(2)}, {scan.position[2].toFixed(2)}]
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div className="location-active-indicator">
                      <span className="indicator-dot"></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <div className="sidebar-hint">
              Click a location to view its panorama
            </div>
          </div>
        </>
      )}
    </div>
  );
}
