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
    const packagePreview = document.getElementById('packagePreview');
    const membersSearchInput = document.getElementById('membersSearchInput');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const themeToggle = document.getElementById('themeToggle');
    const copyPreviewBtn = document.getElementById('copyPreviewBtn');

    // -------------------------
    // THEME MANAGEMENT
    // -------------------------
    function initTheme() {
        chrome.storage.sync.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
                document.querySelector('.sun-icon').style.display = 'none';
                document.querySelector('.moon-icon').style.display = 'block';
            }
        });
    }

    themeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        
        document.querySelector('.sun-icon').style.display = isDark ? 'none' : 'block';
        document.querySelector('.moon-icon').style.display = isDark ? 'block' : 'none';
        
        chrome.storage.sync.set({ theme: isDark ? 'dark' : 'light' });
    });

    initTheme();

    // -------------------------
    // COPY TO CLIPBOARD
    // -------------------------
    copyPreviewBtn?.addEventListener('click', async () => {
        const previewText = packagePreview.textContent;
        try {
            await navigator.clipboard.writeText(previewText);
            const originalText = copyPreviewBtn.innerHTML;
            copyPreviewBtn.innerHTML = '✓';
            setTimeout(() => {
                copyPreviewBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });

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
        showToast('Error', message, 'error');
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
        if (message.type == 'AUTH_STATE_CHANGED') {
            console.log('[APP] Received AUTH_STATE_CHANGED:', message.org);
            hideLoadingUI();
            
            if (message.org?.isAuthenticated) {
                console.log('[APP] Authenticated, showing UI');
                showAuthenticatedUI(message.org);
                fetchMetadataTypes(); // Fetch dynamic metadata types on successful auth
                fetchApiVersions(); // Fetch dynamic API versions on successful auth
            } else {
                const errorMsg = message.org?.error 
                    ? `Connection failed: ${message.org.error}` 
                    : 'Not connected to a Salesforce org';
                console.log('[APP] Not authenticated:', errorMsg);
                showUnauthenticatedUI(errorMsg);
                
                if (message.org?.error) {
                    showToast('Connection Failed', message.org.error, 'error');
                }
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
    let selectedMembers = new Map(); // Map of metadataType -> Set of member names

    chrome.storage.sync.get(['apiVersion', 'selectedMembers'], (data) => {
        if (data.apiVersion) apiVersionSelect.value = data.apiVersion;
        if (data.selectedMembers && typeof data.selectedMembers === 'object') {
            // Restore selectedMembers Map from storage (stored as object)
            Object.entries(data.selectedMembers).forEach(([type, members]) => {
                selectedMembers.set(type, new Set(members));
            });
        }
        // Don't load anything yet; wait for auth and dynamic fetch
    });

    searchInput?.addEventListener('input', () => {
        renderMetadataList(searchInput.value.toLowerCase());
    });

    membersSearchInput?.addEventListener('input', () => {
        const searchTerm = membersSearchInput.value.toLowerCase();
        const memberItems = document.querySelectorAll('.member-item:not(.select-all-item)');
        
        memberItems.forEach(item => {
            const label = item.querySelector('label');
            if (label) {
                const text = label.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            }
        });
    });

    apiVersionSelect?.addEventListener('change', () => {
        chrome.storage.sync.set({ apiVersion: apiVersionSelect.value });
        updatePackagePreview();
    });

    generateBtn?.addEventListener('click', generatePackage);
    
    clearAllBtn?.addEventListener('click', () => {
        // Clear all selections
        selectedTypes.clear();
        selectedMembers.clear();
        
        // Clear storage
        chrome.storage.sync.set({ selectedMembers: {} });
        
        // Uncheck all metadata type checkboxes
        const metadataCheckboxes = metadataList.querySelectorAll('input[type="checkbox"]');
        metadataCheckboxes.forEach(cb => cb.checked = false);
        
        // Clear members display
        const title = document.getElementById('membersTitle');
        const membersList = document.getElementById('membersList');
        title.textContent = 'Select a metadata type';
        membersList.innerHTML = '';
        membersSearchInput.style.display = 'none';
        membersSearchInput.value = '';
        
        // Update UI
        generateBtn.disabled = true;
        updatePackagePreview();
    });

    async function fetchMetadataTypes() {
        try {
            console.log('[APP] Fetching available metadata types from org...');
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'metadata-loading';
            loadingDiv.style.cssText = 'text-align: center; padding: 40px 20px; color: #666;';
            loadingDiv.innerHTML = '<div style="margin-bottom: 10px; font-size: 14px;">⏳ Loading metadata types...</div><div style="font-size: 12px; color: #999;">Fetching list from your org</div>';
            metadataList.innerHTML = '';
            metadataList.appendChild(loadingDiv);

            const response = await chrome.runtime.sendMessage({
                type: 'GET_AVAILABLE_METADATA_TYPES'
            });

            if (response?.success && response.types) {
                metadataTypes = response.types;
                console.log('[APP] Loaded', metadataTypes.length, 'metadata types from org');
                renderMetadataList();
            } else {
                throw new Error(response?.error || 'Failed to fetch metadata types');
            }
        } catch (err) {
            console.warn('[APP] Could not fetch dynamic metadata types:', err.message);
            console.log('[APP] Using default metadata types');
            metadataTypes = getDefaultMetadataTypes();
            renderMetadataList();
        }
    }

    async function fetchApiVersions() {
        try {
            console.log('[APP] Fetching available API versions from org...');
            
            // Direct await response from service worker
            const response = await chrome.runtime.sendMessage({
                type: 'GET_AVAILABLE_API_VERSIONS'
            });
            
            if (response && response.success && response.versions?.length > 0) {
                console.log('[APP] Loaded', response.versions.length, 'API versions from org');
                // Populate dropdown with fetched versions
                apiVersionSelect.innerHTML = '<option value="">-- Select API Version --</option>';
                response.versions.forEach(version => {
                    const option = document.createElement('option');
                    option.value = version;
                    option.textContent = `${version} API`;
                    apiVersionSelect.appendChild(option);
                });
                // Auto-select first (latest) version
                if (response.versions.length > 0) {
                    apiVersionSelect.value = response.versions[0];
                    chrome.storage.sync.set({ apiVersion: response.versions[0] });
                }
            } else {
                throw new Error(response?.error || 'Failed to fetch API versions');
            }
        } catch (err) {
            console.warn('[APP] Could not fetch API versions:', err.message);
            console.log('[APP] Using default API versions');
        }
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
                    generateBtn.disabled = selectedTypes.size === 0;
                    // Load components when checkbox is checked
                    if (checkbox.checked) {
                        loadMetadataMembers(type);
                    } else {
                        // Clear members display when unchecked
                        const title = document.getElementById('membersTitle');
                        const membersList = document.getElementById('membersList');
                        title.textContent = 'Select a metadata type';
                        membersList.innerHTML = '';
                        // Clear selected members for this type from storage
                        selectedMembers.delete(type);
                        const membersForStorage = {};
                        selectedMembers.forEach((set, t) => {
                            membersForStorage[t] = [...set];
                        });
                        chrome.storage.sync.set({ selectedMembers: membersForStorage });
                    }
                    // Update preview when metadata type is toggled
                    updatePackagePreview();
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
        updatePackagePreview();
    }

    async function loadMetadataMembers(metadataType) {
        const title = document.getElementById('membersTitle');
        const membersList = document.getElementById('membersList');

        title.textContent = `Loading ${metadataType}...`;
        membersList.innerHTML = '';
        membersSearchInput.style.display = 'none';
        membersSearchInput.value = '';

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

            // Show search input
            membersSearchInput.style.display = 'block';

            // Add Select All checkbox
            const selectAllDiv = document.createElement('div');
            selectAllDiv.className = 'member-item select-all-item';
            selectAllDiv.style.fontWeight = 'bold';
            selectAllDiv.style.borderBottom = '2px solid #dee2e6';
            selectAllDiv.style.marginBottom = '8px';
            
            const selectAllCheckbox = document.createElement('input');
            selectAllCheckbox.type = 'checkbox';
            selectAllCheckbox.id = `select-all-${metadataType}`;
            
            // Check if all members are already selected
            const memberSet = selectedMembers.get(metadataType) || new Set();
            selectAllCheckbox.checked = members.length > 0 && members.every(name => memberSet.has(name));
            
            selectAllCheckbox.onchange = () => {
                const allCheckboxes = membersList.querySelectorAll('input[type="checkbox"]:not(#select-all-' + metadataType + ')');
                
                if (!selectedMembers.has(metadataType)) {
                    selectedMembers.set(metadataType, new Set());
                }
                const set = selectedMembers.get(metadataType);
                
                allCheckboxes.forEach(cb => {
                    cb.checked = selectAllCheckbox.checked;
                    const memberName = cb.dataset.memberName;
                    if (selectAllCheckbox.checked) {
                        set.add(memberName);
                    } else {
                        set.delete(memberName);
                    }
                });
                
                // Save to storage
                const membersForStorage = {};
                selectedMembers.forEach((set, type) => {
                    membersForStorage[type] = [...set];
                });
                chrome.storage.sync.set({ selectedMembers: membersForStorage });
                
                // Update preview
                updatePackagePreview();
            };
            
            const selectAllLabel = document.createElement('label');
            selectAllLabel.htmlFor = selectAllCheckbox.id;
            selectAllLabel.textContent = 'Select All';
            selectAllLabel.style.marginLeft = '8px';
            selectAllLabel.style.cursor = 'pointer';
            
            selectAllDiv.append(selectAllCheckbox, selectAllLabel);
            membersList.appendChild(selectAllDiv);

            members.forEach(name => {
                const div = document.createElement('div');
                div.className = 'member-item';
                
                // Checkbox for component selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `member-${metadataType}-${name}`;
                checkbox.dataset.memberName = name; // Store member name for select all
                
                // Check if this member was previously selected
                if (selectedMembers.has(metadataType) && selectedMembers.get(metadataType).has(name)) {
                    checkbox.checked = true;
                }
                
                checkbox.onchange = () => {
                    // Initialize set for this metadata type if not exists
                    if (!selectedMembers.has(metadataType)) {
                        selectedMembers.set(metadataType, new Set());
                    }
                    
                    const memberSet = selectedMembers.get(metadataType);
                    if (checkbox.checked) {
                        memberSet.add(name);
                    } else {
                        memberSet.delete(name);
                    }
                    
                    // Update select all checkbox state
                    const selectAllCheckbox = document.getElementById(`select-all-${metadataType}`);
                    if (selectAllCheckbox) {
                        const allCheckboxes = membersList.querySelectorAll('input[type="checkbox"]:not(#select-all-' + metadataType + ')');
                        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
                        selectAllCheckbox.checked = allChecked;
                    }
                    
                    // Save to storage
                    const membersForStorage = {};
                    selectedMembers.forEach((set, type) => {
                        membersForStorage[type] = [...set];
                    });
                    chrome.storage.sync.set({ selectedMembers: membersForStorage });
                    
                    // Update preview
                    updatePackagePreview();
                };
                
                // Label for component name
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = name;
                label.style.marginLeft = '8px';
                label.style.cursor = 'pointer';
                
                div.append(checkbox, label);
                membersList.appendChild(div);
            });

        } catch (err) {
            console.error('loadMetadataMembers error', err);
            title.textContent = `Error loading ${metadataType}`;
            membersList.innerHTML = `<div class="member-item">Error: ${err.message}</div>`;
        }
    }

    async function generatePackage() {
        try {
            // Convert selectedMembers Map to object for sending
            const membersForPackage = {};
            selectedMembers.forEach((set, type) => {
                if (set.size > 0) {
                    membersForPackage[type] = [...set];
                }
            });
            
            const response = await chrome.runtime.sendMessage({
                type: 'GENERATE_PACKAGE',
                data: {
                    metadataTypes: [...selectedTypes],
                    apiVersion: apiVersionSelect.value,
                    members: membersForPackage
                }
            });

            if (!response?.success) throw new Error('Generation failed');
            downloadFile('package.xml', response.packageXml);
            showToast('Success', 'Package.xml generated and downloaded!', 'success');
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

    function updatePackagePreview() {
        const apiVersion = apiVersionSelect.value || '61.0';
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

        if (selectedTypes.size === 0) {
            xml += '    <!-- Select metadata types to see preview -->\n';
        } else {
            const sortedTypes = [...selectedTypes].sort();
            
            sortedTypes.forEach(type => {
                xml += `    <types>\n`;
                
                // Check if we have specific members selected for this type
                if (selectedMembers.has(type) && selectedMembers.get(type).size > 0) {
                    const members = [...selectedMembers.get(type)].sort();
                    members.forEach(member => {
                        xml += `        <members>${member}</members>\n`;
                    });
                } else {
                    xml += `        <members>*</members>\n`;
                }
                
                xml += `        <name>${type}</name>\n`;
                xml += `    </types>\n`;
            });
        }

        xml += `    <version>${apiVersion}</version>\n`;
        xml += '</Package>';

        packagePreview.textContent = xml;
    }

    // -------------------------
    // INITIAL LOAD
    // -------------------------
    requestAuthCheck();
});
