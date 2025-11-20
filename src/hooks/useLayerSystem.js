import { useState, useCallback } from 'react';
import { findMeshesByExpressID } from '../utils/ifcUtils';

/**
 * Custom hook for managing IFC layers (storeys and element types)
 */
export function useLayerSystem() {
  const [layers, setLayers] = useState([]);
  const [layerGroups, setLayerGroups] = useState({});

  /**
   * Extract layers from IFC model
   */
  const extractLayersFromModel = useCallback(async (model, loader, modelID) => {
    if (!loader || !modelID) {
      console.log('Cannot extract layers: missing loader or modelID');
      return;
    }

    try {
      console.log('Extracting layers from IFC model...');
      const layersList = [];
      const storeyLayers = [];
      const typeLayers = {};
      
      // Get spatial structure (building storeys)
      try {
        if (loader.ifcManager.getSpatialStructure) {
          const spatialStructure = await loader.ifcManager.getSpatialStructure(modelID);
          console.log('Spatial structure:', spatialStructure);
          
          if (spatialStructure && spatialStructure.children) {
            spatialStructure.children.forEach((building) => {
              if (building.children) {
                building.children.forEach((storey) => {
                  if (storey.type === 'IFCBUILDINGSTOREY' || storey.type === 'IfcBuildingStorey') {
                    const storeyLayer = {
                      id: `storey-${storey.expressID}`,
                      name: storey.Name?.value || `Storey ${storey.expressID}`,
                      type: 'storey',
                      expressID: storey.expressID,
                      visible: true,
                      elements: storey.children || [],
                      elevation: storey.Elevation?.value || 0
                    };
                    storeyLayers.push(storeyLayer);
                    layersList.push(storeyLayer);
                  }
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('Could not get spatial structure:', err);
      }

      // Extract element types by traversing all meshes
      const elementTypes = new Map();
      const processedExpressIDs = new Set();
      
      model.traverse((child) => {
        if (child.isMesh && child.geometry) {
          let expressID = child.userData?.expressID;
          if (!expressID && loader.ifcManager) {
            try {
              expressID = loader.ifcManager.getExpressId(child.geometry, 0);
            } catch (err) {
              // Ignore
            }
          }
          
          if (expressID && !processedExpressIDs.has(expressID)) {
            processedExpressIDs.add(expressID);
            
            try {
              const props = loader.ifcManager.getItemProperties(modelID, expressID);
              if (props && props.type) {
                const ifcType = props.type.value || props.type;
                if (!elementTypes.has(ifcType)) {
                  elementTypes.set(ifcType, []);
                }
                elementTypes.get(ifcType).push(expressID);
              }
            } catch (err) {
              // Ignore errors getting properties
            }
          }
        }
      });

      // Create type layers
      elementTypes.forEach((expressIDs, ifcType) => {
        const typeLayer = {
          id: `type-${ifcType}`,
          name: ifcType.replace('IFC', '').replace('Ifc', ''),
          type: 'elementType',
          ifcType: ifcType,
          visible: true,
          expressIDs: expressIDs,
          elementCount: expressIDs.length
        };
        typeLayers[ifcType] = typeLayer;
        layersList.push(typeLayer);
      });

      console.log(`Extracted ${storeyLayers.length} storeys and ${Object.keys(typeLayers).length} element types`);

      setLayers(layersList);
      setLayerGroups({
        storeys: storeyLayers,
        types: typeLayers
      });
    } catch (err) {
      console.error('Error extracting layers:', err);
    }
  }, []);

  /**
   * Toggle layer visibility
   */
  const toggleLayerVisibility = useCallback((layerId, model, loader, edgesRef) => {
    setLayers(prevLayers => {
      return prevLayers.map(layer => {
        if (layer.id === layerId) {
          const newVisible = !layer.visible;
          
          if (layer.type === 'storey') {
            if (model && loader && layer.elements) {
              layer.elements.forEach(element => {
                if (element.expressID) {
                  const meshes = findMeshesByExpressID(model, element.expressID, loader);
                  meshes.forEach(mesh => {
                    mesh.visible = newVisible;
                    if (edgesRef.current) {
                      edgesRef.current.forEach(edge => {
                        if (edge.userData.originalMesh === mesh) {
                          edge.visible = newVisible;
                        }
                      });
                    }
                  });
                }
              });
            }
          } else if (layer.type === 'elementType') {
            if (model && loader && layer.expressIDs) {
              layer.expressIDs.forEach(expressID => {
                const meshes = findMeshesByExpressID(model, expressID, loader);
                meshes.forEach(mesh => {
                  mesh.visible = newVisible;
                  if (edgesRef.current) {
                    edgesRef.current.forEach(edge => {
                      if (edge.userData.originalMesh === mesh) {
                        edge.visible = newVisible;
                      }
                    });
                  }
                });
              });
            }
          }
          
          return { ...layer, visible: newVisible };
        }
        return layer;
      });
    });
  }, []);

  return {
    layers,
    layerGroups,
    extractLayersFromModel,
    toggleLayerVisibility
  };
}

