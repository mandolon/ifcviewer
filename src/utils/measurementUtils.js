/**
 * Utility functions for measurement calculations and formatting
 */

/**
 * Converts distance in meters to feet and inches format
 * @param {number} distanceMeters - Distance in meters
 * @returns {string} Formatted string (e.g., "5' 3.25\"" or "8.50\"")
 */
export function formatDistance(distanceMeters) {
  const distanceInches = distanceMeters * 39.3701; // meters to inches
  const feet = Math.floor(distanceInches / 12);
  const inches = Math.round(distanceInches % 12); // Round to whole inches, no decimals
  return feet > 0 ? `${feet}' ${inches}"` : `${inches}"`;
}

/**
 * Creates a canvas texture with dimension text
 * @param {string} text - Text to display
 * @param {Object} THREE - Three.js library
 * @returns {THREE.CanvasTexture} Canvas texture
 */
export function createDimensionTexture(text, THREE) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'black';
  context.font = 'bold 32px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 32);
  
  return new THREE.CanvasTexture(canvas);
}

