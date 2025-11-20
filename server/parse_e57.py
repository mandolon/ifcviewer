#!/usr/bin/env python3
"""
E57 File Parser using pye57 library
Extracts point cloud data, scan metadata, and panoramic images
Supports both Leica Register 360 and Autodesk ReCap E57 exports
"""

import sys
import json
import base64
import struct
from pathlib import Path

try:
    import pye57
    import numpy as np
except ImportError:
    print(json.dumps({
        "error": "Missing dependencies. Install with: pip install pye57 numpy"
    }), file=sys.stderr)
    sys.exit(1)


def log_debug(message):
    """Log debug message to stderr"""
    print(f"DEBUG: {message}", file=sys.stderr)


def detect_e57_source(e57):
    """
    Detect E57 source software (Leica Register 360, Autodesk ReCap, or unknown)

    Inspects header metadata and structure to identify vendor

    Returns:
        str: "leica", "recap", or "unknown"
    """
    try:
        # Try to get header from first scan
        if e57.scan_count > 0:
            header = e57.get_header(0)

            # Check for vendor-specific metadata
            # ReCap may include software info
            if 'creationDateTime' in header:
                creation_info = str(header.get('creationDateTime', ''))
                if 'recap' in creation_info.lower() or 'autodesk' in creation_info.lower():
                    return 'recap'

            # Check for Leica-specific fields
            if 'sensor' in header:
                sensor_info = str(header.get('sensor', ''))
                if 'leica' in sensor_info.lower() or 'blk360' in sensor_info.lower() or 'rtc360' in sensor_info.lower():
                    return 'leica'

            # Check structure patterns
            # Leica typically has visualReferenceRepresentation
            # ReCap may have different image storage
            if 'visualReferenceRepresentation' in header:
                return 'leica'  # High confidence

            # Check for ReCap-specific image2D structure
            if 'pinholeRepresentation' in header and 'imageList' in header:
                return 'recap'  # ReCap often uses imageList

        return 'unknown'

    except Exception as e:
        log_debug(f"Error detecting E57 source: {e}")
        return 'unknown'


def rotation_matrix_to_quaternion(matrix):
    """
    Convert 3x3 rotation matrix to quaternion [x, y, z, w]

    Args:
        matrix: 3x3 numpy array or nested list

    Returns:
        list: [qx, qy, qz, qw]
    """
    if isinstance(matrix, list):
        matrix = np.array(matrix)

    # Ensure it's at least 3x3
    if matrix.shape[0] < 3 or matrix.shape[1] < 3:
        log_debug(f"Invalid rotation matrix shape: {matrix.shape}")
        return [0, 0, 0, 1]

    # Use first 3x3 portion if 4x4 transform matrix
    R = matrix[:3, :3]

    # Calculate quaternion from rotation matrix
    trace = np.trace(R)

    if trace > 0:
        s = 0.5 / np.sqrt(trace + 1.0)
        w = 0.25 / s
        x = (R[2, 1] - R[1, 2]) * s
        y = (R[0, 2] - R[2, 0]) * s
        z = (R[1, 0] - R[0, 1]) * s
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = 2.0 * np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2])
        w = (R[2, 1] - R[1, 2]) / s
        x = 0.25 * s
        y = (R[0, 1] + R[1, 0]) / s
        z = (R[0, 2] + R[2, 0]) / s
    elif R[1, 1] > R[2, 2]:
        s = 2.0 * np.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2])
        w = (R[0, 2] - R[2, 0]) / s
        x = (R[0, 1] + R[1, 0]) / s
        y = 0.25 * s
        z = (R[1, 2] + R[2, 1]) / s
    else:
        s = 2.0 * np.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1])
        w = (R[1, 0] - R[0, 1]) / s
        x = (R[0, 2] + R[2, 0]) / s
        y = (R[1, 2] + R[2, 1]) / s
        z = 0.25 * s

    return [float(x), float(y), float(z), float(w)]


