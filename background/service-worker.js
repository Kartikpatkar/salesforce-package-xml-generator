// background/service-worker.js
// v5 - Simplified import
import SalesforceAuth from '../utils/auth.js';
console.log('Service worker registered');

async function checkAuthAndNotify() {
  try {
    const org = await SalesforceAuth.getCurrentOrg();

    console.log(
      'Auth check result:',
      org?.isAuthenticated ? 'Authenticated' : 'Not authenticated'
    );

    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      org
    });
  } catch (error) {
    console.error('Auth check failed:', error);

    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      org: { isAuthenticated: false }
    });
  }
}

// Initialize connection
chrome.runtime.onInstalled.addListener(() => {
  console.log('Service worker installed');
  // Set default settings
  chrome.storage.sync.set({
    apiVersion: '56.0',
    defaultMetadataTypes: [
      'ApexClass', 'ApexPage', 'ApexTrigger', 'ApexComponent',
      'CustomObject', 'CustomField', 'Layout', 'Profile', 'PermissionSet',
      'CustomTab', 'Workflow', 'ValidationRule', 'RecordType', 'Flow',
      'CustomMetadata', 'CustomLabel'
    ]
  });
});

// Keep the service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker started');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('app/index.html')
  });
});

// Package generation function
function generatePackageXml(metadataTypes = [], apiVersion = '56.0') {
  if (!Array.isArray(metadataTypes) || metadataTypes.length === 0) {
    throw new Error('No metadata types selected');
  }

  let packageXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  packageXml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

  // Sort metadata types for consistent output
  metadataTypes.sort().forEach(type => {
    if (typeof type === 'string' && type.trim() !== '') {
      packageXml += '    <types>\n';
      packageXml += '        <members>*</members>\n';
      packageXml += `        <name>${type.trim()}</name>\n`;
      packageXml += '    </types>\n';
    }
  });

  packageXml += `    <version>${apiVersion || '56.0'}</version>\n`;
  packageXml += '</Package>';

  return packageXml;
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log('Message received:', message.type);

  switch (message.type) {
    case 'LOGIN':
      SalesforceAuth.login();
      break;

    case 'CHECK_AUTH':
      checkAuthAndNotify();   // ✅ NOW EXISTS
      break;

    case 'CONTENT_SCRIPT_LOADED':
      handleContentScriptLoaded(message, sender);
      break;

    case 'GET_METADATA_MEMBERS':
      (async () => {
        let result;
        if (isToolingType(message.metadataType)) {
          result = await fetchMembersViaToolingAPI(message.metadataType);
        } else {
          result = await fetchMetadataMembersViaMetadataAPI(message.metadataType);
        }

        chrome.runtime.sendMessage({
          type: 'GET_METADATA_MEMBERS_RESPONSE',
          ...result
        });
      })();
      break;


    case 'GENERATE_PACKAGE':
      try {
        const { metadataTypes, apiVersion } = message.data;

        const packageXml = generatePackageXml(metadataTypes, apiVersion);

        chrome.runtime.sendMessage({
          type: 'GENERATE_PACKAGE_RESPONSE',
          success: true,
          packageXml
        });
      } catch (e) {
        chrome.runtime.sendMessage({
          type: 'GENERATE_PACKAGE_RESPONSE',
          success: false,
          error: e.message
        });
      }
      break;

    default:
      console.warn('Unknown message type:', message.type);
  }
});

async function fetchMembersViaToolingAPI(metadataType) {
  try {
    const org = await SalesforceAuth.getCurrentOrg();
    if (!org.isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    // Only these metadata types should use the Tooling API
    const objectMap = {
      ApexClass: 'ApexClass',
      ApexTrigger: 'ApexTrigger',
      ApexComponent: 'ApexComponent',
      ApexPage: 'ApexPage'
    };
    
    // CustomLabel and other metadata types should use the Metadata API
    if (metadataType === 'CustomLabel') {
      return { success: false, error: 'Use Metadata API' };
    }

    const toolingObject = objectMap[metadataType];
    if (!toolingObject) {
      return { success: false, error: 'Unsupported tooling type' };
    }

    const query = `SELECT Name FROM ${toolingObject} ORDER BY Name`;
    const url =
      `${org.instanceUrl}/services/data/v56.0/tooling/query/?q=` +
      encodeURIComponent(query);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${org.sessionId}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    return {
      success: true,
      members: data.records.map(r => r.Name)
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}


// Helper: call Metadata API listMetadata (SOAP) and return array of fullNames
async function fetchMetadataMembersViaMetadataAPI(metadataType) {
  try {
    const org = await SalesforceAuth.getCurrentOrg();
    if (!org?.isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    // build SOAP body for listMetadata
    const body = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                              xmlns:met="http://soap.sforce.com/2006/04/metadata">
              <soapenv:Header>
                <met:SessionHeader>
                  <met:sessionId>${org.sessionId}</met:sessionId>
                </met:SessionHeader>
              </soapenv:Header>
              <soapenv:Body>
                <met:listMetadata>
                  <met:queries>
                    <met:type>${metadataType}</met:type>
                  </met:queries>
                  <met:asOfVersion>56.0</met:asOfVersion>
                </met:listMetadata>
              </soapenv:Body>
            </soapenv:Envelope>
        `;

    const res = await fetch(`${org.instanceUrl}/services/Soap/m/56.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': 'listMetadata'
      },
      body
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    }

    const text = await res.text();

    // Very simple XML parsing to pull <fullName> values
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const fullNameNodes = Array.from(xml.getElementsByTagName('fullName'));
    const members = fullNameNodes.map(n => n.textContent).filter(Boolean);

    return { success: true, members };
  } catch (err) {
    console.error('fetchMetadataMembersViaMetadataAPI error', err);
    return { success: false, error: err.message };
  }
}

async function handleContentScriptLoaded(message, sender) {
  const url = message.url || sender?.tab?.url;
  if (!url) return;

  const isSalesforce =
    url.includes('salesforce.com') ||
    url.includes('force.com') ||
    url.includes('visual.force.com');

  if (!isSalesforce) return;

  console.log('Salesforce page confirmed via content script');

  // Delay slightly to allow cookies/session to settle
  setTimeout(async () => {
    const org = await SalesforceAuth.getCurrentOrg();

    chrome.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      org
    });
  }, 500);
}




// Listen for tab updates to detect login/logout
// In service-worker.js, find the tab update listener and update it:
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' &&
    (tab.url?.includes('salesforce.com') ||
      tab.url?.includes('force.com') ||
      tab.url?.includes('visual.force.com'))) {
    console.log('Tab updated, checking auth status...');
    try {
      const org = await SalesforceAuth.getCurrentOrg();
      console.log('Auth status after tab update:', org.isAuthenticated ? 'Authenticated' : 'Not authenticated');

      // Send message to all extension views
      chrome.runtime.sendMessage({
        type: 'AUTH_STATE_CHANGED',
        org
      });
    } catch (error) {
      console.error('Error checking auth status on tab update:', error);
    }
  }
});

// Listen for installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Open the app page on install
    chrome.tabs.create({
      url: chrome.runtime.getURL('app/index.html')
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

function isToolingType(type) {
  return [
    'ApexClass',
    'ApexTrigger',
    'ApexComponent',
    'ApexPage'
  ].includes(type);
}