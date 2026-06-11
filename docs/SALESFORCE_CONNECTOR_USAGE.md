# Salesforce Connector Module

A reusable Chrome Extension module for detecting and authenticating Salesforce orgs across multiple extensions.

## Features

- ✅ Automatic org detection from browser tabs
- ✅ Cookie-based session validation
- ✅ Support for production and sandbox orgs
- ✅ Smart caching with configurable TTL
- ✅ Multi-window support
- ✅ Login flow with automatic redirect handling
- ✅ Event-based notifications
- ✅ Tab recency filtering (prevents ghost connections)

## Installation

### 1. Copy Files to Your Extension

Copy `utils/salesforce-connector.js` to your extension project.

### 2. Update manifest.json

Add required permissions:

```json
{
  "permissions": [
    "tabs",
    "cookies",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://*.salesforce.com/*",
    "https://*.force.com/*",
    "https://*.visual.force.com/*",
    "https://*.my.salesforce.com/*",
    "https://*.salesforce-setup.com/*",
    "https://*.my.salesforce-setup.com/*",
    "https://login.salesforce.com/*",
    "https://test.salesforce.com/*"
  ]
}
```

## Usage

### Basic Usage

```javascript
import SalesforceConnector from './utils/salesforce-connector.js';

// Initialize connector
const sfConnector = new SalesforceConnector({
  cacheTTL: 60000, // Cache duration (default: 60 seconds)
  onAuthChange: (org) => {
    if (org.isAuthenticated) {
      console.log('Connected to:', org.instanceUrl);
      console.log('Session ID:', org.sessionId);
      console.log('Is Sandbox:', org.isSandbox);
    } else {
      console.log('Not authenticated');
    }
  }
});

// Check authentication
const org = await sfConnector.checkAuth();
console.log(org);
```

### Advanced Authentication

```javascript
// Check auth with custom options
const org = await sfConnector.checkAuth({
  skipCache: true,           // Bypass cache
  currentWindowOnly: true,   // Only check current window tabs
  recencyThreshold: 30000    // Only use tabs accessed in last 30s
});

if (org.isAuthenticated) {
  // Make API calls using org.sessionId and org.instanceUrl
  const response = await fetch(`${org.instanceUrl}/services/data/v56.0/sobjects`, {
    headers: {
      'Authorization': `Bearer ${org.sessionId}`,
      'Content-Type': 'application/json'
    }
  });
}
```

### Login Flow

```javascript
// Login to production
try {
  const org = await sfConnector.login(false);
  console.log('Successfully logged into production org:', org.instanceUrl);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Login to sandbox
try {
  const org = await sfConnector.login(true);
  console.log('Successfully logged into sandbox org:', org.instanceUrl);
} catch (error) {
  console.error('Login failed:', error.message);
}

// Login with custom timeout
const org = await sfConnector.login(false, 120000); // 2 minute timeout
```

### Switch Org

```javascript
// Clear current session and force re-authentication
await sfConnector.switchOrg();

// After switching, you'll need to re-authenticate
const newOrg = await sfConnector.checkAuth();
```

### Manual Cache Management

```javascript
// Clear cache to force fresh authentication check
sfConnector.clearCache();

// Next check will be fresh
const org = await sfConnector.checkAuth();
```

## API Reference

### Constructor Options

```javascript
new SalesforceConnector({
  cacheTTL: 60000,              // Cache time-to-live in milliseconds
  onAuthChange: (org) => {},    // Callback for auth state changes
  contentScriptPath: 'path'     // Optional: custom content script path
})
```

### Methods

#### `checkAuth(options)`

Check current Salesforce authentication status.

**Parameters:**
- `options` (Object, optional)
  - `skipCache` (boolean) - Bypass cache, force fresh check
  - `currentWindowOnly` (boolean) - Only check tabs in current window (default: true)
  - `recencyThreshold` (number) - Max tab age in ms (default: 30000)

**Returns:** `Promise<Object>` - Org object

