# Salesforce Package Generator

A Chrome extension that helps Salesforce developers generate `package.xml` files for metadata deployments.

## Features

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

## Usage

1. Click the extension icon in your Chrome toolbar
2. The extension will open in a new tab
3. Select the metadata types you want to include in your package
4. Choose the desired API version
5. Click "Generate package.xml" to download the file

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
