# Salesforce Package Generator

A Chrome extension that helps Salesforce developers generate `package.xml` files for metadata deployments.

## Features

- 🔐 **Automatic Org Detection** - Opens from any logged-in Salesforce org page
- 🔑 **Manual Login** - Production and Sandbox login options  
- 📦 **Smart Package Generation** - Select metadata types to include
- 🎯 **Member Preview** - View individual components before generating
- ⚡ **Fast & Reliable** - Cookie-based authentication works with all orgs
- Select multiple metadata types with an intuitive interface
- Search and filter metadata types
- Choose different API versions
- Generate and download `package.xml` files
- Works with Salesforce orgs (both production and sandbox)

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your Chrome toolbar

## Usage ##

### Connecting to Salesforce

**Option 1: Auto-Detection (Recommended)**
1. Login to your Salesforce org in Chrome
2. Click the extension icon or open from the toolbar
3. Click "Detect Current Org" 
4. The extension will automatically find your active session

**Option 2: Manual Login**
1. Click the extension icon
2. Click "Login to Salesforce"
3. Choose Production or Sandbox
4. Complete login in the new tab
5. Extension closes the tab and connects automatically

### Generating package.xml

1. Click the extension icon in your Chrome toolbar
2. The extension will open in a new tab
3. Once connected, browse available metadata types
4. Check the boxes for types you want to include in your package
5. Click on any type name to preview its members (optional)
6. Choose the desired API version (default: 56.0)
7. Click "Generate package.xml" to download the file

## How It Works

The extension uses **cookie-based authentication**:
- Detects session cookies from any Salesforce tab
- Works with Production, Sandbox, Scratch, and Developer orgs
- Supports custom domains and My Domain
- No Connected App or OAuth setup required
- Session ID used only for Tooling/Metadata API calls

## Troubleshooting

**"Could not detect org"**
- Make sure you're logged into Salesforce in Chrome
- Try refreshing the Salesforce page
- Use manual login instead

**"Login timeout"**
- Complete the login within 5 minutes
- Check your network connection
- Try again with manual login

**No metadata showing**
- Ensure you have API access in your org
- Check profile permissions
- Refresh the extension

## Development

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Building the Extension

To build the extension for production:

```bash
npm run build
```

The built files will be available in the `dist` directory.

### Loading in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` directory

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ for Salesforce developers
- Inspired by the need for a simple package.xml generator
