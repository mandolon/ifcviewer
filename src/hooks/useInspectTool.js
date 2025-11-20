import { useState, useCallback, useRef } from 'react';
import { getElementInfo } from '../utils/ifcUtils';

/**
 * Custom hook for element inspection tool
 */
export function useInspectTool() {
  const [inspectMode, setInspectMode] = useState(false);
  const [elementProperties, setElementProperties] = useState(null);
  const highlightMeshRef = useRef(null); // Store the highlight mesh
  const sceneRef = useRef(null); // Store scene reference for cleanup

  /**
   * Clear face highlight
   */
  const clearHighlights = useCallback(() => {
    if (highlightMeshRef.current && sceneRef.current) {
      sceneRef.current.remove(highlightMeshRef.current);
      highlightMeshRef.current.geometry.dispose();
      highlightMeshRef.current.material.dispose();
      highlightMeshRef.current = null;
    }
  }, []);

  const toggleInspect = useCallback(() => {
    setInspectMode(prev => {
      const newMode = !prev;
      if (!newMode) {
        // Clear highlights when turning off inspect mode
        clearHighlights();
        setElementProperties(null);
      }
      return newMode;
    });
  }, [clearHighlights]);

  /**
   * Highlight a single face from intersection
   */
  const highlightFace = useCallback((intersect, scene, threeRef) => {
    if (!inspectMode || !intersect || !scene || !threeRef) {
      clearHighlights();
      return;
    }

    const THREE = threeRef.current;
    if (!THREE) return;

    // Store scene reference
    sceneRef.current = scene;

    // Check if we're hovering over an edge - skip edges
    if (intersect.object.userData?.isEdge) {
      clearHighlights();
      return;
    }

    // Get face data from intersection
    const face = intersect.face;
    const faceIndex = intersect.faceIndex;
    const mesh = intersect.object;

    if (!face || faceIndex === undefined || !mesh.isMesh) {
      clearHighlights();
      return;
    }

    // Get geometry data
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    const index = geometry.index;

    if (!positions || !index) {
      clearHighlights();
      return;
    }

    // Get the three vertices of the face
    const a = index.getX(faceIndex * 3);
    const b = index.getX(faceIndex * 3 + 1);
    const c = index.getX(faceIndex * 3 + 2);

    // Get vertex positions
    const v1 = new THREE.Vector3(
      positions.getX(a), positions.getY(a), positions.getZ(a)
    );
    const v2 = new THREE.Vector3(
      positions.getX(b), positions.getY(b), positions.getZ(b)
    );
    const v3 = new THREE.Vector3(
      positions.getX(c), positions.getY(c), positions.getZ(c)
    );

    // Apply mesh world matrix to vertices
    mesh.updateMatrixWorld();
    v1.applyMatrix4(mesh.matrixWorld);
    v2.applyMatrix4(mesh.matrixWorld);
    v3.applyMatrix4(mesh.matrixWorld);

    // Create vertices array for the face (in world space)
    const vertices = new Float32Array([
      v1.x, v1.y, v1.z,
      v2.x, v2.y, v2.z,
      v3.x, v3.y, v3.z
    ]);

    // Create geometry for just this face
    const faceGeometry = new THREE.BufferGeometry();
    faceGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    faceGeometry.setIndex([0, 1, 2]);

    // Create highlight material
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Create highlight mesh at world origin (vertices are already in world space)
    const highlightMesh = new THREE.Mesh(faceGeometry, highlightMaterial);
    
    // Calculate face normal for slight offset to avoid z-fighting
    const normal = new THREE.Vector3();
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    normal.crossVectors(edge1, edge2).normalize();
    
    // Offset the face slightly along its normal
    const offset = 0.001;
    const offsetVertices = new Float32Array([
      v1.x + normal.x * offset, v1.y + normal.y * offset, v1.z + normal.z * offset,
      v2.x + normal.x * offset, v2.y + normal.y * offset, v2.z + normal.z * offset,
      v3.x + normal.x * offset, v3.y + normal.y * offset, v3.z + normal.z * offset
    ]);
    faceGeometry.setAttribute('position', new THREE.BufferAttribute(offsetVertices, 3));

    // Remove previous highlight
    clearHighlights();

    // Add new highlight
    scene.add(highlightMesh);
    highlightMeshRef.current = highlightMesh;
  }, [inspectMode, clearHighlights]);

  /**
   * Handle hover over model in inspect mode
   */
  const handleInspectHover = useCallback((intersect, model, loader, threeRef, scene) => {
    if (!inspectMode) {
      clearHighlights();
      return;
    }

    if (intersect && intersect.object) {
      highlightFace(intersect, scene, threeRef);
    } else {
      clearHighlights();
    }
  }, [inspectMode, highlightFace, clearHighlights]);

  /**
   * Format area in square feet and square inches
   */
  const formatArea = useCallback((areaSquareMeters) => {
    const areaSquareFeet = areaSquareMeters * 10.764; // square meters to square feet
    const squareFeet = Math.floor(areaSquareFeet);
    const squareInches = Math.round((areaSquareFeet - squareFeet) * 144);
    
    if (squareFeet > 0) {
      return `${squareFeet} sq ft ${squareInches} sq in`;
    } else {
      return `${squareInches} sq in`;
    }
  }, []);

  /**
   * Calculate area of a triangle face
   */
  const calculateFaceArea = useCallback((intersect, threeRef) => {
    if (!intersect || !intersect.face || !threeRef) return null;

    const THREE = threeRef.current;
    if (!THREE) return null;

    try {
      const face = intersect.face;
      const mesh = intersect.object;
      const geometry = mesh.geometry;
      const positions = geometry.attributes.position;
      const index = geometry.index;

      if (!positions || !index) return null;

      // Get the three vertices of the face
      const faceIndex = intersect.faceIndex;
      if (faceIndex === undefined) return null;

      const a = index.getX(faceIndex * 3);
      const b = index.getX(faceIndex * 3 + 1);
      const c = index.getX(faceIndex * 3 + 2);

      // Get vertex positions
      const v1 = new THREE.Vector3(
        positions.getX(a), positions.getY(a), positions.getZ(a)
      );
      const v2 = new THREE.Vector3(
        positions.getX(b), positions.getY(b), positions.getZ(b)
      );
      const v3 = new THREE.Vector3(
        positions.getX(c), positions.getY(c), positions.getZ(c)
      );

      // Apply mesh world matrix to vertices
      mesh.updateMatrixWorld();
      v1.applyMatrix4(mesh.matrixWorld);
      v2.applyMatrix4(mesh.matrixWorld);
      v3.applyMatrix4(mesh.matrixWorld);

      // Calculate triangle area using cross product
      const edge1 = new THREE.Vector3().subVectors(v2, v1);
      const edge2 = new THREE.Vector3().subVectors(v3, v1);
      const cross = new THREE.Vector3().crossVectors(edge1, edge2);
      const area = cross.length() / 2;

      return area;
    } catch (err) {
      console.error('Error calculating face area:', err);
      return null;
    }
  }, []);

  const handleInspectClick = useCallback(async (intersect, model, loader, modelID, threeRef) => {
    if (!inspectMode || !intersect) return;

    try {
      // Calculate face area first
      const faceArea = calculateFaceArea(intersect, threeRef);
      
      // Get element info
      const elementInfo = getElementInfo(intersect, model, loader, modelID, threeRef.current);
      
      if (elementInfo) {
        // Add face area to element info
        setElementProperties({
          ...elementInfo,
          faceArea: faceArea,
          faceAreaFormatted: faceArea ? formatArea(faceArea) : null
        });
      } else {
        // Even if no element info, show face area
        setElementProperties({
          error: 'No properties found for this element.',
          faceArea: faceArea,
          faceAreaFormatted: faceArea ? formatArea(faceArea) : null
        });
      }
    } catch (err) {
      console.error('Error inspecting element:', err);
      const faceArea = calculateFaceArea(intersect, threeRef);
      setElementProperties({
        error: 'Error inspecting element: ' + err.message,
        faceArea: faceArea,
        faceAreaFormatted: faceArea ? formatArea(faceArea) : null
      });
    }
  }, [inspectMode, calculateFaceArea, formatArea]);

  return {
    inspectMode,
    elementProperties,
    toggleInspect,
    handleInspectClick,
    handleInspectHover,
    clearHighlights
  };
}

