/**
 * Shows a temporary notification (toast) message on the screen.
 * @param {string} title - The title text of the toast.
 * @param {string} message - The detailed message inside the toast.
 * @param {string} type - The type of toast: 'success' (default), 'error', or 'info'.
 */
function showToast(title, message, type = 'success') {
    // Find the container where toasts will be shown
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.warn('Toast container element with id "toastContainer" not found.');
        return;  // If container is missing, stop the function
    }

    // Create a new div element for the toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`; // Add CSS classes based on toast type

    // Choose icon based on the toast type
    let iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    `; // Default success icon
    
    if (type === 'error') {
        iconSvg = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    }
    if (type === 'info') {
        iconSvg = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        `;
    }

    // Set the inner HTML of the toast with icon, title, message, and close button
    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;

    // Add the toast element to the container so it becomes visible
    toastContainer.appendChild(toast);

    // Find the close button inside the toast
    const closeBtn = toast.querySelector('.toast-close');
    // When user clicks the close button, fade out and remove the toast
    closeBtn.addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';  // start fade out animation
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);  // remove toast from DOM after animation
            }
        }, 300); // wait for animation to finish before removing
    });

    // Automatically remove the toast after 3 seconds if not closed already
    setTimeout(() => {
        if (toastContainer.contains(toast)) {  // check if toast is still visible
            toast.style.animation = 'fadeOut 0.3s ease forwards';  // fade out animation
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);  // remove after animation
                }
            }, 300);
        }
    }, 3000);
}

// expose globally for non-module scripts
window.showToast = showToast;
