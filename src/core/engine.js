/**
 * PageEtch - Persistent Web Content Editor
 * @file engine.js - High-performance DOM observer, batch patcher, and SPA router sync
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

(function () {
  'use strict';

  window.__PAGE_ETCH__ = window.__PAGE_ETCH__ || {};
  const Helpers = window.__PAGE_ETCH__.Helpers;

  class PersistenceEngine {
    constructor() {
      this.observer = null;
      this.isObserving = false;
      this.currentUrl = window.location.href;
      this.isApplying = false;

      /**
       * In-memory cache of original HTML/content keyed by edit ID
       * Ensures instantaneous reversion even when an edit is deleted from storage
       * @type {Map<string, string>}
       */
      this.originalSnapshots = new Map();

      this._debouncedApply = Helpers.debounce(() => this.applyAll(), 75);
    }

    /**
     * Initializes engine and begins observing
     */
    async start() {
      const Storage = window.__PAGE_ETCH__.Storage;
      await Storage.init();

      // Apply active edits immediately upon startup
      this.applyAll();

      // Start the DOM Mutation Observer
      this.startObserver();

      // Listen for reactive storage updates
      Storage.subscribe(() => {
        this.applyAll();
      });

      // Hook SPA client-side routing
      this._hookSpaNavigation();
    }

    /**
     * Applies all active edits and cleanly reverts any disabled or deleted edits
     */
    applyAll() {
      if (this.isApplying) return;
      this.isApplying = true;

      try {
        const Storage = window.__PAGE_ETCH__.Storage;
        const SelectorEngine = window.__PAGE_ETCH__.SelectorEngine;
        const currentUrl = window.location.href;

        const activeEdits = Storage.getEditsForPage(currentUrl);
        const activeIdSet = new Set(activeEdits.map(e => e.id));

        // Step 1: Revert elements whose edits have been disabled or deleted
        const appliedElements = document.querySelectorAll('[data-pageetch-applied]');
        if (appliedElements.length > 0) {
          const allEdits = Storage.getAllEditsForPage(currentUrl);

          appliedElements.forEach(el => {
            const appliedId = el.getAttribute('data-pageetch-applied');
            if (!activeIdSet.has(appliedId)) {
              // Priority 1: In-memory original snapshot
              if (this.originalSnapshots.has(appliedId)) {
                Helpers.dom.setContent(el, this.originalSnapshots.get(appliedId));
              } else {
                // Priority 2: Stored record original content
                const matched = allEdits.find(e => e.id === appliedId);
                if (matched && typeof matched.originalHtml === 'string' && matched.originalHtml !== '') {
                  Helpers.dom.setContent(el, matched.originalHtml);
                }
              }
              el.removeAttribute('data-pageetch-applied');
            }
          });
        }

        // Step 2: Apply active edits
        for (const edit of activeEdits) {
          const el = SelectorEngine.resolve(edit);
          if (el && el.nodeType === Node.ELEMENT_NODE) {
            const currentContent = Helpers.dom.getContent(el);

            // Record snapshot before first modification
            if (!this.originalSnapshots.has(edit.id)) {
              const snapshot = edit.originalHtml || currentContent;
              this.originalSnapshots.set(edit.id, snapshot);
            }

            // Only mutate if content differs, avoiding unnecessary DOM repaints
            if (currentContent !== edit.editedHtml) {
              Helpers.dom.setContent(el, edit.editedHtml);
              el.setAttribute('data-pageetch-applied', edit.id);
            }
          }
        }
      } catch (err) {
        console.error('[PageEtch:Engine] Error during patch application:', err);
      } finally {
        this.isApplying = false;
      }
    }

    /**
     * Starts the MutationObserver with debounced batch processing
     */
    startObserver() {
      if (this.isObserving) return;

      this.observer = new MutationObserver((mutations) => {
        if (this.isApplying) return;

        // Check if URL changed in an SPA route transition
        if (window.location.href !== this.currentUrl) {
          this.currentUrl = window.location.href;
          this.applyAll();
          return;
        }

        let shouldPatch = false;
        for (const mutation of mutations) {
          const target = mutation.target;
          // Ignore mutations inside PageEtch UI
          if (target && (target.id === 'pageetch-root' || (target.closest && target.closest('#pageetch-root')))) {
            continue;
          }

          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldPatch = true;
            break;
          }
        }

        if (shouldPatch) {
          this._debouncedApply();
        }
      });

      const root = document.body || document.documentElement;
      if (root) {
        this.observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true
        });
        this.isObserving = true;
      } else {
        window.addEventListener('DOMContentLoaded', () => this.startObserver());
      }
    }

    /**
     * Cross-world SPA navigation hook
     */
    _hookSpaNavigation() {
      const handleLocationChange = () => {
        const newUrl = window.location.href;
        if (newUrl !== this.currentUrl) {
          this.currentUrl = newUrl;
          this.applyAll();
        }
      };

      window.addEventListener('popstate', handleLocationChange);
      window.addEventListener('hashchange', handleLocationChange);

      // Lightweight polling check every 300ms for silent client-side routing transitions
      setInterval(() => {
        if (window.location.href !== this.currentUrl) {
          handleLocationChange();
        }
      }, 300);
    }
  }

  window.__PAGE_ETCH__.Engine = new PersistenceEngine();
})();