def rotation_to_quaternion(rotation_data):
    """
    Convert various rotation formats to quaternion [x, y, z, w]

    Handles:
    - Quaternion dict: {'x': .., 'y': .., 'z': .., 'w': ..}
    - Rotation matrix: 3x3 or 4x4 array/list
    - Euler angles: [roll, pitch, yaw] in radians

    Args:
        rotation_data: dict, list, or numpy array

    Returns:
        list: [qx, qy, qz, qw]
    """
    if rotation_data is None:
        return [0.0, 0.0, 0.0, 1.0]

    # Case 1: Already a quaternion dict
    if isinstance(rotation_data, dict):
        if all(k in rotation_data for k in ['x', 'y', 'z', 'w']):
            return [
                float(rotation_data.get('x', 0.0)),
                float(rotation_data.get('y', 0.0)),
                float(rotation_data.get('z', 0.0)),
                float(rotation_data.get('w', 1.0))
            ]

        # Case 2: Rotation matrix in dict (ReCap sometimes uses this)
        if 'rotation' in rotation_data and isinstance(rotation_data['rotation'], (list, np.ndarray)):
            return rotation_matrix_to_quaternion(rotation_data['rotation'])

    # Case 3: Rotation matrix as array/list
    if isinstance(rotation_data, (list, np.ndarray)):
        arr = np.array(rotation_data)

        # Check if it's a rotation matrix (3x3 or 4x4)
        if arr.shape == (3, 3) or arr.shape == (4, 4):
            return rotation_matrix_to_quaternion(arr)

        # Check if it's Euler angles (3 values)
        if arr.shape == (3,) or (isinstance(rotation_data, list) and len(rotation_data) == 3):
            # Convert Euler to quaternion (ZYX convention)
            roll, pitch, yaw = rotation_data[:3]

            cy = np.cos(yaw * 0.5)
            sy = np.sin(yaw * 0.5)
            cp = np.cos(pitch * 0.5)
            sp = np.sin(pitch * 0.5)
            cr = np.cos(roll * 0.5)
            sr = np.sin(roll * 0.5)

            w = cr * cp * cy + sr * sp * sy
            x = sr * cp * cy - cr * sp * sy
            y = cr * sp * cy + sr * cp * sy
            z = cr * cp * sy - sr * sp * cy

            return [float(x), float(y), float(z), float(w)]

    # Default: identity quaternion
    log_debug(f"Could not convert rotation data to quaternion: {type(rotation_data)}")
    return [0.0, 0.0, 0.0, 1.0]


def quaternion_to_compass_heading(quat):
    """
    Convert quaternion to compass heading in degrees (0-360)

    Args:
        quat: [x, y, z, w] quaternion

    Returns:
        float: Compass heading in degrees (0-360)
    """
    if not quat or len(quat) < 4:
        return 0

    x, y, z, w = quat

    # Calculate yaw (rotation around Z axis for most scanners)
    # Formula: atan2(2*(w*z + x*y), 1 - 2*(y^2 + z^2))
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    yaw = np.arctan2(siny_cosp, cosy_cosp)

    # Convert to degrees
    degrees = np.degrees(yaw)

    # Normalize to 0-360
    if degrees < 0:
        degrees += 360

    return round(degrees)


def parse_e57_file(file_path):
    """Parse E57 file and extract all data"""

    print("PROGRESS:10", file=sys.stderr)

    try:
        # Open E57 file
        e57 = pye57.E57(file_path)
        log_debug(f"Opened E57 file: {file_path}")
        log_debug(f"Scan count: {e57.scan_count}")

        # Detect source format
        source_format = detect_e57_source(e57)
        log_debug(f"Detected E57 source: {source_format}")

        print("PROGRESS:20", file=sys.stderr)

        # Extract point cloud data
        point_cloud_data = extract_point_cloud(e57, source_format)
        log_debug(f"Extracted {point_cloud_data['pointCount']} points")

        print("PROGRESS:50", file=sys.stderr)

        # Extract scan metadata and images
        scan_metadata, panorama_images = extract_scans_and_images(e57, source_format)
        log_debug(f"Extracted {len(scan_metadata['scans'])} scans")
        log_debug(f"Extracted {len(panorama_images)} panoramic images")

        print("PROGRESS:90", file=sys.stderr)

        result = {
            "pointCloudData": point_cloud_data,
            "scanMetadata": scan_metadata,
            "panoramaImages": panorama_images,
            "sourceFormat": source_format  # Include detected format for debugging
        }

        return result

    except Exception as e:
        log_debug(f"Error parsing E57 file: {e}")
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


def extract_point_cloud(e57, source_format):
    """
    Extract point cloud positions and colors

    Works with both Leica and ReCap E57 exports
    """

    positions = []
    colors = []

    log_debug(f"Extracting point cloud (source: {source_format})...")

    # Get scan data (works for both Leica and ReCap)
    for scan_index in range(e57.scan_count):
        try:
            header = e57.get_header(scan_index)
            data = e57.read_scan(scan_index, ignore_missing_fields=True)

            # Extract XYZ coordinates (standard across all E57 files)
            if 'cartesianX' in data and 'cartesianY' in data and 'cartesianZ' in data:
                x = data['cartesianX']
                y = data['cartesianY']
                z = data['cartesianZ']

                # Stack coordinates
                points = np.column_stack((x, y, z))
                positions.extend(points.flatten().tolist())

                # Extract RGB colors if available
                if 'colorRed' in data and 'colorGreen' in data and 'colorBlue' in data:
                    r = data['colorRed'] / 255.0
                    g = data['colorGreen'] / 255.0
                    b = data['colorBlue'] / 255.0

                    point_colors = np.column_stack((r, g, b))
                    colors.extend(point_colors.flatten().tolist())

                log_debug(f"  Scan {scan_index}: {len(x)} points")

        except Exception as e:
            log_debug(f"Warning: Error reading scan {scan_index}: {e}")
            continue

    return {
        "positions": positions,
        "colors": colors if colors else None,
        "pointCount": len(positions) // 3
    }


