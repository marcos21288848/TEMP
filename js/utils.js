// Create a notification container on the body
const notificationContainer = document.createElement('div');
notificationContainer.id = 'notification-container';
document.body.appendChild(notificationContainer);

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // 'success' or 'error'
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    // Make it appear
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Disappear after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        // Remove from DOM after transition
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 4000);
}

// Add basic styles for the notification to the head
document.head.insertAdjacentHTML('beforeend', `
<style>
    #notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .notification {
        padding: 15px 20px;
        border-radius: 8px;
        color: #fff;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(120%);
        transition: transform 0.5s ease-in-out;
    }
    .notification.show {
        transform: translateX(0);
    }
    .notification.success {
        background-color: #2e7d32; /* Green */
    }
    .notification.error {
        background-color: #c62828; /* Red */
    }
</style>
`);
