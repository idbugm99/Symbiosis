/**
 * Logo Plugin
 * Displays the Symbiosis logo and brand name
 */

import { MenuBarPluginBase } from './plugin-base.js';
import type { MenuBarPluginConfig } from '../../types/index.js';

export class LogoPlugin extends MenuBarPluginBase {
  constructor(config: MenuBarPluginConfig, manager: any, dependencies: Record<string, any>) {
    super(config, manager, dependencies);
  }

  render(): HTMLElement {
    // Use existing topbar-logo CSS class for consistency
    const container = document.createElement('div');
    container.className = 'topbar-logo';
    container.title = 'Symbiosis - Research Desktop';
    container.setAttribute('aria-label', 'Symbiosis Logo');
    container.style.cursor = 'pointer';
    container.addEventListener('click', () => this.handleClick());

    // Icon (microscope)
    if (this.settings.showIcon) {
      const icon = document.createElement('span');
      icon.textContent = '🔬';
      container.appendChild(icon);
    }

    // Text (Symbiosis)
    if (this.settings.showText) {
      const text = document.createTextNode(' Symbiosis');
      container.appendChild(text);
    }

    return container;
  }

  /**
   * Handle logo click
   */
  handleClick(): void {
    console.log('Logo clicked - navigating to:', this.settings.link);

    // Navigate to link (default: '/')
    if (this.settings.link) {
      window.location.href = this.settings.link;
    }

    // //FUTURE: Emit event for other plugins
    // this.emit('logo-clicked', { link: this.settings.link });
  }

  /**
   * Update logo settings
   * @param {Object} data - New settings
   */
  update(data: any): void {
    if (data.showIcon !== undefined) {
      this.settings.showIcon = data.showIcon;
    }

    if (data.showText !== undefined) {
      this.settings.showText = data.showText;
    }

    if (data.link !== undefined) {
      this.settings.link = data.link;
    }

    // Re-render if element exists
    if (this.element) {
      const newElement = this.render();
      this.element.replaceWith(newElement);
      this.element = newElement;
    }
  }
}