def extract_scans_and_images(e57, source_format):
    """
    Extract scan metadata and panoramic images

    Handles both Leica and ReCap E57 structures with fallback logic
    """

    scans = []
    panorama_images = {}

    log_debug(f"Extracting scans and images (source: {source_format})...")

    for scan_index in range(e57.scan_count):
        try:
            header = e57.get_header(scan_index)
            
            # Convert ScanHeader to dict for easier access
            header_dict = header.__dict__ if hasattr(header, '__dict__') else dict(header)

            # Extract pose (position and rotation)
            # Try multiple paths for compatibility
            pose = header_dict.get('pose', {})

            # Extract position (standard across formats)
            translation = pose.get('translation', {})
            position = [
                float(translation.get('x', 0.0)),
                float(translation.get('y', 0.0)),
                float(translation.get('z', 0.0))
            ]

            # Extract rotation (may be quaternion OR matrix)
            rotation = pose.get('rotation', {})
            quat = rotation_to_quaternion(rotation)

            log_debug(f"  Scan {scan_index}: position={position}, quaternion={quat}")

            compass_heading = quaternion_to_compass_heading(quat)

            # Extract metadata
            scan_id = header_dict.get('guid', f'scan_{scan_index + 1}')
            scan_name = header_dict.get('name', header_dict.get('description', f'Scan {scan_index + 1}'))

            image_file = f'image_{scan_index}'

            scan_info = {
                "id": scan_id,
                "name": scan_name,
                "position": position,
                "compassHeading": compass_heading,
                "imageFile": image_file,
                "imageIndex": scan_index
            }

            scans.append(scan_info)

            # Try to extract panoramic image
            try:
                image_data = extract_image_from_scan(e57, scan_index, header_dict, source_format)
                if image_data:
                    # Convert to base64 for JSON transport
                    panorama_images[image_file] = base64.b64encode(image_data).decode('utf-8')
                    log_debug(f"  Scan {scan_index}: Extracted image ({len(image_data)} bytes)")
                else:
                    log_debug(f"  Scan {scan_index}: No image found")
            except Exception as img_error:
                log_debug(f"Warning: Could not extract image for scan {scan_index}: {img_error}")

        except Exception as e:
            log_debug(f"Warning: Error processing scan {scan_index}: {e}")
            continue

    # Get project name from first scan if available
    project_name = "E57 Project"
    if e57.scan_count > 0:
        try:
            first_header = e57.get_header(0)
            first_header_dict = first_header.__dict__ if hasattr(first_header, '__dict__') else dict(first_header)
            project_name = first_header_dict.get('projectName', first_header_dict.get('name', 'E57 Project'))
        except:
            pass

    metadata = {
        "version": "1.0",
        "projectName": project_name,
        "scans": scans
    }

    return metadata, panorama_images


def extract_image_from_scan(e57, scan_index, header, source_format):
    """
    Extract panoramic image from scan if available

    Tries multiple extraction paths for compatibility:
    1. Leica: visualReferenceRepresentation
    2. ReCap: pinholeRepresentation, sphericalRepresentation
    3. Generic: Any image data in header

    Args:
        e57: E57 file object
        scan_index: Index of scan
        header: Scan header dict
        source_format: Detected source ("leica", "recap", or "unknown")

    Returns:
        bytes: Image data (JPEG or PNG) or None
    """

    # Strategy: Try all known paths, return first successful extraction

    extraction_paths = []

    # Path 1: Leica visualReferenceRepresentation (most common for BLK360/RTC360)
    if 'visualReferenceRepresentation' in header:
        extraction_paths.append(('visualReferenceRepresentation', header['visualReferenceRepresentation']))

    # Path 2: ReCap sphericalRepresentation (RealView panoramas)
    if 'sphericalRepresentation' in header:
        extraction_paths.append(('sphericalRepresentation', header['sphericalRepresentation']))

    # Path 3: Generic pinholeRepresentation
    if 'pinholeRepresentation' in header:
        extraction_paths.append(('pinholeRepresentation', header['pinholeRepresentation']))

    # Path 4: cylindricalRepresentation (some scanners)
    if 'cylindricalRepresentation' in header:
        extraction_paths.append(('cylindricalRepresentation', header['cylindricalRepresentation']))

    # Try each path
    for path_name, img_repr in extraction_paths:
        try:
            # Try JPEG first (most common)
            if 'jpegImage' in img_repr:
                log_debug(f"    Found image via {path_name}.jpegImage")
                return img_repr['jpegImage']

            # Try PNG
            if 'pngImage' in img_repr:
                log_debug(f"    Found image via {path_name}.pngImage")
                return img_repr['pngImage']

            # Try generic 'imageData' field (some E57 variants)
            if 'imageData' in img_repr:
                log_debug(f"    Found image via {path_name}.imageData")
                return img_repr['imageData']

        except Exception as e:
            log_debug(f"    Failed to extract from {path_name}: {e}")
            continue

    # No image found via any path
    return None


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: parse_e57.py <file_path>"}), file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    if not Path(file_path).exists():
        print(json.dumps({"error": f"File not found: {file_path}"}), file=sys.stderr)
        sys.exit(1)

    result = parse_e57_file(file_path)

    # Output JSON to stdout
    print(json.dumps(result))
    print("PROGRESS:100", file=sys.stderr)
