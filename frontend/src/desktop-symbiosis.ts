/**
 * Symbiosis Desktop - Phoenix Core Integration
 *
 * This file initializes the Phoenix Core desktop framework with Symbiosis-specific configuration.
 *
 * TEMPORARY FIX: Phoenix-core's Desktop class has hardcoded imports to its stub data files.
 * Until Desktop accepts configuration injection, we use the original Symbiosis desktop.ts
 */

// For now, keep using the local implementation until phoenix-core supports config injection
import './desktop.ts'
