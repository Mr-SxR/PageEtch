/**
 * PageEtch - Persistent Web Content Editor
 * @file selector.js - Multi-strategy selector engine with hierarchical XPath and fuzzy fallback
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

(function () {
  'use strict';

  window.__PAGE_ETCH__ = window.__PAGE_ETCH__ || {};

  /**
   * Evaluates if an element ID appears stable, meaningful, and globally unique
   * @param {Element} el - DOM element
   * @returns {boolean} True if stable unique identifier
   */
  function isStableId(el) {
    if (!el || !el.id || typeof el.id !== 'string') return false;
    const id = el.id.trim();
    if (!id || id.length > 64) return false;

    // Reject dynamic client framework patterns (:r0:, radix, uuid, hex hashes, pure numbers)
    const volatilePattern = /^(:r|radix|headlessui|react-select|ember|\d+$|[0-9a-f]{8,})/i;
    if (volatilePattern.test(id)) {
      return false;
    }

    try {
      const matches = document.querySelectorAll(`#${CSS.escape(id)}`);
      return matches.length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Generates a stable, canonical XPath expression for a DOM element
   * @param {Element} element - DOM element
   * @returns {string} Normalized XPath
   */
  function getElementXPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
    if (element === document.body) return '/html/body';

    const segments = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
      let index = 1;
      let sibling = current.previousElementSibling;

      while (sibling) {
        if (sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.nodeName.toLowerCase();
      segments.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
    }

    return '/html/' + segments.join('/');
  }

  /**
   * Multi-Strategy Selector Engine
   */
  const SelectorEngine = {
    /**
     * Generates a persistent fingerprint for a DOM element across reloads
     * @param {Element} el - Target DOM node
     * @returns {{ selector: string, xpath: string, textAnchor: string, tagName: string }}
     */
    generate(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) {
        throw new Error('SelectorEngine.generate: Invalid DOM node provided');
      }

      const tagName = el.tagName.toLowerCase();
      const textAnchor = (el.textContent || '').trim().slice(0, 80);
      const xpath = getElementXPath(el);

      // Strategy 1: Stable Unique Document ID
      if (isStableId(el)) {
        return {
          selector: `#${CSS.escape(el.id)}`,
          xpath,
          textAnchor,
          tagName
        };
      }

      // Strategy 2: High-reliability testing and semantic accessibility attributes
      const semanticAttrs = [
        'data-testid', 'data-test', 'data-qa', 'data-cy',
        'data-component', 'aria-label', 'name', 'role'
      ];

      for (const attr of semanticAttrs) {
        const val = el.getAttribute(attr);
        if (val && val.length < 80) {
          const candidate = `${tagName}[${attr}="${CSS.escape(val)}"]`;
          try {
            if (document.querySelectorAll(candidate).length === 1) {
              return { selector: candidate, xpath, textAnchor, tagName };
            }
          } catch {
            // Ignore syntax errors in escaped selectors
          }
        }
      }

      // Strategy 3: Clean Semantic Class Combination (non-hashed)
      if (el.classList && el.classList.length > 0) {
        const cleanClasses = Array.from(el.classList).filter(c => {
          return !/^(css-|\w{8,}$|[0-9a-f]{6,})/i.test(c) && c.length < 40;
        });

        if (cleanClasses.length > 0) {
          const classCandidate = `${tagName}.${cleanClasses.map(c => CSS.escape(c)).join('.')}`;
          try {
            if (document.querySelectorAll(classCandidate).length === 1) {
              return { selector: classCandidate, xpath, textAnchor, tagName };
            }
          } catch {
            // Ignore syntax errors
          }
        }
      }

      // Strategy 4: Hierarchical path with ancestor ID anchoring & nth-of-type
      const pathSegments = [];
      let current = el;

      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
        // If an ancestor possesses a stable ID, anchor to it and truncate climbing
        if (current !== el && isStableId(current)) {
          pathSegments.unshift(`#${CSS.escape(current.id)}`);
          break;
        }

        let segment = current.tagName.toLowerCase();

        if (current.parentElement) {
          const siblings = Array.from(current.parentElement.children);
          const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
          if (sameTagSiblings.length > 1) {
            const index = sameTagSiblings.indexOf(current) + 1;
            segment += `:nth-of-type(${index})`;
          }
        }

        pathSegments.unshift(segment);
        current = current.parentElement;
      }

      return {
        selector: pathSegments.join(' > '),
        xpath,
        textAnchor,
        tagName
      };
    },

    /**
     * Resolves an edit rule back to its live DOM element using multi-tier fallback
     * @param {{ selector: string, xpath?: string, textAnchor?: string, tagName?: string }} rule - Edit rule object
     * @returns {Element|null} The resolved DOM element or null if not found
     */
    resolve(rule) {
      if (!rule) return null;

      // Tier 1: Direct CSS Selector Query
      if (rule.selector) {
        try {
          const target = document.querySelector(rule.selector);
          if (target && target.nodeType === Node.ELEMENT_NODE) {
            return target;
          }
        } catch {
          // Selector syntax or parsing issue; proceed to fallback tier
        }
      }

      // Tier 2: XPath Fallback
      if (rule.xpath) {
        try {
          const result = document.evaluate(
            rule.xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          if (result && result.singleNodeValue && result.singleNodeValue.nodeType === Node.ELEMENT_NODE) {
            return result.singleNodeValue;
          }
        } catch {
          // XPath evaluation failed; proceed to fuzzy anchor
        }
      }

      // Tier 3: Fuzzy Anchor Fallback (for dynamic SPAs where tree shifted)
      if (rule.tagName && rule.textAnchor && rule.textAnchor.length >= 3) {
        try {
          const candidates = document.getElementsByTagName(rule.tagName);
          let bestMatch = null;
          let shortestTextLength = Infinity;

          for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const candidateText = (candidate.textContent || '').trim();

            if (candidateText.length >= 3 && (candidateText.startsWith(rule.textAnchor) || rule.textAnchor.startsWith(candidateText))) {
              // Prefer leaf-most node with smallest text footprint to avoid matching giant parent containers
              if (candidateText.length < shortestTextLength) {
                shortestTextLength = candidateText.length;
                bestMatch = candidate;
              }
            }
          }

          if (bestMatch) {
            return bestMatch;
          }
        } catch {
          // Fallback exhausted
        }
      }

      return null;
    }
  };

  window.__PAGE_ETCH__.SelectorEngine = SelectorEngine;
})();
