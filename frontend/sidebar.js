/**
 * Nexus Pay Reusable Sidebar Component
 * 
 * Injects the Desktop Sidebar, Mobile Sidebar, and Mobile Navbar into the page
 * and handles active state highlighting logic based on the current URL.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Apply global settings (theme, accent, privacy) before anything else
    applyNexusGlobalSettings();
    injectSidebar();
    setActiveLink();
    setupMobileMenu();
    loadSidebarUser();
});

/** Global Theme & Appearance Application */
function applyNexusGlobalSettings() {
    const stored = localStorage.getItem('nexus_user_settings');
    if (!stored) return;
    try {
        const s = JSON.parse(stored);
        if (s.appearance) {
            if (s.appearance.darkMode) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-accent', s.appearance.accent || 'blue');
        }
    } catch(e) {}
}

function injectSidebar() {
    // 1. Mobile Navbar structure
    const mobileNavHTML = `
        <nav class="mobile-navbar" id="mobileNavbar">
            <div class="container" style="display:flex;justify-content:space-between;align-items:center;">
                <a href="dashboard.html" class="logo" style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;">
                    <div class="logo-icon" style="width:36px;height:36px;background:linear-gradient(145deg, #1a4cff, #7b3fe4);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;font-weight:700;">N</div>
                    <span class="logo-text" style="font-size:1.3rem;font-weight:700;background:linear-gradient(145deg, #1a4cff, #7b3fe4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Nexus Pay</span>
                </a>
                <div class="menu-btn" id="menuBtn" style="display:flex;flex-direction:column;justify-content:space-between;width:30px;height:20px;cursor:pointer;z-index:1002;">
                    <span style="width:100%;height:2.5px;background:#1a4cff;border-radius:4px;transition:all 0.3s;"></span>
                    <span style="width:100%;height:2.5px;background:#1a4cff;border-radius:4px;transition:all 0.3s;"></span>
                    <span style="width:100%;height:2.5px;background:#1a4cff;border-radius:4px;transition:all 0.3s;"></span>
                </div>
            </div>
        </nav>
        <div class="sidebar-overlay" id="sidebarOverlay"></div>
    `;

    // 2. Sidebar Core HTML (Used for both Desktop & Mobile)
    const sidebarContentHTML = `
        <a href="dashboard.html" class="sidebar-logo">
            <div class="logo-icon" style="width:36px;height:36px;background:linear-gradient(145deg, #1a4cff, #7b3fe4);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;font-weight:700;">N</div>
            <span class="logo-text" style="font-size:1.3rem;font-weight:700;background:linear-gradient(145deg, #1a4cff, #7b3fe4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Nexus Pay</span>
        </a>
        
        <ul class="sidebar-menu">
            <li><a href="dashboard.html" data-page="dashboard"><i class="fas fa-home"></i> <span>Dashboard</span></a></li>
            <li><a href="my-cards.html" data-page="my-cards"><i class="fas fa-credit-card"></i> <span>My Cards</span></a></li>
            <li><a href="transactions.html" data-page="transactions"><i class="fas fa-exchange-alt"></i> <span>Transactions</span></a></li>
            <li><a href="analytics.html" data-page="analytics"><i class="fas fa-chart-line"></i> <span>Analytics</span></a></li>
            <li><a href="wallets.html" data-page="wallets"><i class="fas fa-wallet"></i> <span>Wallets</span></a></li>
            <li><a href="notifications.html" data-page="notifications"><i class="fas fa-bell"></i> <span>Notifications</span></a></li>
            <li><a href="statements.html" data-page="statements"><i class="fas fa-file-invoice-dollar"></i> <span>Statements</span></a></li>
        </ul>

        <div class="sidebar-divider" style="height:1px;background:#e9ecf2;margin:1rem 0;"></div>
        
        <ul class="sidebar-menu static">
            <li><a href="settings.html" data-page="settings"><i class="fas fa-cog"></i> <span>Settings</span></a></li>
            <li><a href="javascript:void(0)" onclick="logoutFromSidebar()" style="color:#ff5e7c;"><i class="fas fa-sign-out-alt"></i> <span>Logout</span></a></li>
        </ul>

        <div class="sidebar-user" style="display:flex;align-items:center;gap:0.7rem;padding:1rem 1.25rem;border-top:1px solid #e9ecf2;">
            <div class="sidebar-user-avatar" id="globalSbAvatar" style="width:36px;height:36px;background:linear-gradient(145deg, #1a4cff, #7b3fe4);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.85rem;">--</div>
            <div class="sidebar-user-info">
                <h4 id="globalSbName" style="font-size:0.85rem;font-weight:700;margin:0;">Loading...</h4>
                <p style="font-size:0.75rem;color:#6e7687;margin:0;"><i class="fas fa-circle" style="color:#00b38a;font-size:0.45rem;margin-right:0.3rem;"></i>online</p>
            </div>
        </div>

        <!-- Universal Settings Modal -->
        <div class="modal shared-modal" id="globalSettingsModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Settings</h3>
                    <button class="close-modal" onclick="closeGlobalModal('globalSettingsModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section" style="margin-bottom: 2rem;">
                        <h4 style="margin-bottom: 1rem; color: #6e7687;">Financial & Security</h4>
                        <button class="btn-secondary" onclick="closeGlobalModal('globalSettingsModal'); openGlobalModal('globalMpinModal');" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 1rem; background: #f5f7fd; border: 1px solid #e9ecf2; border-radius: 12px; color: #121826; font-weight: 500; cursor: pointer; transition: 0.2s;">
                            <span><i class="fas fa-coins" style="margin-right: 0.8rem; color: #1a4cff;"></i> Change Monthly Salary</span>
                            <i class="fas fa-chevron-right" style="font-size: 0.8rem; color: #6e7687;"></i>
                        </button>
                        <p style="font-size: 0.75rem; color: #6e7687; margin-top: 0.5rem; padding-left: 0.5rem;">Recalculate your credit limit and available balance securely.</p>
                    </div>
                    <div class="settings-section">
                        <h4 style="margin-bottom: 1rem; color: #6e7687;">Account</h4>
                        <button class="btn-secondary" onclick="logoutFromSidebar()" style="display: flex; align-items: center; justify-content: center; width: 100%; padding: 1rem; background: rgba(255, 94, 124, 0.1); border: 1px solid rgba(255, 94, 124, 0.2); border-radius: 12px; color: #ff5e7c; font-weight: 600; cursor: pointer; transition: 0.2s;">
                            <i class="fas fa-sign-out-alt" style="margin-right: 0.8rem;"></i> Logout from Nexus Pay
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Universal MPIN Modal -->
        <div class="modal shared-modal" id="globalMpinModal">
            <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2.5rem;">
                <div class="modal-icon" style="width: 80px; height: 80px; background: rgba(26,76,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #1a4cff; font-size: 2rem;">
                    <i class="fas fa-shield-alt"></i>
                </div>
                <h2 style="margin-bottom: 0.5rem;">Security Verification</h2>
                <p style="color: #6e7687; margin-bottom: 2rem;">Enter your 4-digit MPIN to authorize salary change.</p>
                <form id="globalMpinForm">
                    <div class="form-group" style="margin-bottom:1.5rem; text-align:left;">
                        <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Enter MPIN</label>
                        <input type="password" id="globalMpinInput" maxlength="4" placeholder="••••" required style="width:100%; font-size: 1.5rem; text-align: center; letter-spacing: 0.5rem; padding: 1.2rem; border: 1.5px solid #e9ecf2; border-radius: 16px;">
                    </div>
                    <button type="submit" class="global-btn-primary" style="width:100%; padding:1rem; background:linear-gradient(145deg, #1a4cff, #7b3fe4); color:white; border:none; border-radius:30px; font-weight:600; cursor:pointer;">Verify Identity</button>
                    <button type="button" onclick="closeGlobalModal('globalMpinModal')" style="margin-top: 1rem; background:none; border:none; color:#6e7687; cursor:pointer;">Cancel</button>
                </form>
            </div>
        </div>

        <!-- Universal Update Salary Modal -->
        <div class="modal shared-modal" id="globalUpdateSalaryModal">
            <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2.5rem;">
                <div class="modal-icon" style="width: 80px; height: 80px; background: rgba(0,179,138,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: #00b38a; font-size: 2rem;">
                    <i class="fas fa-coins"></i>
                </div>
                <h2 style="margin-bottom: 0.5rem;">Update Salary</h2>
                <p style="color: #6e7687; margin-bottom: 2rem;">Enter your new monthly income. Limits will be recalculated automatically.</p>
                <form id="globalSalaryForm">
                    <div class="form-group" style="margin-bottom:1.5rem; text-align:left;">
                        <label style="display:block; margin-bottom:0.5rem; font-weight:500;">Monthly Income (₹)</label>
                        <input type="number" id="globalSalaryInput" placeholder="e.g. 50000" required style="width:100%; padding: 1rem; border: 1.5px solid #e9ecf2; border-radius: 16px; font-size: 1rem;">
                    </div>
                    <button type="submit" class="global-btn-primary" style="width:100%; padding:1rem; background:linear-gradient(145deg, #1a4cff, #7b3fe4); color:white; border:none; border-radius:30px; font-weight:600; cursor:pointer;">Update & Sync</button>
                </form>
            </div>
        </div>
    `;

    // Create wrapper containers
    const hostShell = document.querySelector('.shell') || document.body;
    
    // Inject Desktop Sidebar
    const desktopAside = document.createElement('aside');
    desktopAside.className = 'desktop-sidebar shared-sidebar';
    desktopAside.innerHTML = sidebarContentHTML;

    // Inject Mobile Sidebar
    const mobileAside = document.createElement('aside');
    mobileAside.className = 'mobile-sidebar shared-sidebar';
    mobileAside.id = 'mobileSidebar';
    mobileAside.innerHTML = sidebarContentHTML;

    // Insert Styles directly
    const style = document.createElement('style');
    style.innerHTML = `
        /* Shared Sidebar Styles */
        .shared-sidebar {
            background: #ffffff;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 12px rgba(0,0,0,0.04);
            z-index: 1001;
            overflow: hidden; /* Prevent double scrollbars */
        }
        .desktop-sidebar {
            width: 260px;
            border-right: 1px solid #e9ecf2;
            flex-shrink: 0;
            height: 100vh;
        }
        .mobile-sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            width: 280px;
            height: 100vh;
            transition: left 0.3s ease;
            box-shadow: 0 16px 32px rgba(0,0,0,0.12);
        }
        .mobile-sidebar.active { left: 0; }
        .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            z-index: 1000;
        }
        .sidebar-overlay.active { display: block; }
        
        .shared-sidebar .sidebar-logo {
            padding: 1.5rem 1.25rem;
            display: flex; align-items: center; gap: 0.65rem;
            text-decoration: none;
            border-bottom: 1px solid #e9ecf2;
        }
        .shared-sidebar .sidebar-menu {
            list-style: none;
            padding: 0.75rem 0.75rem 0;
            display: flex; flex-direction: column; gap: 0.15rem;
            flex: 1;
            overflow-y: auto;
        }
        .shared-sidebar .sidebar-menu.static {
            flex: 0;
            overflow-y: visible;
            padding-bottom: 0.75rem;
        }
        .shared-sidebar .sidebar-menu a {
            display: flex; align-items: center; gap: 0.75rem;
            padding: 0.7rem 0.9rem;
            border-radius: 12px;
            text-decoration: none;
            color: #6e7687;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.18s ease;
        }
        .shared-sidebar .sidebar-menu a:hover {
            background: #f5f7fd; color: #121826;
        }
        .shared-sidebar .sidebar-menu a.active {
            background: rgba(26,76,255,0.08); /* Primary color w/ opacity */
            color: #1a4cff;
            font-weight: 600;
        }
        .shared-sidebar .sidebar-menu a i {
            width: 18px; text-align: center; font-size: 0.9rem;
        }

        /* Mobile Nav Header */
        .mobile-navbar {
            display: none;
            background: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.04);
            padding: 0.75rem 1rem;
            position: sticky; top: 0; z-index: 999;
        }
        @media (max-width: 1024px) {
            .desktop-sidebar { width: 200px; }
        }
        @media (max-width: 780px) {
            .desktop-sidebar { display: none !important; }
            .mobile-navbar { display: block; }
        }

        /* Generic Modal Styles for Shared Modals */
        .shared-modal {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        }
        .shared-modal.active { display: flex; }
        .shared-modal .modal-content {
            background: white;
            border-radius: 24px;
            width: 90%;
            max-width: 500px;
            padding: 2rem;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            animation: modalFadeIn 0.3s ease;
            position: relative;
        }
        @keyframes modalFadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .shared-modal .modal-header {
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;
        }
        .shared-modal .close-modal {
            background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6e7687;
        }
    `;

    document.head.appendChild(style);

    // If a shell wrapper exists (transactions/analytics), prepend desktop sidebar there
    if (document.querySelector('.shell')) {
        document.querySelector('.shell').prepend(desktopAside);
    } else {
        // Otherwise prepend to body (like old dashboard structure)
        document.body.prepend(desktopAside);
    }

    // Always append mobile nav to body root natively without a generic div wrapper
    // (a generic div breaks CSS Grid layouts applied directly to the body)
    document.body.insertAdjacentHTML('afterbegin', mobileNavHTML);
    document.body.appendChild(mobileAside);
}

