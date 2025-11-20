/**
 * IFC-specific utility functions
 */

/**
 * Get expressID from an intersection object
 */
export function getExpressIDFromIntersect(intersect, loader) {
  if (!intersect || !intersect.object) return null;

  const object = intersect.object;
  
  // Try userData first
  if (object.userData?.expressID) {
    return object.userData.expressID;
  }
  
  // Try geometry userData
  if (object.geometry?.userData?.expressID) {
    return object.geometry.userData.expressID;
  }
  
  // Try using ifcManager.getExpressId
  if (loader?.ifcManager && object.geometry) {
    try {
      const expressID = loader.ifcManager.getExpressId(object.geometry, 0);
      if (expressID) return expressID;
    } catch (err) {
      // Ignore errors
    }
  }
  
  return null;
}

/**
 * Find all meshes belonging to a specific expressID
 */
export function findMeshesByExpressID(model, expressID, loader) {
  if (!model || !expressID) return [];

  const meshes = [];
  let checkedCount = 0;
  let matchedCount = 0;
  
  model.traverse((child) => {
    if (child.isMesh && child.geometry) {
      checkedCount++;
      let meshExpressID = child.userData?.expressID;
      
      if (!meshExpressID && loader?.ifcManager) {
        try {
          meshExpressID = loader.ifcManager.getExpressId(child.geometry, 0);
          if (!meshExpressID && child.geometry.userData) {
            meshExpressID = child.geometry.userData.expressID;
          }
        } catch (err) {
          // Ignore errors
        }
      }
      
      if (meshExpressID === expressID) {
        meshes.push(child);
        matchedCount++;
      }
    }
  });
  
  // If no meshes found, try per-face check
  if (matchedCount === 0 && loader?.ifcManager) {
    model.traverse((child) => {
      if (child.isMesh && child.geometry && child.geometry.index) {
        const index = child.geometry.index;
        for (let i = 0; i < Math.min(100, index.count); i += 3) {
          try {
            const faceExpressID = loader.ifcManager.getExpressId(child.geometry, i);
            if (faceExpressID === expressID) {
              if (!meshes.includes(child)) {
                meshes.push(child);
                matchedCount++;
              }
              break;
            }
          } catch (err) {
            // Continue
          }
        }
      }
    });
  }
  
  return meshes;
}

/**
 * Calculate surface area of a mesh
 */
export function calculateElementArea(mesh, THREE) {
  if (!THREE || !mesh || !mesh.geometry) return null;

  try {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    
    if (!positions || positions.count < 3) return null;

    let totalArea = 0;
    
    if (geometry.index) {
      const index = geometry.index;
      for (let i = 0; i < index.count - 2; i += 3) {
        const i1 = index.getX(i);
        const i2 = index.getX(i + 1);
        const i3 = index.getX(i + 2);
        
        const v1 = new THREE.Vector3(
          positions.getX(i1),
          positions.getY(i1),
          positions.getZ(i1)
        );
        const v2 = new THREE.Vector3(
          positions.getX(i2),
          positions.getY(i2),
          positions.getZ(i2)
        );
        const v3 = new THREE.Vector3(
          positions.getX(i3),
          positions.getY(i3),
          positions.getZ(i3)
        );
        
        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const cross = new THREE.Vector3().crossVectors(edge1, edge2);
        const area = cross.length() / 2;
        totalArea += area;
      }
    } else {
      for (let i = 0; i < positions.count - 2; i += 3) {
        const v1 = new THREE.Vector3(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        );
        const v2 = new THREE.Vector3(
          positions.getX(i + 1),
          positions.getY(i + 1),
          positions.getZ(i + 1)
        );
        const v3 = new THREE.Vector3(
          positions.getX(i + 2),
          positions.getY(i + 2),
          positions.getZ(i + 2)
        );
        
        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const cross = new THREE.Vector3().crossVectors(edge1, edge2);
        const area = cross.length() / 2;
        totalArea += area;
      }
    }
    
    return totalArea;
  } catch (err) {
    console.error('Error calculating area:', err);
    return null;
  }
}

/**
 * Get element information (area, vertices, faces) for a clicked element
 */
export function getElementInfo(intersect, model, loader, modelID, THREE) {
  if (!THREE || !intersect) return null;

  try {
    const expressID = getExpressIDFromIntersect(intersect, loader);
    
    if (!expressID) {
      // Fallback: calculate area for just the clicked mesh
      const mesh = intersect.object;
      const area = calculateElementArea(mesh, THREE);
      return {
        type: mesh.type || 'Mesh',
        area: area,
        vertices: mesh.geometry?.attributes?.position?.count || 0,
        faces: mesh.geometry?.index ? mesh.geometry.index.count / 3 : 0
      };
    }
    
    // Find all meshes belonging to this expressID
    const elementMeshes = findMeshesByExpressID(model, expressID, loader);
    
    if (elementMeshes.length === 0) {
      // Fallback to clicked mesh
      const mesh = intersect.object;
      const area = calculateElementArea(mesh, THREE);
      return {
        type: mesh.type || 'Mesh',
        expressID: expressID,
        area: area,
        vertices: mesh.geometry?.attributes?.position?.count || 0,
        faces: mesh.geometry?.index ? mesh.geometry.index.count / 3 : 0,
        note: 'Calculated from clicked mesh only - may not represent full element'
      };
    }
    
    // Calculate total area for all meshes of this element
    let totalArea = 0;
    let totalVertices = 0;
    let totalFaces = 0;
    
    elementMeshes.forEach(mesh => {
      const area = calculateElementArea(mesh, THREE);
      if (area !== null) {
        totalArea += area;
      }
      totalVertices += mesh.geometry?.attributes?.position?.count || 0;
      if (mesh.geometry?.index) {
        totalFaces += mesh.geometry.index.count / 3;
      }
    });
    
    return {
      type: 'IFC Element',
      expressID: expressID,
      area: totalArea,
      vertices: totalVertices,
      faces: Math.floor(totalFaces),
      meshCount: elementMeshes.length
    };
  } catch (err) {
    console.error('Error getting element info:', err);
    return null;
  }
}

/**
 * Get properties for an expressID
 */
export async function getPropertiesForExpressID(expressID, loader, modelID) {
  if (!loader || !expressID) {
    return null;
  }

  if (!modelID) {
    return null;
  }

  try {
    let props = null;
    
    if (loader.ifcManager.getItemProperties) {
      props = await loader.ifcManager.getItemProperties(modelID, expressID);
    } else if (loader.ifcManager.getProperties) {
      props = await loader.ifcManager.getProperties(modelID, expressID);
    }
    
    return props;
  } catch (err) {
    console.error('Error fetching properties:', err);
    return null;
  }
}

