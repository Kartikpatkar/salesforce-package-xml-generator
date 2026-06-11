# Chrome Web Store Listing — Salesforce Package Generator

> Last Updated: 2026-06-11

## Store Listing

**Extension Name**
Salesforce Package Generator

**Short Description**
Generate deployment packages (package.xml) for Salesforce with ease.

**Detailed Description**
Salesforce Package Generator simplifies the creation of package.xml files for your Salesforce deployments.

With this extension, you can easily select the metadata types and specific components you want to include in your deployment package. The extension automatically detects your active Salesforce session, fetches available metadata types, and lists components in real-time, allowing you to build package files directly from your browser.

Key Features:
- Automatic detection of active Salesforce sessions from your browser tabs.
- Real-time retrieval of metadata types and components via Tooling and Metadata APIs.
- Filter and search components to easily locate what you need to deploy.
- Live XML preview of the generated package file.
- Single-click copy to clipboard or direct XML download.

How to Use:
1. Log in to your Salesforce Org in Chrome.
2. Click the Salesforce Package Generator extension icon.
3. Your active Org connection will be automatically detected.
4. Select the metadata types and individual members you want to package.
5. Review the live preview on the right and click "Generate package.xml" to download the file.

Privacy and Security Note:
This extension runs entirely inside your browser. All session detection and API requests are executed locally on your device. We do not collect, transmit, or store any personal data or credentials on external servers.

**Category**
Developer Tools

**Single Purpose**
Generates XML deployment package files (package.xml) from active Salesforce instances.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `assets/icons/icon128.png` |
| Screenshot 1 | 1280×800 | ✅ Ready | `assets/screenshots/Salesforce Package XML Generator (Dark Theme).png` |
| Screenshot 2 | 1280×800 | ✅ Ready | `assets/screenshots/Salesforce Package XML Generator (Light Theme).png` |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Used to query active Salesforce tabs to detect current active session instance URLs. |
| `cookies` | permissions | Used to read session cookies (`sid` variants) from Salesforce domains to authorize API connection calls. |
| `storage` | permissions | Used to save user preferences, default metadata selections, and API versions. |
| `activeTab` | permissions | Used to obtain temporary tab access upon user click to identify the active Salesforce tab URL. |
| `scripting` | permissions | Used to dynamically inject the content-script to check session validity and retrieve Org context info. |
| `https://*.salesforce.com/*` | host_permissions | Allowed domain to perform fetch API calls to Salesforce metadata and tooling query services. |
| `https://*.force.com/*` | host_permissions | Allowed domain to perform fetch API calls to Salesforce metadata and tooling query services. |
| `https://*.visual.force.com/*` | host_permissions | Allowed domain to perform fetch API calls to Salesforce metadata and tooling query services. |
| `https://*.my.salesforce.com/*` | host_permissions | Allowed domain to perform fetch API calls to Salesforce metadata and tooling query services. |
| `https://login.salesforce.com/*` | host_permissions | Allowed domain to login to Salesforce production and retrieve redirected sessions. |
| `https://test.salesforce.com/*` | host_permissions | Allowed domain to login to Salesforce sandboxes and retrieve redirected sessions. |
| `https://*.salesforce-setup.com/*` | host_permissions | Allowed domain to detect sessions on Salesforce setup pages. |
| `https://*.my.salesforce-setup.com/*` | host_permissions | Allowed domain to detect sessions on Salesforce setup pages. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL**
Refer to [PRIVACY.md](file:///Users/apple/Desktop/Desktop Backup/New folder/Project/SFDX Package Generator/salesforce-package-xml-generator/PRIVACY.md) in the project workspace.

---

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

---

## Developer Info

**Publisher Name**
Kartik Patkar

**Contact Email**
kartikkp.assets@gmail.com

**Support URL / Email**
https://github.com/Kartikpatkar/salesforce-package-xml-generator/issues

**Homepage URL**
https://github.com/Kartikpatkar/salesforce-package-xml-generator

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.2 | 2026-06-11 | Bug fixes, optimized icons, refactored API clients, and CSP alignment. | Draft |
| 1.0.1 | 2026-06-10 | Minor updates. | Published |
| 1.0.0 | 2025-12-31 | Initial release. | Published |
