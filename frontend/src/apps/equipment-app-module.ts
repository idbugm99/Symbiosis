/**
 * Equipment App Module
 * Wraps EquipmentApp with lifecycle hooks for the app system
 */

import type { AppModule, AppInstanceSettings, AppLifecycleContext } from '../types/index.js';
import { EquipmentApp } from './EquipmentApp.js';

let appInstance: EquipmentApp | null = null;

/**
 * Equipment Management App Module
 * Full-screen equipment management with search, filter, CRUD operations
 */
const EquipmentAppModule: AppModule = {
  /**
   * Called when app window is mounted
   */
  async onMount(contentContainer: HTMLElement, settings: AppInstanceSettings, context: AppLifecycleContext) {
    console.log('✅ EquipmentApp mounted', { settings, context });

    // Create Equipment App instance
    appInstance = new EquipmentApp(contentContainer);

    console.log('✅ EquipmentApp initialization complete');
  },

  /**
   * Called before app window is destroyed
   * Clean up resources to prevent memory leaks
   */
  async onUnmount() {
    console.log('🧹 EquipmentApp unmounting');

    if (appInstance) {
      appInstance.destroy();
      appInstance = null;
      console.log('✅ EquipmentApp cleaned up');
    }
  },

  /**
   * Called when app is paused (minimized, hidden, etc.)
   */
  async onPause() {
    console.log('⏸️  EquipmentApp paused');
    // Optional: Pause timers, animations, etc.
  },

  /**
   * Called when app is resumed from paused state
   */
  async onResume() {
    console.log('▶️  EquipmentApp resumed');

    // Optional: Resume timers, refresh data
    if (appInstance) {
      appInstance.refresh();
    }
  }
};

export default EquipmentAppModule;
