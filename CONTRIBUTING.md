# 🤝 Contributing to Salesforce Package XML Generator

Thank you for your interest in contributing to **Salesforce Package XML Generator**!
We welcome **bug reports, feature requests, performance improvements, UI/UX enhancements, and documentation updates**.

This project is a **developer-focused Chrome Extension** built around **Salesforce Metadata & Tooling APIs**, so **accuracy, security, and performance** are extremely important.

---

## 🧩 Ways to Contribute

### 🐞 Report Bugs

If you encounter a bug, please open an issue with:

* A clear description of the issue
* Steps to reproduce the problem
* Expected behavior vs actual behavior
* Salesforce org type (Prod / Sandbox / Dev / Scratch)
* Screenshots or screen recordings (if applicable)
* Chrome version and OS

This helps ensure issues are diagnosed and fixed correctly across org types.

---

### 💡 Suggest Enhancements

Have an idea to improve the extension?
Open a feature request issue and include:

* What problem it solves for Salesforce developers
* Why it improves deployment or metadata workflows
* Any Salesforce references (Tooling API, Metadata API, DX, etc.)
* Mockups, wireframes, or screenshots (optional but helpful)

We especially welcome ideas related to:

* Metadata exploration improvements
* Partial deployment workflows
* `destructiveChanges.xml` generation
* Performance optimizations for large orgs
* Better Profile / PermissionSet handling
* CI/CD–friendly enhancements

---

### 💻 Submit Code

We accept pull requests for:

* Bug fixes
* New features
* UI / UX improvements
* Performance optimizations
* Refactoring and cleanup
* Documentation improvements

⚠️ **Please follow the existing project structure and architecture.**

---

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/Kartikpatkar/salesforce-package-xml-generator.git
cd salesforce-package-xml-generator
```

---

### Load the Extension in Chrome

1. Open Chrome and navigate to:

   ```
   chrome://extensions/
   ```

2. Enable **Developer Mode** (top-right)

3. Click **Load unpacked**

4. Select the project root folder (where `manifest.json` exists)

The extension will now be available in Chrome.

---

## ✅ Before Submitting a Pull Request

1. Fork the repository and create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Keep changes **focused and well-scoped**
   (avoid mixing refactors with new features).

3. Test your changes locally:

   * Connect to at least one Salesforce org
   * Test metadata loading for:

     * ApexClass (Tooling API)
     * CustomObject / Layout (Metadata API)
   * Verify package.xml output
   * Test dark and light themes
   * Ensure no console errors in service worker

4. Submit a pull request with:

   * A clear title and description
   * Screenshots for UI changes
   * References to related issues (e.g. `Closes #12`)

---

## 🧪 Testing Guidelines

If your change affects metadata retrieval or generation logic, please test with:

* Small and large Salesforce orgs
* Multiple metadata types
* Partial and full deployments
* Switching between orgs
* Invalid or expired sessions
* Dark and light UI modes

Avoid introducing API calls that:

* Increase rate-limit usage unnecessarily
* Duplicate existing metadata requests

---

## 📚 Code Style Guide

* Keep JavaScript **modular and readable**
* Avoid inline scripts (Chrome Extension CSP)
* Follow **Manifest V3 best practices**
* Use clear, Salesforce-consistent naming
* Handle async logic carefully (service worker lifecycle)
* Ensure UI changes support **dark mode**
* Never log sensitive session data

---

## 🔒 Security Guidelines

* Do **not** store credentials or tokens
* Do **not** introduce external servers or trackers
* Use only Salesforce APIs supported by the platform
* Keep permissions minimal and Salesforce-scoped
* All logic must run locally in the browser

Security-related pull requests are reviewed carefully.

---

## 🙌 Code of Conduct

Please be respectful and inclusive.
We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) to maintain a welcoming and collaborative community.

---

## 📬 Questions or Discussions?

* Open an issue for questions or ideas
* Discussions may be enabled in the future

Thanks for contributing to **Salesforce Package XML Generator** 🚀
Your contributions help make Salesforce deployments faster, safer, and easier for everyone.

---
