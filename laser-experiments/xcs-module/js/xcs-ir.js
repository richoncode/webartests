/**
 * XCS Internal Representation (IR) - Compatibility Bridge for XCSSystem
 * Normalizes formal XCS data into a flat array of display-ready objects.
 */
import { XCSProject } from './xcs-system.js';

export const XCSIR = {
  /**
   * Parses raw XCS JSON and returns an array of objects for the viewer.
   */
  parseXCS(data) {
    const project = XCSProject.fromJSON(data);
    if (!project) return [];
    
    // Return the normalized render properties for every item
    return project.getItems().map(item => item.getRenderProps());
  }
};
