import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { parseE57File } from './e57Parser.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS for React frontend (localhost:3000)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB limit (much higher than browser)
  },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.e57') {
      cb(null, true);
    } else {
      cb(new Error('Only .e57 files are allowed'));
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'E57 processing server is running' });
});

// E57 parsing endpoint
app.post('/api/parse-e57', upload.single('e57File'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Received E57 file:', {
      filename: req.file.originalname,
      size: req.file.size,
      path: req.file.path
    });

    // Parse the E57 file
    const result = await parseE57File(req.file.path, (progress) => {
      // In a production app, you could use WebSockets to send progress updates
      console.log(`Parsing progress: ${progress}%`);
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Return parsed data
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error parsing E57 file:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to parse E57 file'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 E57 Processing Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`\n✅ Ready to accept E57 files from React frontend (http://localhost:3000)\n`);
});
