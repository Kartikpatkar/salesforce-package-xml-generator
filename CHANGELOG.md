# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2026-06-11

### Fixed
- **404 Script Path**: Fixed incorrect path reference `<script src="utils/setup.js">` to `../utils/setup.js` in `app/index.html`.
- **Unsupported Tooling Types**: Fixed missing `LightningComponentBundle` and `AuraDefinitionBundle` mappings in the service worker tooling dispatcher.
- **Duplicate Listeners**: Merged duplicate `chrome.runtime.onInstalled` listeners in the background worker.
- **Login Polling Leak**: Resolved memory leaks and redundant calls by explicitly clearing `loginCheckInterval` when authentication completes.
- **Extension Icons**: Resized bloated `icon16.png` (from 275KB to 949B) and generated properly sized `icon48.png` and `icon128.png` files.

### Added
- **Local SVG Icons**: Removed dependency on external FontAwesome CDN to prevent Manifest V3 Content Security Policy (CSP) violations. Added SVG symbols directly into `app/assets/icons.svg`.
- **Dynamic API Versioning**: Updated `salesforce-members.js` to query Salesforce metadata using the active user-selected API version instead of hardcoding `56.0`.
- **Chrome Web Store Listing**: Created `CHROMEWEBSTORE.md` containing listing copy and permissions justifications.

### Refactored
- **Consolidated Authentication**: Upgraded `SalesforceConnector` to handle context info extraction and refactored the background worker to use it exclusively, completely deleting the redundant `utils/auth.js` helper.
- **Unified Members Client**: Refactored the service worker to leverage the modular `SalesforceMembers` utility, removing ~150 lines of duplicate SOAP/Tooling query logic.

---

## [1.0.1] - 2026-06-10
- Minor fixes and updates.

---

## [1.0.0] - 2025-12-31
- Initial release.