```javascript
{
  isAuthenticated: true,
  instanceUrl: 'https://myorg.my.salesforce.com',
  sessionId: 'xxxxxxxxxxxx',
  isSandbox: false,
  tabId: 12345
}
```

#### `login(useSandbox, timeout)`

Open Salesforce login window and authenticate.

**Parameters:**
- `useSandbox` (boolean) - true for sandbox, false for production
- `timeout` (number, optional) - Timeout in ms (default: 60000)

**Returns:** `Promise<Object>` - Org object after successful login

#### `switchOrg()`

Clear current session and force re-authentication.

**Returns:** `Promise<void>`

#### `clearCache()`

Manually clear the authentication cache.

**Returns:** `void`

## Integration Examples

### Example 1: Background Service Worker

```javascript
// background/service-worker.js
import SalesforceConnector from '../utils/salesforce-connector.js';

const sfConnector = new SalesforceConnector({
  onAuthChange: (org) => {
    // Notify all extension contexts
    chrome.runtime.sendMessage({
      type: 'SF_AUTH_CHANGED',
      org
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CHECK_SF_AUTH':
      sfConnector.checkAuth().then(sendResponse);
      return true; // Async response
      
    case 'SF_LOGIN':
      sfConnector.login(message.useSandbox).then(sendResponse).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;
      
    case 'SF_SWITCH_ORG':
      sfConnector.switchOrg().then(sendResponse);
      return true;
  }
});
```

### Example 2: Popup UI

```javascript
// popup/popup.js
let currentOrg = null;

// Check auth on popup open
chrome.runtime.sendMessage({ type: 'CHECK_SF_AUTH' }, (org) => {
  if (org.isAuthenticated) {
    showConnectedUI(org);
  } else {
    showLoginUI();
  }
});

// Login button handler
document.getElementById('loginBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ 
    type: 'SF_LOGIN', 
    useSandbox: false 
  }, (org) => {
    if (org.isAuthenticated) {
      showConnectedUI(org);
    } else {
      showError('Login failed');
    }
  });
});

// Switch org button
document.getElementById('switchOrgBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SF_SWITCH_ORG' }, () => {
    showLoginUI();
  });
});

function showConnectedUI(org) {
  document.getElementById('status').textContent = `Connected to ${org.instanceUrl}`;
  document.getElementById('orgType').textContent = org.isSandbox ? 'Sandbox' : 'Production';
}

function showLoginUI() {
  document.getElementById('status').textContent = 'Not connected';
}
```

### Example 3: Making Salesforce API Calls

```javascript
// utils/salesforce-api.js
import SalesforceConnector from './salesforce-connector.js';

class SalesforceAPI {
  constructor() {
    this.connector = new SalesforceConnector();
  }

  async query(soql) {
    const org = await this.connector.checkAuth();
    if (!org.isAuthenticated) {
      throw new Error('Not authenticated to Salesforce');
    }

    const url = `${org.instanceUrl}/services/data/v56.0/query?q=${encodeURIComponent(soql)}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${org.sessionId}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getMetadataTypes() {
    const org = await this.connector.checkAuth();
    if (!org.isAuthenticated) {
      throw new Error('Not authenticated to Salesforce');
    }

    const url = `${org.instanceUrl}/services/data/v56.0/metadata/describe`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${org.sessionId}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Metadata fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.metadataObjects;
  }
}

export default SalesforceAPI;
```

## Troubleshooting

### Issue: Not detecting org

**Solution:** Ensure you have the required host_permissions in manifest.json

### Issue: Login window doesn't redirect

**Solution:** Check that your content script is properly configured and matches Salesforce domains

### Issue: Authentication fails after login

**Solution:** 
- Verify session cookies are being set
- Check browser console for errors
- Ensure API version (v56.0) is supported by your org

### Issue: Cache not clearing

**Solution:** Call `clearCache()` explicitly before checking auth

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Any Chromium-based browser with Manifest V3 support

## License

MIT License - Free to use in commercial and open-source projects

## Support

For issues or questions, refer to the main extension repository or contact the author.