function setActiveLink() {
    // Determine current page from URL
    const path = window.location.pathname;
    let page = path.split('/').pop().replace('.html', '');
    
    if (!page || page === '/') page = 'dashboard';
    
    // Select all links in both sidebars
    const links = document.querySelectorAll('.shared-sidebar .sidebar-menu a[data-page]');
    
    // Clear old active classes and add to matching
    links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
}

function setupMobileMenu() {
    const mobileSidebar = document.getElementById('mobileSidebar');
    const menuBtn = document.getElementById('menuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if(!menuBtn) return;

    function toggleMenu() {
        mobileSidebar.classList.toggle('active');
        menuBtn.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        
        // Handle menu button animation safely
        if(menuBtn.classList.contains('active')) {
            menuBtn.children[0].style.transform = "rotate(45deg) translate(5px, 5px)";
            menuBtn.children[1].style.opacity = "0";
            menuBtn.children[2].style.transform = "rotate(-45deg) translate(7px, -6px)";
        } else {
            menuBtn.children[0].style.transform = "none";
            menuBtn.children[1].style.opacity = "1";
            menuBtn.children[2].style.transform = "none";
        }
    }

    menuBtn.addEventListener('click', toggleMenu);
    sidebarOverlay.addEventListener('click', toggleMenu);
}

async function loadSidebarUser() {
    const token = localStorage.getItem('token');
    if(!token) return;
    try {
        const u = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } }).then(r=>r.json());
        // Sync currentUser for global services
        localStorage.setItem('currentUser', JSON.stringify(u));
        
        const initials = ((u.first_name||'U')[0] + (u.last_name||'')[0]).toUpperCase();
        const fullName = ((u.first_name||'')+' '+(u.last_name||'')).trim() || 'User';
        
        document.querySelectorAll('#globalSbName').forEach(el => el.textContent = fullName);
        document.querySelectorAll('#globalSbAvatar').forEach(el => el.textContent = initials);
    } catch(e) {
        console.error("Sidebar user fetch failed", e);
    }
}

