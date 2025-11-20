import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for section/clipping tool functionality
 */
export function useSectionTool({ rendererRef, threeRef, onToggle }) {
  const [sectionActive, setSectionActive] = useState(false);
  const clippingPlaneRef = useRef(null);

  const toggleSection = useCallback(() => {
    const renderer = rendererRef.current;
    const THREE = threeRef.current;
    
    if (!renderer || !THREE) {
      return;
    }
    
    setSectionActive(prev => {
      const newSectionActive = !prev;
      
      // Notify parent to disable other tools if needed
      if (onToggle && newSectionActive) {
        onToggle();
      }
      
      if (newSectionActive) {
        if (!clippingPlaneRef.current) {
          const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
          clippingPlaneRef.current = plane;
          console.log('Created new clipping plane');
        }
        renderer.clippingPlanes = [clippingPlaneRef.current];
        renderer.localClippingEnabled = true;
        console.log('Section cut enabled');
      } else {
        renderer.clippingPlanes = [];
        renderer.localClippingEnabled = false;
        console.log('Section cut disabled');
      }
      
      return newSectionActive;
    });
  }, [rendererRef, threeRef, onToggle]);
  
  const adjustSection = useCallback((value) => {
    if (clippingPlaneRef.current) {
      clippingPlaneRef.current.constant = parseFloat(value);
    }
  }, []);

  return {
    sectionActive,
    toggleSection,
    adjustSection,
    clippingPlaneRef
  };
}

