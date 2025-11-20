# E57 Processing Server

Local Node.js server for robust E57 file parsing using Python's `pye57` library.

## Why Use Server-Side Processing?

**Advantages over browser-based parsing:**
- ✅ Supports **all E57 file variants** (not just limited subset)
- ✅ Handles files **>2GB** (no browser memory limits)
- ✅ **More reliable** parsing with native `pye57` library
- ✅ Faster processing for large files
- ✅ Keeps all functionality: point clouds + panoramas + scan locations

## Supported E57 Sources

The parser **auto-detects** and supports E57 files from:

### ✅ Leica Geosystems
- **Leica Register 360** (BLK360, RTC360 scanners)
- Exports with `visualReferenceRepresentation` for panoramic images
- Quaternion-based rotation data
- Full support for point clouds, scan poses, and panoramas

### ✅ Autodesk ReCap
- **ReCap Pro** (any scanner source: FARO, Leica, Z+F, etc.)
- **RealView** panoramic images via `sphericalRepresentation`
- Supports both quaternion and rotation matrix formats
- Handles alternative image storage paths (`pinholeRepresentation`, `cylindricalRepresentation`)

### ✅ Generic E57
- Any E57-compliant scanner export
- Fallback extraction paths for maximum compatibility
- Detailed logging to help diagnose unsupported structures

**Detection is automatic** - just upload any E57 file and the parser will identify the source and use appropriate extraction methods.

## Setup

### 1. Install Dependencies

**Python (required for E57 parsing):**

**Windows:**
```bash
# Check if Python is installed
py --version

# If not installed, download from https://www.python.org/downloads/
# OR install from Microsoft Store
# IMPORTANT: Check "Add Python to PATH" during installation

# Install pye57 and numpy
py -m pip install pye57 numpy
```

**Linux/macOS:**
```bash
# Install Python 3 if not already installed
python3 --version

# Install pye57 and numpy
pip3 install pye57 numpy
```

**Node.js (server runtime):**
```bash
cd server
npm install
```

### 2. Start the Server

```bash
cd server
npm start
```

You should see:
```
🚀 E57 Processing Server running on http://localhost:3001
📁 Uploads directory: /path/to/server/uploads
✅ Ready to accept E57 files from React frontend (http://localhost:3000)
```

### 3. Use with Frontend

The React frontend (http://localhost:3000) will automatically detect the server and use it for E57 parsing.

**Server status indicator:**
- **✓ Server-Side Processing Active** - Server is running
- **⚠ Browser-Based Processing Only** - Server is not running

## How It Works

1. **Frontend**: User uploads E57 file in React app
2. **Upload**: File sent to `http://localhost:3001/api/parse-e57`
3. **Server**: Saves file temporarily, calls Python script
4. **Python**: `pye57` library parses E57 file
5. **Extract**: Point cloud data, scan metadata, panoramic images
6. **Return**: JSON data sent back to frontend
7. **Cleanup**: Temporary file deleted

## File Structure

```
server/
├── index.js              # Express server
├── e57Parser.js          # Node.js wrapper for Python
├── parse_e57.py          # Python E57 parsing script
├── package.json          # Node.js dependencies
├── uploads/              # Temporary file storage (auto-created)
└── README.md             # This file
```

## API Endpoints

### Health Check
```
GET /health
Response: { "status": "ok", "message": "E57 processing server is running" }
```

### Parse E57
```
POST /api/parse-e57
Content-Type: multipart/form-data
Body: e57File (file)

Response: {
  "success": true,
  "data": {
    "pointCloudData": { ... },
    "scanMetadata": { ... },
    "panoramaImages": { ... }
  }
}
```

## Troubleshooting

### Server won't start

**Error: `pye57` not found**
```bash
pip3 install pye57 numpy
```

**Error: Port 3001 already in use**
```bash
# Change PORT in server/index.js
const PORT = 3002; // or any available port
```

### Python script fails

**Check Python version:**
```bash
python3 --version  # Should be 3.7+
```

**Test Python script directly:**
```bash
python3 server/parse_e57.py /path/to/file.e57
```

### Frontend shows "Server-Based Processing Only"

1. Make sure server is running: `cd server && npm start`
2. Check server URL in `src/utils/serverE57Parser.js` (should be `http://localhost:3001`)
3. Check browser console for connection errors

## Development

**Auto-restart on file changes:**
```bash
npm install -g nodemon
cd server
npm run dev
```

**Test with sample E57 file:**
```bash
# Upload a file via the React frontend
# Or test the API directly:
curl -X POST \
  -F "e57File=@/path/to/test.e57" \
  http://localhost:3001/api/parse-e57
```

## Production Deployment

For production use, consider:

1. **Authentication**: Add API keys or JWT tokens
2. **Rate Limiting**: Prevent abuse with express-rate-limit
3. **File Size Limits**: Already set to 10GB, adjust as needed
4. **Error Handling**: Add Sentry or logging service
5. **HTTPS**: Use nginx reverse proxy
6. **Process Manager**: Use PM2 for auto-restart

## Dependencies

- **Node.js**: Express, multer, cors
- **Python**: pye57, numpy

## License

MIT
