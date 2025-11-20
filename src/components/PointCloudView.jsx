import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './PointCloudView.css';

export default function PointCloudView({
  pointCloudData,
  scanMetadata,
  activeLocationId,
  onLocationSelect,
  measurementMode,
  measurementPoints,
  measurementResult,
  onMeasurementPoint,
  hotspotVisibility
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const hotspotsGroupRef = useRef(null);
  const measurementGroupRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const pointCloudRef = useRef(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState('initializing');

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Hotspots group
    const hotspotsGroup = new THREE.Group();
    hotspotsGroup.name = 'hotspots';
    scene.add(hotspotsGroup);
    hotspotsGroupRef.current = hotspotsGroup;

    // Measurement group
    const measurementGroup = new THREE.Group();
    measurementGroup.name = 'measurements';
    scene.add(measurementGroup);
    measurementGroupRef.current = measurementGroup;

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    setIsInitialized(true);
    setStatus('ready');

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Load point cloud data
  useEffect(() => {
    if (!isInitialized || !pointCloudData || !sceneRef.current) return;

    setStatus('loading-cloud');

    try {
      // Remove existing point cloud if any
      if (pointCloudRef.current) {
        sceneRef.current.remove(pointCloudRef.current);
        if (pointCloudRef.current.geometry) {
          pointCloudRef.current.geometry.dispose();
        }
        if (pointCloudRef.current.material) {
          pointCloudRef.current.material.dispose();
        }
      }

      // Create point cloud from data
      // For now, create a simple point cloud visualization
      // This will be replaced with actual Potree integration or E57 parsed data
      const geometry = new THREE.BufferGeometry();

      // If pointCloudData has positions array
      if (pointCloudData.positions) {
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(pointCloudData.positions, 3)
        );

        // If we have colors
        if (pointCloudData.colors) {
          geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(pointCloudData.colors, 3)
          );
        }
      }

      // Material
      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: pointCloudData.colors ? true : false,
        color: pointCloudData.colors ? undefined : 0xffffff,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geometry, material);
      points.name = 'pointCloud';
      sceneRef.current.add(points);
      pointCloudRef.current = points;

      // Fit camera to point cloud
      if (geometry.attributes.position) {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        const camera = cameraRef.current;
        const controls = controlsRef.current;

        camera.position.set(
          center.x + maxDim,
          center.y + maxDim,
          center.z + maxDim
        );
        controls.target.copy(center);
        controls.update();
      }

      setStatus('loaded');
    } catch (error) {
      console.error('Error loading point cloud:', error);
      setStatus('error');
    }
  }, [isInitialized, pointCloudData]);

  // Update hotspots
  useEffect(() => {
    if (!isInitialized || !scanMetadata || !hotspotsGroupRef.current) return;

    // Clear existing hotspots
    while (hotspotsGroupRef.current.children.length > 0) {
      const child = hotspotsGroupRef.current.children[0];
      hotspotsGroupRef.current.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // Create hotspots for each scan location
    scanMetadata.scans.forEach((scan) => {
      const isActive = scan.id === activeLocationId;

      // Hotspot sphere
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: isActive ? 0xffd700 : 0xaaaaaa,
        transparent: true,
        opacity: 0.8
      });

      const hotspot = new THREE.Mesh(geometry, material);
      hotspot.position.set(
        scan.position[0],
        scan.position[1],
        scan.position[2]
      );
      hotspot.userData = { scanId: scan.id, type: 'hotspot' };
      hotspot.name = `hotspot-${scan.id}`;

      hotspotsGroupRef.current.add(hotspot);

      // Optional: Add compass direction indicator
      if (scan.compassHeading !== undefined) {
        const arrowGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({
          color: isActive ? 0xffd700 : 0x888888
        });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);

        // Position arrow in front of hotspot
        const heading = (scan.compassHeading * Math.PI) / 180;
        const distance = 0.5;
        arrow.position.set(
          scan.position[0] + Math.sin(heading) * distance,
          scan.position[1],
          scan.position[2] + Math.cos(heading) * distance
        );
        arrow.rotation.x = Math.PI / 2;
        arrow.rotation.z = -heading;

        hotspotsGroupRef.current.add(arrow);
      }
    });

    // Update visibility
    hotspotsGroupRef.current.visible = hotspotVisibility;
  }, [isInitialized, scanMetadata, activeLocationId, hotspotVisibility]);

  // Update measurement visualization
  useEffect(() => {
    if (!isInitialized || !measurementGroupRef.current) return;

    // Clear existing measurement visuals
    while (measurementGroupRef.current.children.length > 0) {
      const child = measurementGroupRef.current.children[0];
      measurementGroupRef.current.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // Draw measurement points
    measurementPoints.forEach((point) => {
      const geometry = new THREE.SphereGeometry(0.15, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(point);
      measurementGroupRef.current.add(sphere);
    });

    // Draw line between points
    if (measurementPoints.length === 2) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(measurementPoints);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        linewidth: 2
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      measurementGroupRef.current.add(line);
    }
  }, [isInitialized, measurementPoints]);

  // Handle click events
  const handleClick = (event) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // Check hotspot intersections first (if not in measurement mode)
    if (!measurementMode && hotspotsGroupRef.current) {
      const hotspotIntersects = raycasterRef.current.intersectObjects(
        hotspotsGroupRef.current.children,
        false
      );

      if (hotspotIntersects.length > 0) {
        const hotspot = hotspotIntersects[0].object;
        if (hotspot.userData.type === 'hotspot') {
          onLocationSelect(hotspot.userData.scanId);
          return;
        }
      }
    }

    // Handle measurement mode clicks
    if (measurementMode && pointCloudRef.current) {
      const intersects = raycasterRef.current.intersectObject(pointCloudRef.current);

      if (intersects.length > 0) {
        const point = intersects[0].point.clone();
        onMeasurementPoint(point);
      }
    }
  };

  return (
    <div className="pointcloud-view" ref={containerRef} onClick={handleClick}>
      {status !== 'ready' && status !== 'loaded' && (
        <div className="pointcloud-status">
          {status === 'initializing' && 'Initializing viewer...'}
          {status === 'loading-cloud' && 'Loading point cloud...'}
          {status === 'error' && 'Error loading point cloud'}
        </div>
      )}

      {measurementMode && (
        <div className="measurement-hint">
          Click on the point cloud to measure distance
          {measurementPoints.length > 0 && ` (${measurementPoints.length}/2 points selected)`}
        </div>
      )}
    </div>
  );
}
