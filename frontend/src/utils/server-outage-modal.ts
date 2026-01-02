/**
 * Server Outage Modal
 * Shows a modal notification when server connection is lost
 */

let modalShown = false;

/**
 * Show server outage modal
 * @param onAcknowledge - Callback when user acknowledges
 * @param onLogout - Callback when user chooses to logout
 */
export function showServerOutageModal(
  onAcknowledge: () => void,
  onLogout: () => void
) {
  // Only show once
  if (modalShown) {
    return;
  }
  
  modalShown = true;
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'server-outage-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `;
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'server-outage-modal';
  modal.style.cssText = `
    background: white;
    border-radius: 18px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    padding: 32px;
    animation: slideUp 0.3s ease;
  `;
  
  // Modal content
  modal.innerHTML = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1f2937;">
        Server Connection Lost
      </h2>
      <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.5;">
        The development server appears to be unavailable. Your work is safe, but hot reloading has been disabled to prevent memory issues.
      </p>
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
        <strong>What happened?</strong><br>
        The connection to the development server was lost. This usually means the server was stopped or crashed.
      </p>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="server-outage-acknowledge" style="
        padding: 10px 20px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        Continue Working
      </button>
      <button id="server-outage-logout" style="
        padding: 10px 20px;
        border: none;
        background: #dc2626;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
      ">
        Logout
      </button>
    </div>
  `;
  
  // Add CSS animations
  if (!document.getElementById('server-outage-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'server-outage-modal-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      #server-outage-acknowledge:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }
      
      #server-outage-logout:hover {
        background: #b91c1c;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
      }
      
      #server-outage-acknowledge:active,
      #server-outage-logout:active {
        transform: scale(0.98);
      }
    `;
    document.head.appendChild(style);
  }
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Button handlers
  const acknowledgeBtn = modal.querySelector('#server-outage-acknowledge');
  const logoutBtn = modal.querySelector('#server-outage-logout');
  
  acknowledgeBtn?.addEventListener('click', () => {
    closeModal();
    onAcknowledge();
  });
  
  logoutBtn?.addEventListener('click', () => {
    closeModal();
    onLogout();
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
      onAcknowledge();
    }
  });
  
  function closeModal() {
    overlay.style.animation = 'fadeOut 0.2s ease';
    modal.style.animation = 'slideDown 0.2s ease';
    setTimeout(() => {
      overlay.remove();
      modalShown = false;
    }, 200);
  }
  
  // Add fadeOut animation if not exists
  if (!document.getElementById('server-outage-modal-animations')) {
    const style = document.createElement('style');
    style.id = 'server-outage-modal-animations';
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes slideDown {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(20px);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Reset modal state (for testing or re-showing)
 */
export function resetServerOutageModal() {
  modalShown = false;
}

