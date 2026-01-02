/**
 * Vite HMR Guard
 * Prevents infinite retry loops when Vite dev server is down
 * 
 * This utility monitors Vite HMR connection failures and disables
 * HMR after a threshold of failures to prevent memory crashes.
 */

const MAX_HMR_FAILURES = 5;
const RESET_DELAY_MS = 60000; // Reset counter after 60 seconds

let hmrFailureCount = 0;
let lastFailureTime = 0;
let hmrDisabled = false;

/**
 * Initialize HMR guard
 * Should be called early in app lifecycle, before Vite HMR connects
 */
export function initViteHmrGuard() {
  // Only run in development mode
  if (import.meta.env.PROD) {
    return;
  }

  // Check if Vite HMR is available
  if (typeof import.meta.hot === 'undefined') {
    return;
  }

  console.log('ViteHmrGuard: Initialized (max failures:', MAX_HMR_FAILURES + ')');

  // Monitor HMR connection errors
  const originalError = console.error;
  let errorCount = 0;

  // Intercept console errors related to WebSocket/HMR failures
  console.error = function(...args: any[]) {
    const message = args.join(' ');
    
    // Check for HMR/WebSocket connection errors
    if (
      message.includes('WebSocket connection') ||
      message.includes('server connection lost') ||
      message.includes('Failed to load resource') ||
      message.includes('Could not connect to the server')
    ) {
      errorCount++;
      
      // Reset counter if enough time has passed
      const now = Date.now();
      if (now - lastFailureTime > RESET_DELAY_MS) {
        hmrFailureCount = 0;
        hmrDisabled = false;
      }
      
      lastFailureTime = now;
      hmrFailureCount++;
      
      // Disable HMR after threshold
      if (hmrFailureCount >= MAX_HMR_FAILURES && !hmrDisabled) {
        disableHmr();
      }
    }
    
    // Call original console.error
    originalError.apply(console, args);
  };

  // Also listen to Vite HMR events directly
  if (import.meta.hot) {
    import.meta.hot.on('vite:error', (err: any) => {
      handleHmrError(err);
    });
  }

  // Monitor network errors
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('WebSocket') ||
      event.message.includes('Failed to load') ||
      event.message.includes('network')
    )) {
      handleHmrError(event.error);
    }
  }, true);
}

/**
 * Handle HMR error
 */
function handleHmrError(err: any) {
  const now = Date.now();
  
  // Reset counter if enough time has passed
  if (now - lastFailureTime > RESET_DELAY_MS) {
    hmrFailureCount = 0;
    hmrDisabled = false;
  }
  
  lastFailureTime = now;
  hmrFailureCount++;
  
  console.warn(`ViteHmrGuard: Connection failure ${hmrFailureCount}/${MAX_HMR_FAILURES}`);
  
  // Disable HMR after threshold
  if (hmrFailureCount >= MAX_HMR_FAILURES && !hmrDisabled) {
    disableHmr();
  }
}

/**
 * Disable HMR to prevent infinite retries
 */
function disableHmr() {
  if (hmrDisabled) {
    return;
  }
  
  hmrDisabled = true;
  
  console.warn(
    `⚠️ ViteHmrGuard: Disabled HMR after ${MAX_HMR_FAILURES} connection failures. ` +
    `HMR will remain disabled for ${RESET_DELAY_MS / 1000} seconds. ` +
    `Refresh the page to re-enable when server is back online.`
  );
  
  // Disable Vite HMR if possible
  if (import.meta.hot) {
    try {
      // Close any existing HMR connection
      if (import.meta.hot.data) {
        // Mark as disabled in HMR data
        import.meta.hot.data.hmrDisabled = true;
      }
    } catch (e) {
      // Ignore errors when disabling
    }
  }
  
  // Prevent further WebSocket connections by overriding WebSocket constructor temporarily
  const OriginalWebSocket = window.WebSocket;
  let blockedConnections = 0;
  
  (window as any).WebSocket = function(url: string | URL, protocols?: string | string[]) {
    if (typeof url === 'string' && url.includes('localhost:3003')) {
      blockedConnections++;
      if (blockedConnections <= 3) {
        console.warn(`ViteHmrGuard: Blocked HMR WebSocket connection attempt ${blockedConnections}`);
      }
      // Return a dummy WebSocket that does nothing
      const dummy = new OriginalWebSocket('ws://localhost:1'); // Invalid URL
      setTimeout(() => {
        try {
          dummy.close();
        } catch (e) {
          // Ignore
        }
      }, 0);
      return dummy;
    }
    return new OriginalWebSocket(url, protocols);
  };
  
  // Restore WebSocket after delay
  setTimeout(() => {
    (window as any).WebSocket = OriginalWebSocket;
    hmrDisabled = false;
    hmrFailureCount = 0;
    console.info('ViteHmrGuard: Reset. HMR can reconnect now.');
  }, RESET_DELAY_MS);
}

// Auto-initialize if in development
if (import.meta.env.DEV) {
  // Run after a short delay to ensure Vite HMR client has loaded
  setTimeout(() => {
    initViteHmrGuard();
  }, 100);
}

