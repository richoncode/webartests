/**
 * XCSExporter - Bridge between Pattern Components and XCSProject.
 * Handles high-level geometric convenience methods (addRect, addCircle, etc.)
 */
import { XCSProject } from './xcs-system.js';

export const XCSExporter = {
  createProject(canvasId) {
    return new XCSProject(canvasId);
  },

  async addRect(project, options) {
    return await project.addItem('RECT', options);
  },

  async addCircle(project, options) {
    return await project.addItem('CIRCLE', options);
  },

  async addPath(project, options) {
    return await project.addItem('PATH', options);
  },

  async addBitmap(project, options) {
    return await project.addItem('BITMAP', options);
  },

  async addText(project, options) {
    return await project.addItem('TEXT', options);
  }
};
