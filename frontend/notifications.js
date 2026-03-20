/**
 * Nexus Notif - Dynamic Notification Service
 * Handles storing, retrieving and managing notifications in localStorage.
 */

const NexusNotif = {
    STORAGE_KEY: 'nexus_notifications',

    /** Get current user safely */
    _getCurrentUser() {
        const u = localStorage.getItem('currentUser') || localStorage.getItem('loggedInUser');
        try { return u ? JSON.parse(u) : null; } catch(e) { return null; }
    },

    /**
     * Add a new notification tied to the current user
     */
    add(message, type = 'transaction') {
        const user = this._getCurrentUser();
        if (!user) return null;

        const all = this._getRawAll();
        const newNotif = {
            id: 'nt-' + Date.now() + Math.floor(Math.random() * 1000),
            userId: user.id || user.email, // Tie to current user
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        all.unshift(newNotif);
        // Keep a reasonable total pool across users
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all.slice(0, 200)));
        
        window.dispatchEvent(new CustomEvent('nexus_notif_added', { detail: newNotif }));
        return newNotif;
    },

    /** Get all notifications from storage (raw) */
    _getRawAll() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        try {
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Get notifications ONLY for the current user
     */
    getAll() {
        const user = this._getCurrentUser();
        if (!user) return [];
        const uid = user.id || user.email;
        return this._getRawAll().filter(n => n.userId === uid);
    },

    /**
     * Mark a specific notification as read (User-scoped)
     */
    markAsRead(id) {
        const all = this._getRawAll();
        const updated = all.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    },

    /**
     * Mark all for current user as read
     */
    markAllRead() {
        const user = this._getCurrentUser();
        if (!user) return;
        const uid = user.id || user.email;
        
        const all = this._getRawAll();
        const updated = all.map(n => n.userId === uid ? { ...n, read: true } : n);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    },

    /**
     * Clear notifications ONLY for current user
     */
    clearAll() {
        const user = this._getCurrentUser();
        if (!user) return;
        const uid = user.id || user.email;

        const all = this._getRawAll();
        const filtered = all.filter(n => n.userId !== uid); // Keep other users' notifs
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    },

    /**
     * Get count of unread notifications for current user
     */
    getUnreadCount() {
        return this.getAll().filter(n => !n.read).length;
    }
};

// Export for use in modules if needed, or just keep as global for vanilla JS
window.NexusNotif = NexusNotif;
