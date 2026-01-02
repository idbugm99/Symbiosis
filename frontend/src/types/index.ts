/**
 * Symbiosis Type Definitions
 * Central type definitions for the entire application
 *
 * ## Usage Guidelines
 *
 * ### String Literal Constants
 * Always use the exported constants instead of string literals for type safety:
 *
 * ❌ BAD (string literals - prone to typos, no autocomplete):
 * ```typescript
 * if (widget.type === 'app') { }
 * if (displayMode === 'popup') { }
 * ```
 *
 * ✅ GOOD (constants - type-safe, autocomplete, refactorable):
 * ```typescript
 * import { WidgetType, DisplayMode } from './types/index.js';
 *
 * if (widget.type === WidgetType.APP) { }
 * if (displayMode === DisplayMode.POPUP) { }
 * ```
 *
 * ### Benefits
 * - **Autocomplete**: IDE suggests all valid values
 * - **Type Safety**: Compile-time errors for invalid values
 * - **Refactoring**: Rename in one place, updates everywhere
 * - **Searchability**: "Find all references" works
 * - **No Runtime Overhead**: Constants are just strings
 */

// ============================================================================
// TYPE CONSTANTS (for compile-time safety and autocomplete)
// ============================================================================

/**
 * Widget/App type constants
 * Use these instead of string literals for type safety and autocomplete
 * @example if (widget.type === WidgetType.APP) { ... }
 */
export const WidgetType = {
  WIDGET: 'widget',
  APP: 'app'
} as const;

/**
 * Display mode constants for app instances
 * @example if (displayMode === DisplayMode.POPUP) { ... }
 */
export const DisplayMode = {
  FULLSCREEN: 'fullscreen',
  FULLSCREEN_NO_NAV: 'fullscreen-no-nav',
  FULLSCREEN_NO_DOCK: 'fullscreen-no-dock',
  POPUP: 'popup',
  MODAL: 'modal',
  EMBEDDED: 'embedded'
} as const;

/**
 * Animation type constants
 * @example animation: AnimationType.FADE
 */
export const AnimationType = {
  FADE: 'fade',
  SLIDE_RIGHT: 'slide-right',
  SLIDE_LEFT: 'slide-left',
  EXPAND_FROM_WIDGET: 'expand-from-widget',
  NONE: 'none'
} as const;

/**
 * Header display mode constants
 * @example if (headerDisplay === HeaderDisplay.NEVER) { ... }
 */
export const HeaderDisplay = {
  ALWAYS: 'always',
  HOVER: 'hover',
  NEVER: 'never',
  AUTO: 'auto'
} as const;

/**
 * Launch trigger constants
 * @example launchTrigger: LaunchTrigger.DOUBLE_CLICK
 */
export const LaunchTrigger = {
  CLICK: 'click',
  DOUBLE_CLICK: 'doubleClick',
  LONG_PRESS: 'longPress',
  BUTTON: 'button'
} as const;

/**
 * Menu bar position constants
 * @example position: MenuBarPosition.CENTER
 */
export const MenuBarPosition = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right'
} as const;

/**
 * Dock app type constants
 * @example if (app.type === DockAppType.DIVIDER) { ... }
 */
export const DockAppType = {
  APP: 'app',
  DIVIDER: 'divider',
  SYSTEM: 'system',
  WIDGET: 'widget'
} as const;

// Type aliases derived from constants (for type annotations)
export type WidgetTypeValue = typeof WidgetType[keyof typeof WidgetType];
export type DisplayModeValue = typeof DisplayMode[keyof typeof DisplayMode];
export type AnimationTypeValue = typeof AnimationType[keyof typeof AnimationType];
export type HeaderDisplayValue = typeof HeaderDisplay[keyof typeof HeaderDisplay];
export type LaunchTriggerValue = typeof LaunchTrigger[keyof typeof LaunchTrigger];
export type MenuBarPositionValue = typeof MenuBarPosition[keyof typeof MenuBarPosition];
export type DockAppTypeValue = typeof DockAppType[keyof typeof DockAppType];

// ============================================================================
// WIDGET & APP TYPES
// ============================================================================

