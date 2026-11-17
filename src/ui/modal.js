/**
 * PageEtch - Persistent Web Content Editor
 * @file modal.js - Shadow DOM isolated editor modal, diff visualizer, and toast system
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

(function () {
  'use strict';

  window.__PAGE_ETCH__ = window.__PAGE_ETCH__ || {};
  const Helpers = window.__PAGE_ETCH__.Helpers;

  const MODAL_CSS = `
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #f8fafc;
      z-index: 2147483647;
      position: relative;
    }

    .pageetch-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 2147483647;
      animation: pageetch-fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .pageetch-dialog {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06);
      width: 680px;
      max-width: 95vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: pageetch-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .pageetch-header {
      padding: 1rem 1.25rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .pageetch-title-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .pageetch-logo-badge {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: block;
      object-fit: contain;
      box-shadow: 0 2px 6px rgba(56, 189, 248, 0.35);
      flex-shrink: 0;
    }

    .pageetch-title {
      font-size: 1rem;
      font-weight: 600;
      color: #f8fafc;
      letter-spacing: -0.2px;
    }

    .pageetch-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 5px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .pageetch-close-btn:hover {
      background: #334155;
      color: #fff;
    }

    .pageetch-meta-bar {
      padding: 0.55rem 1.25rem;
      background: #0b1120;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      font-size: 12px;
      color: #94a3b8;
    }

    .pageetch-meta-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow-x: auto;
    }

    .pageetch-pill {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 2px 8px;
      border-radius: 9999px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #38bdf8;
      white-space: nowrap;
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pageetch-scope-select {
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      outline: none;
      cursor: pointer;
    }

    .pageetch-scope-select:focus {
      border-color: #38bdf8;
    }

    .pageetch-tabs {
      display: flex;
      background: #1e293b;
      padding: 0 1.25rem;
      border-bottom: 1px solid #334155;
      gap: 1.25rem;
    }

    .pageetch-tab-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
      padding: 0.7rem 0.2rem;
      cursor: pointer;
      position: relative;
      transition: color 0.15s;
    }

    .pageetch-tab-btn:hover {
      color: #f8fafc;
    }

    .pageetch-tab-btn.active {
      color: #38bdf8;
    }

    .pageetch-tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: #38bdf8;
      border-radius: 2px 2px 0 0;
    }

    .pageetch-body {
      padding: 1.25rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 260px;
    }

    .pageetch-editor-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
    }

    .pageetch-editor-pane.hidden {
      display: none;
    }

    .pageetch-textarea {
      width: 100%;
      min-height: 240px;
      background: #020617;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
      padding: 0.85rem;
      resize: vertical;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .pageetch-textarea:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }

    .pageetch-visual-area {
      min-height: 240px;
      background: #020617;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1rem;
      color: #f8fafc;
      outline: none;
      overflow-y: auto;
      line-height: 1.6;
    }

    .pageetch-visual-area:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }

    .pageetch-diff-view {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      font-size: 12px;
      height: 100%;
    }

    .pageetch-diff-col {
      background: #020617;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.75rem;
      max-height: 240px;
      overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      white-space: pre-wrap;
      word-break: break-all;
      color: #cbd5e1;
    }

    .pageetch-diff-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 0.4rem;
      letter-spacing: 0.5px;
    }

    .pageetch-footer {
      padding: 1rem 1.25rem;
      background: #1e293b;
      border-top: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .pageetch-actions-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pageetch-actions-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .pageetch-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.52rem 1rem;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease-in-out;
    }

    .pageetch-btn-primary {
      background: #0284c7;
      color: #fff;
    }

    .pageetch-btn-primary:hover {
      background: #0369a1;
    }

    .pageetch-btn-secondary {
      background: transparent;
      color: #cbd5e1;
      border-color: #475569;
    }

    .pageetch-btn-secondary:hover {
      background: #334155;
      color: #fff;
    }

    .pageetch-btn-danger {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.25);
    }

    .pageetch-btn-danger:hover {
      background: #ef4444;
      color: #fff;
    }

    .pageetch-toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 2147483647;
      pointer-events: none;
    }

    .pageetch-toast {
      pointer-events: auto;
      background: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 0.7rem 1.1rem;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 13px;
      animation: pageetch-toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .pageetch-toast.success {
      border-left: 3px solid #10b981;
    }

    .pageetch-toast.error {
      border-left: 3px solid #ef4444;
    }

    @keyframes pageetch-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes pageetch-pop-in {
      from { transform: scale(0.96) translateY(6px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    @keyframes pageetch-toast-in {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;

  class UIManager {
    constructor() {
      this.hostElement = null;
      this.shadowRoot = null;
    }

    /**
     * Ensures Shadow DOM container exists on the host document
     */
    ensureHost() {
      if (this.hostElement && this.shadowRoot) return;

      const existing = document.getElementById('pageetch-root');
      if (existing) existing.remove();

      this.hostElement = document.createElement('div');
      this.hostElement.id = 'pageetch-root';
      this.hostElement.setAttribute('data-pageetch-ui', 'true');
      this.shadowRoot = this.hostElement.attachShadow({ mode: 'closed' });

      const style = document.createElement('style');
      style.textContent = MODAL_CSS;
      this.shadowRoot.appendChild(style);

      const toastContainer = document.createElement('div');
      toastContainer.className = 'pageetch-toast-container';
      this.shadowRoot.appendChild(toastContainer);

      (document.body || document.documentElement).appendChild(this.hostElement);
    }

    /**
     * Shows a toast notification inside the isolated Shadow DOM
     * @param {string} message - Toast message text
     * @param {'info'|'success'|'error'} [type='success'] - Toast type
     * @param {number} [duration=2500] - Duration in ms
     */
    showToast(message, type = 'success', duration = 2500) {
      this.ensureHost();
      const container = this.shadowRoot.querySelector('.pageetch-toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `pageetch-toast ${type}`;
      toast.textContent = message;
      container.appendChild(toast);

      setTimeout(() => {
        toast.style.transition = 'opacity 0.2s, transform 0.2s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 200);
      }, duration);
    }

    /**
     * Opens the PageEtch Editor Modal for target DOM element
     * @param {Element} targetElement - DOM element selected for editing
     */
    openEditor(targetElement) {
      this.ensureHost();

      // Close existing dialog if already open
      const existingOverlay = this.shadowRoot.querySelector('.pageetch-overlay');
      if (existingOverlay) existingOverlay.remove();

      const SelectorEngine = window.__PAGE_ETCH__.SelectorEngine;
      const Storage = window.__PAGE_ETCH__.Storage;

      const fingerprint = SelectorEngine.generate(targetElement);
      const isInput = Helpers.dom.isFormInput(targetElement);
      const originalContent = Helpers.dom.getContent(targetElement);

      // Check existing edits for this element
      const currentUrl = window.location.href;
      const pageEdits = Storage.getAllEditsForPage(currentUrl);
      const existingEdit = pageEdits.find(e => e.selector === fingerprint.selector);

      const initialMatchMode = existingEdit ? existingEdit.matchMode : (Storage.settingsCache.defaultMatchMode || 'path');

      const overlay = document.createElement('div');
      overlay.className = 'pageetch-overlay';

      overlay.innerHTML = `
        <div class="pageetch-dialog" role="dialog" aria-modal="true" aria-labelledby="pageetch-title">
          <div class="pageetch-header">
            <div class="pageetch-title-group">
              <img src="${chrome.runtime.getURL('icons/icon.svg')}" alt="PageEtch Logo" class="pageetch-logo-badge">
              <h2 class="pageetch-title" id="pageetch-title">PageEtch &bull; Edit Element</h2>
            </div>
            <button class="pageetch-close-btn" id="pageetch-btn-close" title="Close (Esc)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="pageetch-meta-bar">
            <div class="pageetch-meta-left">
              <span>Tag: <strong class="pageetch-pill">&lt;${fingerprint.tagName}&gt;</strong></span>
              <span>Selector: <span class="pageetch-pill" title="${Helpers.dom.escapeHtml(fingerprint.selector)}">${Helpers.dom.escapeHtml(fingerprint.selector)}</span></span>
            </div>
            <div>
              <select class="pageetch-scope-select" id="pageetch-scope-select" title="Choose which pages this edit applies to">
                <option value="path" ${initialMatchMode === 'path' ? 'selected' : ''}>Path Scope (/path)</option>
                <option value="origin" ${initialMatchMode === 'origin' ? 'selected' : ''}>Entire Domain (*.site)</option>
                <option value="exact" ${initialMatchMode === 'exact' ? 'selected' : ''}>Exact URL (full params)</option>
              </select>
            </div>
          </div>

          <div class="pageetch-tabs">
            <button class="pageetch-tab-btn active" data-tab="html">HTML Source</button>
            <button class="pageetch-tab-btn" data-tab="visual">Visual Text</button>
            <button class="pageetch-tab-btn" data-tab="diff">Compare Diff</button>
          </div>

          <div class="pageetch-body">
            <!-- HTML Source Pane -->
            <div class="pageetch-editor-pane" id="pageetch-pane-html">
              <textarea class="pageetch-textarea" id="pageetch-html-input" spellcheck="false" placeholder="Enter HTML or content here..."></textarea>
            </div>

            <!-- Visual Text Pane -->
            <div class="pageetch-editor-pane hidden" id="pageetch-pane-visual">
              <div class="pageetch-visual-area" id="pageetch-visual-input" contenteditable="true"></div>
            </div>

            <!-- Diff Comparison Pane -->
            <div class="pageetch-editor-pane hidden" id="pageetch-pane-diff">
              <div class="pageetch-diff-view">
                <div>
                  <div class="pageetch-diff-label">Original Content</div>
                  <div class="pageetch-diff-col" id="pageetch-diff-orig"></div>
                </div>
                <div>
                  <div class="pageetch-diff-label">Modified Content</div>
                  <div class="pageetch-diff-col" id="pageetch-diff-new"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="pageetch-footer">
            <div class="pageetch-actions-left">
              ${existingEdit ? '<button class="pageetch-btn pageetch-btn-danger" id="pageetch-btn-reset">Reset to Original</button>' : ''}
            </div>
            <div class="pageetch-actions-right">
              <button class="pageetch-btn pageetch-btn-secondary" id="pageetch-btn-cancel">Cancel</button>
              <button class="pageetch-btn pageetch-btn-primary" id="pageetch-btn-save">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save &amp; Persist
              </button>
            </div>
          </div>
        </div>
      `;

      this.shadowRoot.appendChild(overlay);

      const htmlInput = overlay.querySelector('#pageetch-html-input');
      const visualInput = overlay.querySelector('#pageetch-visual-input');
      const diffOrig = overlay.querySelector('#pageetch-diff-orig');
      const diffNew = overlay.querySelector('#pageetch-diff-new');
      const scopeSelect = overlay.querySelector('#pageetch-scope-select');

      // Populate initial values
      const initialContent = existingEdit ? existingEdit.editedHtml : originalContent;
      htmlInput.value = initialContent;
      visualInput.innerHTML = initialContent;

      // Track active tab state and current working buffer
      let currentActiveTab = 'html';

      const getLatestBuffer = () => {
        if (currentActiveTab === 'visual') {
          return visualInput.innerHTML;
        }
        return htmlInput.value;
      };

      const syncAllPanes = () => {
        const currentBuffer = getLatestBuffer();
        if (currentActiveTab === 'visual') {
          htmlInput.value = currentBuffer;
        } else {
          visualInput.innerHTML = currentBuffer;
        }
        diffOrig.textContent = originalContent;
        diffNew.textContent = currentBuffer;
      };

      // 2-space indentation support in textarea
      htmlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = htmlInput.selectionStart;
          const end = htmlInput.selectionEnd;
          htmlInput.value = htmlInput.value.substring(0, start) + '  ' + htmlInput.value.substring(end);
          htmlInput.selectionStart = htmlInput.selectionEnd = start + 2;
        }
      });

      // Synchronize panes on tab switch
      const tabBtns = overlay.querySelectorAll('.pageetch-tab-btn');
      const panes = {
        html: overlay.querySelector('#pageetch-pane-html'),
        visual: overlay.querySelector('#pageetch-pane-visual'),
        diff: overlay.querySelector('#pageetch-pane-diff')
      };

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const nextTab = btn.dataset.tab;
          if (nextTab === currentActiveTab) return;

          // Sync before switching
          syncAllPanes();

          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          Object.keys(panes).forEach(p => {
            panes[p].classList.toggle('hidden', p !== nextTab);
          });

          currentActiveTab = nextTab;

          if (nextTab === 'html') {
            htmlInput.focus();
          } else if (nextTab === 'visual') {
            visualInput.focus();
          }
        });
      });

      // Autofocus textarea
      setTimeout(() => htmlInput.focus(), 60);

      // Teardown / Close handler
      const close = () => {
        overlay.remove();
        document.removeEventListener('keydown', handleGlobalKeyDown);
      };

      const handleGlobalKeyDown = (e) => {
        if (e.key === 'Escape') {
          close();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) {
          e.preventDefault();
          save();
        }
      };

      document.addEventListener('keydown', handleGlobalKeyDown);

      overlay.querySelector('#pageetch-btn-close').addEventListener('click', close);
      overlay.querySelector('#pageetch-btn-cancel').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      // Save and persist routine
      const save = async () => {
        syncAllPanes();
        const finalHtml = getLatestBuffer();
        const selectedMatchMode = scopeSelect.value || 'path';

        try {
          // Immediately update live DOM
          Helpers.dom.setContent(targetElement, finalHtml);

          // Store rule in persistence engine
          const savedRecord = await Storage.saveEdit({
            id: existingEdit ? existingEdit.id : undefined,
            url: window.location.href,
            matchMode: selectedMatchMode,
            selector: fingerprint.selector,
            xpath: fingerprint.xpath,
            textAnchor: Helpers.dom.getSnippet(finalHtml, 60),
            tagName: fingerprint.tagName,
            originalHtml: originalContent,
            editedHtml: finalHtml,
            enabled: true
          });

          targetElement.setAttribute('data-pageetch-applied', savedRecord.id);

          this.showToast('Etched & persisted successfully!');
          close();
        } catch (err) {
          console.error('[PageEtch:UI] Save error:', err);
          this.showToast('Failed to save changes.', 'error');
        }
      };

      overlay.querySelector('#pageetch-btn-save').addEventListener('click', save);

      // Reset to original handler
      const resetBtn = overlay.querySelector('#pageetch-btn-reset');
      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          try {
            await Storage.deleteEdit(existingEdit.id, existingEdit.urlKey);
            targetElement.removeAttribute('data-pageetch-applied');

            if (typeof existingEdit.originalHtml === 'string' && existingEdit.originalHtml !== '') {
              Helpers.dom.setContent(targetElement, existingEdit.originalHtml);
            } else {
              Helpers.dom.setContent(targetElement, originalContent);
            }

            this.showToast('Restored original element content.');
            close();
          } catch (err) {
            console.error('[PageEtch:UI] Reset error:', err);
            this.showToast('Error resetting element.', 'error');
          }
        });
      }
    }
  }

  window.__PAGE_ETCH__.UI = new UIManager();
})();
