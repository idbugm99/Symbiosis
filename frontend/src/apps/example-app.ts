/**
 * Example App with Lifecycle Hooks
 * Demonstrates how to create an app with full lifecycle management
 */

import type { AppModule, AppInstanceSettings, AppLifecycleContext } from '../types/index.js';

// App state (persists across lifecycle)
let updateInterval: number | null = null;
let startTime: number = 0;
let container: HTMLElement | null = null;

/**
 * Example app demonstrating all lifecycle hooks
 */
const ExampleApp: AppModule = {
  /**
   * Called when app window is mounted
   * Use this to initialize your app, render UI, start timers
   */
  async onMount(contentContainer: HTMLElement, settings: AppInstanceSettings, context: AppLifecycleContext) {
    console.log('✅ ExampleApp mounted', { settings, context });

    container = contentContainer;
    startTime = Date.now();

    // Render initial UI
    container.innerHTML = `
      <div style="padding: 20px; font-family: system-ui;">
        <h2>Example App with Lifecycle Hooks</h2>
        <p>Instance ID: <code>${context.instanceId}</code></p>
        <p>Display Mode: <code>${settings.displayMode}</code></p>

        <div style="margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px;">
          <strong>Lifecycle Events:</strong>
          <ul id="lifecycle-log" style="margin-top: 10px; font-family: monospace; font-size: 12px;"></ul>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
          <strong>Live Data:</strong>
          <div id="live-data" style="margin-top: 10px;"></div>
        </div>

        <div style="margin-top: 20px;">
          <button id="close-btn" style="padding: 8px 16px; cursor: pointer;">Close App</button>
          <button id="change-mode-btn" style="padding: 8px 16px; cursor: pointer; margin-left: 10px;">Toggle Fullscreen</button>
        </div>
      </div>
    `;

    // Log lifecycle event
    logLifecycleEvent('onMount called');

    // Setup event listeners
    const closeBtn = container.querySelector('#close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        context.closeApp();
      });
    }

    const changeModeBtn = container.querySelector('#change-mode-btn');
    if (changeModeBtn) {
      changeModeBtn.addEventListener('click', () => {
        const newMode = settings.displayMode === 'fullscreen' ? 'popup' : 'fullscreen';
        context.updateSettings({ displayMode: newMode });
      });
    }

    // Start live data updates (demonstrates cleanup need)
    updateInterval = window.setInterval(() => {
      updateLiveData();
    }, 1000);

    // Simulate async initialization (API call, data fetch, etc.)
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ ExampleApp initialization complete');
  },

  /**
   * Called before app window is destroyed
   * CRITICAL: Clean up resources here to prevent memory leaks
   */
  async onUnmount() {
    console.log('🧹 ExampleApp unmounting');
    logLifecycleEvent('onUnmount called');

    // Clear timers
    if (updateInterval !== null) {
      clearInterval(updateInterval);
      updateInterval = null;
      console.log('✅ Cleared update interval');
    }

    // Cancel pending requests (example)
    // abortController?.abort();

    // Remove event listeners (if not using cleanup manager)
    // element.removeEventListener(...)

    // Clean up any other resources
    container = null;

    console.log('✅ ExampleApp cleanup complete');
  },

  /**
   * Called when app window is resized
   * Use this to adjust layout, re-render charts, etc.
   */
  onResize(dimensions: { width: number; height: number }) {
    console.log('📐 ExampleApp resized', dimensions);
    logLifecycleEvent(`onResize: ${dimensions.width}x${dimensions.height}`);

    // Update UI based on new dimensions
    if (container) {
      const liveData = container.querySelector('#live-data');
      if (liveData) {
        liveData.innerHTML += `<div>Window resized to ${dimensions.width}x${dimensions.height}</div>`;
      }
    }
  },

  /**
   * Called when app window gains focus (brought to front)
   * Use this to resume activities, refresh data
   */
  onFocus() {
    console.log('🎯 ExampleApp focused');
    logLifecycleEvent('onFocus called');

    // Example: Resume paused activities
    // - Resume animations
    // - Refresh data
    // - Resume timers (if paused)
  },

  /**
   * Called when app window loses focus (another window brought to front)
   * Use this to pause activities, save state
   */
  onBlur() {
    console.log('😴 ExampleApp blurred');
    logLifecycleEvent('onBlur called');

    // Example: Pause activities
    // - Pause animations
    // - Stop polling
    // - Save current state
  }
};

/**
 * Helper function to log lifecycle events to the UI
 */
function logLifecycleEvent(message: string): void {
  if (!container) return;

  const log = container.querySelector('#lifecycle-log');
  if (log) {
    const entry = document.createElement('li');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(entry);

    // Keep only last 10 entries
    while (log.children.length > 10) {
      log.removeChild(log.firstChild!);
    }
  }
}

/**
 * Helper function to update live data display
 */
function updateLiveData(): void {
  if (!container) return;

  const liveData = container.querySelector('#live-data');
  if (liveData) {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    liveData.innerHTML = `
      <div>Uptime: ${uptime}s</div>
      <div>Current time: ${new Date().toLocaleTimeString()}</div>
      <div>Update count: ${uptime}</div>
    `;
  }
}

// Export app module
export default ExampleApp;
