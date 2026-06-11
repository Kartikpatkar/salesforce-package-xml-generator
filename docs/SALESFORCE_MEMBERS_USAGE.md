# Salesforce Members Fetcher

Reusable module to fetch metadata type members from Salesforce orgs with automatic API routing.

## Features

- ✅ Automatic routing to Tooling API or Metadata API based on type
- ✅ Support for all standard metadata types
- ✅ Simple, clean API
- ✅ Works with salesforce-connector.js for authentication
- ✅ Proper error handling and validation
- ✅ No external dependencies (just native fetch)

## Installation

Copy `utils/salesforce-members.js` to your extension project.

**Dependency:** Requires `salesforce-connector.js` in the same folder.

## Usage

### Basic Usage

```javascript
import SalesforceMembers from './utils/salesforce-members.js';

// Initialize
const members = new SalesforceMembers({
  apiVersion: '56.0'  // optional, defaults to 56.0
});

// Fetch members for any metadata type
const apexClasses = await members.getMembers('ApexClass');
console.log('Apex Classes:', apexClasses);
// ['AccountController', 'ContactHelper', 'TestDataFactory', ...]

const reports = await members.getMembers('Report');
console.log('Reports:', reports);
// ['Sales_Report', 'Monthly_Dashboard', ...]

const profiles = await members.getMembers('Profile');
console.log('Profiles:', profiles);
// ['Admin', 'Standard User', 'Sales Profile', ...]
```

### With Shared Connector

```javascript
import SalesforceConnector from './utils/salesforce-connector.js';
import SalesforceMembers from './utils/salesforce-members.js';

// Create shared connector
const connector = new SalesforceConnector();

// Share connector across multiple instances
const members = new SalesforceMembers({ connector });

// Check auth once
const org = await connector.checkAuth();

// Now fetch members (uses same auth)
const apexClasses = await members.getMembers('ApexClass');
const flows = await members.getMembers('Flow');
```

### Check API Routing

```javascript
const members = new SalesforceMembers();

// Check which API will be used
console.log(members.isToolingType('ApexClass'));      // true - uses Tooling API
console.log(members.isToolingType('Report'));         // false - uses Metadata API
console.log(members.isToolingType('CustomObject'));   // false - uses Metadata API
```

## Supported Metadata Types

### Via Tooling API (Faster)
- ApexClass
- ApexTrigger
- ApexComponent
- ApexPage
- LightningComponentBundle
- AuraDefinitionBundle

### Via Metadata API (All Others)
- Report
- Dashboard
- Flow
- FlowDefinition
- CustomObject
- CustomField
- Layout
- Profile
- PermissionSet
- ValidationRule
- WorkflowRule
- EmailTemplate
- StaticResource
- QuickAction
- CustomTab
- CustomApplication
- ... and 150+ other standard types

## API Reference

### Constructor

```javascript
new SalesforceMembers(options)
```

**Options:**
- `apiVersion` (string, optional) - Salesforce API version (default: '56.0')
- `connector` (SalesforceConnector, optional) - Shared connector instance

### Methods

#### `getMembers(metadataType)`

Fetch members for a metadata type.

**Parameters:**
- `metadataType` (string, required) - Metadata type name

**Returns:** `Promise<Array<string>>` - Array of member names

**Example:**
```javascript
const members = await fetcher.getMembers('ApexClass');
// ['MyClass', 'TestClass', 'Helper']
```

#### `isToolingType(type)`

Check if a metadata type uses Tooling API.

**Parameters:**
- `type` (string, required) - Metadata type name

**Returns:** `boolean` - True if uses Tooling API

**Example:**
```javascript
const usesTooling = fetcher.isToolingType('ApexClass'); // true
```

## Integration Examples

### Example 1: Fetch All Metadata

```javascript
import SalesforceMembers from './utils/salesforce-members.js';

const fetcher = new SalesforceMembers();

const metadataTypes = [
  'ApexClass',
  'ApexTrigger', 
  'Report',
  'Dashboard',
  'Flow',
  'CustomObject'
];

const allMembers = {};

for (const type of metadataTypes) {
  try {
    const members = await fetcher.getMembers(type);
    allMembers[type] = members;
    console.log(`${type}: ${members.length} members`);
  } catch (error) {
    console.error(`Failed to fetch ${type}:`, error.message);
  }
}

console.log('All members:', allMembers);
```

### Example 2: Background Service Worker

```javascript
// background/service-worker.js
import SalesforceMembers from '../utils/salesforce-members.js';

const membersFetcher = new SalesforceMembers();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_MEMBERS') {
    membersFetcher.getMembers(message.metadataType)
      .then(members => {
        sendResponse({ success: true, members });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});
```

### Example 3: UI with Loading State

```javascript
// popup/popup.js
async function loadMetadataMembers(type) {
  const statusDiv = document.getElementById('status');
  const listDiv = document.getElementById('membersList');
  
  statusDiv.textContent = `Loading ${type}...`;
  listDiv.innerHTML = '';
  
  try {
    const members = await chrome.runtime.sendMessage({
      type: 'GET_MEMBERS',
      metadataType: type
    });
    
    if (members.success) {
      statusDiv.textContent = `Found ${members.members.length} ${type} members`;
      members.members.forEach(name => {
        const item = document.createElement('div');
        item.textContent = name;
        listDiv.appendChild(item);
      });
    } else {
      statusDiv.textContent = `Error: ${members.error}`;
    }
  } catch (error) {
    statusDiv.textContent = `Failed: ${error.message}`;
  }
}

// Usage
document.getElementById('loadApex').addEventListener('click', () => {
  loadMetadataMembers('ApexClass');
});
```

### Example 4: Generate Package.xml

```javascript
import SalesforceMembers from './utils/salesforce-members.js';

async function generatePackageXml(metadataTypes) {
  const fetcher = new SalesforceMembers();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
  
  for (const type of metadataTypes) {
    const members = await fetcher.getMembers(type);
    
    if (members.length > 0) {
      xml += '    <types>\n';
      members.forEach(member => {
        xml += `        <members>${member}</members>\n`;
      });
      xml += `        <name>${type}</name>\n`;
      xml += '    </types>\n';
    }
  }
  
  xml += '    <version>56.0</version>\n';
  xml += '</Package>';
  
  return xml;
}

// Usage
const types = ['ApexClass', 'ApexTrigger', 'Report'];
const packageXml = await generatePackageXml(types);
console.log(packageXml);
```

## Error Handling

The module throws descriptive errors:

```javascript
try {
  const members = await fetcher.getMembers('InvalidType');
} catch (error) {
  // Possible errors:
  // - "Not authenticated to Salesforce"
  // - "Missing session info - please re-authenticate"
  // - "Tooling API error: HTTP 404 - ..."
  // - "Metadata API error: HTTP 500 ..."
  console.error(error.message);
}
```

## Performance Notes

- **Tooling API** (6 types): Faster, returns results in ~100-300ms
- **Metadata API** (all others): Slower, typically ~500-1500ms
- Results are not cached - implement your own caching layer if needed

## Caching Example

```javascript
class CachedMembersFetcher extends SalesforceMembers {
  constructor(options) {
    super(options);
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }
  
  async getMembers(metadataType) {
    const cached = this.cache.get(metadataType);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.cacheTTL) {
      return cached.members;
    }
    
    const members = await super.getMembers(metadataType);
    this.cache.set(metadataType, { members, timestamp: now });
    
    return members;
  }
}
```

## License

MIT License - Free to use in commercial and open-source projects
