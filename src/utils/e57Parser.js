/**
 * E57 File Parser Utility
 * Parses E57 files to extract point clouds, panoramic images, and scan metadata
 */

import { convertE57 } from 'web-e57';

/**
 * Convert quaternion rotation to compass heading (yaw angle in degrees)
 * @param {Object} quaternion - Quaternion object with x, y, z, w components
 * @returns {number} Compass heading in degrees (0-360)
 */
function quaternionToCompassHeading(quaternion) {
  if (!quaternion || typeof quaternion !== 'object') {
    return 0;
  }

  const { x = 0, y = 0, z = 0, w = 1 } = quaternion;

  // Calculate yaw (rotation around Y axis)
  // Formula: atan2(2*(w*y + x*z), 1 - 2*(y^2 + z^2))
  const siny_cosp = 2 * (w * y + x * z);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  let yaw = Math.atan2(siny_cosp, cosy_cosp);

  // Convert from radians to degrees
  let degrees = (yaw * 180) / Math.PI;

  // Normalize to 0-360 range
  if (degrees < 0) {
    degrees += 360;
  }

  return Math.round(degrees);
}

/**
 * Parse E57 file and extract all necessary data
 * @param {File} file - The E57 file to parse
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} Parsed data containing point cloud, images, and metadata
 */
export async function parseE57File(file, onProgress = () => {}) {
  try {
    onProgress(10);

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    onProgress(20);

    // Convert E57 to JSON format using web-e57
    // This library can convert E57 to various formats
    const result = await convertE57(arrayBuffer, 'JSON');
    onProgress(50);

    // Parse the JSON result
    const e57Data = typeof result === 'string' ? JSON.parse(result) : result;
    onProgress(60);

    // Extract point cloud data
    const pointCloudData = extractPointCloud(e57Data);
    onProgress(70);

    // Extract scan locations and images
    const scanMetadata = extractScanMetadata(e57Data);
    onProgress(80);

    // Extract panoramic images
    const panoramaBlobs = await extractPanoramicImages(e57Data, arrayBuffer);
    onProgress(90);

    onProgress(100);

    return {
      pointCloudData,
      scanMetadata,
      panoramaBlobs
    };
  } catch (error) {
    console.error('Error parsing E57 file:', error);
    throw new Error(`Failed to parse E57 file: ${error.message}`);
  }
}

/**
 * Extract point cloud data from E57 JSON structure
 * @param {Object} e57Data - Parsed E57 data
 * @returns {Object} Point cloud data with positions and colors
 */
function extractPointCloud(e57Data) {
  try {
    // E57 structure: /data3D/pointCloud[]/points
    const pointClouds = e57Data.data3D?.pointClouds || [];

    if (pointClouds.length === 0) {
      throw new Error('No point clouds found in E57 file');
    }

    // Use the first point cloud (or merge if multiple)
    const pointCloud = pointClouds[0];
    const points = pointCloud.points || [];

    // Extract positions
    const positions = [];
    const colors = [];

    points.forEach((point) => {
      // Position (required)
      if (point.cartesianX !== undefined && point.cartesianY !== undefined && point.cartesianZ !== undefined) {
        positions.push(point.cartesianX, point.cartesianY, point.cartesianZ);

        // Colors (optional)
        if (point.colorRed !== undefined && point.colorGreen !== undefined && point.colorBlue !== undefined) {
          // Normalize colors from 0-255 to 0-1
          colors.push(
            point.colorRed / 255,
            point.colorGreen / 255,
            point.colorBlue / 255
          );
        }
      }
    });

    return {
      positions: new Float32Array(positions),
      colors: colors.length > 0 ? new Float32Array(colors) : null,
      pointCount: positions.length / 3
    };
  } catch (error) {
    console.error('Error extracting point cloud:', error);
    throw new Error('Failed to extract point cloud data');
  }
}

/**
 * Extract scan metadata (locations, poses) from E57 data
 * @param {Object} e57Data - Parsed E57 data
 * @returns {Object} Scan metadata with location information
 */
function extractScanMetadata(e57Data) {
  try {
    // E57 structure: /images2D/images[]
    const images = e57Data.images2D?.images || [];

    if (images.length === 0) {
      console.warn('No images found in E57 file');
      return { scans: [] };
    }

    const scans = images.map((image, index) => {
      const pose = image.pose || {};
      const position = pose.translation || { x: 0, y: 0, z: 0 };
      const rotation = pose.rotation || { x: 0, y: 0, z: 0, w: 1 };

      // Calculate compass heading from quaternion
      const compassHeading = quaternionToCompassHeading(rotation);

      return {
        id: image.guid || `scan_${index + 1}`,
        name: image.name || image.description || `Scan ${index + 1}`,
        position: [position.x, position.y, position.z],
        compassHeading,
        imageFile: `image_${index}`, // Internal reference
        imageIndex: index // Store index for image extraction
      };
    });

    return {
      version: '1.0',
      projectName: e57Data.guid || 'E57 Project',
      scans
    };
  } catch (error) {
    console.error('Error extracting scan metadata:', error);
    throw new Error('Failed to extract scan metadata');
  }
}

/**
 * Extract panoramic images from E57 data
 * @param {Object} e57Data - Parsed E57 data
 * @param {ArrayBuffer} arrayBuffer - Original E57 file buffer
 * @returns {Promise<Map>} Map of image IDs to Blobs
 */
async function extractPanoramicImages(e57Data, arrayBuffer) {
  try {
    const images = e57Data.images2D?.images || [];
    const blobMap = new Map();

    // For each image, extract the binary data
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Image data is typically stored as binary blob in E57
      // The actual extraction depends on web-e57 library capabilities
      if (image.pinholeRepresentation?.jpegImage) {
        // If JPEG data is available directly
        const jpegData = image.pinholeRepresentation.jpegImage;
        const blob = new Blob([jpegData], { type: 'image/jpeg' });
        blobMap.set(`image_${i}`, blob);
      } else if (image.visualReferenceRepresentation?.jpegImage) {
        // Alternative location for image data
        const jpegData = image.visualReferenceRepresentation.jpegImage;
        const blob = new Blob([jpegData], { type: 'image/jpeg' });
        blobMap.set(`image_${i}`, blob);
      } else {
        console.warn(`No image data found for image ${i}`);
      }
    }

    return blobMap;
  } catch (error) {
    console.error('Error extracting panoramic images:', error);
    // Return empty map instead of throwing - images are optional
    return new Map();
  }
}

/**
 * Validate E57 file before parsing
 * @param {File} file - File to validate
 * @returns {boolean} True if valid E57 file
 */
export function validateE57File(file) {
  if (!file) return false;

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.e57')) {
    return false;
  }

  // Check MIME type (if available)
  // E57 files may have various MIME types or none
  // So we primarily rely on extension

  return true;
}

/**
 * Generate sample point cloud for testing (fallback if E57 parsing fails)
 * @returns {Object} Sample point cloud data
 */
export function generateSamplePointCloud() {
  const positions = [];
  const colors = [];

  // Generate a simple point cloud (e.g., a grid)
  for (let x = -10; x <= 10; x += 0.5) {
    for (let y = -10; y <= 10; y += 0.5) {
      const z = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 2;
      positions.push(x, z, y);

      // Rainbow colors based on height
      const color = (z + 2) / 4; // Normalize to 0-1
      colors.push(color, 1 - color, 0.5);
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    pointCount: positions.length / 3
  };
}

export default {
  parseE57File,
  validateE57File,
  quaternionToCompassHeading,
  generateSamplePointCloud
};