function logoutFromSidebar() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function openGlobalSettings() {
    openGlobalModal('globalSettingsModal');
}

function openGlobalModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.add('active');
}

function closeGlobalModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.classList.remove('active');
}

// Global Form Handlers for Settings
document.addEventListener('submit', async (e) => {
    const token = localStorage.getItem('token');
    
    // MPIN Verification
    if (e.target.id === 'globalMpinForm') {
        e.preventDefault();
        const mpin = document.getElementById('globalMpinInput').value;
        try {
            const res = await fetch('/api/auth/verify-mpin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ mpin })
            });
            if (res.ok) {
                closeGlobalModal('globalMpinModal');
                document.getElementById('globalMpinInput').value = '';
                openGlobalModal('globalUpdateSalaryModal');
            } else {
                const result = await res.json();
                alert(result.message || "Incorrect MPIN. Try again.");
            }
        } catch (err) {
            alert("Verification failed");
        }
    }

    // Salary Update
    if (e.target.id === 'globalSalaryForm') {
        e.preventDefault();
        const salary = document.getElementById('globalSalaryInput').value;
        try {
            const res = await fetch('/api/auth/salary', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ salary: parseFloat(salary) })
            });
            if (res.ok) {
                alert("Salary and card limits updated successfully!");
                closeGlobalModal('globalUpdateSalaryModal');
                document.getElementById('globalSalaryInput').value = '';
                // If the page has an initialization function (like Dashboard), call it
                if (typeof initializeDashboard === 'function') initializeDashboard(token);
                else location.reload(); // Fallback to refresh and show new data
            } else {
                const result = await res.json();
                alert(result.message || "Failed to update salary");
            }
        } catch (err) {
            alert("Error updating salary");
        }
    }
});
