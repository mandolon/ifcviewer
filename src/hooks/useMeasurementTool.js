import { useState, useRef, useCallback } from 'react';
import { formatDistance, createDimensionTexture } from '../utils/measurementUtils';

/**
 * Custom hook for measurement tool functionality
 * Handles creating, displaying, dragging, and managing measurements
 */
export function useMeasurementTool({
  threeRef,
  sceneRef,
  cameraRef,
  controlsRef,
  raycasterRef,
  mouseRef,
  currentModelRef
}) {
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [measurementCount, setMeasurementCount] = useState(0);
  
  const measurementsRef = useRef([]);
  const hoverIndicatorRef = useRef(null);
  const tempFirstPointMarkerRef = useRef(null);
  const hoveredSphereRef = useRef(null);
  const draggedSphereRef = useRef(null);
  const draggedMeasurementRef = useRef(null);
  const isDraggingRef = useRef(false);
  const justFinishedDraggingRef = useRef(false);

  function createMeasurement(point1, point2) {
    const THREE = threeRef.current;
    const scene = sceneRef.current;
    if (!THREE || !scene) return null;

    // Create sphere markers at both points (semi-transparent black)
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      transparent: true,
      opacity: 0.6
    });
    
    const marker1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      sphereMaterial.clone()
    );
    marker1.position.copy(point1);
    marker1.userData.isMeasurementMarker = true;
    marker1.userData.markerIndex = 1;
    scene.add(marker1);
    
    const marker2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 16),
      sphereMaterial.clone()
    );
    marker2.position.copy(point2);
    marker2.userData.isMeasurementMarker = true;
    marker2.userData.markerIndex = 2;
    scene.add(marker2);

    // Create line between points
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([point1, point2]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);

    // Calculate distance and format
    const distanceMeters = point1.distanceTo(point2);
    const dimensionText = formatDistance(distanceMeters);

    // Create text sprite for dimension
    const texture = createDimensionTexture(dimensionText, THREE);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    // Position sprite at midpoint between points
    const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    sprite.position.copy(midpoint);
    sprite.position.y += 0.3;
    sprite.scale.set(1, 0.25, 1);
    scene.add(sprite);
    
    // Return measurement object
    const measurement = {
      id: Date.now(),
      marker1,
      marker2,
      line,
      sprite,
      text: dimensionText,
      distance: distanceMeters
    };
    
    // Store reference to measurement in markers
    marker1.userData.measurement = measurement;
    marker2.userData.measurement = measurement;
    
    return measurement;
  }
  
  function updateMeasurementVisuals(measurement) {
    const THREE = threeRef.current;
    if (!THREE || !measurement) return;
    
    const point1 = measurement.marker1.position;
    const point2 = measurement.marker2.position;
    
    // Update line geometry
    measurement.line.geometry.dispose();
    measurement.line.geometry = new THREE.BufferGeometry().setFromPoints([point1, point2]);
    
    // Calculate new distance
    const distanceMeters = point1.distanceTo(point2);
    const dimensionText = formatDistance(distanceMeters);
    
    // Update sprite texture
    measurement.sprite.material.map.dispose();
    const texture = createDimensionTexture(dimensionText, THREE);
    measurement.sprite.material.map = texture;
    measurement.sprite.material.needsUpdate = true;
    
    // Update sprite position
    const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    measurement.sprite.position.copy(midpoint);
    measurement.sprite.position.y += 0.3;
    
    // Update measurement data
    measurement.text = dimensionText;
    measurement.distance = distanceMeters;
  }

  function clearMeasurementVisuals() {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove all measurements
    measurementsRef.current.forEach(measurement => {
      scene.remove(measurement.marker1);
      scene.remove(measurement.marker2);
      measurement.marker1.geometry.dispose();
      measurement.marker2.geometry.dispose();
      measurement.marker1.material.dispose();
      measurement.marker2.material.dispose();
      
      scene.remove(measurement.line);
      measurement.line.geometry.dispose();
      measurement.line.material.dispose();
      
      scene.remove(measurement.sprite);
      measurement.sprite.material.map.dispose();
      measurement.sprite.material.dispose();
    });
    
    measurementsRef.current = [];
    setMeasurementCount(0);
    
    // Remove temporary first point marker
    if (tempFirstPointMarkerRef.current) {
      scene.remove(tempFirstPointMarkerRef.current);
      tempFirstPointMarkerRef.current.geometry.dispose();
      tempFirstPointMarkerRef.current.material.dispose();
      tempFirstPointMarkerRef.current = null;
    }
    
    // Remove hover indicator
    if (hoverIndicatorRef.current) {
      scene.remove(hoverIndicatorRef.current);
      hoverIndicatorRef.current.geometry.dispose();
      hoverIndicatorRef.current.material.dispose();
      hoverIndicatorRef.current = null;
    }
  }

  const updateHoverIndicator = useCallback((event) => {
    const THREE = threeRef.current;
    const raycaster = raycasterRef.current;
    const mouse = mouseRef.current;
    const camera = cameraRef.current;
    const model = currentModelRef.current;
    const scene = sceneRef.current;
    
    if (!THREE || !raycaster || !mouse || !camera || !scene) {
      return;
    }
    
    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check for hovering over measurement spheres first
    let hoveredSphere = null;
    const allSpheres = [];
    measurementsRef.current.forEach(measurement => {
      allSpheres.push(measurement.marker1, measurement.marker2);
    });
    
    if (allSpheres.length > 0) {
      const sphereIntersects = raycaster.intersectObjects(allSpheres, false);
      if (sphereIntersects.length > 0) {
        hoveredSphere = sphereIntersects[0].object;
      }
    }
    
    // Update hovered sphere color
    if (hoveredSphere !== hoveredSphereRef.current) {
      if (hoveredSphereRef.current) {
        hoveredSphereRef.current.material.color.setHex(0x000000);
        hoveredSphereRef.current.material.opacity = 0.6;
      }
      
      if (hoveredSphere) {
        hoveredSphere.material.color.setHex(0x2196f3);
        hoveredSphere.material.opacity = 0.7;
      }
      
      hoveredSphereRef.current = hoveredSphere;
    }
    
    // Only show hover indicator in measure mode when not hovering over spheres
    if (!measureMode) {
      if (hoverIndicatorRef.current) {
        if (hoverIndicatorRef.current.parent === scene) {
          scene.remove(hoverIndicatorRef.current);
          hoverIndicatorRef.current.geometry.dispose();
          hoverIndicatorRef.current.material.dispose();
        }
        hoverIndicatorRef.current = null;
      }
      return;
    }
    
    if (!model) {
      return;
    }
    
    // Check for model intersection (for hover indicator)
    if (!hoveredSphere) {
      const intersects = raycaster.intersectObject(model, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        
        if (!hoverIndicatorRef.current) {
          const geometry = new THREE.SphereGeometry(0.04, 16, 16);
          const material = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.3
          });
          const sphere = new THREE.Mesh(geometry, material);
          hoverIndicatorRef.current = sphere;
          scene.add(sphere);
        }
        
        hoverIndicatorRef.current.position.copy(point);
        hoverIndicatorRef.current.visible = true;
      } else {
        if (hoverIndicatorRef.current) {
          hoverIndicatorRef.current.visible = false;
        }
      }
    } else {
      if (hoverIndicatorRef.current) {
        hoverIndicatorRef.current.visible = false;
      }
    }
  }, [measureMode, currentModelRef]);

  const handleCanvasMouseDown = useCallback((event) => {
    if (isDraggingRef.current) return;
    
    const THREE = threeRef.current;
    const raycaster = raycasterRef.current;
    const mouse = mouseRef.current;
    const camera = cameraRef.current;
    
    if (!THREE || !raycaster || !mouse || !camera) {
      return;
    }
    
    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check if clicking on a measurement sphere
    const allSpheres = [];
    measurementsRef.current.forEach(measurement => {
      allSpheres.push(measurement.marker1, measurement.marker2);
    });
    
    if (allSpheres.length > 0) {
      const sphereIntersects = raycaster.intersectObjects(allSpheres, false);
      if (sphereIntersects.length > 0) {
        const clickedSphere = sphereIntersects[0].object;
        draggedSphereRef.current = clickedSphere;
        draggedMeasurementRef.current = clickedSphere.userData.measurement;
        isDraggingRef.current = true;
        
        // Disable camera controls while dragging
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
        
        clickedSphere.material.color.setHex(0x2196f3);
        clickedSphere.material.opacity = 0.7;
        event.preventDefault();
        return;
      }
    }
  }, [controlsRef]);
  
  const handleCanvasMouseMove = useCallback((event) => {
    if (!isDraggingRef.current || !draggedSphereRef.current) {
      updateHoverIndicator(event);
      return;
    }
    
    // Handle dragging
    const THREE = threeRef.current;
    const raycaster = raycasterRef.current;
    const mouse = mouseRef.current;
    const camera = cameraRef.current;
    const model = currentModelRef.current;
    
    if (!THREE || !raycaster || !mouse || !camera || !model) {
      return;
    }
    
    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(model, true);
    
    if (intersects.length > 0) {
      const newPoint = intersects[0].point;
      draggedSphereRef.current.position.copy(newPoint);
      
      if (draggedMeasurementRef.current) {
        updateMeasurementVisuals(draggedMeasurementRef.current);
      }
    }
  }, [updateHoverIndicator, currentModelRef]);
  
  const handleCanvasMouseUp = useCallback((event) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      justFinishedDraggingRef.current = true;
      
      // Re-enable camera controls after dragging
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      
      // Reset sphere color when done dragging
      if (draggedSphereRef.current) {
        draggedSphereRef.current.material.color.setHex(0x000000);
        draggedSphereRef.current.material.opacity = 0.6;
      }
      draggedSphereRef.current = null;
      draggedMeasurementRef.current = null;
      
      setTimeout(() => {
        justFinishedDraggingRef.current = false;
      }, 100);
    }
  }, [controlsRef]);
  
  const handleCanvasClick = useCallback((event) => {
    if (!measureMode || isDraggingRef.current || justFinishedDraggingRef.current) return;
    
    const THREE = threeRef.current;
    const raycaster = raycasterRef.current;
    const mouse = mouseRef.current;
    const camera = cameraRef.current;
    const model = currentModelRef.current;
    
    if (!THREE || !raycaster || !mouse || !camera || !model) {
      return;
    }
    
    const rect = event.target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(model, true);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const newPoints = [...measurePoints, point];
      const scene = sceneRef.current;
      
      if (newPoints.length === 2) {
        // Remove temporary first point marker
        if (tempFirstPointMarkerRef.current && scene) {
          scene.remove(tempFirstPointMarkerRef.current);
          tempFirstPointMarkerRef.current.geometry.dispose();
          tempFirstPointMarkerRef.current.material.dispose();
          tempFirstPointMarkerRef.current = null;
        }
        
        // Create a new measurement with both points
        const measurement = createMeasurement(newPoints[0], newPoints[1]);
        if (measurement) {
          measurementsRef.current.push(measurement);
          setMeasurementCount(measurementsRef.current.length);
          const dimensionText = formatDistance(measurement.distance);
          console.log(`Distance: ${dimensionText} (Measurement #${measurementsRef.current.length})`);
        }
        
        setMeasurePoints([]);
      } else {
        // First point clicked - show temporary sphere
        setMeasurePoints(newPoints);
        
        if (THREE && scene) {
          if (tempFirstPointMarkerRef.current) {
            scene.remove(tempFirstPointMarkerRef.current);
            tempFirstPointMarkerRef.current.geometry.dispose();
            tempFirstPointMarkerRef.current.material.dispose();
          }
          
          const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.6
          });
          const tempMarker = new THREE.Mesh(sphereGeometry, sphereMaterial);
          tempMarker.position.copy(point);
          scene.add(tempMarker);
          tempFirstPointMarkerRef.current = tempMarker;
        }
        
        console.log('First point selected, click another point');
      }
    }
  }, [measureMode, measurePoints]);

  function toggleMeasure() {
    const newMode = !measureMode;
    setMeasureMode(newMode);
    setMeasurePoints([]);
    if (newMode) {
      clearMeasurementVisuals();
      console.log('Measure mode activated - click two points on the model');
    } else {
      clearMeasurementVisuals();
      const scene = sceneRef.current;
      if (hoverIndicatorRef.current && scene) {
        scene.remove(hoverIndicatorRef.current);
        hoverIndicatorRef.current.geometry.dispose();
        hoverIndicatorRef.current.material.dispose();
        hoverIndicatorRef.current = null;
      }
      console.log('Measure mode deactivated');
    }
  }

  return {
    measureMode,
    measurePoints,
    measurementCount,
    toggleMeasure,
    clearMeasurementVisuals,
    handleCanvasClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    updateHoverIndicator
  };
}

