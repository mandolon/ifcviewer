import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse E57 file using Python pye57 library
 * @param {string} filePath - Path to E57 file
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Object>} Parsed E57 data
 */
export async function parseE57File(filePath, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'parse_e57.py');

    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      return reject(new Error('Python E57 parser script not found. Run: pip install pye57 numpy'));
    }

    console.log('Starting Python E57 parser...');
    onProgress(10);

    // Spawn Python process
    const pythonProcess = spawn('C:\\Users\\alope\\AppData\\Local\\Programs\\Python\\Python312\\python.exe', [pythonScript, filePath]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;

      // Parse progress updates from Python
      const progressMatch = output.match(/PROGRESS:(\d+)/);
      if (progressMatch) {
        const progress = parseInt(progressMatch[1]);
        onProgress(progress);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python process exited with code:', code);
        console.error('stderr:', stderr);
        return reject(new Error(`E57 parsing failed: ${stderr || 'Unknown error'}`));
      }

      try {
        // Parse JSON output from Python
        const result = JSON.parse(stdout);

        // Convert base64 images to Buffers
        if (result.panoramaImages) {
          for (const [key, base64Data] of Object.entries(result.panoramaImages)) {
            result.panoramaImages[key] = Buffer.from(base64Data, 'base64');
          }
        }

        onProgress(100);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}. Make sure Python 3 and pye57 are installed.`));
    });
  });
}
