// Content script for Salesforce Package Generator
// This script runs in the context of Salesforce pages

console.log('Salesforce Package Generator content script loaded');

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === 'GET_METADATA') {
    // TODO: Implement logic to fetch metadata from Salesforce page
    // For now, return a sample response
    sendResponse({
      success: true,
      metadata: {
        orgId: getOrgId(),
        username: getUsername(),
        metadataTypes: getAvailableMetadataTypes()
      }
    });
  }
  
  if (request.type === 'GET_ORG_INFO') {
    // Extract org info from the page
    sendResponse({
      orgId: getOrgId(),
      userId: getUserId(),
      username: getUsername()
    });
  }

  if (request.type === 'VALIDATE_SESSION') {
    validateSession().then(sendResponse);
    return true;
  }
  
  return true; // Required for async response
});

// Helper functions to extract information from Salesforce page
function getOrgId() {
  // Extract org ID from the page
  const match = document.cookie.match(/oid=([^;]+)/);
  return match ? match[1] : null;
}

function getUsername() {
  // Try to get username from various places in the page
  const userInfo = document.querySelector('.profileTrigger');
  return userInfo ? userInfo.textContent.trim() : null;
}

function getUserId() {
  // Extract user ID from the page
  const match = document.cookie.match(/uid=([^;]+)/);
  return match ? match[1] : null;
}

async function validateSession() {
  const urls = buildApiUrls();
  const failures = [];

  for (const apiUrl of urls) {
    try {
      const res = await fetch(apiUrl, {
        credentials: 'include',
        mode: 'cors',
        cache: 'no-cache'
      });

      if (res.redirected) {
        console.warn('Session validation redirected', apiUrl, res.url);
        failures.push({ url: apiUrl, redirected: true, location: res.url });
        continue;
      }

      if (!res.ok) {
        let bodyPreview = '';
        try {
          bodyPreview = await res.text();
          bodyPreview = bodyPreview.slice(0, 200);
        } catch (e) {
          bodyPreview = '(unreadable body)';
        }
        console.warn('Session validation HTTP error', apiUrl, res.status, res.statusText, bodyPreview);
        failures.push({ url: apiUrl, status: res.status, statusText: res.statusText, bodyPreview });
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        console.warn('Session validation unexpected content type', apiUrl, contentType);
        failures.push({ url: apiUrl, contentType });
        continue;
      }

      return { success: true, url: apiUrl };
    } catch (e) {
      console.warn('Session validation fetch error', apiUrl, e?.name, e?.message);
      failures.push({ url: apiUrl, error: e?.message || 'unknown error', name: e?.name });
    }
  }

  console.error('Session validation failed for all URLs', failures);
  return { success: false, attempts: failures };
}

function buildApiUrls() {
  const urls = new Set();
  const { protocol, hostname } = window.location;

  // Same-origin attempt first
  urls.add(`${protocol}//${hostname}/services/data/v56.0/limits`);

  // Lightning domains often need my.salesforce.com for API calls
  if (hostname.endsWith('.lightning.force.com')) {
    urls.add(`${protocol}//${hostname.replace('.lightning.force.com', '.my.salesforce.com')}/services/data/v56.0/limits`);
  }

  // my.salesforce.com fallback if we are on *.my.salesforce.com already
  if (hostname.includes('.my.salesforce.com')) {
    urls.add(`${protocol}//${hostname}/services/data/v56.0/limits`);
  }

  return Array.from(urls);
}

function getAvailableMetadataTypes() {
  // This is a placeholder - in a real implementation, you would fetch this from the Salesforce API
  return [
    'ApexClass',
    'ApexPage',
    'ApexTrigger',
    'ApexComponent',
    'CustomObject',
    'CustomField',
    'Layout',
    'Profile',
    'PermissionSet',
    'CustomTab',
    'Workflow',
    'ValidationRule',
    'RecordType',
    'Flow',
    'CustomMetadata',
    'CustomLabel'
  ];
}

// Listen for page changes to update metadata when navigating in Salesforce
const observer = new MutationObserver(() => {
  // TODO: Update metadata when the page changes
});

// Start observing the document with the configured parameters
observer.observe(document.body, { childList: true, subtree: true });

// Send a message to the background script when the content script is loaded
chrome.runtime.sendMessage({ 
  type: 'CONTENT_SCRIPT_LOADED',
  url: window.location.href 
});
