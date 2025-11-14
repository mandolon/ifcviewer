import React, { useRef, useEffect, useState } from 'react';
import './IfcViewer.css';

export default function IfcViewer() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const loaderRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cleanup = false;
    let animationId = null;
    let onResizeHandler = null;

    async function init() {
      setStatus('initializing');

      try {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls');
        const { IFCLoader } = await import('web-ifc-three');

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(8, 13, 15);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(0, 10, 10);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const grid = new THREE.GridHelper(50, 50, 0x888888, 0xdddddd);
        scene.add(grid);

        const loader = new IFCLoader();

        // Set wasm path for web-ifc
        if (loader.ifcManager && loader.ifcManager.setWasmPath) {
          loader.ifcManager.setWasmPath('/');
        }

        function animate() {
          controls.update();
          renderer.render(scene, camera);
          animationId = requestAnimationFrame(animate);
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

        // save refs for later use
        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;
        controlsRef.current = controls;
        loaderRef.current = loader;

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
      if (animationId) cancelAnimationFrame(animationId);
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
  }, []);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('loading-file');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { IFCLoader } = await import('web-ifc-three');

      // Reuse loader from init if available, otherwise create new one
      let loader = loaderRef.current;
      if (!loader) {
        loader = new IFCLoader();
        if (loader.ifcManager && loader.ifcManager.setWasmPath) {
          loader.ifcManager.setWasmPath('/');
        }
        loaderRef.current = loader;
      }

      const model = await loader.parse(arrayBuffer);

      // Add model to the initialized scene
      const scene = sceneRef.current;
      if (scene && model) {
        scene.add(model.mesh || model);
      }

      setStatus('loaded');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="ifc-viewer-root">
      <div className="ifc-toolbar">
        <label className="file-label">
          Select IFC file
          <input type="file" accept=".ifc" onChange={handleFile} />
        </label>
        <div className={`status ${status}`}>Status: {status}</div>
        {errorMsg && <div className="error-msg">{errorMsg}</div>}
      </div>
      <div className="ifc-canvas" ref={containerRef} />
      <div className="ifc-hint">Drag to rotate • Scroll to zoom • Right-click to pan</div>
    </div>
  );
}
