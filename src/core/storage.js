/**
 * PageEtch - Persistent Web Content Editor
 * @file storage.js - Centralized storage layer with reactive sync, caching, and auto-migrations
 * @license MIT
 * @repository https://github.com/Mr-SxR/PageEtch
 */

(function () {
  'use strict';

  window.__PAGE_ETCH__ = window.__PAGE_ETCH__ || {};
  const Helpers = window.__PAGE_ETCH__.Helpers;

  const STORAGE_KEYS = {
    EDITS: 'pageetch_edits',
    SETTINGS: 'pageetch_settings',
    LEGACY_EDITS: 'pwe_edits',
    LEGACY_SETTINGS: 'pwe_settings'
  };

  const DEFAULT_SETTINGS = {
    globalEnabled: true,
    defaultMatchMode: 'path', // 'exact' | 'path' | 'origin'
    autoObserve: true
  };

  /**
   * Enterprise Storage Layer Manager
   */
  class StorageManager {
    constructor() {
      /** @type {Record<string, Array<Object>>} */
      this.editsCache = {};
      /** @type {Object} */
      this.settingsCache = { ...DEFAULT_SETTINGS };
      this.isInitialized = false;
      this.changeListeners = new Set();
    }

    /**
     * Initializes cache, runs migrations, and registers reactive storage watchers
     */
    async init() {
      if (this.isInitialized) return;

      try {
        const raw = await chrome.storage.local.get(null);

        // Run migrations for legacy storage formats
        await this._migrateLegacyData(raw);

        // Refresh settings from storage
        this.settingsCache = {
          ...DEFAULT_SETTINGS,
          ...(raw[STORAGE_KEYS.SETTINGS] || raw[STORAGE_KEYS.LEGACY_SETTINGS] || {})
        };

        // Refresh edits from storage
        this.editsCache = raw[STORAGE_KEYS.EDITS] || raw[STORAGE_KEYS.LEGACY_EDITS] || {};

        // Watch for changes made by other tabs or the extension popup
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== 'local') return;

          let hasUpdated = false;

          if (changes[STORAGE_KEYS.EDITS]) {
            this.editsCache = changes[STORAGE_KEYS.EDITS].newValue || {};
            hasUpdated = true;
          } else if (changes[STORAGE_KEYS.LEGACY_EDITS]) {
            this.editsCache = changes[STORAGE_KEYS.LEGACY_EDITS].newValue || {};
            hasUpdated = true;
          }

          if (changes[STORAGE_KEYS.SETTINGS]) {
            this.settingsCache = { ...DEFAULT_SETTINGS, ...(changes[STORAGE_KEYS.SETTINGS].newValue || {}) };
            hasUpdated = true;
          }

          if (hasUpdated) {
            this._notifyListeners();
          }
        });

        this.isInitialized = true;
      } catch (err) {
        console.error('[PageEtch:Storage] Initialization error:', err);
      }
    }

    /**
     * Seamlessly migrates legacy PWE data structures to PageEtch schema
     * @private
     */
    async _migrateLegacyData(rawStorage) {
      if (!rawStorage) return;

      let requiresSave = false;
      let targetEdits = rawStorage[STORAGE_KEYS.EDITS] || {};

      // 1. Migrate PWE 2.0 key to PageEtch key
      if (!rawStorage[STORAGE_KEYS.EDITS] && rawStorage[STORAGE_KEYS.LEGACY_EDITS]) {
        targetEdits = rawStorage[STORAGE_KEYS.LEGACY_EDITS];
        requiresSave = true;
      }

      // 2. Migrate raw v1.0 key-value format (URL keys directly on root storage)
      const legacyKeysToRemove = [];
      for (const [key, val] of Object.entries(rawStorage)) {
        if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('file://')) {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            const urlKey = Helpers.url.normalize(key, 'path');
            targetEdits[urlKey] = targetEdits[urlKey] || [];

            for (const [selector, html] of Object.entries(val)) {
              targetEdits[urlKey].push({
                id: Helpers.generateId('etch_migrated'),
                url: key,
                urlKey,
                matchMode: 'path',
                selector,
                xpath: '',
                textAnchor: Helpers.dom.getSnippet(html, 40),
                tagName: '',
                originalHtml: '',
                editedHtml: html,
                enabled: true,
                createdAt: Date.now(),
                updatedAt: Date.now()
              });
            }
            legacyKeysToRemove.push(key);
            requiresSave = true;
          }
        }
      }

      if (requiresSave) {
        await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: targetEdits });
        if (legacyKeysToRemove.length > 0) {
          await chrome.storage.local.remove(legacyKeysToRemove);
        }
        console.info('[PageEtch:Storage] Successfully migrated legacy storage records.');
      }
    }

    /**
     * Retrieves all active, enabled edits applicable to the specified URL
     * @param {string} currentUrl - Active page URL
     * @returns {Array<Object>} List of applicable active edit records
     */
    getEditsForPage(currentUrl) {
      if (!this.settingsCache.globalEnabled) return [];

      const exactKey = Helpers.url.normalize(currentUrl, 'exact');
      const pathKey = Helpers.url.normalize(currentUrl, 'path');
      const originKey = Helpers.url.normalize(currentUrl, 'origin');

      const matches = [];

      // Check origin scope rules (domain-wide)
      if (this.editsCache[originKey]) {
        matches.push(...this.editsCache[originKey].filter(e => e.matchMode === 'origin'));
      }
      // Check path scope rules (path-wide)
      if (this.editsCache[pathKey]) {
        matches.push(...this.editsCache[pathKey].filter(e => !e.matchMode || e.matchMode === 'path'));
      }
      // Check exact scope rules (query-string specific)
      if (exactKey !== pathKey && this.editsCache[exactKey]) {
        matches.push(...this.editsCache[exactKey].filter(e => e.matchMode === 'exact'));
      }

      // Deduplicate by edit ID and return enabled only
      const seen = new Set();
      return matches.filter(edit => {
        if (seen.has(edit.id)) return false;
        seen.add(edit.id);
        return edit.enabled !== false;
      });
    }

    /**
     * Returns all edits for a given page URL (both enabled and disabled)
     * @param {string} currentUrl - Active page URL
     * @returns {Array<Object>}
     */
    getAllEditsForPage(currentUrl) {
      const exactKey = Helpers.url.normalize(currentUrl, 'exact');
      const pathKey = Helpers.url.normalize(currentUrl, 'path');
      const originKey = Helpers.url.normalize(currentUrl, 'origin');

      const matches = [];

      if (this.editsCache[originKey]) {
        matches.push(...this.editsCache[originKey]);
      }
      if (this.editsCache[pathKey] && pathKey !== originKey) {
        matches.push(...this.editsCache[pathKey]);
      }
      if (this.editsCache[exactKey] && exactKey !== pathKey && exactKey !== originKey) {
        matches.push(...this.editsCache[exactKey]);
      }

      const seen = new Set();
      return matches.filter(edit => {
        if (seen.has(edit.id)) return false;
        seen.add(edit.id);
        return true;
      });
    }

    /**
     * Aggregates all edits across all websites grouped by domain
     * @returns {{ totalCount: number, activeCount: number, domains: Array<{ domain: string, count: number, activeCount: number, edits: Array<Object> }> }}
     */
    getAllGlobalEditsGrouped() {
      const domainMap = new Map();
      let totalCount = 0;
      let activeCount = 0;

      for (const [urlKey, editList] of Object.entries(this.editsCache)) {
        if (!Array.isArray(editList) || editList.length === 0) continue;

        const domain = Helpers.url.getDomain(urlKey);

        if (!domainMap.has(domain)) {
          domainMap.set(domain, {
            domain,
            count: 0,
            activeCount: 0,
            edits: []
          });
        }

        const domainGroup = domainMap.get(domain);

        editList.forEach(edit => {
          totalCount++;
          domainGroup.count++;
          if (edit.enabled !== false) {
            activeCount++;
            domainGroup.activeCount++;
          }
          domainGroup.edits.push({ ...edit, parentUrlKey: urlKey });
        });
      }

      // Convert to array and sort domains by edit count descending
      const domains = Array.from(domainMap.values()).sort((a, b) => b.count - a.count);

      return {
        totalCount,
        activeCount,
        domains
      };
    }

    /**
     * Saves or updates an edit rule in storage
     * @param {Object} editData - Edit rule payload
     * @returns {Promise<Object>} Stored edit record
     */
    async saveEdit(editData) {
      await this.init();

      const matchMode = editData.matchMode || this.settingsCache.defaultMatchMode || 'path';
      const urlKey = Helpers.url.normalize(editData.url, matchMode);
      const list = this.editsCache[urlKey] ? [...this.editsCache[urlKey]] : [];

      const existingIndex = list.findIndex(item => item.id === editData.id || item.selector === editData.selector);

      const record = {
        id: editData.id || Helpers.generateId('etch'),
        url: editData.url,
        urlKey,
        matchMode,
        selector: editData.selector,
        xpath: editData.xpath || '',
        textAnchor: editData.textAnchor || '',
        tagName: editData.tagName || '',
        originalHtml: typeof editData.originalHtml === 'string' ? editData.originalHtml : '',
        editedHtml: editData.editedHtml,
        enabled: editData.enabled !== false,
        createdAt: editData.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], ...record };
      } else {
        list.push(record);
      }

      this.editsCache[urlKey] = list;
      await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: this.editsCache });
      this._notifyListeners();
      return record;
    }

    /**
     * Toggles an edit's active state
     * @param {string} id - Edit rule ID
     * @param {string} urlKey - Target URL key
     * @param {boolean} enabled - New status
     */
    async toggleEdit(id, urlKey, enabled) {
      await this.init();

      let targetKey = urlKey;
      if (!this.editsCache[targetKey] || !this.editsCache[targetKey].some(e => e.id === id)) {
        for (const [key, list] of Object.entries(this.editsCache)) {
          if (list.some(e => e.id === id)) {
            targetKey = key;
            break;
          }
        }
      }

      const list = this.editsCache[targetKey];
      if (!list) return;

      const item = list.find(e => e.id === id);
      if (item) {
        item.enabled = enabled;
        item.updatedAt = Date.now();
        await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: this.editsCache });
        this._notifyListeners();
      }
    }

    /**
     * Deletes a specific edit rule
     * @param {string} id - Edit rule ID
     * @param {string} urlKey - Target URL key
     */
    async deleteEdit(id, urlKey) {
      await this.init();

      let targetKey = urlKey;
      if (!this.editsCache[targetKey] || !this.editsCache[targetKey].some(e => e.id === id)) {
        for (const [key, list] of Object.entries(this.editsCache)) {
          if (list.some(e => e.id === id)) {
            targetKey = key;
            break;
          }
        }
      }

      const list = this.editsCache[targetKey];
      if (!list) return;

      const filtered = list.filter(e => e.id !== id);
      if (filtered.length === 0) {
        delete this.editsCache[targetKey];
      } else {
        this.editsCache[targetKey] = filtered;
      }

      await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: this.editsCache });
      this._notifyListeners();
    }

    /**
     * Clears all edits belonging to an entire domain
     * @param {string} targetDomain - Domain name e.g. "youtube.com"
     */
    async deleteDomainEdits(targetDomain) {
      await this.init();

      let hasChanged = false;
      for (const urlKey of Object.keys(this.editsCache)) {
        const domain = Helpers.url.getDomain(urlKey);
        if (domain === targetDomain) {
          delete this.editsCache[urlKey];
          hasChanged = true;
        }
      }

      if (hasChanged) {
        await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: this.editsCache });
        this._notifyListeners();
      }
    }

    /**
     * Clears all edits for a single page URL across exact and path match scopes
     * @param {string} currentUrl - Page URL
     */
    async clearPage(currentUrl) {
      await this.init();

      const exactKey = Helpers.url.normalize(currentUrl, 'exact');
      const pathKey = Helpers.url.normalize(currentUrl, 'path');

      let hasChanged = false;
      if (this.editsCache[exactKey]) {
        delete this.editsCache[exactKey];
        hasChanged = true;
      }
      if (this.editsCache[pathKey]) {
        delete this.editsCache[pathKey];
        hasChanged = true;
      }

      if (hasChanged) {
        await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: this.editsCache });
        this._notifyListeners();
      }
    }

    /**
     * Permanently purges all stored edits across all websites
     */
    async clearAll() {
      this.editsCache = {};
      await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: {} });
      this._notifyListeners();
    }

    /**
     * Exports entire edit database to a structured JSON object
     * @returns {Object} Backup bundle
     */
    exportData() {
      return {
        app: 'PageEtch',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        settings: this.settingsCache,
        edits: this.editsCache
      };
    }

    /**
     * Imports edits database from a JSON backup
     * @param {Object} data - Imported JSON object
     * @param {boolean} [overwrite=false] - Whether to overwrite existing edits
     * @returns {Promise<{ importedCount: number }>}
     */
    async importData(data, overwrite = false) {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format: data must be a valid PageEtch backup object');
      }

      await this.init();

      const importedEdits = data.edits || {};
      let count = 0;

      if (overwrite) {
        this.editsCache = importedEdits;
        for (const list of Object.values(importedEdits)) {
          count += Array.isArray(list) ? list.length : 0;
        }
      } else {
        for (const [urlKey, list] of Object.entries(importedEdits)) {
          if (!Array.isArray(list)) continue;
          count += list.length;

          if (!this.editsCache[urlKey]) {
            this.editsCache[urlKey] = list;
          } else {
            const existingMap = new Map(this.editsCache[urlKey].map(item => [item.id, item]));
            list.forEach(item => existingMap.set(item.id, item));
            this.editsCache[urlKey] = Array.from(existingMap.values());
          }
        }
      }

      await chrome.storage.local.set({ [STORAGE_KEYS.EDITS]: this.editsCache });
      this._notifyListeners();
      return { importedCount: count };
    }

    /**
     * Subscribes a listener callback to storage changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe handler
     */
    subscribe(callback) {
      this.changeListeners.add(callback);
      return () => this.changeListeners.delete(callback);
    }

    _notifyListeners() {
      this.changeListeners.forEach(fn => {
        try {
          fn(this.editsCache, this.settingsCache);
        } catch (e) {
          console.error('[PageEtch:Storage] Listener error:', e);
        }
      });
    }
  }

  window.__PAGE_ETCH__.Storage = new StorageManager();
})();
