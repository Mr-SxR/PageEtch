/**
 * PageEtch - Persistent Web Content Editor
 * @file content.js - Content script lifecycle entry point and runtime message dispatcher
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

(function () {
  'use strict';

  let lastClickedElement = null;

  // Track target element right-clicked for context menu actions
  document.addEventListener('contextmenu', (event) => {
    lastClickedElement = event.target;
  }, true);

  // Runtime message dispatcher from background service worker or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      const PageEtch = window.__PAGE_ETCH__;

      switch (request.action) {
        case 'edit_target_element': {
          if (lastClickedElement && PageEtch && PageEtch.UI) {
            PageEtch.UI.openEditor(lastClickedElement);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Target element unavailable' });
          }
          break;
        }

        case 'start_inspector': {
          if (PageEtch && PageEtch.Inspector) {
            PageEtch.Inspector.start();
            sendResponse({ success: true });
          }
          break;
        }

        case 'get_page_edits': {
          if (PageEtch && PageEtch.Storage) {
            const edits = PageEtch.Storage.getAllEditsForPage(window.location.href);
            sendResponse({ success: true, edits });
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[PageEtch:ContentScript] Message dispatch error:', err);
      sendResponse({ success: false, error: err.message });
    }

    return true; // Keep asynchronous response channel open
  });

  // Start persistence engine when DOM is ready
  const initEngine = () => {
    const PageEtch = window.__PAGE_ETCH__;
    if (PageEtch && PageEtch.Engine) {
      PageEtch.Engine.start();
    }
  };

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initEngine);
  } else {
    initEngine();
  }
})();
