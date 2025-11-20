import { useRef, useCallback } from 'react';

/**
 * Custom hook for loading IFC models and managing edges
 */
export function useModelLoader() {
  const currentModelRef = useRef(null);
  const modelIDRef = useRef(null);
  const edgesRef = useRef([]);

  /**
   * Create edges for a model
   */
  const createEdges = useCallback((model, scene, THREE, showEdges) => {
    if (!showEdges || !model || !scene || !THREE) return;

    const edges = [];
    model.traverse((child) => {
      if (child.isMesh && child.geometry) {
        try {
          const edgesGeometry = new THREE.EdgesGeometry(child.geometry);
          const edgesMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000,
            linewidth: 1
          });
          const edgeLines = new THREE.LineSegments(edgesGeometry, edgesMaterial);
          edgeLines.userData.isEdge = true;
          edgeLines.userData.originalMesh = child;
          scene.add(edgeLines);
          edges.push(edgeLines);
        } catch (err) {
          console.warn('Could not create edges for mesh:', err);
        }
      }
    });
    edgesRef.current = edges;
  }, []);

  /**
   * Remove edges from scene
   */
  const removeEdges = useCallback((scene) => {
    edgesRef.current.forEach(edge => {
      scene.remove(edge);
      edge.geometry.dispose();
      edge.material.dispose();
    });
    edgesRef.current = [];
  }, []);

  /**
   * Toggle edges visibility
   */
  const toggleEdges = useCallback((model, scene, THREE, showEdges) => {
    if (showEdges) {
      createEdges(model, scene, THREE, true);
    } else {
      removeEdges(scene);
    }
  }, [createEdges, removeEdges]);

  /**
   * Load model from file
   */
  const loadModelFromFile = useCallback(async (file, loader, scene, THREE, showEdges) => {
    if (!file) return null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Reuse loader if available, otherwise create new one
      let ifcLoader = loader;
      if (!ifcLoader) {
        const { IFCLoader } = await import('web-ifc-three/IFCLoader');
        ifcLoader = new IFCLoader();
        await ifcLoader.ifcManager.setWasmPath('/wasm/');
        await ifcLoader.ifcManager.ifcAPI.Init();
      }

      const model = await ifcLoader.parse(arrayBuffer);
      
      // Store model ID
      if (model && model.modelID !== undefined) {
        modelIDRef.current = model.modelID;
      } else if (ifcLoader.ifcManager?.models?.length > 0) {
        const lastModelID = ifcLoader.ifcManager.models[ifcLoader.ifcManager.models.length - 1];
        modelIDRef.current = lastModelID;
      }

      // Remove previous model
      if (currentModelRef.current && scene) {
        scene.remove(currentModelRef.current);
        if (currentModelRef.current.geometry) {
          currentModelRef.current.geometry.dispose();
        }
        if (currentModelRef.current.material) {
          if (Array.isArray(currentModelRef.current.material)) {
            currentModelRef.current.material.forEach(mat => mat.dispose());
          } else {
            currentModelRef.current.material.dispose();
          }
        }
      }

      // Remove previous edges
      removeEdges(scene);

      // Add new model
      scene.add(model);
      currentModelRef.current = model;

      // Create edges if enabled
      if (showEdges) {
        createEdges(model, scene, THREE, true);
      }

      return { model, loader: ifcLoader };
    } catch (err) {
      console.error('Error loading model:', err);
      throw err;
    }
  }, [createEdges, removeEdges]);

  return {
    currentModelRef,
    modelIDRef,
    edgesRef,
    loadModelFromFile,
    createEdges,
    removeEdges,
    toggleEdges
  };
}