export interface WidgetDefinition {
  id: string;
  name: string;
  icon: string;
  type: 'widget' | 'app';
  category: string;
  size: string;
  cols: number;
  rows: number;
  description: string;
  hasLiveContent?: boolean;
  controlledBy?: string;
  headerDisplay?: 'always' | 'hover' | 'never' | 'auto';
  launchesApp?: string;
  launchTrigger?: 'click' | 'doubleClick' | 'longPress' | 'button';
  instanceSettingsOverride?: AppInstanceSettings;
}

export interface WidgetInstance {
  id: string;
  userId: string;
  workspaceId: string;
  widgetDefId: string;
  cell: number;
  occupiedCells: number[];
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // Enriched fields (from definition)
  name?: string;
  icon?: string;
  type?: 'widget' | 'app';
  category?: string;
  size?: string;
  cols?: number;
  rows?: number;
  description?: string;
  headerDisplay?: 'always' | 'hover' | 'never' | 'auto';
  launchesApp?: string;
  launchTrigger?: 'click' | 'doubleClick' | 'longPress' | 'button';
}

export interface AppInstanceSettings {
  displayMode?: 'fullscreen' | 'fullscreen-no-nav' | 'fullscreen-no-dock' | 'popup' | 'modal' | 'embedded';
  animation?: 'fade' | 'slide-right' | 'slide-left' | 'expand-from-widget' | 'none';
  multiInstance?: boolean;
  showCloseButton?: boolean;
  showMinimizeButton?: boolean;
  dock?: boolean;
  menuBar?: boolean;
  sideNav?: boolean;
  dimensions?: { width: number; height: number };
  position?: 'center' | { x: number; y: number };
}

/**
 * App Lifecycle Hooks
 * Optional callbacks that apps can implement to manage their lifecycle
 *
 * @example
 * export default {
 *   onMount(container, settings, context) {
 *     // Initialize app, render UI, start timers
 *     container.innerHTML = '<div>My App</div>';
 *   },
 *   onUnmount() {
 *     // Cleanup: clear timers, cancel requests, remove listeners
 *   }
 * }
 */
export interface AppLifecycleHooks {
  /**
   * Called when app window is created and mounted to DOM
   * @param container - The app's content container element
   * @param settings - Instance settings for this app window
   * @param context - App context with instanceId, appId, eventBus
   */
  onMount?: (
    container: HTMLElement,
    settings: AppInstanceSettings,
    context: AppLifecycleContext
  ) => void | Promise<void>;

  /**
   * Called before app window is destroyed
   * Use this to cleanup resources: timers, listeners, network requests
   */
  onUnmount?: () => void | Promise<void>;

  /**
   * Called when app window is resized
   * @param dimensions - New width and height of the window
   */
  onResize?: (dimensions: { width: number; height: number }) => void;

  /**
   * Called when app window gains focus (brought to front)
   */
  onFocus?: () => void;

  /**
   * Called when app window loses focus (another window brought to front)
   */
  onBlur?: () => void;
}

/**
 * Context object passed to app lifecycle hooks
 * Provides access to app identity and communication channels
 */
export interface AppLifecycleContext {
  instanceId: string;
  appId: string;
  eventBus: EventBus | null;
  closeApp: () => void;
  updateSettings: (newSettings: Partial<AppInstanceSettings>) => void;
}

/**
 * App Module Structure
 * Apps should export an object or class implementing lifecycle hooks
 *
 * @example Default export with hooks
 * export default {
 *   onMount(container, settings, context) { },
 *   onUnmount() { }
 * }
 *
 * @example Class-based app
 * export default class MyApp {
 *   onMount(container, settings, context) { }
 *   onUnmount() { }
 * }
 */
export interface AppModule {
  onMount?: AppLifecycleHooks['onMount'];
  onUnmount?: AppLifecycleHooks['onUnmount'];
  onResize?: AppLifecycleHooks['onResize'];
  onFocus?: AppLifecycleHooks['onFocus'];
  onBlur?: AppLifecycleHooks['onBlur'];
}

// ============================================================================
// USER & WORKSPACE TYPES
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role?: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GRID & LAYOUT TYPES
// ============================================================================

export interface GridConfig {
  columns: number;
  rows: number;
  totalCells: number;
  cellSize: number;
  gap: number;
}

export interface CellPosition {
  cell: number;
  row: number;
  col: number;
}

// ============================================================================
// EVENT BUS TYPES
// ============================================================================

export type EventCallback = (data?: any) => void;

export interface EventListenerMap {
  [eventName: string]: EventCallback[];
}

