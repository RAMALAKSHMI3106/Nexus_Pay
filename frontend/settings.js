/**
 * Nexus Pay Settings Logic
 * Manages the multi-section settings object in localStorage and handles UI state updates.
 */

const NexusSettings = {
    STORAGE_KEY: 'nexus_user_settings',
    
    // Default initial settings
    defaults: {
        profile: { name: '', email: '', phone: '', avatar: '' },
        security: { twoFactor: false, password: 'password123', mpin: '1234' },
        notifications: { transactions: true, reminders: true, statements: true, promos: false },
        credit: { salary: 0, autoPay: false, reminderDays: 3 },
        appearance: { darkMode: false, accent: 'blue' },
        privacy: { hideCards: true, hideBalance: false, visibility: true }
    },

    /** Load settings from localStorage */
    get() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        try {
            const parsed = stored ? JSON.parse(stored) : {};
            // Deep merge defaults with stored to handle new keys in future
            return { ...this.defaults, ...parsed };
        } catch (e) {
            return this.defaults;
        }
    },

    /** Save settings to localStorage */
    save(newSettings) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newSettings));
        this.applyGlobalSettings(newSettings);
        
        // Show status message
        const status = document.getElementById('saveStatus');
        if (status) {
            status.style.opacity = '1';
            setTimeout(() => status.style.opacity = '0', 2000);
        }
    },

    /** Apply appearance settings globally */
    applyGlobalSettings(settings) {
        // 1. Dark Mode
        if (settings.appearance.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // 2. Accent Color
        document.body.setAttribute('data-accent', settings.appearance.accent || 'blue');
    }
};

// Initialize Page Data
document.addEventListener('DOMContentLoaded', () => {
    const settings = NexusSettings.get();
    NexusSettings.applyGlobalSettings(settings);

    // Only run form mapping if we are on settings.html
    if (window.location.pathname.includes('settings.html')) {
        mapSettingsToUI(settings);
        attachFormHandlers();
    }
});

/** Map data object values to the HTML form elements */
function mapSettingsToUI(s) {
    // Profile
    document.getElementById('profName').value = s.profile.name;
    document.getElementById('profEmail').value = s.profile.email;
    document.getElementById('profPhone').value = s.profile.phone;

    // Security
    document.getElementById('sec2FA').checked = s.security.twoFactor;

    // Notifications
    document.getElementById('notifTx').checked = s.notifications.transactions;
    document.getElementById('notifRemind').checked = s.notifications.reminders;
    document.getElementById('notifStat').checked = s.notifications.statements;
    document.getElementById('notifPromo').checked = s.notifications.promos;

    // Credit
    document.getElementById('credSalary').value = s.credit.salary;
    document.getElementById('credAuto').checked = s.credit.autoPay;
    document.getElementById('credRemindDays').value = s.credit.reminderDays;

    // Appearance
    document.getElementById('appDarkMode').checked = s.appearance.darkMode;
    document.getElementById('appAccent').value = s.appearance.accent;

    // Privacy
    document.getElementById('privHideCards').checked = s.privacy.hideCards;
    document.getElementById('privHideBalance').checked = s.privacy.hideBalance;
    document.getElementById('privVisibility').checked = s.privacy.visibility;
}

/** Attach event listeners to all save buttons and toggles */
function attachFormHandlers() {
    const settings = NexusSettings.get();

    // 1. Individual Forms
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        settings.profile.name = document.getElementById('profName').value;
        settings.profile.email = document.getElementById('profEmail').value;
        settings.profile.phone = document.getElementById('profPhone').value;
        NexusSettings.save(settings);
    });

    document.getElementById('securityForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        settings.security.twoFactor = document.getElementById('sec2FA').checked;
        NexusSettings.save(settings);
    });

    // 2. Interactive Toggles (Save on change)
    document.querySelectorAll('.switch input').forEach(input => {
        input.addEventListener('change', () => {
            const id = input.id;
            // Map IDs to settings path
            if (id.startsWith('notif')) {
                const key = id.replace('notif', '').toLowerCase();
                const mapping = { tx: 'transactions', remind: 'reminders', stat: 'statements', promo: 'promos' };
                settings.notifications[mapping[key]] = input.checked;
            } else if (id.startsWith('app')) {
                settings.appearance.darkMode = document.getElementById('appDarkMode').checked;
            } else if (id.startsWith('priv')) {
                const key = id.replace('priv', '');
                if (key === 'HideCards') settings.privacy.hideCards = input.checked;
                if (key === 'HideBalance') settings.privacy.hideBalance = input.checked;
                if (key === 'Visibility') settings.privacy.visibility = input.checked;
            } else if (id === 'credAuto') {
                settings.credit.autoPay = input.checked;
            } else if (id === 'sec2FA') {
                settings.security.twoFactor = input.checked;
            }
            NexusSettings.save(settings);
        });
    });

    // 3. Select fields (Save on change)
    document.getElementById('appAccent').addEventListener('change', (e) => {
        settings.appearance.accent = e.target.value;
        NexusSettings.save(settings);
    });

    document.getElementById('credRemindDays').addEventListener('change', (e) => {
        settings.credit.reminderDays = parseInt(e.target.value);
        NexusSettings.save(settings);
    });

    // 4. Manual Save for Credit
    document.getElementById('saveCreditBtn').addEventListener('click', () => {
        settings.credit.salary = parseInt(document.getElementById('credSalary').value);
        NexusSettings.save(settings);
        
        // Trigger server sync if applicable
        syncSalaryWithServer(settings.credit.salary);
    });
}

