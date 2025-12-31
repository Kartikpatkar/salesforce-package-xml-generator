# 📦 Salesforce Package XML Generator – Metadata Explorer & Deployment Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](#)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg?logo=google-chrome)](#)
[![Salesforce](https://img.shields.io/badge/Salesforce-Metadata%20API-00A1E0.svg)](#)

> **Tagline**: *Explore Salesforce metadata and generate accurate `package.xml` files — visually, securely, and effortlessly.*

---

## ✨ Overview

**Salesforce Package XML Generator** is a modern, developer-focused **Chrome Extension** that helps you **browse Salesforce org metadata and generate deployment-ready `package.xml` files** without writing XML manually.

Built for Salesforce developers who frequently work with:

* Metadata deployments
* Partial deployments
* CI/CD preparation
* Sandbox → Production releases
* Multi-org environments

The extension focuses on **accuracy, speed, and clarity**, using **Salesforce Tooling API and Metadata API** directly — no scraping, no middleware.

---

## 🚀 Key Features

### 🔐 Salesforce Org Detection & Authentication

* Automatically detects the **currently active Salesforce org**
* Supports:

  * Production
  * Sandbox
  * Developer Edition
  * Scratch Orgs
* Uses existing Salesforce browser session
* No OAuth setup
* No credentials stored
* Real-time connection status indicator

---

### 🧩 Metadata Type Explorer

* Displays a searchable list of Salesforce **metadata types**
* Dynamically loads metadata types from the connected org
* Intelligent fallback to default metadata list if API discovery fails
* Commonly supported types include:

  * ApexClass
  * ApexTrigger
  * ApexPage
  * ApexComponent
  * CustomObject
  * CustomField
  * Layout
  * Profile
  * PermissionSet
  * Flow
  * CustomMetadata
  * CustomLabel
  * Workflow
  * ValidationRule
  * RecordType

---

### 📂 Metadata Component Viewer

* Click any metadata type to view **actual components present in the org**
* Uses the **correct Salesforce API per metadata type**:

  * **Tooling API** for Apex metadata
  * **Metadata API (`listMetadata`)** for configuration metadata
* Displays real-time component count
* Gracefully handles:

  * Empty metadata
  * Unsupported metadata types
  * API errors

---

### ☑️ Fine-Grained Selection

* Select **individual metadata components**
* “Select All” support per metadata type
* Search within metadata components
* Selections persist across sessions using Chrome Storage

---

### 📦 Smart `package.xml` Generator

* Generates **valid Salesforce `package.xml`**
* Supports:

  * Full wildcard deployment (`<members>*</members>`)
  * Partial deployments (specific components only)
* Live **package.xml preview**
* Automatically updates as selections change
* Configurable Salesforce **API version**
* One-click download
* Copy-to-clipboard support

---

### 🎨 Clean & Developer-Friendly UI

* Three-panel layout:

  * Metadata Types
  * Metadata Components
  * Package XML Preview
* Responsive design
* Dark / Light mode support
* Toast notifications for actions and errors
* Designed for daily Salesforce development workflows

---

## 🧼 Clear & Reset

* Clear all selections instantly
* Reset metadata and preview state
* Safely switch between Salesforce orgs

---

## 🖥️ UI Philosophy

Salesforce Package XML Generator is designed with:

* **Zero unnecessary complexity**
* **Clear visual hierarchy**
* **Fast navigation between metadata**
* **Readable XML preview**
* **Developer-first usability**

---

## 📸 Screenshots

### 🔷 Light Mode

![Light Mode - Editor Page](./assets/screenshots/Salesforce%20Package%20XML%20Generator%20(Light%20Theme).png)

### 🌑 Dark Mode

![Dark Mode - Editor Page](./assets/screenshots/Salesforce%20Package%20XML%20Generator%20(Dark%20Theme).png)

---

## 🛠 Built With

* **HTML, CSS, JavaScript (Vanilla)**
* Chrome Extensions API (**Manifest V3**)
* Salesforce **Tooling API**
* Salesforce **Metadata API**
* Modular, message-driven architecture

---

## 📦 Installation

### 🔧 Load Extension Manually (Developer Mode)

1. **Clone or Download this Repository**

   ```bash
   git clone https://github.com/Kartikpatkar/salesforce-package-xml-generator.git
   ```

2. **Open Chrome Extensions Page**

   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode**

   * Toggle **Developer mode** (top-right)

4. **Click “Load unpacked”**

   * Select the project root folder (contains `manifest.json`)

5. **Done 🎉**

   * Open Salesforce and click the extension icon

> ✅ Works with existing Salesforce login
> ✅ No external servers
> ✅ No data stored outside the browser

---

## 🧪 Current Capabilities

✔ Salesforce org auto-detection
✔ Metadata type discovery
✔ Metadata component listing
✔ Tooling API & Metadata API support
✔ Partial & full `package.xml` generation
✔ Live XML preview
✔ Persistent selections
✔ Dark / light themes

---

## 🛣️ Roadmap (Planned Enhancements)

* 📦 Metadata ZIP retrieve support
* 🧨 `destructiveChanges.xml` generation
* 👤 Profile & PermissionSet sub-component selection
* 🔍 Metadata search across types
* 🔄 Org-to-org metadata comparison
* 💾 Saved package presets

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

* Fork the repository
* Create a feature branch
* Submit a pull request

Please keep changes modular and follow the existing code structure.

---

## 🧠 Author

Built by **Kartik Patkar**
Salesforce Developer • Chrome Extension Builder

---

## 📜 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

---

> **Salesforce Package XML Generator** — because deployments should be precise, fast, and stress-free 🚀

---