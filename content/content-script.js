// Content script for Salesforce Package Generator
// This script runs in the context of Salesforce pages

console.log('Salesforce Package Generator content script loaded');

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