/** Sync salary with backend API for limit recalculation */
async function syncSalaryWithServer(salary) {
    const token = localStorage.getItem('token');
    if (!token || !salary) return;

    try {
        const res = await fetch('/api/auth/salary', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ salary })
        });
        if (res.ok) console.log("Backend Salary Sync Success");
    } catch (e) {
        console.error("Salary sync failed", e);
    }
}

/** Reset all local data after confirmation */
function resetAppData() {
    if (confirm("WARNING: This will permanently delete your local settings and log you out. Continue?")) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

/** Password Verification & Update */
function verifyOldPass() {
    const settings = NexusSettings.get();
    const oldInput = document.getElementById('oldPass').value;
    const feedback = document.getElementById('passPhase1');

    if (oldInput === settings.security.password) {
        document.getElementById('passPhase2').style.display = 'block';
        feedback.style.opacity = '0.5';
        feedback.style.pointerEvents = 'none';
        alert("Password verified. Please enter your new password below.");
    } else {
        alert("Incorrect old password. Please try again.");
    }
}

function updatePass() {
    const settings = NexusSettings.get();
    const n = document.getElementById('newPass').value;
    const c = document.getElementById('confirmPass').value;

    if (!n || n.length < 6) return alert("New password must be at least 6 characters.");
    if (n !== c) return alert("Passwords do not match!");

    settings.security.password = n;
    NexusSettings.save(settings);
    
    // Reset UI
    document.getElementById('passPhase2').style.display = 'none';
    const p1 = document.getElementById('passPhase1');
    p1.style.opacity = '1';
    p1.style.pointerEvents = 'auto';
    document.getElementById('oldPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confirmPass').value = '';

    alert("Password updated successfully!");
}

/** MPIN Verification & Update */
function verifyOldMpin() {
    const settings = NexusSettings.get();
    const oldInput = document.getElementById('oldMpin').value;
    const feedback = document.getElementById('mpinPhase1');

    if (oldInput === settings.security.mpin) {
        document.getElementById('mpinPhase2').style.display = 'block';
        feedback.style.opacity = '0.5';
        feedback.style.pointerEvents = 'none';
        alert("MPIN verified. Please set your new 4-6 digit MPIN.");
    } else {
        alert("Incorrect old MPIN. Please try again.");
    }
}

function updateMpin() {
    const settings = NexusSettings.get();
    const n = document.getElementById('newMpin').value;
    const c = document.getElementById('confirmMpin').value;

    if (!/^\d{4,6}$/.test(n)) return alert("New MPIN must be numeric and 4-6 digits long.");
    if (n !== c) return alert("MPINs do not match!");

    settings.security.mpin = n;
    NexusSettings.save(settings);
    
    // Reset UI
    document.getElementById('mpinPhase2').style.display = 'none';
    const m1 = document.getElementById('mpinPhase1');
    m1.style.opacity = '1';
    m1.style.pointerEvents = 'auto';
    document.getElementById('oldMpin').value = '';
    document.getElementById('newMpin').value = '';
    document.getElementById('confirmMpin').value = '';

    alert("MPIN updated successfully!");
}

/** Export transaction history as PDF */
async function exportPDF() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/payments/history', { headers: { Authorization: 'Bearer ' + token } });
        const history = await res.json();
        
        if (!history || history.length === 0) {
            alert("No transactions found to export.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add Header
        doc.setFontSize(22);
        doc.setTextColor(26, 76, 255); // Nexus Primary
        doc.text("Nexus Pay", 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(110, 118, 135);
        doc.text("Account Statement", 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);
        
        // Prepare Table Data
        const tableColumn = ["Date", "Category", "Recipient", "Status", "Amount"];
        const tableRows = [];

        history.forEach(tx => {
            const txData = [
                new Date(tx.created_at).toLocaleDateString(),
                tx.category || "General",
                tx.recipient_account || "N/A",
                tx.status.toUpperCase(),
                `INR ${parseFloat(tx.amount).toLocaleString('en-IN')}`
            ];
            tableRows.push(txData);
        });

        // Generate Table
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [26, 76, 255] },
            styles: { fontSize: 9 },
            columnStyles: {
                4: { halign: 'right', fontStyle: 'bold' }
            }
        });

        doc.save(`nexus_pay_statement_${Date.now()}.pdf`);
    } catch (e) {
        console.error(e);
        alert("PDF Export failed");
    }
}
