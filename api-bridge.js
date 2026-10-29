/* Compatibility layer: preserve the supplied UI's localStorage-shaped data logic while persisting to the API. */
(function () {
  const nativeSetItem = Storage.prototype.setItem;
  let serverReady = false, hydrating = false, queue = Promise.resolve();
  function readLoans(value) { try { return JSON.parse(value || '[]'); } catch (_) { return []; } }

  function syncLoans(value) {
    nativeSetItem.call(localStorage, 'loans', value);
    if (!serverReady || hydrating) return;
    const loans = readLoans(value);
    queue = queue.then(async () => {
      const adminToken = sessionStorage.getItem('rf_admin_token');
      const customerToken = sessionStorage.getItem('rf_customer_token');
      const token = adminToken || customerToken;
      const response = await fetch('/api/loans/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ loans })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('Save failed:', body.message || response.statusText);
        window.dispatchEvent(new CustomEvent('rf-save-error', { detail: body.message || 'Save failed' }));
      }
    }).catch(err => {
      console.error('API sync failed:', err);
      window.dispatchEvent(new CustomEvent('rf-save-error', { detail: 'Backend connection failed. Changes may not be saved.' }));
    });
  }

  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === 'loans') return syncLoans(String(value));
    return nativeSetItem.call(this, key, value);
  };

  window.rfApi = {
    async request(path, options = {}) {
      const token = sessionStorage.getItem('rf_admin_token') || sessionStorage.getItem('rf_customer_token');
      const headers = { ...(options.headers || {}) };
      if (token) headers.Authorization = 'Bearer ' + token;
      return fetch(path, { ...options, headers });
    },
    flush() { return queue; },
    setLoans(loans, silent = false) {
      hydrating = true;
      nativeSetItem.call(localStorage, 'loans', JSON.stringify(Array.isArray(loans) ? loans : []));
      hydrating = false;
      if (!silent) window.dispatchEvent(new CustomEvent('rf-loans-loaded'));
    },
    async refreshAdminLoans() {
      const response = await this.request('/api/admin/loans');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load admin records');
      this.setLoans(data, true);
      return data;
    }
  };

  window.addEventListener('rf-save-error', event => {
    const message = event.detail || 'Changes may not have been saved.';
    const notice = document.createElement('div');
    notice.setAttribute('role', 'alert');
    notice.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#fee2e2;color:#991b1b;padding:12px 16px;border:1px solid #fecaca;border-radius:8px;font:14px sans-serif';
    notice.textContent = message;
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 7000);
  });
  window.rfBootstrap = async function(runOriginalApp) {
    // Never preload all customer records into public browser storage.
    hydrating = true;
    nativeSetItem.call(localStorage, 'loans', '[]');
    hydrating = false;
    serverReady = true;
    runOriginalApp();
  };
})();
