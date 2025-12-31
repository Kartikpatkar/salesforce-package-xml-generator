// utils/auth.js - Cookie-based authentication for any Salesforce org
class SalesforceAuth {
    // Short-lived cache to avoid revalidating the same session on every call
    static _cache = { org: null, timestamp: 0 };
    static _CACHE_TTL = 60000; // 60 seconds

    // Clear the cache (useful when switching orgs)
    static clearCache() {
        this._cache = { org: null, timestamp: 0 };
        console.log('Auth cache cleared');
    }

    static async getCurrentOrg() {
        try {
            // Return cached org if still fresh
            const now = Date.now();
            if (this._cache.org?.isAuthenticated && (now - this._cache.timestamp) < this._CACHE_TTL) {
                return this._cache.org;
            }

            // Check if there's a stored opener tab (the tab user was on before clicking extension)
            const storage = await chrome.storage.local.get(['openerTabId']);
            const openerTabId = storage.openerTabId;
            
            if (openerTabId) {
                console.log('Checking opener tab ID:', openerTabId);
                try {
                    const openerTab = await chrome.tabs.get(openerTabId);
                    if (openerTab && openerTab.url && (
                        openerTab.url.includes('salesforce.com') ||
                        openerTab.url.includes('force.com') ||
                        openerTab.url.includes('visual.force.com')
                    )) {
                        const openerHost = new URL(openerTab.url).hostname;
                        if (this._isLoginOrTestHost(openerHost)) {
                            console.log('Skipping login/test opener tab:', openerHost);
                        } else {
                            console.log('Opener tab is Salesforce:', openerTab.url);
                            const result = await this._checkTabForSession(openerTab);
                            if (result.isAuthenticated) {
                                console.log('Found session in opener tab:', result.instanceUrl);
                                this._cache = { org: result, timestamp: Date.now() };
                                return result;
                            }
                        }
                    }
                } catch (e) {
                    console.log('Opener tab no longer exists:', e.message);
                }
            }
            
            // If we reached here, opener tab did not yield an authenticated session.
            console.log('No authenticated org found in opener tab; skipping scan of other tabs by request');
            this._cache = { org: { isAuthenticated: false }, timestamp: Date.now() };
            return { isAuthenticated: false };
        } catch (error) {
            console.error('Error detecting current org:', error);
            return { isAuthenticated: false, error: error.message };
        }
    }

