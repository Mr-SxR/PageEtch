/**
 * PageEtch - Persistent Web Content Editor
 * @file inspector.js - Visual element picker and hover inspector
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

(function () {
  'use strict';

  window.__PAGE_ETCH__ = window.__PAGE_ETCH__ || {};
  const Helpers = window.__PAGE_ETCH__.Helpers;

  const INSPECTOR_CSS = `
    .pageetch-inspector-box {
      position: fixed;
      pointer-events: none;
      border: 2px solid #38bdf8;
      background: rgba(56, 189, 248, 0.18);
      border-radius: 4px;
      z-index: 2147483646;
      transition: all 0.05s ease-out;
      display: none;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.45);
    }

    .pageetch-inspector-badge {
      position: absolute;
      top: -28px;
      left: 0;
      background: #0f172a;
      border: 1px solid #38bdf8;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
    }

    .pageetch-inspector-banner {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f172a;
      border: 1px solid #38bdf8;
      color: #f8fafc;
      padding: 8px 18px;
      border-radius: 9999px;
      box-shadow: 0 12px 20px -3px rgba(0, 0, 0, 0.6);
      z-index: 2147483647;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: pageetch-banner-slide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .pageetch-banner-kbd {
      background: #1e293b;
      border: 1px solid #475569;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      color: #94a3b8;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }

    @keyframes pageetch-banner-slide {
      from { transform: translate(-50%, -18px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `;

  class ElementInspector {
    constructor() {
      this.isActive = false;
      this.currentTarget = null;
      this.highlightBox = null;
      this.badge = null;
      this.banner = null;

      this._onMouseMove = Helpers.rafBatch(this._onMouseMove.bind(this));
      this._onScroll = this._onScroll.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);
    }

    /**
     * Initializes inspector DOM elements inside Shadow DOM
     */
    _ensureElements() {
      window.__PAGE_ETCH__.UI.ensureHost();
      const shadow = window.__PAGE_ETCH__.UI.shadowRoot;

      if (!shadow.querySelector('#pageetch-inspector-style')) {
        const style = document.createElement('style');
        style.id = 'pageetch-inspector-style';
        style.textContent = INSPECTOR_CSS;
        shadow.appendChild(style);
      }

      if (!this.highlightBox) {
        this.highlightBox = document.createElement('div');
        this.highlightBox.className = 'pageetch-inspector-box';

        this.badge = document.createElement('div');
        this.badge.className = 'pageetch-inspector-badge';
        this.highlightBox.appendChild(this.badge);

        shadow.appendChild(this.highlightBox);
      }

      if (!this.banner) {
        this.banner = document.createElement('div');
        this.banner.className = 'pageetch-inspector-banner';
        this.banner.innerHTML = `
          <span>Select any element on the page to edit</span>
          <span class="pageetch-banner-kbd">ESC to cancel</span>
        `;
        shadow.appendChild(this.banner);
      }
    }

    /**
     * Starts visual inspection mode
     */
    start() {
      if (this.isActive) return;
      this.isActive = true;
      this._ensureElements();

      this.banner.style.display = 'flex';
      this.highlightBox.style.display = 'none';

      document.addEventListener('mousemove', this._onMouseMove, true);
      window.addEventListener('scroll', this._onScroll, true);
      document.addEventListener('click', this._onClick, true);
      document.addEventListener('keydown', this._onKeyDown, true);
    }

    /**
     * Stops visual inspection mode and clears highlights
     */
    stop() {
      if (!this.isActive) return;
      this.isActive = false;

      if (this.highlightBox) this.highlightBox.style.display = 'none';
      if (this.banner) this.banner.style.display = 'none';

      document.removeEventListener('mousemove', this._onMouseMove, true);
      window.removeEventListener('scroll', this._onScroll, true);
      document.removeEventListener('click', this._onClick, true);
      document.removeEventListener('keydown', this._onKeyDown, true);

      this.currentTarget = null;
    }

    _updateHighlight(target) {
      if (!target || !Helpers.dom.isEditable(target)) {
        if (this.highlightBox) this.highlightBox.style.display = 'none';
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        if (this.highlightBox) this.highlightBox.style.display = 'none';
        return;
      }

      this.highlightBox.style.display = 'block';
      this.highlightBox.style.top = `${rect.top}px`;
      this.highlightBox.style.left = `${rect.left}px`;
      this.highlightBox.style.width = `${rect.width}px`;
      this.highlightBox.style.height = `${rect.height}px`;

      // Compose descriptive badge
      const tag = target.tagName.toLowerCase();
      const idStr = target.id ? `#${target.id}` : '';
      const firstClass = target.classList && target.classList.length > 0 ? `.${target.classList[0]}` : '';
      this.badge.textContent = `<${tag}${idStr}${firstClass}> ${Math.round(rect.width)}×${Math.round(rect.height)}`;

      // Flip badge inside the box if it overflows the top viewport boundary
      if (rect.top < 34) {
        this.badge.style.top = '4px';
        this.badge.style.left = '4px';
      } else {
        this.badge.style.top = '-28px';
        this.badge.style.left = '0';
      }
    }

    _onMouseMove(e) {
      if (!this.isActive) return;
      const target = e.target;
      this.currentTarget = target;
      this._updateHighlight(target);
    }

    _onScroll() {
      if (!this.isActive || !this.currentTarget) return;
      this._updateHighlight(this.currentTarget);
    }

    _onClick(e) {
      if (!this.isActive) return;

      // Prevent triggering target links, buttons, or form submissions
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const target = this.currentTarget || e.target;
      this.stop();

      if (target && Helpers.dom.isEditable(target)) {
        window.__PAGE_ETCH__.UI.openEditor(target);
      }
    }

    _onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.stop();
      }
    }
  }

  window.__PAGE_ETCH__.Inspector = new ElementInspector();
})();
