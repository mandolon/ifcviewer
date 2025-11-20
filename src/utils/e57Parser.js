/**
 * E57 File Parser Utility
 * Parses E57 files to extract point clouds, panoramic images, and scan metadata
 */

import { convertE57 } from 'web-e57';

// File size limits (in bytes)
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB hard limit
const WARNING_FILE_SIZE = 500 * 1024 * 1024; // 500MB warning threshold

/**
 * Validate file size before processing
 * @param {File} file - The file to validate
 * @returns {Object} Validation result with status and message
 */
export function validateFileSize(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB) exceeds maximum limit of 2GB. Please use a smaller file or decimate the point cloud in Leica Register 360.`
    };
  }

  if (file.size > WARNING_FILE_SIZE) {
    return {
      valid: true,
      warning: `Large file detected (${(file.size / 1024 / 1024).toFixed(0)} MB). Processing may take several minutes and could fail due to browser memory limits. Consider using a smaller file.`
    };
  }

  return { valid: true };
}

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
 * Read file in chunks to avoid memory issues with large files
 * @param {File} file - The file to read
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<ArrayBuffer>} File contents as ArrayBuffer
 */
async function readFileInChunks(file, onProgress = () => {}) {
  const chunkSize = 64 * 1024 * 1024; // 64MB chunks
  const chunks = [];
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const arrayBuffer = await chunk.arrayBuffer();
    chunks.push(arrayBuffer);
    offset += chunkSize;

    // Report progress (first 15% is for reading the file)
    const progress = Math.min(15, (offset / file.size) * 15);
    onProgress(progress);
  }

  // Combine all chunks into a single ArrayBuffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;

  for (const chunk of chunks) {
    result.set(new Uint8Array(chunk), position);
    position += chunk.byteLength;
  }

  return result.buffer;
}

/**
 * Parse E57 file and extract all necessary data
 * @param {File} file - The E57 file to parse
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} Parsed data containing point cloud, images, and metadata
 */
export async function parseE57File(file, onProgress = () => {}) {
  try {
    onProgress(5);

    // Validate file size first
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    // Read file in chunks to avoid memory issues
    let arrayBuffer;
    try {
      if (file.size > 100 * 1024 * 1024) { // > 100MB, use chunked reading
        arrayBuffer = await readFileInChunks(file, (progress) => {
          onProgress(5 + progress); // 5-20% for file reading
        });
        onProgress(20);
      } else {
        // Small files can be read directly
        arrayBuffer = await file.arrayBuffer();
        onProgress(20);
      }
    } catch (readError) {
      console.error('File read error:', readError);
      throw new Error(`Failed to read file: ${readError.message}. The file may be too large for browser memory. Try using a file smaller than 2GB.`);
    }

    // Convert E57 to JSON format using web-e57
    let result;
    try {
      result = await convertE57(arrayBuffer, 'JSON');

      if (!result) {
        throw new Error('Conversion returned no data. The E57 file may be empty or corrupted.');
      }

      onProgress(50);
    } catch (conversionError) {
      console.error('E57 conversion error:', conversionError);

      // Provide more specific error message
      const errorMsg = conversionError?.message || 'Unknown error during conversion';

      if (errorMsg.includes('WASM') || errorMsg.includes('wasm')) {
        throw new Error(`WASM module error: The E57 parser failed to initialize. Try refreshing the page.`);
      }

      if (!conversionError || errorMsg === 'undefined' || errorMsg === '') {
        throw new Error(`E57 parsing library error: The file could not be processed. This may be due to:\n• Incompatible E57 format\n• Corrupted file\n• Unsupported E57 features\n\nAlternative: Export point cloud as LAS/LAZ and use a manual file upload viewer instead.`);
      }

      throw new Error(`Failed to convert E57 file: ${errorMsg}. The file may be corrupted or use an unsupported E57 variant.`);
    }

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

    // Provide more helpful error messages
    if (error.message.includes('memory') || error.message.includes('allocation')) {
      throw new Error(`Out of memory: The file is too large to process in your browser. Please reduce the point cloud size in Leica Register 360 or use a file smaller than 2GB.`);
    }

    throw new Error(error.message || 'Failed to parse E57 file');
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
