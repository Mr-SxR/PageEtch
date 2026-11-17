/**
 * PageEtch - Persistent Web Content Editor
 * @file popup.js - Modern popup UI controller with page and global library views
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

document.addEventListener('DOMContentLoaded', async () => {
  const Helpers = window.__PAGE_ETCH__.Helpers;
  const Storage = window.__PAGE_ETCH__.Storage;

  // View Navigation Elements
  const tabThisPage = document.getElementById('tab-this-page');
  const tabAllSites = document.getElementById('tab-all-sites');
  const viewPage = document.getElementById('view-page');
  const viewGlobal = document.getElementById('view-global');
  const tabPageCount = document.getElementById('tab-page-count');
  const tabGlobalCount = document.getElementById('tab-global-count');

  // Header Elements
  const globalToggle = document.getElementById('global-toggle');

  // "This Page" View Elements
  const pageUrlEl = document.getElementById('page-url');
  const countBadge = document.getElementById('edits-count-badge');
  const editsListPage = document.getElementById('edits-list-page');
  const emptyStatePage = document.getElementById('empty-state-page');
  const searchBoxPage = document.getElementById('search-box-page');
  const searchInputPage = document.getElementById('search-input-page');
  const btnPick = document.getElementById('btn-pick-element');
  const btnClearPage = document.getElementById('btn-clear-page');

  // "All Websites" View Elements
  const globalTotalStats = document.getElementById('global-total-stats');
  const btnClearAllInline = document.getElementById('btn-clear-all-inline');
  const searchBoxGlobal = document.getElementById('search-box-global');
  const searchInputGlobal = document.getElementById('search-input-global');
  const emptyStateGlobal = document.getElementById('empty-state-global');
  const domainGroupsList = document.getElementById('domain-groups-list');

  // Footer Elements
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const btnResetAll = document.getElementById('btn-reset-all');
  const fileInput = document.getElementById('import-file-input');
  const toastEl = document.getElementById('popup-toast');

  // In-Popup Modal Dialog Elements
  const confirmModal = document.getElementById('popup-confirm-modal');
  const modalTitle = document.getElementById('confirm-modal-title');
  const modalDesc = document.getElementById('confirm-modal-desc');
  const modalCancel = document.getElementById('confirm-modal-cancel');
  const modalOk = document.getElementById('confirm-modal-ok');

  let currentTab = null;
  let cachedPageEdits = [];
  let cachedGlobalData = { totalCount: 0, activeCount: 0, domains: [] };
  let currentActiveView = 'page'; // 'page' | 'global'
  let onModalConfirm = null;

  /**
   * Displays temporary toast notification in the popup
   * @param {string} msg - Message string
   */
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2200);
  }

  /**
   * Shows in-popup confirmation modal, avoiding native window.confirm popup dismissals
   * @param {string} title 
   * @param {string} desc 
   * @param {Function} callback 
   */
  function showConfirm(title, desc, callback) {
    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    onModalConfirm = callback;
    confirmModal.style.display = 'flex';
  }

  modalCancel.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    onModalConfirm = null;
  });

  modalOk.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    if (typeof onModalConfirm === 'function') {
      onModalConfirm();
    }
    onModalConfirm = null;
  });

  /**
   * Tab Navigation Switcher
   */
  tabThisPage.addEventListener('click', () => {
    switchView('page');
  });

  tabAllSites.addEventListener('click', () => {
    switchView('global');
  });

  function switchView(view) {
    currentActiveView = view;
    if (view === 'page') {
      tabThisPage.classList.add('active');
      tabAllSites.classList.remove('active');
      viewPage.style.display = 'flex';
      viewGlobal.style.display = 'none';
      renderPageEdits();
    } else {
      tabAllSites.classList.add('active');
      tabThisPage.classList.remove('active');
      viewGlobal.style.display = 'flex';
      viewPage.style.display = 'none';
      renderGlobalEdits();
    }
  }

  /**
   * Initializes Popup Lifecycle
   */
  async function init() {
    await Storage.init();

    // Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab || !tab.url || (!tab.url.startsWith('http') && !tab.url.startsWith('file'))) {
      pageUrlEl.textContent = 'Restricted page (cannot edit)';
      btnPick.disabled = true;
      btnClearPage.disabled = true;
      cachedPageEdits = [];
      renderPageEdits();
    } else {
      try {
        const parsed = new URL(tab.url);
        pageUrlEl.textContent = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
      } catch {
        pageUrlEl.textContent = tab.url;
      }
      pageUrlEl.title = tab.url;
    }

    // Load global toggle state
    const settings = Storage.settingsCache;
    globalToggle.checked = settings.globalEnabled !== false;

    refreshAllData();

    // Watch for cross-tab or storage changes
    Storage.subscribe(() => {
      refreshAllData();
    });
  }

  /**
   * Refreshes both page and global cache data and updates badges
   */
  function refreshAllData() {
    if (currentTab && currentTab.url) {
      cachedPageEdits = Storage.getAllEditsForPage(currentTab.url);
    } else {
      cachedPageEdits = [];
    }

    cachedGlobalData = Storage.getAllGlobalEditsGrouped();

    // Update badges
    tabPageCount.textContent = cachedPageEdits.length;
    tabGlobalCount.textContent = cachedGlobalData.totalCount;

    if (currentActiveView === 'page') {
      renderPageEdits();
    } else {
      renderGlobalEdits();
    }
  }

  /* ========================================================
     VIEW 1: THIS PAGE RENDERING & SEARCH
     ======================================================== */

  function renderPageEdits() {
    filterAndRenderPageEdits();
  }

  function filterAndRenderPageEdits() {
    const query = (searchInputPage.value || '').trim().toLowerCase();
    const editsToRender = !query ? cachedPageEdits : cachedPageEdits.filter(edit => {
      const snippet = (edit.editedHtml || edit.textAnchor || '').toLowerCase();
      const selector = (edit.selector || '').toLowerCase();
      const tag = (edit.tagName || '').toLowerCase();
      return snippet.includes(query) || selector.includes(query) || tag.includes(query);
    });

    editsListPage.innerHTML = '';
    const activeCount = cachedPageEdits.filter(e => e.enabled !== false).length;
    countBadge.textContent = `${activeCount} edit${activeCount === 1 ? '' : 's'}`;

    if (!cachedPageEdits || cachedPageEdits.length === 0) {
      emptyStatePage.style.display = 'flex';
      btnClearPage.style.display = 'none';
      searchBoxPage.style.display = 'none';
      return;
    }

    searchBoxPage.style.display = 'flex';
    btnClearPage.style.display = 'block';

    if (editsToRender.length === 0) {
      emptyStatePage.style.display = 'flex';
      emptyStatePage.querySelector('.empty-title').textContent = 'No matching edits';
      emptyStatePage.querySelector('.empty-desc').textContent = 'No edits match your search query.';
      return;
    }

    emptyStatePage.style.display = 'none';

    editsToRender.forEach(edit => {
      const card = createEditCardElement(edit);
      editsListPage.appendChild(card);
    });
  }

  searchInputPage.addEventListener('input', () => {
    filterAndRenderPageEdits();
  });

  /* ========================================================
     VIEW 2: ALL WEBSITES RENDERING & SEARCH (Global Library)
     ======================================================== */

  function renderGlobalEdits() {
    filterAndRenderGlobalEdits();
  }

  function filterAndRenderGlobalEdits() {
    const query = (searchInputGlobal.value || '').trim().toLowerCase();
    domainGroupsList.innerHTML = '';

    const totalDomainsCount = cachedGlobalData.domains.length;
    const totalEditsCount = cachedGlobalData.totalCount;

    globalTotalStats.textContent = `${totalEditsCount} saved edit${totalEditsCount === 1 ? '' : 's'} across ${totalDomainsCount} website${totalDomainsCount === 1 ? '' : 's'}`;

    if (totalEditsCount === 0) {
      emptyStateGlobal.style.display = 'flex';
      searchBoxGlobal.style.display = 'none';
      btnClearAllInline.style.display = 'none';
      return;
    }

    searchBoxGlobal.style.display = 'flex';
    btnClearAllInline.style.display = 'block';

    // Filter domain groups by query
    let filteredDomains = cachedGlobalData.domains.map(group => {
      if (!query) return group;

      const domainMatch = group.domain.toLowerCase().includes(query);
      if (domainMatch) return group;

      const matchingEdits = group.edits.filter(edit => {
        const snippet = (edit.editedHtml || edit.textAnchor || '').toLowerCase();
        const selector = (edit.selector || '').toLowerCase();
        const tag = (edit.tagName || '').toLowerCase();
        const url = (edit.url || '').toLowerCase();
        return snippet.includes(query) || selector.includes(query) || tag.includes(query) || url.includes(query);
      });

      return {
        ...group,
        count: matchingEdits.length,
        edits: matchingEdits
      };
    }).filter(group => group.edits.length > 0);

    if (filteredDomains.length === 0) {
      emptyStateGlobal.style.display = 'flex';
      emptyStateGlobal.querySelector('.empty-title').textContent = 'No matching edits';
      emptyStateGlobal.querySelector('.empty-desc').textContent = 'No saved edits match your search term.';
      return;
    }

    emptyStateGlobal.style.display = 'none';

    filteredDomains.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'domain-group';

      groupEl.innerHTML = `
        <div class="domain-header">
          <div class="domain-header-left">
            <svg class="domain-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <svg class="domain-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span class="domain-name" title="${Helpers.dom.escapeHtml(group.domain)}">${Helpers.dom.escapeHtml(group.domain)}</span>
          </div>
          <div class="domain-header-right">
            <span class="domain-count-pill">${group.count} edit${group.count === 1 ? '' : 's'}</span>
            <button class="btn-del-domain" title="Delete all edits for ${Helpers.dom.escapeHtml(group.domain)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="domain-body"></div>
      `;

      const domainHeader = groupEl.querySelector('.domain-header');
      const domainBody = groupEl.querySelector('.domain-body');
      const delDomainBtn = groupEl.querySelector('.btn-del-domain');

      // Expand / Collapse Accordion
      domainHeader.addEventListener('click', (e) => {
        if (e.target.closest('.btn-del-domain')) return;
        groupEl.classList.toggle('collapsed');
      });

      // Clear Domain Handler
      delDomainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirm(
          `Clear ${group.domain}`,
          `Are you sure you want to remove all ${group.count} saved edit(s) for ${group.domain}?`,
          async () => {
            await Storage.deleteDomainEdits(group.domain);
            showToast(`Cleared edits for ${group.domain}`);
            refreshAllData();
          }
        );
      });

      // Render cards inside domain body
      group.edits.forEach(edit => {
        const card = createEditCardElement(edit, true);
        domainBody.appendChild(card);
      });

      domainGroupsList.appendChild(groupEl);
    });
  }

  searchInputGlobal.addEventListener('input', () => {
    filterAndRenderGlobalEdits();
  });

  /* ========================================================
     CARD COMPONENT CREATOR
     ======================================================== */

  function createEditCardElement(edit, showUrlPath = false) {
    const card = document.createElement('div');
    card.className = `edit-card ${edit.enabled === false ? 'disabled' : ''}`;

    const snippet = Helpers.dom.getSnippet(edit.editedHtml || edit.textAnchor || '', 55);
    const tag = edit.tagName ? `<${edit.tagName.toUpperCase()}>` : 'Element';
    const scopeLabel = edit.matchMode ? edit.matchMode.toUpperCase() : 'PATH';

    let urlPathSnippet = '';
    if (showUrlPath && edit.url) {
      try {
        const u = new URL(edit.url);
        urlPathSnippet = u.pathname + (u.search ? u.search : '') + (u.hash ? u.hash : '');
      } catch {
        urlPathSnippet = edit.url;
      }
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="card-tags-group">
          <span class="card-tag">${Helpers.dom.escapeHtml(tag)}</span>
          <span class="card-scope" title="Match scope: ${Helpers.dom.escapeHtml(scopeLabel)}">${Helpers.dom.escapeHtml(scopeLabel)}</span>
        </div>
        <div class="card-controls">
          <label class="switch switch-sm" title="Toggle this edit">
            <input type="checkbox" class="toggle-edit" ${edit.enabled !== false ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          <button class="btn-card-del" title="Delete edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      ${urlPathSnippet ? `<div class="card-url-hint" title="${Helpers.dom.escapeHtml(edit.url)}">${Helpers.dom.escapeHtml(urlPathSnippet)}</div>` : ''}
      <div class="card-snippet" title="${Helpers.dom.escapeHtml(snippet)}">${Helpers.dom.escapeHtml(snippet)}</div>
      <div class="card-selector" title="${Helpers.dom.escapeHtml(edit.selector)}">${Helpers.dom.escapeHtml(edit.selector)}</div>
    `;

    // Toggle edit active status
    const toggle = card.querySelector('.toggle-edit');
    toggle.addEventListener('change', async (e) => {
      const urlKey = edit.parentUrlKey || edit.urlKey;
      await Storage.toggleEdit(edit.id, urlKey, e.target.checked);
      card.classList.toggle('disabled', !e.target.checked);
      refreshAllData();
    });

    // Delete edit
    const delBtn = card.querySelector('.btn-card-del');
    delBtn.addEventListener('click', async () => {
      const urlKey = edit.parentUrlKey || edit.urlKey;
      await Storage.deleteEdit(edit.id, urlKey);
      showToast('Edit removed');
      refreshAllData();
    });

    return card;
  }

  /* ========================================================
     GLOBAL ACTIONS & LISTENERS
     ======================================================== */

  // Global Toggle Handler
  globalToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({
      pageetch_settings: {
        ...Storage.settingsCache,
        globalEnabled: enabled
      }
    });
    showToast(enabled ? 'PageEtch enabled globally' : 'PageEtch paused globally');
  });

  // Pick Element Handler
  btnPick.addEventListener('click', async () => {
    if (!currentTab || !currentTab.id) return;
    try {
      await chrome.tabs.sendMessage(currentTab.id, { action: 'start_inspector' });
      window.close(); // Close popup window so user can interact with the page
    } catch {
      showToast('Please reload the webpage to inspect');
    }
  });

  // Clear Page Handler
  btnClearPage.addEventListener('click', () => {
    showConfirm(
      'Clear Page Edits',
      'Are you sure you want to remove all edits saved for this specific page?',
      async () => {
        await Storage.clearPage(currentTab.url);
        showToast('Page edits cleared');
        refreshAllData();
      }
    );
  });

  // Export JSON Backup
  btnExport.addEventListener('click', () => {
    const data = Storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);

    const a = document.createElement('a');
    a.href = url;
    a.download = `pageetch-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup downloaded');
  });

  // Import JSON Trigger
  btnImport.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const res = await Storage.importData(parsed, false);
        showToast(`Imported ${res.importedCount} edits successfully!`);
        refreshAllData();
      } catch (err) {
        showToast('Error: Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // Reset All Handlers (Both footer and inline buttons)
  const triggerResetAllConfirmation = () => {
    const globalData = Storage.getAllGlobalEditsGrouped();
    const totalEdits = globalData.totalCount;
    const totalDomains = globalData.domains.length;

    if (totalEdits === 0) {
      showToast('No saved edits to reset');
      return;
    }

    const domainSample = globalData.domains.slice(0, 3).map(d => d.domain).join(', ');
    const moreNotice = totalDomains > 3 ? ` and ${totalDomains - 3} more` : '';

    showConfirm(
      'Reset All Websites',
      `Warning: This will permanently delete ALL ${totalEdits} saved edit(s) across ${totalDomains} website(s) (${domainSample}${moreNotice}). This cannot be undone. Proceed?`,
      async () => {
        await Storage.clearAll();
        showToast('All stored edits permanently deleted');
        refreshAllData();
      }
    );
  };

  btnResetAll.addEventListener('click', triggerResetAllConfirmation);
  btnClearAllInline.addEventListener('click', triggerResetAllConfirmation);

  init();
});
