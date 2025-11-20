/**
 * Server-Side E57 Parser Client
 * Uploads E57 files to local Node.js server for parsing
 */

const SERVER_URL = 'http://localhost:3001';

/**
 * Check if server is available
 * @returns {Promise<boolean>}
 */
export async function isServerAvailable() {
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    console.log('Server not available:', error.message);
    return false;
  }
}

/**
 * Parse E57 file using server-side processing
 * @param {File} file - The E57 file to parse
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} Parsed data
 */
export async function parseE57FileOnServer(file, onProgress = () => {}) {
  try {
    onProgress(5);

    // Create FormData
    const formData = new FormData();
    formData.append('e57File', file);

    onProgress(10);

    console.log('Uploading E57 file to server for processing...');

    // Upload file to server
    const response = await fetch(`${SERVER_URL}/api/parse-e57`, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header, browser will set it with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Server parsing failed');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Parsing failed');
    }

    const data = result.data;

    // Convert base64 panorama images to Blobs
    const panoramaBlobs = new Map();
    if (data.panoramaImages) {
      for (const [key, base64Data] of Object.entries(data.panoramaImages)) {
        // Convert base64 to Blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        panoramaBlobs.set(key, blob);
      }
    }

    onProgress(100);

    // Log diagnostic information
    console.log('📊 E57 Parsing Results:', {
      sourceFormat: data.sourceFormat || 'unknown',
      pointCount: data.pointCloudData.pointCount,
      hasColors: !!data.pointCloudData.colors,
      scanCount: data.scanMetadata?.scans?.length || 0,
      panoramaCount: panoramaBlobs.size
    });

    return {
      pointCloudData: {
        positions: new Float32Array(data.pointCloudData.positions),
        colors: data.pointCloudData.colors ? new Float32Array(data.pointCloudData.colors) : null,
        pointCount: data.pointCloudData.pointCount
      },
      scanMetadata: data.scanMetadata,
      panoramaBlobs: panoramaBlobs,
      sourceFormat: data.sourceFormat || 'unknown'  // Pass through for diagnostics
    };

  } catch (error) {
    console.error('Server parsing error:', error);
    throw new Error(`Server-side parsing failed: ${error.message}`);
  }
}