    static async _ensureContentScript(tabId) {
        try {
            await chrome.tabs.sendMessage(tabId, { type: 'PING' });
            return true;
        } catch (err) {
            if (err?.message?.includes('Receiving end')) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['content/content-script.js']
                    });
                    return true;
                } catch (injectErr) {
                    console.log('Failed to inject content script:', injectErr.message);
                    return false;
                }
            }
            return false;
        }
    }

    static _isLoginOrTestHost(hostname = '') {
        return hostname === 'login.salesforce.com' ||
               hostname === 'test.salesforce.com' ||
               hostname.startsWith('login.') ||
               hostname.startsWith('test.');
    }

    static _scoreSessionCookie(name = '') {
        if (name === 'sid') return 3;            // canonical session cookie
        if (name.startsWith('sid_')) return 2;   // other sid variants
        if (name.includes('sid')) return 1;      // fallbacks like sid_Client
        if (name.endsWith('_sid')) return 1;     // trailing sid patterns
        return 0;
    }

    static _getApiBaseFromHostname(hostname, protocol = 'https:') {
        if (!hostname) return null;
        if (hostname.endsWith('.lightning.force.com')) {
            return `${protocol}//${hostname.replace('.lightning.force.com', '.my.salesforce.com')}`;
        }
        return `${protocol}//${hostname}`;
    }

    static async _validateSessionViaApi(apiBase, sessionId, tabId = null) {
        if (!apiBase || !sessionId) {
            return { success: false, error: 'Missing apiBase or sessionId' };
        }

        // If we have a tabId, try validating via content script first (uses page's cookies)
        if (tabId) {
            try {
                const response = await chrome.tabs.sendMessage(tabId, { 
                    type: 'VALIDATE_SESSION',
                    apiBase,
                    sessionId
                });
                if (response?.success) {
                    return { success: true };
                }
            } catch (e) {
                console.log('Content script validation failed, trying API directly:', e.message);
            }
        }

        // Fallback: try REST API with Bearer token
        const url = `${apiBase}/services/data/v56.0/limits`;
        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${sessionId}` },
                cache: 'no-cache'
            });

            if (!res.ok) {
                let bodyPreview = '';
                try {
                    bodyPreview = await res.text();
                    bodyPreview = bodyPreview.slice(0, 200);
                } catch (e) {
                    bodyPreview = '(unreadable body)';
                }
                return { success: false, status: res.status, statusText: res.statusText, bodyPreview };
            }

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('json')) {
                return { success: false, contentType };
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    static async _checkTabForSession(tab) {
        try {
            const url = new URL(tab.url);
            const hostname = url.hostname;
            
            console.log('Checking tab:', hostname);

            // Skip generic login hosts; we only want actual org hosts
            if (this._isLoginOrTestHost(hostname)) {
                console.log('Skipping login/test host:', hostname);
                return { isAuthenticated: false };
            }
            
            // Try multiple domain variations for cookie lookup
            const domainsToCheck = [
                hostname,
                '.' + hostname,
                '.salesforce.com',
                '.my.salesforce.com',
                '.force.com'
            ];
            
            const candidateCookies = [];
            
            // Try each domain pattern
            for (const domain of domainsToCheck) {
                try {
                    const cookies = await chrome.cookies.getAll({ domain });
                    console.log('Cookies for', domain, ':', cookies.length);

                    cookies.forEach(c => {
                        const score = this._scoreSessionCookie(c.name);
                        if (score > 0) {
                            candidateCookies.push({ cookie: c, score });
                        }
                    });
                } catch (e) {
                    // Continue to next domain
                }
            }

            if (candidateCookies.length > 0) {
                candidateCookies.sort((a, b) => b.score - a.score);

                const validationFailures = [];
                const seenValues = new Set();

                for (const { cookie } of candidateCookies) {
                    if (seenValues.has(cookie.value)) {
                        continue; // skip duplicate sid values to avoid noisy retries
                    }
                    seenValues.add(cookie.value);

                    console.log('Selected session cookie:', cookie.name);

                    // Determine if sandbox
                    const isSandbox = hostname.includes('.sandbox.') ||
                                    hostname.includes('--') ||
                                    hostname.includes('.develop.') ||
                                    hostname.includes('.scratch.');
                    
                    const apiBase = this._getApiBaseFromHostname(hostname, url.protocol);

                    // Validate session via content script first (prefers page's session)
                    const validation = await this._validateSessionViaApi(apiBase, cookie.value, tab.id);
                    if (validation?.success) {
                        // Augment with org info if available via content script
                        let orgInfo = {};
                        try {
                            const injected = await this._ensureContentScript(tab.id);
                            if (injected) {
                                const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ORG_INFO' });
                                orgInfo = response || {};
                            }
                        } catch (e) {
                            console.log('Could not get org info from tab');
                        }

                        return {
                            isAuthenticated: true,
                            instanceUrl: apiBase,
                            sessionId: cookie.value,
                            isSandbox,
                            orgId: orgInfo.orgId,
                            userId: orgInfo.userId,
                            username: orgInfo.username,
                            tabId: tab.id
                        };
                    }

                    console.warn('Session validation failed (API)', validation ? JSON.stringify(validation) : 'no response');
                    validationFailures.push({ cookie: cookie.name, validation });
                }

                // All candidates failed
                return { isAuthenticated: false, validationFailure: validationFailures };
            }
            
            return { isAuthenticated: false };
        } catch (err) {
            console.log('Error checking tab:', err);
            return { isAuthenticated: false };
        }
    }

    // Ensure confirm function exists (not available in service worker)
    static get confirm() {
        return typeof window !== 'undefined' && window.confirm
            ? window.confirm.bind(window)
            : () => true; // Default to true in non-window contexts
    }

    static async login(useSandbox = false) {
        try {
            const authUrl = useSandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
            const tab = await chrome.tabs.create({ url: authUrl });

            return new Promise((resolve, reject) => {
                const onUpdated = async (tabId, changeInfo, updatedTab) => {
                    if (tabId === tab.id && changeInfo.status === 'complete') {
                        try {
                            const url = new URL(updatedTab.url);
                            const isSalesforceUrl = url.hostname.endsWith('salesforce.com') ||
                                url.hostname.endsWith('force.com');

                            if (isSalesforceUrl &&
                                (url.pathname.includes('/secur/') ||
                                    url.pathname.includes('/lightning/setup/'))) {

                                // Give it a moment for the session to be established
                                setTimeout(async () => {
                                    const org = await this.getCurrentOrg();
                                    if (org.isAuthenticated) {
                                        chrome.tabs.onUpdated.removeListener(onUpdated);
                                        chrome.tabs.remove(tabId);
                                        resolve(org);
                                    } else {
                                        // If not authenticated yet, keep listening
                                        console.log('Session not established yet, continuing to listen...');
                                    }
                                }, 1000);
                            }
                        } catch (error) {
                            console.error('Error in tab update handler:', error);
                        }
                    }
                };

                // Set a timeout to clean up if authentication takes too long
                const timeout = setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(onUpdated);
                    reject(new Error('Authentication timed out'));
                }, 60000); // 60 second timeout

                chrome.tabs.onUpdated.addListener(onUpdated);
            });
        } catch (error) {
            console.error('Login error:', error);
            throw new Error('Failed to initiate login: ' + error.message);
        }
    }
}

export default SalesforceAuth;