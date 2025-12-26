// utils/auth.js - v3 - Added confirm function check
class SalesforceAuth {
    static async getCurrentOrg() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) {
                return { isAuthenticated: false };
            }

            // Check for Salesforce domains
            const isSalesforceDomain = tab.url.includes('salesforce.com') ||
                tab.url.includes('force.com') ||
                tab.url.includes('visual.force.com');

            if (!isSalesforceDomain) {
                return { isAuthenticated: false };
            }

            const url = new URL(tab.url);
            // Handle sandbox orgs
            const isSandbox = url.hostname.includes('test.salesforce.com') ||
                (url.hostname.includes('salesforce.com') &&
                    !url.hostname.includes('login'));

            // For content pages, we can check for the presence of the session cookie
            const domain = isSandbox ? '.salesforce.com' : url.hostname;
            const cookies = await chrome.cookies.getAll({ domain });

            // Look for any session cookie
            const sessionCookie = cookies.find(c =>
                c.name.startsWith('sid') ||
                c.name === 'sid' ||
                c.name.endsWith('sid') ||
                c.name.includes('sid=')
            );

            if (sessionCookie) {
                return {
                    isAuthenticated: true,
                    instanceUrl: `${url.protocol}//${url.host}`,
                    sessionId: sessionCookie.value,
                    isSandbox
                };
            }

            return { isAuthenticated: false };
        } catch (error) {
            console.error('Error detecting current org:', error);
            return { isAuthenticated: false, error: error.message };
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