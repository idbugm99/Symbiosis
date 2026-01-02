/**
 * Search Plugin
 * Provides search functionality for Symbiosis
 */

import { MenuBarPluginBase } from './plugin-base.js';
import type { MenuBarPluginConfig } from '../../types/index.js';

export class SearchPlugin extends MenuBarPluginBase {
  // Properties
  private expanded: boolean;

  constructor(config: MenuBarPluginConfig, manager: any, dependencies: Record<string, any>) {
    super(config, manager, dependencies);

    this.expanded = false;
  }

  render(): HTMLElement {
    // Use existing topbar-search CSS class
    const container = document.createElement('div');
    container.className = 'topbar-search';

    // Search input (expands on hover/focus)
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = this.settings.placeholder || 'Search chemicals, equipment, experiments...';
    input.addEventListener('input', (e: any) => this.handleSearch(e.target.value));
    input.addEventListener('keydown', (e: any) => {
      if (e.key === 'Enter') {
        this.handleSearchSubmit(e.target.value);
      }
    });
    container.appendChild(input);

    // Search icon (appended after input so it overlays correctly)
    const icon = document.createElement('span');
    icon.className = 'topbar-search-icon';
    icon.textContent = '🔍';
    container.appendChild(icon);

    return container;
  }

  /**
   * Handle search input
   */
  handleSearch(value: string): void {
    console.log('SearchPlugin: Search input:', value);
    // TODO: Implement live search suggestions
  }

  /**
   * Handle search submit
   */
  handleSearchSubmit(value: string): void {
    console.log('SearchPlugin: Search submitted:', value);
    this.performSearch(value);
  }

  /**
   * Handle search icon click
   */
  handleClick(): void {
    console.log('SearchPlugin: Search clicked');

    if (this.settings.expandOnClick) {
      this.expand();
    } else {
      this.openSearchModal();
    }

    // //FUTURE: Emit event
    // this.emit('search-opened', {});
  }

  /**
   * Expand search (show input field inline)
   */
  expand(): void {
    if (this.expanded) return;

    this.expanded = true;

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = this.settings.placeholder;
    input.className = 'search-input';
    input.style.border = '1px solid #d1d5db';
    input.style.borderRadius = '4px';
    input.style.padding = '6px 12px';
    input.style.fontSize = '14px';
    input.style.outline = 'none';
    input.style.width = '250px';
    input.style.backgroundColor = '#ffffff';

    // Focus on input
    setTimeout(() => input.focus(), 0);

    // Add to container
    this.element.appendChild(input);

    // Keep expanded background
    this.element.style.backgroundColor = 'rgba(243, 244, 246, 0.8)';

    // Search on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.collapse();
      }
    });

    // Collapse on blur
    input.addEventListener('blur', () => {
      setTimeout(() => this.collapse(), 200);
    });

    // Stop propagation to prevent container click
    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Collapse search (hide input field)
   */
  collapse(): void {
    if (!this.expanded) return;

    this.expanded = false;

    // Remove input field
    const input = this.element.querySelector('.search-input');
    if (input) {
      input.remove();
    }

    // Reset background
    this.element.style.backgroundColor = 'transparent';
  }

  /**
   * Open search modal (for non-expand mode)
   */
  openSearchModal(): void {
    // TODO: Implement search modal
    console.log('SearchPlugin: Opening search modal');

    alert('Search modal coming soon!\n\nFor now, this is a placeholder for the full search interface.');
  }

  /**
   * Perform search
   * @param {string} query - Search query
   */
  performSearch(query: string): void {
    if (!query.trim()) {
      this.collapse();
      return;
    }

    console.log(`SearchPlugin: Searching for "${query}" in scope "${this.settings.scope}"`);

    // TODO: Implement actual search logic
    alert(`Search: "${query}"\nScope: ${this.settings.scope}\n\nSearch functionality coming soon!`);

    this.collapse();

    // //FUTURE: Emit event
    // this.emit('search-performed', { query, scope: this.settings.scope });
  }
}
