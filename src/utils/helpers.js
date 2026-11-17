/**
 * PageEtch - Persistent Web Content Editor
 * @file helpers.js - Universal utility functions, URL normalization, and DOM helpers
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

(function () {
  'use strict';

  window.__PAGE_ETCH__ = window.__PAGE_ETCH__ || {};

  /**
   * Universal Helper Utilities
   */
  const Helpers = {
    /**
     * Generates a collision-resistant unique identifier
     * @param {string} prefix - Optional namespace prefix
     * @returns {string} Unique identifier
     */
    generateId(prefix = 'etch') {
      const timestamp = Date.now().toString(36);
      const entropy = Math.random().toString(36).substring(2, 9);
      return `${prefix}_${timestamp}_${entropy}`;
    },

    /**
     * URL Normalization & Matching Engine
     */
    url: {
      /**
       * Strips tracking, advertising, and analytics parameters from a URL
       * @param {string} rawUrl - Full URL string
       * @returns {string} Clean URL without tracking query parameters
       */
      cleanUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return '';
        try {
          const parsed = new URL(rawUrl);
          const trackingPatterns = [
            /^utm_/i,
            /^(gclid|fbclid|mc_|msclkid|twclid|yclid|_hsenc|_hsmi)/i,
            /^(ref|source|ref_src|ref_url|_ga|_gl)/i
          ];

          const paramsToRemove = [];
          for (const key of parsed.searchParams.keys()) {
            if (trackingPatterns.some(pattern => pattern.test(key))) {
              paramsToRemove.push(key);
            }
          }

          paramsToRemove.forEach(param => parsed.searchParams.delete(param));
          return parsed.toString();
        } catch {
          return rawUrl;
        }
      },

      /**
       * Normalizes a URL based on the specified scope match mode
       * @param {string} rawUrl - Target URL
       * @param {'exact'|'path'|'origin'} [mode='path'] - Normalization scope
       * @returns {string} Normalized URL key
       */
      normalize(rawUrl, mode = 'path') {
        if (!rawUrl) return '';
        try {
          const cleaned = this.cleanUrl(rawUrl);
          const parsed = new URL(cleaned);

          switch (mode) {
            case 'origin':
              return parsed.origin;

            case 'exact':
              return parsed.href;

            case 'path':
            default: {
              // Preserve SPA hash routing (e.g., /#/dashboard or #/settings)
              const hashRoute = parsed.hash && parsed.hash.startsWith('#/') ? parsed.hash : '';
              return `${parsed.origin}${parsed.pathname}${hashRoute}`;
            }
          }
        } catch {
          return rawUrl;
        }
      },

      /**
       * Safely extracts hostname for display purposes
       * @param {string} rawUrl - URL string
       * @returns {string} Hostname or fallback string
       */
      getDomain(rawUrl) {
        try {
          return new URL(rawUrl).hostname;
        } catch {
          return 'Local Document';
        }
      }
    },

    /**
     * DOM Inspection and Mutation Helpers
     */
    dom: {
      /**
       * Determines whether an element is suitable and safe for editing
       * @param {Element|null} el - Target DOM node
       * @returns {boolean} True if editable by user
       */
      isEditable(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

        const prohibitedTags = new Set([
          'HTML', 'HEAD', 'META', 'SCRIPT', 'STYLE', 'LINK',
          'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'CANVAS',
          'SVG', 'PATH', 'AUDIO', 'VIDEO'
        ]);

        if (prohibitedTags.has(el.tagName)) return false;

        // Never allow targeting extension UI or overlay nodes
        if (el.closest('#pageetch-root') || el.hasAttribute('data-pageetch-ui')) {
          return false;
        }

        return true;
      },

      /**
       * Checks whether the element is a form input or textarea
       * @param {Element} el - DOM element
       * @returns {boolean}
       */
      isFormInput(el) {
        if (!el || !el.tagName) return false;
        const tag = el.tagName.toUpperCase();
        return tag === 'INPUT' || tag === 'TEXTAREA';
      },

      /**
       * Retrieves the current content of an element, supporting both standard elements and inputs
       * @param {Element} el - DOM element
       * @returns {string} Current content HTML or input value
       */
      getContent(el) {
        if (!el) return '';
        if (this.isFormInput(el)) {
          return el.value || '';
        }
        return el.innerHTML;
      },

      /**
       * Sets the content of an element, supporting both standard elements and form controls
       * @param {Element} el - DOM element
       * @param {string} content - HTML string or value to apply
       */
      setContent(el, content) {
        if (!el) return;
        if (this.isFormInput(el)) {
          el.value = content;
          el.setAttribute('value', content);
          el.defaultValue = content;
          // Dispatch input event for reactive frameworks (React, Vue)
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.innerHTML = content;
        }
      },

      /**
       * Escapes raw HTML strings for safe text insertion into UI components
       * @param {string} str - Raw string
       * @returns {string} Sanitized string
       */
      escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      },

      /**
       * Extracts a concise, clean text snippet for UI previews
       * @param {string} htmlOrText - Source HTML or plain text
       * @param {number} [maxLen=60] - Maximum string length
       * @returns {string} Clean truncated preview snippet
       */
      getSnippet(htmlOrText, maxLen = 60) {
        if (!htmlOrText || typeof htmlOrText !== 'string') return '';
        const temp = document.createElement('div');
        temp.innerHTML = htmlOrText;
        const text = (temp.textContent || temp.innerText || '').replace(/\s+/g, ' ').trim();
        return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
      }
    },

    /**
     * Debounces a high-frequency function invocation
     * @param {Function} func - Function to debounce
     * @param {number} [wait=80] - Debounce delay in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 80) {
      let timeoutId;
      return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
        }, wait);
      };
    },

    /**
     * Batches execution to the next browser animation frame
     * @param {Function} callback - Function to run on animation frame
     * @returns {Function} Batched function
     */
    rafBatch(callback) {
      let rafId = null;
      return function batched(...args) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          callback.apply(this, args);
          rafId = null;
        });
      };
    }
  };

  window.__PAGE_ETCH__.Helpers = Helpers;
})();
