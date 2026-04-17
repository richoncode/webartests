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
  },

  /**
   * Serializes the project and triggers a browser download.
   */
  exportProject(project, filename = 'project') {
    const data = project.toJSON();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.xcs') ? filename : `${filename}.xcs`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