export interface EventLogEntry {
  event: string;
  data: unknown;
  timestamp: string;
}

export const EventNames = {
  // Widget Events
  WIDGET_ADDED: 'widget:added',
  WIDGET_REMOVED: 'widget:removed',
  WIDGET_MOVED: 'widget:moved',
  WIDGET_UPDATED: 'widget:updated',
  WIDGET_CLICKED: 'widget:clicked',
  WIDGET_DOUBLE_CLICKED: 'widget:double-clicked',
  WIDGET_LONG_PRESSED: 'widget:long-pressed',
  WIDGETS_CHANGED: 'widgets:changed',
  WIDGETS_WIGGLE_MODE_ENTERED: 'widgets:wiggle-mode-entered',
  WIDGETS_WIGGLE_MODE_EXITED: 'widgets:wiggle-mode-exited',

  // Workspace Events
  WORKSPACE_SWITCHED: 'workspace:switched',
  WORKSPACE_CREATED: 'workspace:created',
  WORKSPACE_DELETED: 'workspace:deleted',
  WORKSPACE_RENAMED: 'workspace:renamed',
  WORKSPACE_SAVED: 'workspace:saved',
  WORKSPACE_SAVE_REQUESTED: 'workspace:save-requested',

  // Dock Events
  DOCK_APP_CLICKED: 'dock:app-clicked',
  DOCK_WIDGET_ADDED: 'dock:widget-added',

  // App Events
  APP_OPENED: 'app:opened',
  APP_CLOSED: 'app:closed',
  APP_FOCUSED: 'app:focused',

  // UI Events
  WELCOME_SHOW: 'welcome:show',
  WELCOME_HIDE: 'welcome:hide',
  GRID_CLEARED: 'grid:cleared',

  // Storage Events
  STORAGE_SAVED: 'storage:saved',
  STORAGE_LOADED: 'storage:loaded',
  STORAGE_ERROR: 'storage:error',

  // Error Events
  ERROR_OCCURRED: 'error:occurred'
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];

// ============================================================================
// MANAGER TYPES
// ============================================================================

export interface EventBus {
  on(eventName: string, handler: EventCallback): void;
  off(eventName: string, handler: EventCallback): void;
  emit(eventName: string, data?: unknown): void;
  once(eventName: string, handler: EventCallback): void;
}

export interface StorageManager {
  loadWorkspaces(): Workspace[];
  saveWorkspaces(workspaces: Workspace[]): void;
  loadCurrentWorkspaceId(): string;
  saveCurrentWorkspaceId(id: string): void;
  getWidgetInstances(): WidgetInstance[];
  saveWidgetInstances(instances: WidgetInstance[]): void;
  getWidgetInstancesForWorkspace(workspaceId: string, enriched?: boolean): WidgetInstance[];
  enrichWidgetInstance(instance: WidgetInstance): WidgetInstance;
  getWidgetDefinition(id: string): WidgetDefinition | null;
  getUser(): User;
  loadDockApps(): DockApp[] | null;
  saveDockApps(apps: DockApp[]): void;
}

export interface WidgetRegistry {
  registerDefinition(id: string, definition: WidgetDefinition): void;
  registerDefinitions(definitions: WidgetDefinition[], skipErrors?: boolean): { registered: number; errors: string[] };
  registerComponent(id: string, ComponentClass: unknown): void;
  registerLoader(id: string, loader: () => Promise<unknown>): void;
  getDefinition(id: string): WidgetDefinition | null;
  getDefinitions(filters?: { type?: string; category?: string; size?: string }): WidgetDefinition[];
  hasDefinition(id: string): boolean;
  hasComponent(id: string): boolean;
  hasLoader(id: string): boolean;
  getComponent(id: string): Promise<unknown>;
}

export interface WidgetRegistryOptions {
  eventBus?: EventBus;
}

export interface WidgetInteractionsOptions {
  widgetManager?: any; // WidgetManager (avoiding circular dependency)
  wiggleModeController?: any; // WidgetWiggleMode (avoiding circular dependency)
  eventBus?: EventBus;
  domHelper?: DOMHelper;
  gridContainer?: HTMLElement;
  longPressDelay?: number;
  doubleClickDelay?: number;
}

