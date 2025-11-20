# ReCap-Style Point Cloud + Panorama Viewer

A web-based viewer for LiDAR point clouds and 360° panoramic images from Leica BLK360 scanners. This application provides an intuitive interface for viewing point cloud data alongside panoramic images from scan locations, with measurement tools and navigation features.

![Point Cloud Panorama Viewer](docs/screenshot.png)

## ✨ Features

- **🗂️ E57 File Support**: Single-file upload containing point clouds, scan locations, and panoramic images
- **☁️ Point Cloud Visualization**: View large point clouds with color-coded rendering
- **📸 360° Panorama Viewer**: Navigate through panoramic images at each scan location
- **📍 Interactive Hotspots**: Click on scan location markers to view corresponding panoramas
- **📏 Measurement Tool**: Measure distances between two points in 3D space
- **⚡ Split View**: View point cloud and panorama side-by-side
- **🗺️ Location Sidebar**: Quick navigation between scan locations
- **🎨 Sample Data Generator**: Test the viewer without real E57 files

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Modern web browser with WebGL support

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm start

# Build for production
npm run build
```

The application will be available at `http://localhost:3000`.

## 📖 Usage

### Method 1: Load E57 File

1. **Export from Leica Register 360:**
   - Open your project
   - Select **File → Export → E57**
   - ✅ Check **"Include Images"**
   - Export the .e57 file

2. **Upload to Viewer:**
   - Open the viewer
   - Click **"Browse Files"**
   - Select your E57 file
   - Wait for parsing (progress shown)

3. **Navigate:**
   - **Point Cloud**: Drag to rotate, scroll to zoom, right-click to pan
   - **Hotspots**: Click markers to switch locations
   - **Sidebar**: Jump directly to any scan location
   - **Measurement**: Enable in toolbar, click two points

### Method 2: Load Sample Data

For testing without a real E57 file:

1. Click **"Load Sample Data (for testing)"**
2. Explore with generated point cloud and panoramas

## 🎮 Controls

### Point Cloud View
| Action | Control |
|--------|---------|
| Rotate camera | Left mouse drag |
| Pan camera | Right mouse drag |
| Zoom | Mouse scroll |
| Select location | Click hotspot |
| Measure point | Click (when measurement mode on) |

### Panorama View
| Action | Control |
|--------|---------|
| Pan view | Mouse drag |
| Zoom | Mouse scroll |
| Reset view | Double-click |

### Toolbar
- **View Mode**: Split / Point Cloud Only / Panorama Only
- **Measure**: Toggle measurement mode
- **Clear**: Reset measurement
- **👁 Icon**: Toggle hotspot visibility

## 📏 Measurement Tool

1. Click **"Measure"** in toolbar (turns ON)
2. Click first point in point cloud
3. Click second point
4. Distance displays in meters/centimeters
5. Click **"Clear"** to reset
6. Toggle measurement off when done

## 🏗️ Architecture

### Component Structure
```
App
├── PointCloudPanoramaViewer
│   ├── FileUploadPanel        # E57 upload & parsing
│   ├── Toolbar                # Controls & measurement
│   ├── LocationSidebar        # Scan location list
│   └── SplitViewContainer     # Layout manager
│       ├── PointCloudView     # Three.js point cloud + hotspots
│       └── PanoramaView       # Pannellum panorama viewer
```

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Three.js** | 3D graphics & point cloud rendering |
| **Pannellum** | 360° panorama viewer |
| **web-e57** | E57 file parser (WASM) |
| **Vite** | Build tool & dev server |

### Data Flow

```
E57 File Upload
    ↓
web-e57 Parser (WASM)
    ↓
Extract: Point Cloud + Metadata + Images
    ↓
State Management (React)
    ↓
Render: PointCloudView + PanoramaView
    ↓
User Interaction → Update Active Location
    ↓
Sync Point Cloud Hotspots ↔ Panorama Display
```

## 📁 E57 File Format

E57 is a vendor-neutral format for 3D imaging data.

### Expected Structure
```
/data3D/pointClouds[]/points   → XYZ coordinates, RGB colors
/images2D/images[]             → Panoramic images
  /pose/translation            → Position (X, Y, Z)
  /pose/rotation               → Orientation (quaternion)
  /guid                        → Unique ID
  /name                        → Location name
```

## 🛠️ Development

### Project Structure
```
src/
├── components/              # React components
│   ├── FileUploadPanel.jsx
│   ├── PointCloudView.jsx
│   ├── PanoramaView.jsx
│   ├── LocationSidebar.jsx
│   ├── Toolbar.jsx
│   └── SplitViewContainer.jsx
├── utils/                   # Utility functions
│   ├── e57Parser.js        # E57 parsing logic
│   └── sampleDataGenerator.js  # Test data
├── App.jsx                  # Root component
└── PointCloudPanoramaViewer.jsx  # Main viewer
```

### Key Utilities

**E57 Parser** (`src/utils/e57Parser.js`)
- Parses E57 binary format
- Extracts point clouds, metadata, images
- Converts quaternions → compass headings
- Progress tracking

**Sample Data Generator** (`src/utils/sampleDataGenerator.js`)
- Generates test point clouds
- Creates sample scan locations
- Generates canvas-based panoramas

## 🧪 Testing

```bash
# Run tests
npm test

# Build production bundle
npm run build

# Preview production build
npm run preview
```

## 🌐 Browser Support

| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full (test WebGL) |
| IE | ❌ Not supported |

## ⚠️ Troubleshooting

### E57 file won't parse
- ✅ Ensure "Include Images" was checked during export
- ✅ Verify file integrity (test in another E57 viewer)
- ✅ Check browser console for errors
- ✅ Try with sample data first

### Point cloud not visible
- Zoom out (scroll wheel)
- Check file contains point cloud data
- Verify WebGL is enabled
- Try resetting camera position

### Panoramas not loading
- Ensure E57 includes image data
- Check images have pose metadata
- Look for console errors
- Verify image format (JPEG/PNG)

### Measurement not working
- Enable measurement mode (toolbar button = ON)
- Click directly on point cloud (not empty space)
- Click on denser areas
- Try with sample data first

## 📊 Performance

### Recommendations
- **Point Cloud Size**: <500M points (decimate in Leica Register 360 if needed)
- **File Size**: <2GB (browser memory limits)
- **Images**: 2048x1024 panoramas (balance quality/performance)

### Optimization Tips
- Use LAZ compression in exports
- Reduce point cloud density for faster loading
- Close other browser tabs to free memory

## 🗺️ Roadmap

### ✅ Phase 1 (Complete)
- E57 parsing
- Point cloud rendering
- Panorama viewer
- Hotspot navigation
- Measurement tool
- Sample data

### 🔜 Phase 2 (Planned)
- Potree integration (better LOD)
- Annotations & markup
- Project save/load
- Export measurements
- Keyboard shortcuts

### 💡 Future Ideas
- Multi-page scan support (100+ locations)
- Compass rose overlay
- Camera animations
- Point cloud filtering
- VR support

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- **Three.js** - 3D graphics library
- **Pannellum** - Panorama viewer
- **web-e57** - E57 parser
- **Leica BLK360** - Reference hardware

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📞 Support

- 🐛 [Report issues](https://github.com/yourusername/ifcviewer/issues)
- 📖 Check troubleshooting section
- 💬 Discussions tab for questions

---

**Note**: This is a viewing tool. For editing/processing, use professional software like Autodesk ReCap Pro or Leica Register 360.
