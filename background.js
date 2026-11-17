/**
 * PageEtch - Persistent Web Content Editor
 * @file background.js - Service worker handling context menus, shortcuts, and badge counter
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

const CONTENT_SCRIPTS = [
  'src/utils/helpers.js',
  'src/core/selector.js',
  'src/core/storage.js',
  'src/ui/modal.js',
  'src/ui/inspector.js',
  'src/core/engine.js',
  'content.js'
];

/**
 * Initializes Context Menu Entries
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'pageetch_edit_element',
      title: 'Etch Content (Edit Element)',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'pageetch_inspect_element',
      title: 'Pick Element to Etch',
      contexts: ['all']
    });
  });
});

/**
 * Injects content scripts into target tab if not already present
 * @param {number} tabId - Target tab ID
 */
async function ensureScriptsInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: CONTENT_SCRIPTS
    });
  } catch (err) {
    // Suppress expected warnings on restricted browser pages (e.g. chrome://)
  }
}

/**
 * Sends a message to a tab, automatically injecting scripts if not yet active
 * @param {number} tabId - Target tab ID
 * @param {string} url - Tab URL
 * @param {Object} message - Action payload
 */
async function sendTabMessage(tabId, url, message) {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://'))) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Inject content scripts and retry
    await ensureScriptsInjected(tabId);
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (retryErr) {
      console.warn('[PageEtch:Background] Message delivery failed after script injection:', retryErr);
    }
  }
}

/**
 * Context Menu Click Handler
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'pageetch_edit_element') {
    await sendTabMessage(tab.id, tab.url, { action: 'edit_target_element' });
  } else if (info.menuItemId === 'pageetch_inspect_element') {
    await sendTabMessage(tab.id, tab.url, { action: 'start_inspector' });
  }
});

/**
 * Keyboard Shortcuts Listener
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-inspector') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        await sendTabMessage(tab.id, tab.url, { action: 'start_inspector' });
      }
    } catch (err) {
      console.warn('[PageEtch:Background] Command dispatch error:', err);
    }
  }
});

/**
 * Updates dynamic badge counter for target tab
 * @param {number} tabId - Tab ID
 * @param {string} url - Tab URL
 */
async function updateTabBadge(tabId, url) {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://'))) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  try {
    const data = await chrome.storage.local.get(['pageetch_edits', 'pwe_edits']);
    const editsMap = data.pageetch_edits || data.pwe_edits || {};

    let pathKey = url;
    let originKey = '';
    try {
      const parsed = new URL(url);
      const hashRoute = parsed.hash && parsed.hash.startsWith('#/') ? parsed.hash : '';
      pathKey = `${parsed.origin}${parsed.pathname}${hashRoute}`;
      originKey = parsed.origin;
    } catch {}

    const matchedEdits = [];
    if (editsMap[originKey]) matchedEdits.push(...editsMap[originKey]);
    if (editsMap[pathKey] && pathKey !== originKey) matchedEdits.push(...editsMap[pathKey]);
    if (editsMap[url] && url !== pathKey && url !== originKey) matchedEdits.push(...editsMap[url]);

    const activeCount = matchedEdits.filter(e => e.enabled !== false).length;

    chrome.action.setBadgeBackgroundColor({ tabId, color: '#0284c7' });
    chrome.action.setBadgeText({
      tabId,
      text: activeCount > 0 ? String(activeCount) : ''
    });
  } catch {
    // Tab closed or unavailable
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      updateTabBadge(tab.id, tab.url);
    }
  } catch {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url) {
    updateTabBadge(tabId, tab.url);
  }
});

chrome.storage.onChanged.addListener(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id && tab.url) {
      updateTabBadge(tab.id, tab.url);
    }
  } catch {}
});
