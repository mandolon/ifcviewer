#!/usr/bin/env python3
"""
E57 File Parser using pye57 library
Extracts point cloud data, scan metadata, and panoramic images
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


def quaternion_to_compass_heading(quat):
    """Convert quaternion to compass heading in degrees (0-360)"""
    if not quat or len(quat) < 4:
        return 0

    x, y, z, w = quat

    # Calculate yaw (rotation around Y axis)
    siny_cosp = 2.0 * (w * y + x * z)
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

        print("PROGRESS:20", file=sys.stderr)

        # Extract point cloud data
        point_cloud_data = extract_point_cloud(e57)

        print("PROGRESS:50", file=sys.stderr)

        # Extract scan metadata and images
        scan_metadata, panorama_images = extract_scans_and_images(e57)

        print("PROGRESS:90", file=sys.stderr)

        result = {
            "pointCloudData": point_cloud_data,
            "scanMetadata": scan_metadata,
            "panoramaImages": panorama_images
        }

        return result

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


def extract_point_cloud(e57):
    """Extract point cloud positions and colors"""

    positions = []
    colors = []

    # Get scan data
    for scan_index in range(e57.scan_count):
        try:
            header = e57.get_header(scan_index)
            data = e57.read_scan(scan_index)

            # Extract XYZ coordinates
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

        except Exception as e:
            print(f"Warning: Error reading scan {scan_index}: {e}", file=sys.stderr)
            continue

    return {
        "positions": positions,
        "colors": colors if colors else None,
        "pointCount": len(positions) // 3
    }


def extract_scans_and_images(e57):
    """Extract scan metadata and panoramic images"""

    scans = []
    panorama_images = {}

    for scan_index in range(e57.scan_count):
        try:
            header = e57.get_header(scan_index)

            # Extract pose (position and rotation)
            pose = header.get('pose', {})
            translation = pose.get('translation', {})
            rotation = pose.get('rotation', {})

            # Get position
            position = [
                translation.get('x', 0.0),
                translation.get('y', 0.0),
                translation.get('z', 0.0)
            ]

            # Get rotation quaternion
            quat = [
                rotation.get('x', 0.0),
                rotation.get('y', 0.0),
                rotation.get('z', 0.0),
                rotation.get('w', 1.0)
            ]

            compass_heading = quaternion_to_compass_heading(quat)

            scan_id = header.get('guid', f'scan_{scan_index + 1}')
            scan_name = header.get('name', f'Scan {scan_index + 1}')

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
                image_data = extract_image_from_scan(e57, scan_index, header)
                if image_data:
                    # Convert to base64 for JSON transport
                    panorama_images[image_file] = base64.b64encode(image_data).decode('utf-8')
            except Exception as img_error:
                print(f"Warning: Could not extract image for scan {scan_index}: {img_error}", file=sys.stderr)

        except Exception as e:
            print(f"Warning: Error processing scan {scan_index}: {e}", file=sys.stderr)
            continue

    metadata = {
        "version": "1.0",
        "projectName": "E57 Project",
        "scans": scans
    }

    return metadata, panorama_images


def extract_image_from_scan(e57, scan_index, header):
    """Extract panoramic image from scan if available"""

    # E57 images are typically stored in the images2D section
    # This is a simplified extraction - actual implementation depends on E57 structure

    # Try to get image from header
    if 'visualReferenceRepresentation' in header:
        img_repr = header['visualReferenceRepresentation']
        if 'jpegImage' in img_repr:
            return img_repr['jpegImage']
        if 'pngImage' in img_repr:
            return img_repr['pngImage']

    if 'pinholeRepresentation' in header:
        img_repr = header['pinholeRepresentation']
        if 'jpegImage' in img_repr:
            return img_repr['jpegImage']
        if 'pngImage' in img_repr:
            return img_repr['pngImage']

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
