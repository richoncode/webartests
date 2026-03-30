/**
 * XCS Exporter - Compatibility Bridge for XCSSystem
 * Maintains legacy static API while delegating to XCSSystem module.
 * Optimized to handle both raw objects and XCSProject instances.
 */
import { XCSProject } from './xcs-system.js';

const wrap = (p) => (p instanceof XCSProject) ? p : XCSProject.fromJSON(p);

export const XCSExporter = {
  /**
   * Creates an XCS project. Now returns an XCSProject instance.
   * (Legacy code treating it as a POJO will still work via proxy or toJSON in Viewer)
   */
  createProject(canvasId) {
    return new XCSProject(canvasId);
  },

  /**
   * Adds text to a project.
   */
  addText(project, options) {
    return wrap(project).addItem('TEXT', options).id;
  },

  /**
   * Adds a circle to a project.
   */
  addCircle(project, options) {
    return wrap(project).addItem('CIRCLE', options).id;
  },

  /**
   * Adds a rectangle to a project.
   */
  addRect(project, options) {
    return wrap(project).addItem('RECT', options).id;
  },

  /**
   * Adds a path to a project.
   */
  addPath(project, options) {
    return wrap(project).addItem('PATH', options).id;
  },

  /**
   * Adds an image to a project.
   */
  addImage(project, options) {
    return wrap(project).addItem('IMAGE', options).id;
  },

  /**
   * Adds a bitmap to a project.
   */
  addBitmap(project, options) {
    return wrap(project).addItem('BITMAP', options).id;
  }
};
