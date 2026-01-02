import { createLogger } from '../utils/logger.js';
import type { StorageManager } from '../types/index.js';

const logger = createLogger('DesktopMemoryManager');

export class DesktopMemoryManager {
  private storageManager: StorageManager;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  /**
   * Save current localStorage state to a downloadable JSON file
   */
  saveMemory(): void {
    try {
      const data = this.storageManager.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `symbiosis-memory-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('✅ Memory saved to file');
      alert('Memory saved! 💾\n\nYour workspace data has been downloaded.\nUse "Load Memory" to restore it in another browser.');
    } catch (error) {
      logger.error('Failed to save memory:', error);
      alert('Failed to save memory: ' + error.message);
    }
  }

  /**
   * Load memory from a JSON file
   */
  loadMemory(): void {
    try {
      // Check if localStorage is available (Safari private browsing blocks it)
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      } catch (e) {
        alert('⚠️ localStorage is not available\n\nThis might be because:\n- You\'re in Private Browsing mode\n- Safari\'s tracking prevention is blocking it\n\nPlease try:\n1. Using normal (non-private) browsing\n2. Disabling "Prevent Cross-Site Tracking" in Safari settings');
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';

      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event: any) => {
          try {
            logger.info('📂 Reading file:', file.name);
            const data = JSON.parse(event.target.result as string);
            logger.info('📊 Parsed data:', data);

            // Validate data structure
            if (!data.user || !data.workspaces || !data.widgetInstances) {
              throw new Error('Invalid memory file format. Missing required fields: user, workspaces, or widgetInstances');
            }

            logger.info('✅ Data validation passed');

            // Confirm before overwriting
            if (!confirm('Load this memory?\n\nThis will replace your current workspace data.\nCurrent data will be lost unless you saved it first.')) {
              logger.info('❌ User cancelled load');
              return;
            }

            // Store in localStorage with error handling for Safari
            try {
              // Separate dock order from main data before storing
              const { dockOrder, ...mainData } = data;

              const jsonString = JSON.stringify(mainData);
              logger.info('💾 Storing data in localStorage (size:', jsonString.length, 'bytes)');
              localStorage.setItem('symbiosis-data', jsonString);
              logger.info('✅ localStorage.setItem successful');

              // Store dock order separately if it exists (via StorageManager)
              if (dockOrder) {
                this.storageManager.saveDockOrder(dockOrder);
                logger.info('✅ Dock order restored');
              }

              // Verify it was stored
              const stored = localStorage.getItem('symbiosis-data');
              if (!stored) {
                throw new Error('localStorage.setItem succeeded but data is not retrievable');
              }
              logger.info('✅ Verified data is retrievable from localStorage');
            } catch (storageError) {
              logger.error('❌ localStorage error:', storageError);
              throw new Error('Failed to store data in localStorage: ' + storageError.message + '\n\nThis might be a Safari private browsing issue.');
            }

            logger.info('✅ Memory loaded from file successfully');
            alert('Memory loaded! 📂\n\nReloading page to apply changes...');

            // Force a hard reload (Safari sometimes caches aggressively)
            window.location.href = window.location.href;
          } catch (error) {
            logger.error('❌ Failed to load memory:', error);
            alert('Failed to load memory:\n\n' + error.message + '\n\nCheck the browser console for details.');
          }
        };

        reader.onerror = (error: any) => {
          logger.error('❌ File read error:', error);
          alert('Failed to read file: ' + (error?.message || 'Unknown error'));
        };

        reader.readAsText(file);
      };

      input.click();
    } catch (error) {
      logger.error('❌ Failed to initialize load:', error);
      alert('Failed to load memory: ' + error.message);
    }
  }

  /**
   * Clear all localStorage data (reset to initial state)
   */
  clearMemory(): void {
    try {
      if (!confirm('Clear all memory? 🗑️\n\nThis will delete all workspaces, widgets, and dock configuration.\nThis action cannot be undone.\n\nMake sure you saved your data first if you want to keep it!')) {
        return;
      }

      localStorage.removeItem('symbiosis-data');
      this.storageManager.clearDockData();

      logger.info('✅ Memory cleared');
      alert('Memory cleared! 🗑️\n\nReloading page to reset to initial state...');

      // Reload page to reset
      window.location.reload();
    } catch (error) {
      logger.error('Failed to clear memory:', error);
      alert('Failed to clear memory: ' + error.message);
    }
  }

  /**
   * Setup global memory management functions for console access
   * Makes functions available via window object for debugging
   */
  setupGlobalFunctions() {
    window.saveMemory = () => this.saveMemory();
    window.loadMemory = () => this.loadMemory();
    window.clearMemory = () => this.clearMemory();

    // Also provide exportData for direct console access
    window.exportData = () => {
      const data = this.storageManager.exportData();
      logger.info('Exported data:');
      logger.info(data);
      return data;
    };

    logger.info('💾 To export data:');
    logger.info('  Run: exportData()');
    logger.info('  Copy the output and paste into temp-data-file.js');
  }
}
