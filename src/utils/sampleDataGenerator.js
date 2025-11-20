/**
 * Sample Data Generator for Testing
 * Generates fake point cloud, scan metadata, and panorama data for testing without real E57 files
 */

/**
 * Generate a sample point cloud (simple mathematical surface)
 * @returns {Object} Point cloud data with positions and colors
 */
export function generateSamplePointCloud() {
  const positions = [];
  const colors = [];

  // Generate a wavy surface
  for (let x = -10; x <= 10; x += 0.2) {
    for (let z = -10; z <= 10; z += 0.2) {
      // Create interesting height variation
      const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 3;

      positions.push(x, y, z);

      // Color based on height
      const normalizedHeight = (y + 3) / 6; // Normalize to 0-1
      const r = normalizedHeight;
      const g = 1 - normalizedHeight;
      const b = 0.5;

      colors.push(r, g, b);
    }
  }

  // Add some random points around to make it look more realistic
  for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;
    const y = Math.random() * 2;

    positions.push(x, y, z);
    colors.push(Math.random(), Math.random(), Math.random());
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    pointCount: positions.length / 3
  };
}

/**
 * Generate sample scan metadata
 * @returns {Object} Scan metadata with multiple scan locations
 */
export function generateSampleScanMetadata() {
  const scans = [
    {
      id: 'scan_001',
      name: 'Entry Point',
      position: [-5, 1.6, -5],
      compassHeading: 0,
      imageFile: 'sample_image_0'
    },
    {
      id: 'scan_002',
      name: 'Center Area',
      position: [0, 1.6, 0],
      compassHeading: 90,
      imageFile: 'sample_image_1'
    },
    {
      id: 'scan_003',
      name: 'East Corner',
      position: [5, 1.6, -5],
      compassHeading: 180,
      imageFile: 'sample_image_2'
    },
    {
      id: 'scan_004',
      name: 'South Point',
      position: [0, 1.6, 5],
      compassHeading: 270,
      imageFile: 'sample_image_3'
    }
  ];

  return {
    version: '1.0',
    projectName: 'Sample Test Project',
    scans
  };
}

/**
 * Generate a sample panoramic image (canvas-based)
 * Creates a simple gradient panorama with text
 * @param {number} index - Scan index for labeling
 * @returns {Blob} Image blob
 */
export async function generateSamplePanorama(index) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);

    // Different color for each scan
    const colors = [
      ['#1e3a8a', '#60a5fa'], // Blue
      ['#166534', '#4ade80'], // Green
      ['#7c2d12', '#fb923c'], // Orange
      ['#581c87', '#c084fc']  // Purple
    ];

    const colorPair = colors[index % colors.length];
    gradient.addColorStop(0, colorPair[0]);
    gradient.addColorStop(1, colorPair[1]);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add some "features" to make it look more like a panorama
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        50 + Math.random() * 100,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Add text label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Sample Panorama ${index + 1}`,
      canvas.width / 2,
      canvas.height / 2
    );

    ctx.font = '24px sans-serif';
    ctx.fillText(
      'This is a generated test panorama',
      canvas.width / 2,
      canvas.height / 2 + 60
    );

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}

/**
 * Generate all sample panoramas for the scan locations
 * @param {Array} scans - Array of scan metadata
 * @returns {Promise<Map>} Map of image IDs to Blobs
 */
export async function generateAllSamplePanoramas(scans) {
  const blobMap = new Map();

  for (let i = 0; i < scans.length; i++) {
    const scan = scans[i];
    const blob = await generateSamplePanorama(i);
    blobMap.set(scan.imageFile, blob);
  }

  return blobMap;
}

/**
 * Generate complete sample project data
 * @returns {Promise<Object>} Complete sample data
 */
export async function generateSampleProjectData() {
  const pointCloudData = generateSamplePointCloud();
  const scanMetadata = generateSampleScanMetadata();
  const panoramaBlobs = await generateAllSamplePanoramas(scanMetadata.scans);

  return {
    pointCloudData,
    scanMetadata,
    panoramaBlobs
  };
}

export default {
  generateSamplePointCloud,
  generateSampleScanMetadata,
  generateSamplePanorama,
  generateAllSamplePanoramas,
  generateSampleProjectData
};
