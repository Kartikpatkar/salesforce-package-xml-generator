document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // -------------------------
    // DOM REFERENCES
    // -------------------------
    const authButton = document.getElementById('authButton');
    const statusDiv = document.getElementById('authStatus');
    const contentDiv = document.getElementById('content');
    const loginButton = document.getElementById('loginButton');
    const metadataList = document.getElementById('metadataList');
    const searchInput = document.getElementById('searchInput');
    const apiVersionSelect = document.getElementById('apiVersion');
    const generateBtn = document.getElementById('generateBtn');
    const userInfo = document.getElementById('user-info');

    // -------------------------
    // UI STATE HELPERS
    // -------------------------
    function showAuthenticatedUI(org) {
        let label = 'Connected to Salesforce';

        const rawUrl = org?.instanceUrl || org?.orgUrl;
        if (rawUrl) {
            try {
                const hostname = new URL(rawUrl).hostname;
                const orgType = org.isSandbox ? ' (Sandbox)' : ' (Production)';
                label = `Connected to ${hostname}${orgType}`;
            } catch (_) { }
        }

        // Show username if available
        if (org.username) {
            label += ` • ${org.username}`;
        }

        statusDiv.textContent = label;
        statusDiv.className = 'auth-status connected';

        authButton.textContent = 'Switch Org';
        loginButton.style.display = 'none';
        contentDiv.style.display = 'block';
    }

    function showUnauthenticatedUI(message = 'Not connected to a Salesforce org') {
        statusDiv.textContent = message;
        statusDiv.className = 'auth-status disconnected';

        authButton.textContent = 'Detect Current Org';
        loginButton.style.display = 'inline-block';
        contentDiv.style.display = 'none';
    }

    function showLoadingUI(message = 'Connecting...') {
        statusDiv.textContent = message;
        statusDiv.className = 'auth-status loading';
        authButton.disabled = true;
        loginButton.disabled = true;
    }

    function hideLoadingUI() {
        authButton.disabled = false;
        loginButton.disabled = false;
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        document.body.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 4000);
    }

    // -------------------------
    // AUTH FLOW
    // -------------------------
    function requestAuthCheck() {
        console.log('[APP] Requesting auth check...');
        showLoadingUI('Detecting Salesforce org...');
        chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
        
        // Hide loading after 5 seconds if no response
        setTimeout(() => {
            if (statusDiv.className === 'auth-status loading') {
                console.log('[APP] Auth check timeout');
                hideLoadingUI();
                showUnauthenticatedUI('Could not detect org - please login manually');
            }
        }, 5000);
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'GENERATE_PACKAGE_RESPONSE') {
            if (message.success) {
                downloadFile('package.xml', message.packageXml);
            } else {
                showError(message.error || 'Failed to generate package.xml');
            }
        }
    });


    chrome.runtime.onMessage.addListener((message) => {
        if (message.type == 'AUTH_STATE_CHANGED') {
            console.log('[APP] Received AUTH_STATE_CHANGED:', message.org);
            hideLoadingUI();
            
            if (message.org?.isAuthenticated) {
                console.log('[APP] Authenticated, showing UI');
                showAuthenticatedUI(message.org);
            } else {
                const errorMsg = message.org?.error 
                    ? `Connection failed: ${message.org.error}` 
                    : 'Not connected to a Salesforce org';
                console.log('[APP] Not authenticated:', errorMsg);
                showUnauthenticatedUI(errorMsg);
                
                if (message.org?.error) {
                    showError(message.org.error);
                }
            }
        }
        if (message.type === 'GET_METADATA_MEMBERS_RESPONSE') {
            // message contains: { success, members, error }
            // find current title / membersList and render (this mirrors direct call return)
            const title = document.getElementById('membersTitle');
            const membersList = document.getElementById('membersList');

            if (!message.success) {
                title.textContent = 'Error';
                membersList.innerHTML = `<div class="member-item">Error: ${message.error}</div>`;
                return;
            }

            const members = message.members || [];
            title.textContent = `Results (${members.length})`;
            membersList.innerHTML = '';
            if (members.length === 0) {
                membersList.innerHTML = '<div class="member-item">No components found</div>';
            } else {
                members.forEach(name => {
                    const div = document.createElement('div');
                    div.className = 'member-item';
                    div.textContent = name;
                    membersList.appendChild(div);
                });
            }
        }
    });

    authButton?.addEventListener('click', requestAuthCheck);

    loginButton?.addEventListener('click', () => showLoginModal());

    function showLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'login-modal';

        modal.innerHTML = `
            <div class="modal-content">
                <h3>Login to Salesforce</h3>
                <button id="loginProd">Production</button>
                <button id="loginSandbox">Sandbox</button>
                <button id="cancelLogin">Cancel</button>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#loginProd').onclick = () => login(false);
        modal.querySelector('#loginSandbox').onclick = () => login(true);
        modal.querySelector('#cancelLogin').onclick = () => modal.remove();

        function login(useSandbox) {
            modal.remove();
            showLoadingUI(`Logging into ${useSandbox ? 'Sandbox' : 'Production'}...`);
            chrome.runtime.sendMessage({
                type: 'LOGIN',
                useSandbox
            });
            
            // Hide loading after 30 seconds if no response
            setTimeout(() => {
                if (statusDiv.className === 'auth-status loading') {
                    hideLoadingUI();
                    showUnauthenticatedUI('Login timeout - please try again');
                }
            }, 30000);
        }
    }

    // -------------------------
    // METADATA LOGIC
    // -------------------------
    let metadataTypes = [];
    let selectedTypes = new Set();

    chrome.storage.sync.get(['apiVersion', 'selectedMetadataTypes'], (data) => {
        if (data.apiVersion) apiVersionSelect.value = data.apiVersion;
        if (data.selectedMetadataTypes) {
            selectedTypes = new Set(data.selectedMetadataTypes);
        }
        fetchMetadataTypes();
    });

    searchInput?.addEventListener('input', () => {
        renderMetadataList(searchInput.value.toLowerCase());
    });

    apiVersionSelect?.addEventListener('change', () => {
        chrome.storage.sync.set({ apiVersion: apiVersionSelect.value });
    });

    generateBtn?.addEventListener('click', generatePackage);

    async function fetchMetadataTypes() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab?.url?.includes('salesforce')) {
                const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_METADATA' });
                metadataTypes = response?.metadata?.metadataTypes || getDefaultMetadataTypes();
                userInfo.textContent = response?.metadata?.username
                    ? `Connected as ${response.metadata.username}`
                    : 'Connected to Salesforce';
            } else {
                metadataTypes = getDefaultMetadataTypes();
                userInfo.textContent = 'Not on a Salesforce page';
            }
        } catch {
            metadataTypes = getDefaultMetadataTypes();
            userInfo.textContent = 'Using default metadata types';
        }

        renderMetadataList();
    }

    function getDefaultMetadataTypes() {
        return [
            'ApexClass', 'ApexPage', 'ApexTrigger', 'ApexComponent',
            'CustomObject', 'CustomField', 'Layout', 'Profile',
            'PermissionSet', 'CustomTab', 'Workflow', 'ValidationRule',
            'RecordType', 'Flow', 'CustomMetadata', 'CustomLabel'
        ];
    }

    function renderMetadataList(filter = '') {
        metadataList.innerHTML = '';

        metadataTypes
            .filter(t => t.toLowerCase().includes(filter))
            .forEach(type => {
                const item = document.createElement('div');
                item.className = 'metadata-item';

                // left: checkbox for package selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = selectedTypes.has(type);
                checkbox.onchange = () => {
                    checkbox.checked ? selectedTypes.add(type) : selectedTypes.delete(type);
                    chrome.storage.sync.set({ selectedMetadataTypes: [...selectedTypes] });
                    generateBtn.disabled = selectedTypes.size === 0;
                };

                // middle: label (clickable)
                const label = document.createElement('span');
                label.textContent = type;
                label.style.cursor = 'pointer';
                label.style.marginLeft = '8px';
                label.onclick = () => loadMetadataMembers(type); // <-- click handler

                item.append(checkbox, label);
                metadataList.appendChild(item);
            });

        generateBtn.disabled = selectedTypes.size === 0;
    }

    async function loadMetadataMembers(metadataType) {
        const title = document.getElementById('membersTitle');
        const membersList = document.getElementById('membersList');

        title.textContent = `Loading ${metadataType}...`;
        membersList.innerHTML = '';

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_METADATA_MEMBERS',
                metadataType
            });

            if (!response || !response.success) {
                title.textContent = `Error loading ${metadataType}`;
                membersList.innerHTML = `<div class="member-item">Error: ${response?.error || 'Unknown'}</div>`;
                return;
            }

            const members = response.members || [];

            title.textContent = `${metadataType} (${members.length})`;

            if (members.length === 0) {
                membersList.innerHTML = '<div class="member-item">No components found</div>';
                return;
            }

            members.forEach(name => {
                const div = document.createElement('div');
                div.className = 'member-item';
                div.textContent = name;
                membersList.appendChild(div);
            });

        } catch (err) {
            console.error('loadMetadataMembers error', err);
            title.textContent = `Error loading ${metadataType}`;
            membersList.innerHTML = `<div class="member-item">Error: ${err.message}</div>`;
        }
    }

    async function generatePackage() {
        chrome.runtime.sendMessage({
            type: 'GENERATE_PACKAGE',
            data: {
                metadataTypes: [...selectedTypes],
                apiVersion: apiVersionSelect.value
            }
        });
    }


    async function generatePackage() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GENERATE_PACKAGE',
                data: {
                    metadataTypes: [...selectedTypes],
                    apiVersion: apiVersionSelect.value
                }
            });

            if (!response?.success) throw new Error('Generation failed');
            downloadFile('package.xml', response.packageXml);
        } catch (err) {
            showError(err.message);
        }
    }

    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }

    // -------------------------
    // INITIAL LOAD
    // -------------------------
    requestAuthCheck();
});
