# 3D Viewer Suite

A comprehensive web-based application featuring two professional 3D viewers:
1. **IFC Viewer**: For Building Information Models (BIM)
2. **Point Cloud + Panorama Viewer**: For LiDAR scans and 360° imagery

![3D Viewer Suite](docs/screenshot.png)

## ✨ Features

### 🏠 Landing Page
- **Dual Viewer Selection**: Choose between IFC or Point Cloud viewers
- **Professional Interface**: Card-based selection with clear descriptions
- **Back Navigation**: Easy return to home from any viewer

### 🏗️ IFC Viewer
- **📦 IFC File Support**: Load Industry Foundation Classes building models
- **🏛️ 3D BIM Visualization**: View architectural and structural elements
- **🔄 Orbit Controls**: Navigate and inspect building components
- **📐 Model Exploration**: Interactive 3D building viewing

### ☁️ Point Cloud + Panorama Viewer
- **🗂️ E57 File Support**: Single-file upload with point clouds, scan locations, and images
- **☁️ Point Cloud Visualization**: View large LiDAR point clouds with color-coded rendering
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

### Getting Started

When you open the application, you'll see the landing page with two options:

1. **IFC Viewer**: For viewing BIM/architectural models (.ifc files)
2. **Point Cloud + Panorama Viewer**: For LiDAR scans (.e57 files)

Click the viewer you want to use. You can return to the landing page at any time using the "← Back to Home" button.

### Using the IFC Viewer

1. Click **"Open IFC Viewer"** on the landing page
2. Click **"Select IFC file"** in the viewer
3. Choose your .ifc file (Industry Foundation Classes)
4. Navigate the 3D model:
   - **Left drag**: Rotate view
   - **Scroll**: Zoom in/out
   - **Right drag**: Pan camera

### Using the Point Cloud + Panorama Viewer

#### Method 1: Load E57 File

1. Click **"Open Point Cloud Viewer"** on the landing page
2. **Export from Leica Register 360:**
   - Open your project
   - Select **File → Export → E57**
   - ✅ Check **"Include Images"**
   - Export the .e57 file
3. **Upload to Viewer:**
   - Click **"Browse Files"**
   - Select your E57 file
   - Wait for parsing (progress shown)
4. **Navigate:**
   - **Point Cloud**: Drag to rotate, scroll to zoom, right-click to pan
   - **Hotspots**: Click markers to switch locations
   - **Sidebar**: Jump directly to any scan location
   - **Measurement**: Enable in toolbar, click two points

#### Method 2: Load Sample Data (Testing)

1. Click **"Open Point Cloud Viewer"** on the landing page
2. Click **"Load Sample Data (for testing)"**
3. Explore with generated point cloud and panoramas

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
App (Viewer Selection)
├── LandingPage               # Viewer selection interface
├── IfcViewer                 # IFC/BIM viewer
│   └── Three.js scene with IFC loader
└── PointCloudPanoramaViewer  # Point cloud + panorama viewer
    ├── FileUploadPanel       # E57 upload & parsing
    ├── Toolbar               # Controls & measurement
    ├── LocationSidebar       # Scan location list
    └── SplitViewContainer    # Layout manager
        ├── PointCloudView    # Three.js point cloud + hotspots
        └── PanoramaView      # Pannellum panorama viewer
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
