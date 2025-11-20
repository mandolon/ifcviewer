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

    // Spawn Python process (cross-platform)
    // Windows: try 'py' first (Python launcher), then 'python', then 'python3'
    // Linux/Mac: try 'python3' first, then 'python'
    let pythonCommand;
    if (process.platform === 'win32') {
      pythonCommand = 'py';  // Python launcher is most reliable on Windows
    } else {
      pythonCommand = 'python3';
    }

    console.log(`Using Python command: ${pythonCommand}`);
    const pythonProcess = spawn(pythonCommand, [pythonScript, filePath]);

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
      let errorMsg = `Failed to start Python process: ${error.message}\n\n`;

      if (process.platform === 'win32') {
        errorMsg += 'Python not found on Windows. Please:\n';
        errorMsg += '1. Install Python 3 from https://www.python.org/downloads/\n';
        errorMsg += '2. Check "Add Python to PATH" during installation\n';
        errorMsg += '3. Or install via Microsoft Store\n';
        errorMsg += '4. Restart your terminal/server after installation\n';
        errorMsg += '5. Install dependencies: py -m pip install pye57 numpy';
      } else {
        errorMsg += 'Python not found. Please install Python 3:\n';
        errorMsg += '- Ubuntu/Debian: sudo apt-get install python3 python3-pip\n';
        errorMsg += '- macOS: brew install python3\n';
        errorMsg += 'Then install dependencies: pip3 install pye57 numpy';
      }

      reject(new Error(errorMsg));
    });
  });
}