export interface WidgetWiggleModeOptions {
  widgetManager?: any; // WidgetManager (avoiding circular dependency)
  eventBus?: EventBus;
  domHelper?: DOMHelper;
  gridContainer?: HTMLElement;
}

// ============================================================================
// MANAGER OPTIONS TYPES
// ============================================================================

export interface EventBusOptions {
  debug?: boolean;
  strictMode?: boolean;
}

export interface StorageManagerOptions {
  storageKey?: string;
}

export interface WidgetManagerOptions {
  eventBus?: EventBus;
  storageManager?: StorageManager;
  domHelper?: DOMHelper;
  widgetRegistry?: WidgetRegistry;
}

export interface WorkspaceManagerOptions {
  eventBus?: EventBus;
  storageManager?: StorageManager;
  domHelper?: DOMHelper;
  widgetRegistry?: WidgetRegistry;
}

export interface DockManagerOptions {
  storageManager?: StorageManager;
  eventBus?: EventBus;
  domHelper?: DOMHelper;
}

export interface MenuBarManagerOptions {
  container?: HTMLElement | null;
  userRole?: string;
  domHelper?: DOMHelper;
  dependencies?: Record<string, any>;
}

export interface MenuBarPluginConfig {
  id: string;
  name: string;
  version: string;
  position: 'left' | 'center' | 'right';
  order: number;
  enabled: boolean;
  hideInMobile: boolean;
  requiredRoles: string[];
  settings: Record<string, any>;
}

export interface DrawerManagerOptions {
  eventBus?: EventBus;
  widgetDefinitions?: WidgetDefinition[];
  domHelper?: DOMHelper;
}

export interface WidgetUIControllerOptions {
  appUIController?: any; // AppUIController (avoiding circular dependency)
  widgetManager?: any; // WidgetManager (avoiding circular dependency)
  eventBus?: EventBus;
  domHelper?: DOMHelper;
  gridContainer?: HTMLElement;
  widgetRegistry?: WidgetRegistry;
}

// ============================================================================
// DOCK TYPES
// ============================================================================

export interface DockApp {
  id: string;
  name: string;
  icon: string;
  type: 'app' | 'divider' | 'system' | 'widget';
  permanent?: boolean;
}

// ============================================================================
// MENU BAR TYPES
// ============================================================================

export interface MenuBarConfig {
  availablePlugins: MenuBarPluginDefinition[];
  layout: {
    left: string[];
    center: string[];
    right: string[];
  };
  settings: Record<string, any>;
}

export interface MenuBarPluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  requiredRole?: string;
}

// ============================================================================
// ERROR BOUNDARY TYPES
// ============================================================================

export interface ErrorBoundaryOptions {
  logErrors?: boolean;
  showUI?: boolean;
  onError?: (error: Error, context: string) => void;
}

// ============================================================================
// PERFORMANCE MONITOR TYPES
// ============================================================================

export interface PerformanceMonitorOptions {
  enabled?: boolean;
  slowThreshold?: number;
  autoReport?: boolean;
}

// ============================================================================
// HOTKEY TYPES
// ============================================================================

export type HotkeyCallback = () => void;

export interface HotkeyRegistration {
  key: string;
  callback: HotkeyCallback;
  description?: string;
}

// ============================================================================
// DOM HELPER TYPES
// ============================================================================

export interface DOMHelper {
  getElementById(id: string): HTMLElement | null;
  querySelector(selector: string): HTMLElement | null;
  querySelectorAll(selector: string): NodeListOf<Element>;
  createElement(tag: string, className?: string, attributes?: Record<string, any>): HTMLElement;
  addEventListener(element: Element | Document | Window, event: string, handler: EventListener, options?: AddEventListenerOptions | boolean): () => void;
  removeElement(element: Element): void;
  toggleClass(element: Element, className: string, force?: boolean): void;
  clearChildren(element: Element): void;
  createText(text: string, tag?: string, className?: string): HTMLElement;
  createIcon(icon: string, className?: string): HTMLElement;
  appendChildren(parent: HTMLElement, children: HTMLElement[]): void;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// ============================================================================
// STORAGE DATA TYPES
// ============================================================================

export interface StorageData {
  widgetDefinitions: WidgetDefinition[];
  user: User;
  workspaces: Workspace[];
  widgetInstances: WidgetInstance[];
  currentWorkspaceId: string;
  version: string;
  lastSaved: string;
}
