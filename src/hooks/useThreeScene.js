import { useRef, useEffect } from 'react';

// Preserve scene across hot reloads in development
let preservedScene = null;
let preservedModel = null;

/**
 * Custom hook for initializing and managing Three.js scene
 * @param {React.RefObject} containerRef - Reference to the container DOM element
 * @param {Function} setStatus - Function to update loading status
 * @param {Function} setErrorMsg - Function to set error message
 * @param {boolean} showEdges - Whether edges should be shown
 * @param {React.RefObject} edgesRef - Reference to edges array
 * @returns {Object} Refs for Three.js objects (renderer, scene, camera, controls, loader, etc.)
 */
export function useThreeScene(containerRef, setStatus, setErrorMsg, showEdges, edgesRef) {
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const loaderRef = useRef(null);
  const gridRef = useRef(null);
  const threeRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(null);
  const animationIdRef = useRef(null);

  useEffect(() => {
    let cleanup = false;
    let onResizeHandler = null;

    async function init() {
      // In development, try to preserve scene across hot reloads
      if (import.meta.hot && preservedScene && sceneRef.current === null) {
        // Restore preserved scene
        sceneRef.current = preservedScene.scene;
        rendererRef.current = preservedScene.renderer;
        cameraRef.current = preservedScene.camera;
        controlsRef.current = preservedScene.controls;
        loaderRef.current = preservedScene.loader;
        gridRef.current = preservedScene.grid;
        threeRef.current = preservedScene.THREE;
        raycasterRef.current = preservedScene.raycaster;
        mouseRef.current = preservedScene.mouse;
        
        // Restore model if it was preserved
        if (preservedModel) {
          // Ensure model is in the scene
          if (!sceneRef.current.children.includes(preservedModel)) {
            sceneRef.current.add(preservedModel);
          }
          preservedModel.visible = true;
          
          // Restore edges if they were enabled
          if (showEdges && edgesRef.current.length === 0) {
            const THREE = threeRef.current;
            const edges = [];
            preservedModel.traverse((child) => {
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
                  sceneRef.current.add(edgeLines);
                  edges.push(edgeLines);
                } catch (err) {
                  console.warn('Could not create edges for mesh:', err);
                }
              }
            });
            edgesRef.current = edges;
          }
        }

        // Re-attach renderer to DOM if needed
        if (containerRef.current && rendererRef.current) {
          const existingCanvas = containerRef.current.querySelector('canvas');
          if (existingCanvas && existingCanvas !== rendererRef.current.domElement) {
            containerRef.current.removeChild(existingCanvas);
          }
          if (!containerRef.current.contains(rendererRef.current.domElement)) {
            containerRef.current.appendChild(rendererRef.current.domElement);
          }
        }

        // Restore camera position and controls target if preserved
        if (preservedScene.cameraPosition) {
          cameraRef.current.position.copy(preservedScene.cameraPosition);
        }
        if (preservedScene.controlsTarget) {
          controlsRef.current.target.copy(preservedScene.controlsTarget);
        }
        cameraRef.current.updateProjectionMatrix();
        controlsRef.current.update();

        // Restart animation
        function animate() {
          if (cleanup) return;
          controlsRef.current.update();
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          
          // Update preserved camera position during HMR
          if (import.meta.hot && preservedScene) {
            preservedScene.cameraPosition = cameraRef.current.position.clone();
            preservedScene.controlsTarget = controlsRef.current.target.clone();
          }
          
          animationIdRef.current = requestAnimationFrame(animate);
        }
        animate();

        setStatus(preservedModel ? 'loaded' : 'ready');
        return;
      }

      setStatus('initializing');

      try {
        const THREE = await import('three');
        threeRef.current = THREE;
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const { IFCLoader } = await import('web-ifc-three/IFCLoader');

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(8, 13, 15);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false; // Disable damping to prevent continuous rotation
        controls.enablePan = true;
        controls.enableZoom = true;

        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(0, 10, 10);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const grid = new THREE.GridHelper(50, 50, 0x888888, 0xdddddd);
        grid.visible = false; // Hidden by default
        scene.add(grid);
        gridRef.current = grid;
        
        // Initialize raycaster and mouse for interactions
        raycasterRef.current = new THREE.Raycaster();
        mouseRef.current = new THREE.Vector2();
        
        const loader = new IFCLoader();

        // Set wasm path and initialize the IFC API
        await loader.ifcManager.setWasmPath('/wasm/');
        await loader.ifcManager.ifcAPI.Init();

        function animate() {
          if (cleanup) return;
          controls.update();
          renderer.render(scene, camera);
          
          // Preserve camera position during HMR
          if (import.meta.hot && preservedScene) {
            preservedScene.cameraPosition = camera.position.clone();
            preservedScene.controlsTarget = controls.target.clone();
          }
          
          animationIdRef.current = requestAnimationFrame(animate);
        }

        animate();

        // resize handler
        onResizeHandler = () => {
          if (!containerRef.current) return;
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };

        window.addEventListener('resize', onResizeHandler);

        // Save refs
        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;
        controlsRef.current = controls;
        loaderRef.current = loader;

        // Preserve for HMR
        if (import.meta.hot) {
          preservedScene = {
            scene,
            renderer,
            camera,
            controls,
            loader,
            grid,
            THREE,
            raycaster: raycasterRef.current,
            mouse: mouseRef.current,
            cameraPosition: camera.position.clone(),
            controlsTarget: controls.target.clone()
          };
        }

        setStatus('ready');
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
        setStatus('error');
      }
    }

    init();

    return () => {
      cleanup = true;
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      if (onResizeHandler) {
        window.removeEventListener('resize', onResizeHandler);
      }
    };
  }, [containerRef, setStatus, setErrorMsg, showEdges, edgesRef]);

  // Export function to preserve model
  const preserveModel = (model) => {
    if (import.meta.hot) {
      preservedModel = model;
      if (preservedScene) {
        preservedScene.model = model;
      }
    }
  };

  return {
    rendererRef,
    sceneRef,
    cameraRef,
    controlsRef,
    loaderRef,
    gridRef,
    threeRef,
    raycasterRef,
    mouseRef,
    preserveModel
  };
}
