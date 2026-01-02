/**
 * Symbiosis Desktop - Phoenix Core Integration
 *
 * This file initializes the Phoenix Core desktop framework with Symbiosis-specific configuration.
 */

// Import phoenix-core Desktop class and styles
import { Desktop } from 'phoenix-core'
import 'phoenix-core/style.css'

// Symbiosis-specific data and configuration
import { availableApps, availableWidgets, gridConfig } from './data/widgets-static'

// Initialize Desktop when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Symbiosis Desktop with Phoenix Core...')

  // Create desktop instance
  // The Desktop class from phoenix-core handles all the managers, orchestrators, and plugins
  window.desktopManager = new Desktop()

  console.log('✅ Symbiosis Desktop initialized successfully')
  console.log('📦 Using Phoenix Core framework')
})
