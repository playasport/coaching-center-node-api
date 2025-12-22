// API Configuration
// Auto-detect API base URL based on current host
const getApiBaseUrl = () => {
    const host = window.location.hostname;
    // If running on same host, use relative path, otherwise use localhost:3001
    if (host === 'localhost' || host === '127.0.0.1') {
        return `http://localhost:3001/api/v1`;
    }
    return `${window.location.protocol}//${host}:${window.location.port || '3001'}/api/v1`;
};

const API_BASE_URL = getApiBaseUrl();
let accessToken = localStorage.getItem('adminAccessToken') || '';
let refreshToken = localStorage.getItem('adminRefreshToken') || '';
let currentUser = null;
let userPermissions = {}; // Store user permissions: { section: [actions] }
let currentPage = 'dashboard';
let currentUsersPage = 1;
let currentCentersPage = 1;
let currentPermissionsPage = 1;
let currentRolesPage = 1;
let currentBannersPage = 1;
let editingBannerId = null;
let currentHighlightsPage = 1;
let editingHighlightId = null;
let currentReelsPage = 1;
let editingReelId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    if (accessToken) {
        showAdminPanel();
        loadUserProfile().then(() => {
            // After profile loads, navigate to dashboard if user has permission
            if (hasPermission('dashboard', 'view')) {
                navigateToPage('dashboard');
            } else {
                // If no dashboard permission, go to first available page or profile
                navigateToPage('profile');
            }
        });
    } else {
        showLoginScreen();
    }

    // Event Listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('refreshTokenBtn').addEventListener('click', handleRefreshToken);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                navigateToPage(page);
            }
        });
    });

    // Profile forms
    document.getElementById('profileForm').addEventListener('submit', handleUpdateProfile);
    document.getElementById('passwordForm').addEventListener('submit', handleChangePassword);

    // User management
    document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
    document.getElementById('closeUserModal')?.addEventListener('click', () => closeUserModal());
    document.getElementById('cancelUserBtn')?.addEventListener('click', () => closeUserModal());
    document.getElementById('userForm')?.addEventListener('submit', handleCreateUser);

    // Role management
    document.getElementById('addRoleBtn')?.addEventListener('click', () => openRoleModal());
    document.getElementById('closeRoleModal')?.addEventListener('click', () => closeRoleModal());
    document.getElementById('cancelRoleBtn')?.addEventListener('click', () => closeRoleModal());
    document.getElementById('roleForm')?.addEventListener('submit', handleSaveRole);

    // Permission management
    document.getElementById('addPermissionBtn')?.addEventListener('click', () => openPermissionModal());
    document.getElementById('closePermissionModal')?.addEventListener('click', () => closePermissionModal());
    document.getElementById('cancelPermissionBtn')?.addEventListener('click', () => closePermissionModal());
    document.getElementById('permissionForm')?.addEventListener('submit', handleSavePermission);
    document.getElementById('refreshPermissionsBtn')?.addEventListener('click', loadPermissions);
    
    // Bulk permission management
    document.getElementById('bulkUpdatePermissionsBtn')?.addEventListener('click', () => openBulkPermissionModal());
    document.getElementById('closeBulkPermissionModal')?.addEventListener('click', () => closeBulkPermissionModal());
    document.getElementById('cancelBulkPermissionBtn')?.addEventListener('click', () => closeBulkPermissionModal());
    document.getElementById('bulkPermissionForm')?.addEventListener('submit', handleBulkUpdatePermissions);
    document.getElementById('bulkPermissionRole')?.addEventListener('change', loadRolePermissionsForBulk);
    document.getElementById('selectAllSections')?.addEventListener('click', selectAllBulkPermissions);
    document.getElementById('deselectAllSections')?.addEventListener('click', deselectAllBulkPermissions);

    // Pagination
    document.getElementById('prevUsersBtn')?.addEventListener('click', () => {
        if (currentUsersPage > 1) {
            currentUsersPage--;
            loadUsers();
        }
    });
    document.getElementById('nextUsersBtn')?.addEventListener('click', () => {
        currentUsersPage++;
        loadUsers();
    });
    document.getElementById('prevCentersBtn')?.addEventListener('click', () => {
        if (currentCentersPage > 1) {
            currentCentersPage--;
            loadCoachingCenters();
        }
    });
    document.getElementById('nextCentersBtn')?.addEventListener('click', () => {
        currentCentersPage++;
        loadCoachingCenters();
    });

    // Permission Pagination
    document.getElementById('prevPermissionsBtn')?.addEventListener('click', () => {
        if (currentPermissionsPage > 1) {
            currentPermissionsPage--;
            loadPermissions();
        }
    });
    document.getElementById('nextPermissionsBtn')?.addEventListener('click', () => {
        currentPermissionsPage++;
        loadPermissions();
    });

    // Role Management Pagination
    document.getElementById('prevRolesBtn')?.addEventListener('click', () => {
        if (currentRolesPage > 1) {
            currentRolesPage--;
            loadRolesForManagement();
        }
    });
    document.getElementById('nextRolesBtn')?.addEventListener('click', () => {
        currentRolesPage++;
        loadRolesForManagement();
    });

    // Role Filtering
    document.getElementById('roleFilter')?.addEventListener('change', () => {
        currentPermissionsPage = 1;
        loadPermissions();
    });

    // Banner Management
    document.getElementById('addBannerBtn')?.addEventListener('click', () => openBannerModal());
    document.getElementById('closeBannerModal')?.addEventListener('click', () => closeBannerModal());
    document.getElementById('cancelBannerBtn')?.addEventListener('click', () => closeBannerModal());
    document.getElementById('bannerForm')?.addEventListener('submit', handleSaveBanner);
    document.getElementById('uploadDesktopImageBtn')?.addEventListener('click', () => uploadBannerImage('desktop'));
    document.getElementById('uploadMobileImageBtn')?.addEventListener('click', () => uploadBannerImage('mobile'));
    document.getElementById('refreshBannersBtn')?.addEventListener('click', loadBanners);
    document.getElementById('bannerPositionFilter')?.addEventListener('change', () => {
        currentBannersPage = 1;
        loadBanners();
    });
    document.getElementById('bannerStatusFilter')?.addEventListener('change', () => {
        currentBannersPage = 1;
        loadBanners();
    });
    document.getElementById('bannerSearchInput')?.addEventListener('input', debounce(() => {
        currentBannersPage = 1;
        loadBanners();
    }, 500));
    document.getElementById('prevBannersBtn')?.addEventListener('click', () => {
        if (currentBannersPage > 1) {
            currentBannersPage--;
            loadBanners();
        }
    });
    document.getElementById('nextBannersBtn')?.addEventListener('click', () => {
        currentBannersPage++;
        loadBanners();
    });

    // Highlight Management
    document.getElementById('addHighlightBtn')?.addEventListener('click', () => openHighlightModal());
    document.getElementById('closeHighlightModal')?.addEventListener('click', () => closeHighlightModal());
    document.getElementById('cancelHighlightBtn')?.addEventListener('click', () => closeHighlightModal());
    document.getElementById('highlightForm')?.addEventListener('submit', handleSaveHighlight);
    document.getElementById('uploadHighlightVideoBtn')?.addEventListener('click', () => uploadHighlightVideo());
    document.getElementById('uploadHighlightThumbnailBtn')?.addEventListener('click', () => uploadHighlightThumbnail());
    document.getElementById('refreshHighlightsBtn')?.addEventListener('click', loadHighlights);

    // Queue Management
    document.getElementById('refreshQueuesBtn')?.addEventListener('click', loadQueues);

    // Log Viewer
    document.getElementById('refreshLogsBtn')?.addEventListener('click', () => {
        currentLogsPage = 1;
        loadLogs();
    });
    document.getElementById('logTypeFilter')?.addEventListener('change', () => {
        currentLogsPage = 1;
        loadLogs();
    });
    document.getElementById('logLevelFilter')?.addEventListener('change', () => {
        currentLogsPage = 1;
        loadLogs();
    });
    document.getElementById('logSearchInput')?.addEventListener('input', debounce(() => {
        currentLogsPage = 1;
        loadLogs();
    }, 500));
    document.getElementById('prevLogsBtn')?.addEventListener('click', () => {
        if (currentLogsPage > 1) {
            currentLogsPage--;
            loadLogs();
        }
    });
    document.getElementById('nextLogsBtn')?.addEventListener('click', () => {
        currentLogsPage++;
        loadLogs();
    });
    document.getElementById('highlightStatusFilter')?.addEventListener('change', () => {
        currentHighlightsPage = 1;
        loadHighlights();
    });
    document.getElementById('highlightVideoProcessingStatusFilter')?.addEventListener('change', () => {
        currentHighlightsPage = 1;
        loadHighlights();
    });
    document.getElementById('highlightSearchInput')?.addEventListener('input', debounce(() => {
        currentHighlightsPage = 1;
        loadHighlights();
    }, 500));
    document.getElementById('prevHighlightsBtn')?.addEventListener('click', () => {
        if (currentHighlightsPage > 1) {
            currentHighlightsPage--;
            loadHighlights();
        }
    });
    document.getElementById('nextHighlightsBtn')?.addEventListener('click', () => {
        currentHighlightsPage++;
        loadHighlights();
    });

    // Reel management
    document.getElementById('addReelBtn')?.addEventListener('click', () => openReelModal());
    document.getElementById('closeReelModal')?.addEventListener('click', () => closeReelModal());
    document.getElementById('cancelReelBtn')?.addEventListener('click', () => closeReelModal());
    document.getElementById('reelForm')?.addEventListener('submit', handleSaveReel);
    document.getElementById('uploadReelVideoBtn')?.addEventListener('click', () => uploadReelVideo());
    document.getElementById('uploadReelThumbnailBtn')?.addEventListener('click', () => uploadReelThumbnail());
    document.getElementById('refreshReelsBtn')?.addEventListener('click', loadReels);
    document.getElementById('reelStatusFilter')?.addEventListener('change', () => {
        currentReelsPage = 1;
        loadReels();
    });
    document.getElementById('reelVideoProcessedStatusFilter')?.addEventListener('change', () => {
        currentReelsPage = 1;
        loadReels();
    });
    document.getElementById('reelSearchInput')?.addEventListener('input', debounce(() => {
        currentReelsPage = 1;
        loadReels();
    }, 500));
    document.getElementById('prevReelsBtn')?.addEventListener('click', () => {
        if (currentReelsPage > 1) {
            currentReelsPage--;
            loadReels();
        }
    });
    document.getElementById('nextReelsBtn')?.addEventListener('click', () => {
        currentReelsPage++;
        loadReels();
    });
    
    // Character counters for reel form
    document.getElementById('reelTitle')?.addEventListener('input', (e) => {
        const count = e.target.value.length;
        const counter = document.getElementById('reelTitleCount');
        if (counter) counter.textContent = `${count}/60`;
    });
    document.getElementById('reelDescription')?.addEventListener('input', (e) => {
        const count = e.target.value.length;
        const counter = document.getElementById('reelDescriptionCount');
        if (counter) counter.textContent = `${count}/300`;
    });
});

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            ...options.headers,
        },
        ...options,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth Functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        showLoading();
        const response = await apiRequest('/admin/auth/login', {
            method: 'POST',
            body: { email, password },
        });

        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        currentUser = response.data.user;

        localStorage.setItem('adminAccessToken', accessToken);
        localStorage.setItem('adminRefreshToken', refreshToken);

        showToast('Login successful!', 'success');
        showAdminPanel();
        await loadUserProfile();
        // Navigate to dashboard after profile loads (will check permissions)
        navigateToPage('dashboard');
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed';
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), 5000);
    } finally {
        hideLoading();
    }
}

async function handleRefreshToken() {
    if (!refreshToken) {
        showToast('No refresh token available', 'error');
        return;
    }

    try {
        showLoading();
        const response = await apiRequest('/admin/auth/refresh', {
            method: 'POST',
            body: { refreshToken },
        });

        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;

        localStorage.setItem('adminAccessToken', accessToken);
        localStorage.setItem('adminRefreshToken', refreshToken);

        showToast('Token refreshed successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Token refresh failed', 'error');
        handleLogout();
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        if (accessToken) {
            await apiRequest('/admin/auth/logout', {
                method: 'POST',
                body: { refreshToken },
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        accessToken = '';
        refreshToken = '';
        currentUser = null;
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        showLoginScreen();
    }
}

// Navigation
function navigateToPage(page) {
    currentPage = page;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show selected page
    const pageElement = document.getElementById(`${page}Page`);
    if (pageElement) {
        pageElement.classList.add('active');
        document.getElementById('pageTitle').textContent = getPageTitle(page);
    }

    // Check permissions for this page (except profile which is always accessible)
    // Note: We check permissions in the switch statement as well, so this is just a warning
    if (page !== 'profile') {
        const navItem = document.querySelector(`[data-page="${page}"]`);
        const section = navItem?.dataset.section;
        
        if (section && !hasPermission(section, 'view')) {
            console.warn(`Permission check failed for page ${page}, section ${section}`);
            // Don't return early - let the switch statement handle it with proper error messages
        }
    }

    // Load page data
    console.log('Executing switch statement for page:', page);
    switch (page) {
        case 'dashboard':
            if (hasPermission('dashboard', 'view')) {
                loadDashboard();
            } else {
                showToast('You do not have permission to view dashboard', 'error');
            }
            break;
        case 'permissions':
            if (hasPermission('permission', 'view')) {
                loadPermissions();
                loadRoles();
                loadSections();
                // Update button visibility
                updateMenuVisibility();
                // Show bulk update button if user has permission
                const bulkBtn = document.getElementById('bulkUpdatePermissionsBtn');
                if (bulkBtn) {
                    bulkBtn.style.display = hasPermission('permission', 'update') ? 'inline-flex' : 'none';
                }
            } else {
                showToast('You do not have permission to view permissions', 'error');
            }
            break;
        case 'users':
            if (hasPermission('user', 'view')) {
                loadUsers();
                // Load roles for create user modal
                if (hasPermission('user', 'create')) {
                    loadRolesForUser();
                }
            } else {
                showToast('You do not have permission to view users', 'error');
            }
            break;
        case 'coaching-centers':
            if (hasPermission('coaching_center', 'view')) {
                loadCoachingCenters();
            } else {
                showToast('You do not have permission to view coaching centers', 'error');
            }
            break;
        case 'roles':
            if (hasPermission('role', 'view')) {
                loadRolesForManagement();
            } else {
                showToast('You do not have permission to view roles', 'error');
            }
            break;
        case 'banners':
            if (hasPermission('banner', 'view')) {
                loadBanners();
                updateMenuVisibility();
                // Show/hide add button based on permission
                const addBtn = document.getElementById('addBannerBtn');
                if (addBtn) {
                    addBtn.style.display = hasPermission('banner', 'create') ? 'inline-flex' : 'none';
                }
            } else {
                showToast('You do not have permission to view banners', 'error');
            }
            break;
        case 'highlights':
            if (hasPermission('highlight', 'view')) {
                loadHighlights();
                updateMenuVisibility();
                // Show/hide add button based on permission
                const addHighlightBtn = document.getElementById('addHighlightBtn');
                if (addHighlightBtn) {
                    addHighlightBtn.style.display = hasPermission('highlight', 'create') ? 'inline-flex' : 'none';
                }
                // Load users and coaching centers for form
                if (hasPermission('highlight', 'create')) {
                    loadUsersForHighlight();
                    loadCoachingCentersForHighlight();
                }
            } else {
                showToast('You do not have permission to view highlights', 'error');
            }
            break;
        case 'reels':
            if (hasPermission('reel', 'view')) {
                loadReels();
                updateMenuVisibility();
                // Show/hide add button based on permission
                const addReelBtn = document.getElementById('addReelBtn');
                if (addReelBtn) {
                    addReelBtn.style.display = hasPermission('reel', 'create') ? 'inline-flex' : 'none';
                }
                // Load users and sports for form
                if (hasPermission('reel', 'create')) {
                    loadUsersForReel();
                    loadSportsForReel();
                }
            } else {
                showToast('You do not have permission to view reels', 'error');
            }
            break;
        case 'queues':
            console.log('Queues case triggered, checking permission...');
            if (hasPermission('settings', 'view')) {
                console.log('Permission granted, calling loadQueues()');
                loadQueues();
            } else {
                console.log('Permission denied for queues');
                showToast('You do not have permission to view queues', 'error');
            }
            break;
        case 'logs':
            console.log('Logs case triggered, checking permission...');
            if (hasPermission('settings', 'view')) {
                console.log('Permission granted, calling loadLogs()');
                loadLogs();
            } else {
                console.log('Permission denied for logs');
                showToast('You do not have permission to view logs', 'error');
            }
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'permissions': 'Permission Management',
        'users': 'User Management',
        'reels': 'Reel Management',
        'coaching-centers': 'Coaching Center Management',
        'roles': 'Role Management',
        'banners': 'Banner Management',
        'highlights': 'Highlight Management',
        'queues': 'Queue Management',
        'logs': 'Log Viewer',
        'profile': 'My Profile',
    };
    return titles[page] || 'Dashboard';
}

// Screen Management
function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('adminPanel').classList.remove('active');
}

function showAdminPanel() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('adminPanel').classList.add('active');
}

// Loading Management
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Dashboard
async function loadDashboard() {
    // Check permission first
    if (!hasPermission('dashboard', 'view')) {
        showToast('You do not have permission to view dashboard', 'error');
        return;
    }

    try {
        showLoading();
        const response = await apiRequest('/admin/dashboard/stats');
        const stats = response.data.stats;

        document.getElementById('totalUsers').textContent = stats.users.total;
        document.getElementById('activeUsers').textContent = `Active: ${stats.users.active}`;
        document.getElementById('totalCenters').textContent = stats.coachingCenters.total;
        document.getElementById('activeCenters').textContent = `Active: ${stats.coachingCenters.active}`;
        document.getElementById('totalBookings').textContent = stats.bookings.total;
        document.getElementById('pendingBookings').textContent = `Pending: ${stats.bookings.pending}`;
        document.getElementById('totalBatches').textContent = stats.batches.total;
        document.getElementById('activeBatches').textContent = `Active: ${stats.batches.active}`;
    } catch (error) {
        showToast(error.message || 'Failed to load dashboard', 'error');
    } finally {
        hideLoading();
    }
}

// User Profile
async function loadUserProfile() {
    try {
        const response = await apiRequest('/admin/auth/profile');
        currentUser = response.data.user;
        
        const userInfo = document.getElementById('userInfo');
        userInfo.textContent = `${currentUser.firstName} ${currentUser.lastName || ''} (${currentUser.email})`.trim();
        
        const userRole = document.getElementById('userRole');
        if (currentUser.roles && currentUser.roles.length > 0) {
            const roleName = typeof currentUser.roles[0] === 'object' 
                ? currentUser.roles[0].name || currentUser.roles[0]
                : currentUser.roles[0];
            userRole.textContent = roleName.replace('_', ' ').toUpperCase();
        }

        // Load user permissions
        await loadUserPermissions();
        
        // Update menu visibility based on permissions
        updateMenuVisibility();
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

// Load user permissions
async function loadUserPermissions() {
    try {
        const response = await apiRequest('/admin/permissions/me');
        userPermissions = response.data.permissions || {};
        console.log('User permissions loaded:', userPermissions);
    } catch (error) {
        console.error('Failed to load user permissions:', error);
        userPermissions = {};
    }
}

// Check if user has permission for a section and action
function hasPermission(section, action = 'view') {
    // Super admin has all permissions
    if (currentUser?.roles?.some(r => {
        const roleName = typeof r === 'object' ? r.name : r;
        return roleName === 'super_admin';
    })) {
        return true;
    }

    // Check if section exists in permissions
    if (!userPermissions[section]) {
        return false;
    }

    // Check if action is in the allowed actions for this section
    return userPermissions[section].includes(action);
}

// Update menu visibility based on permissions
function updateMenuVisibility() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        const section = item.dataset.section;
        if (section) {
            // Check if user has VIEW permission for this section
            if (hasPermission(section, 'view')) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        }
    });

    // Profile is always visible (no permission check)
    const profileItem = document.querySelector('.nav-item[data-page="profile"]');
    if (profileItem) {
        profileItem.style.display = 'flex';
    }

    // Update "Add Permission" button visibility
    const addPermissionBtn = document.getElementById('addPermissionBtn');
    if (addPermissionBtn) {
        if (hasPermission('permission', 'create')) {
            addPermissionBtn.style.display = 'inline-flex';
        } else {
            addPermissionBtn.style.display = 'none';
        }
    }
}

async function loadProfile() {
    if (!currentUser) {
        await loadUserProfile();
    }

    document.getElementById('profileFirstName').value = currentUser.firstName || '';
    document.getElementById('profileLastName').value = currentUser.lastName || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileMobile').value = currentUser.mobile || '';
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
        showLoading();
        const data = {
            firstName: document.getElementById('profileFirstName').value,
            lastName: document.getElementById('profileLastName').value,
            mobile: document.getElementById('profileMobile').value || undefined,
        };

        await apiRequest('/admin/auth/profile', {
            method: 'PATCH',
            body: data,
        });

        showToast('Profile updated successfully!', 'success');
        await loadUserProfile();
    } catch (error) {
        showToast(error.message || 'Failed to update profile', 'error');
    } finally {
        hideLoading();
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    try {
        showLoading();
        const data = {
            currentPassword: document.getElementById('currentPassword').value,
            newPassword: document.getElementById('newPassword').value,
        };

        await apiRequest('/admin/auth/password', {
            method: 'PATCH',
            body: data,
        });

        showToast('Password changed successfully!', 'success');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        showToast(error.message || 'Failed to change password', 'error');
    } finally {
        hideLoading();
    }
}

// Users Management
async function loadUsers() {
    // Check permission first
    if (!hasPermission('user', 'view')) {
        showToast('You do not have permission to view users', 'error');
        return;
    }

    try {
        showLoading();
        const response = await apiRequest(`/admin/users?page=${currentUsersPage}&limit=10`);
        const users = response.data.users;
        const pagination = response.data.pagination;

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            const roles = user.roles?.map(r => r.name || r).join(', ') || 'No roles';
            const status = user.isActive ? 
                '<span class="badge badge-success">Active</span>' : 
                '<span class="badge badge-danger">Inactive</span>';

            const canEdit = hasPermission('user', 'update');
            const canDelete = hasPermission('user', 'delete');
            const actionButtons = [];
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="editUser('${user.id}')">Edit</button>`);
            }
            if (canDelete) {
                actionButtons.push(`<button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Delete</button>`);
            }
            const actionsHtml = actionButtons.length > 0 ? actionButtons.join(' ') : '<span class="text-muted">No actions</span>';

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.firstName} ${user.lastName || ''}</td>
                <td>${user.email}</td>
                <td>${roles}</td>
                <td>${status}</td>
                <td class="action-buttons">${actionsHtml}</td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('usersPageInfo').textContent = 
            `Page ${pagination.page} of ${pagination.totalPages}`;
        document.getElementById('prevUsersBtn').disabled = pagination.page === 1;
        document.getElementById('nextUsersBtn').disabled = !pagination.hasNextPage;

        // Show/hide add button based on permission
        const addBtn = document.getElementById('addUserBtn');
        if (addBtn) {
            addBtn.style.display = hasPermission('user', 'create') ? 'inline-flex' : 'none';
        }
    } catch (error) {
        showToast(error.message || 'Failed to load users', 'error');
    } finally {
        hideLoading();
    }
}

function openUserModal() {
    if (!hasPermission('user', 'create')) {
        showToast('You do not have permission to create users', 'error');
        return;
    }
    document.getElementById('userModal').classList.add('active');
    document.getElementById('userForm').reset();
    document.getElementById('userIsActive').checked = true;
    loadRolesForUser();
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

async function loadRolesForUser() {
    try {
        const response = await apiRequest('/role');
        const roles = response.data.roles;
        
        const select = document.getElementById('userRoles');
        select.innerHTML = '';
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.name;
            option.textContent = role.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load roles:', error);
        showToast('Failed to load roles', 'error');
    }
}

async function handleCreateUser(e) {
    e.preventDefault();
    try {
        // Check permission
        if (!hasPermission('user', 'create')) {
            showToast('You do not have permission to create users', 'error');
            return;
        }

        showLoading();
        
        // Get selected roles
        const roleSelect = document.getElementById('userRoles');
        const selectedRoles = Array.from(roleSelect.selectedOptions).map(option => option.value);
        
        if (selectedRoles.length === 0) {
            showToast('Please select at least one role', 'error');
            hideLoading();
            return;
        }

        // Get date of birth
        const dobInput = document.getElementById('userDob').value;
        const dob = dobInput ? new Date(dobInput).toISOString() : null;

        const data = {
            email: document.getElementById('userEmail').value,
            password: document.getElementById('userPassword').value,
            firstName: document.getElementById('userFirstName').value,
            lastName: document.getElementById('userLastName').value || null,
            mobile: document.getElementById('userMobile').value || null,
            gender: document.getElementById('userGender').value || null,
            dob: dob,
            roles: selectedRoles,
            userType: document.getElementById('userType').value || null,
            isActive: document.getElementById('userIsActive').checked,
        };

        await apiRequest('/admin/users', {
            method: 'POST',
            body: data,
        });

        showToast('User created successfully!', 'success');
        closeUserModal();
        loadUsers();
    } catch (error) {
        showToast(error.message || 'Failed to create user', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteUser(userId) {
    if (!hasPermission('user', 'delete')) {
        showToast('You do not have permission to delete users', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/users/${userId}`, {
            method: 'DELETE',
        });

        showToast('User deleted successfully!', 'success');
        loadUsers();
    } catch (error) {
        showToast(error.message || 'Failed to delete user', 'error');
    } finally {
        hideLoading();
    }
}

function editUser(userId) {
    if (!hasPermission('user', 'update')) {
        showToast('You do not have permission to edit users', 'error');
        return;
    }
    showToast(`Edit user ${userId} - Feature coming soon`, 'success');
}

// Coaching Centers Management
async function loadCoachingCenters() {
    // Check permission first
    if (!hasPermission('coaching_center', 'view')) {
        showToast('You do not have permission to view coaching centers', 'error');
        return;
    }

    try {
        showLoading();
        const response = await apiRequest(`/admin/coaching-centers?page=${currentCentersPage}&limit=10`);
        const centers = response.data.coachingCenters;
        const pagination = response.data.pagination;

        const tbody = document.getElementById('centersTableBody');
        tbody.innerHTML = '';

        if (centers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No coaching centers found</td></tr>';
            return;
        }

        centers.forEach(center => {
            const row = document.createElement('tr');
            const status = center.is_active ? 
                '<span class="badge badge-success">Active</span>' : 
                '<span class="badge badge-danger">Inactive</span>';

            row.innerHTML = `
                <td>${center.id}</td>
                <td>${center.center_name}</td>
                <td>${center.email}</td>
                <td>${status}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="viewCenter('${center.id}')">View</button>
                    <button class="btn btn-sm btn-outline" onclick="editCenter('${center.id}')">Edit</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('centersPageInfo').textContent = 
            `Page ${pagination.page} of ${pagination.totalPages}`;
        document.getElementById('prevCentersBtn').disabled = pagination.page === 1;
        document.getElementById('nextCentersBtn').disabled = !pagination.hasNextPage;
    } catch (error) {
        showToast(error.message || 'Failed to load coaching centers', 'error');
    } finally {
        hideLoading();
    }
}

function viewCenter(centerId) {
    showToast(`View center ${centerId} - Feature coming soon`, 'success');
}

function editCenter(centerId) {
    showToast(`Edit center ${centerId} - Feature coming soon`, 'success');
}

// Permissions Management
let availableSections = [];
let availableRoles = [];

// Make functions global for onclick handlers
window.editRole = editRole;
window.deleteRole = deleteRole;

// Bulk Permission Management
let currentBulkRoleId = null;

function openBulkPermissionModal() {
    if (!hasPermission('permission', 'update')) {
        showToast('You do not have permission to update permissions', 'error');
        return;
    }
    
    const modal = document.getElementById('bulkPermissionModal');
    const form = document.getElementById('bulkPermissionForm');
    const roleSelect = document.getElementById('bulkPermissionRole');
    
    // Reset form
    form.reset();
    currentBulkRoleId = null;
    document.getElementById('bulkPermissionsList').innerHTML = '<p class="text-center text-muted">Select a role to load permissions</p>';
    
    // Populate roles dropdown
    if (availableRoles.length === 0) {
        loadRoles().then(() => {
            populateBulkRoleSelect();
        });
    } else {
        populateBulkRoleSelect();
    }
    
    modal.classList.add('active');
}

function closeBulkPermissionModal() {
    document.getElementById('bulkPermissionModal').classList.remove('active');
    currentBulkRoleId = null;
    document.getElementById('bulkPermissionForm').reset();
}

function populateBulkRoleSelect() {
    const roleSelect = document.getElementById('bulkPermissionRole');
    roleSelect.innerHTML = '<option value="">Select Role</option>';
    availableRoles.forEach(role => {
        const option = document.createElement('option');
        // Handle both id and _id
        option.value = role.id || role._id?.toString() || '';
        option.textContent = role.name;
        roleSelect.appendChild(option);
    });
}

async function loadRolePermissionsForBulk() {
    const roleId = document.getElementById('bulkPermissionRole').value;
    if (!roleId) {
        document.getElementById('bulkPermissionsList').innerHTML = '<p class="text-center text-muted">Select a role to load permissions</p>';
        currentBulkRoleId = null;
        return;
    }
    
    currentBulkRoleId = roleId;
    
    try {
        showLoading();
        
        // Load existing permissions for this role
        const permissionsResponse = await apiRequest(`/admin/permissions/role/${roleId}`);
        const existingPermissions = permissionsResponse.data.permissions || [];
        
        // Create a map of existing permissions by section
        const permissionsMap = {};
        existingPermissions.forEach(perm => {
            permissionsMap[perm.section] = {
                actions: perm.actions || [],
                isActive: perm.isActive !== false
            };
        });
        
        // Load sections and actions
        if (availableSections.length === 0) {
            await loadSections();
        }
        
        const actionsList = ['view', 'create', 'update', 'delete'];
        const actionsLabels = {
            'view': 'View',
            'create': 'Create',
            'update': 'Update',
            'delete': 'Delete'
        };
        
        // Build permissions UI
        const container = document.getElementById('bulkPermissionsList');
        container.innerHTML = '';
        
        availableSections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.style.cssText = 'border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #f9f9f9;';
            
            const existingPerm = permissionsMap[section.value] || { actions: [], isActive: true };
            
            const sectionHeader = document.createElement('div');
            sectionHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
            
            const sectionTitle = document.createElement('h4');
            sectionTitle.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600;';
            sectionTitle.textContent = section.label;
            
            const sectionToggle = document.createElement('label');
            sectionToggle.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';
            sectionToggle.innerHTML = `
                <input type="checkbox" class="section-active-toggle" data-section="${section.value}" ${existingPerm.isActive ? 'checked' : ''}>
                <span style="font-size: 14px;">Active</span>
            `;
            
            sectionHeader.appendChild(sectionTitle);
            sectionHeader.appendChild(sectionToggle);
            
            const actionsDiv = document.createElement('div');
            actionsDiv.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 10px;';
            
            actionsList.forEach(action => {
                const actionLabel = document.createElement('label');
                actionLabel.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px; background: white; border-radius: 4px; border: 1px solid #ddd;';
                actionLabel.innerHTML = `
                    <input type="checkbox" 
                           class="permission-action" 
                           data-section="${section.value}" 
                           data-action="${action}"
                           ${existingPerm.actions.includes(action) ? 'checked' : ''}>
                    <span style="font-size: 14px;">${actionsLabels[action]}</span>
                `;
                actionsDiv.appendChild(actionLabel);
            });
            
            sectionDiv.appendChild(sectionHeader);
            sectionDiv.appendChild(actionsDiv);
            container.appendChild(sectionDiv);
        });
        
        // Add event listeners for section toggle
        document.querySelectorAll('.section-active-toggle').forEach(toggle => {
            toggle.addEventListener('change', function() {
                const section = this.dataset.section;
                const isActive = this.checked;
                document.querySelectorAll(`.permission-action[data-section="${section}"]`).forEach(action => {
                    action.disabled = !isActive;
                    if (!isActive) {
                        action.checked = false;
                    }
                });
            });
            
            // Set initial disabled state
            const section = toggle.dataset.section;
            const isActive = toggle.checked;
            document.querySelectorAll(`.permission-action[data-section="${section}"]`).forEach(action => {
                action.disabled = !isActive;
            });
        });
        
    } catch (error) {
        showToast(error.message || 'Failed to load role permissions', 'error');
        document.getElementById('bulkPermissionsList').innerHTML = '<p class="text-center text-danger">Failed to load permissions</p>';
    } finally {
        hideLoading();
    }
}

function selectAllBulkPermissions() {
    document.querySelectorAll('.permission-action').forEach(checkbox => {
        if (!checkbox.disabled) {
            checkbox.checked = true;
        }
    });
}

function deselectAllBulkPermissions() {
    document.querySelectorAll('.permission-action').forEach(checkbox => {
        checkbox.checked = false;
    });
}

async function handleBulkUpdatePermissions(e) {
    e.preventDefault();
    
    if (!hasPermission('permission', 'update')) {
        showToast('You do not have permission to update permissions', 'error');
        return;
    }
    
    const roleId = document.getElementById('bulkPermissionRole').value;
    if (!roleId) {
        showToast('Please select a role', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Collect all permissions
        const permissions = [];
        const sections = new Set();
        
        // Get all checked actions
        document.querySelectorAll('.permission-action:checked').forEach(checkbox => {
            const section = checkbox.dataset.section;
            const action = checkbox.dataset.action;
            sections.add(section);
        });
        
        // Build permissions array
        sections.forEach(section => {
            const actions = [];
            const isActiveToggle = document.querySelector(`.section-active-toggle[data-section="${section}"]`);
            const isActive = isActiveToggle ? isActiveToggle.checked : true;
            
            document.querySelectorAll(`.permission-action[data-section="${section}"]:checked`).forEach(checkbox => {
                actions.push(checkbox.dataset.action);
            });
            
            if (actions.length > 0) {
                permissions.push({
                    section: section,
                    actions: actions,
                    isActive: isActive
                });
            }
        });
        
        if (permissions.length === 0) {
            showToast('Please select at least one permission', 'error');
            return;
        }
        
        // Submit bulk update
        await apiRequest('/admin/permissions/bulk', {
            method: 'POST',
            body: {
                role: roleId,
                permissions: permissions
            }
        });
        
        showToast('Permissions updated successfully!', 'success');
        closeBulkPermissionModal();
        loadPermissions();
    } catch (error) {
        showToast(error.message || 'Failed to update permissions', 'error');
    } finally {
        hideLoading();
    }
}

async function loadSections() {
    try {
        const response = await apiRequest('/admin/permissions/sections');
        availableSections = response.data.sections;
        
        const select = document.getElementById('permissionSection');
        select.innerHTML = '<option value="">Select Section</option>';
        availableSections.forEach(section => {
            const option = document.createElement('option');
            option.value = section.value;
            option.textContent = section.label;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load sections:', error);
    }
}

async function loadRoles() {
    try {
        const response = await apiRequest('/role');
        availableRoles = response.data.roles;
        
        const roleFilter = document.getElementById('roleFilter');
        const permissionRole = document.getElementById('permissionRole');
        
        [roleFilter, permissionRole].forEach(select => {
            if (select) {
                select.innerHTML = select.id === 'roleFilter' ? 
                    '<option value="">All Roles</option>' : 
                    '<option value="">Select Role</option>';
        availableRoles.forEach(role => {
            const option = document.createElement('option');
            // Handle both id and _id
            option.value = role.id || role._id?.toString() || '';
            option.textContent = role.name;
            select.appendChild(option);
        });
            }
        });
    } catch (error) {
        console.error('Failed to load roles:', error);
    }
}

async function loadPermissions() {
    // Check permission first
    if (!hasPermission('permission', 'view')) {
        showToast('You do not have permission to view permissions', 'error');
        return;
    }

    try {
        showLoading();
        const roleFilter = document.getElementById('roleFilter')?.value;
        let endpoint = `/admin/permissions?page=${currentPermissionsPage}&limit=10`;
        
        // If role filter is applied, we currently use a different endpoint
        if (roleFilter) {
            endpoint = `/admin/permissions/role/${roleFilter}`;
        }

        const response = await apiRequest(endpoint);
        
        // Handle response with pagination
        const permissions = response.data.permissions;
        const pagination = response.data.pagination;

        // Update pagination UI if we have pagination data
        const pageInfo = document.getElementById('permissionsPageInfo');
        const prevBtn = document.getElementById('prevPermissionsBtn');
        const nextBtn = document.getElementById('nextPermissionsBtn');

        if (pagination && pageInfo && prevBtn && nextBtn) {
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
            prevBtn.disabled = pagination.page === 1;
            nextBtn.disabled = !pagination.hasNextPage;
            currentPermissionsPage = pagination.page;
        } else if (pageInfo && prevBtn && nextBtn) {
            // If no pagination data (e.g. for role-specific list), hide/disable pagination
            pageInfo.textContent = 'All records';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        }

        const tbody = document.getElementById('permissionsTableBody');
        tbody.innerHTML = '';

        if (!permissions || permissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No permissions found</td></tr>';
            return;
        }

        permissions.forEach(permission => {
            const row = document.createElement('tr');
            const roleName = permission.role?.name || 'Unknown';
            const sectionName = availableSections.find(s => s.value === permission.section)?.label || permission.section;
            const actions = permission.actions.join(', ');
            const status = permission.isActive ? 
                '<span class="badge badge-success">Active</span>' : 
                '<span class="badge badge-danger">Inactive</span>';

            // Handle both id and _id (lean() returns _id, toJSON() returns id)
            const permissionId = permission.id || permission._id?.toString() || '';
            
            if (!permissionId) {
                console.warn('Permission missing ID:', permission);
            }

            // Show edit/delete buttons only if user has permission
            const canEdit = hasPermission('permission', 'update');
            const canDelete = hasPermission('permission', 'delete');
            const actionButtons = [];
            if (canEdit && permissionId) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="editPermission('${permissionId}')">Edit</button>`);
            }
            if (canDelete && permissionId) {
                actionButtons.push(`<button class="btn btn-sm btn-danger" onclick="deletePermission('${permissionId}')">Delete</button>`);
            }
            const actionsHtml = actionButtons.length > 0 ? actionButtons.join(' ') : '<span class="text-muted">No actions</span>';

            row.innerHTML = `
                <td>${roleName}</td>
                <td>${sectionName}</td>
                <td>${actions}</td>
                <td>${status}</td>
                <td class="action-buttons">${actionsHtml}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showToast(error.message || 'Failed to load permissions', 'error');
    } finally {
        hideLoading();
    }
}

function openPermissionModal() {
    // Check permission instead of role
    if (!hasPermission('permission', 'create')) {
        showToast('You do not have permission to create permissions', 'error');
        return;
    }
    
    editingPermissionId = null;
    
    // Reset form
    document.getElementById('permissionForm').reset();
    document.getElementById('permissionIsActive').checked = true;
    
    // Enable role and section fields
    document.getElementById('permissionRole').disabled = false;
    document.getElementById('permissionSection').disabled = false;
    
    // Update modal title
    const modalTitle = document.querySelector('#permissionModal .modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = 'Create New Permission';
    }
    
    // Update submit button text
    const submitBtn = document.querySelector('#permissionForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Create Permission';
    }
    
    document.getElementById('permissionModal').classList.add('active');
}

function closePermissionModal() {
    document.getElementById('permissionModal').classList.remove('active');
    editingPermissionId = null;
    document.getElementById('permissionForm').reset();
    document.getElementById('permissionRole').disabled = false;
    document.getElementById('permissionSection').disabled = false;
}

async function handleSavePermission(e) {
    e.preventDefault();
    try {
        showLoading();
        
        const roleId = document.getElementById('permissionRole').value;
        const section = document.getElementById('permissionSection').value;
        const actions = Array.from(document.querySelectorAll('input[name="actions"]:checked')).map(cb => cb.value);
        const isActive = document.getElementById('permissionIsActive').checked;

        if (!actions || actions.length === 0) {
            showToast('Please select at least one action', 'error');
            return;
        }

        const data = {
            actions,
            isActive,
        };

        if (editingPermissionId) {
            // Update existing permission
            if (!hasPermission('permission', 'update')) {
                showToast('You do not have permission to update permissions', 'error');
                return;
            }
            
            await apiRequest(`/admin/permissions/${editingPermissionId}`, {
                method: 'PATCH',
                body: data,
            });

            showToast('Permission updated successfully!', 'success');
        } else {
            // Create new permission
            if (!hasPermission('permission', 'create')) {
                showToast('You do not have permission to create permissions', 'error');
                return;
            }
            
            data.role = roleId;
            data.section = section;

            await apiRequest('/admin/permissions', {
                method: 'POST',
                body: data,
            });

            showToast('Permission created successfully!', 'success');
        }

        closePermissionModal();
        loadPermissions();
        // Reload user permissions to reflect any changes
        await loadUserPermissions();
        updateMenuVisibility();
    } catch (error) {
        showToast(error.message || 'Failed to save permission', 'error');
    } finally {
        hideLoading();
    }
}

let editingPermissionId = null;

async function editPermission(permissionId) {
    if (!hasPermission('permission', 'update')) {
        showToast('You do not have permission to update permissions', 'error');
        return;
    }
    
    if (!permissionId) {
        showToast('Permission ID is missing', 'error');
        return;
    }
    
    editingPermissionId = permissionId;
    
    try {
        showLoading();
        
        // Load permission data
        const response = await apiRequest(`/admin/permissions/${permissionId}`);
        const permission = response.data.permission;
        
        if (!permission) {
            showToast('Permission not found', 'error');
            return;
        }
        
        // Populate form
        // Handle role ID (could be id or _id)
        const roleId = permission.role?.id || permission.role?._id?.toString() || '';
        document.getElementById('permissionRole').value = roleId;
        document.getElementById('permissionSection').value = permission.section;
        document.getElementById('permissionIsActive').checked = permission.isActive !== false;
        
        // Set actions checkboxes
        document.querySelectorAll('input[name="actions"]').forEach(checkbox => {
            checkbox.checked = permission.actions.includes(checkbox.value);
        });
        
        // Update modal title
        const modalTitle = document.querySelector('#permissionModal .modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Permission';
        }
        
        // Update submit button text
        const submitBtn = document.querySelector('#permissionForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Update Permission';
        }
        
        // Disable role and section fields (they can't be changed)
        document.getElementById('permissionRole').disabled = true;
        document.getElementById('permissionSection').disabled = true;
        
        // Open modal
        document.getElementById('permissionModal').classList.add('active');
        
    } catch (error) {
        showToast(error.message || 'Failed to load permission', 'error');
    } finally {
        hideLoading();
    }
}

async function deletePermission(permissionId) {
    // Check permission
    if (!hasPermission('permission', 'delete')) {
        showToast('You do not have permission to delete permissions', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this permission?')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/permissions/${permissionId}`, {
            method: 'DELETE',
        });

        showToast('Permission deleted successfully!', 'success');
        loadPermissions();
        // Reload user permissions to reflect any changes
        await loadUserPermissions();
        updateMenuVisibility();
    } catch (error) {
        showToast(error.message || 'Failed to delete permission', 'error');
    } finally {
        hideLoading();
    }
}

// Roles Management
let editingRoleId = null;

async function loadRolesForManagement() {
    // Check permission first
    if (!hasPermission('role', 'view')) {
        showToast('You do not have permission to view roles', 'error');
        return;
    }

    try {
        showLoading();
        const response = await apiRequest(`/admin/roles?page=${currentRolesPage}&limit=10`);
        const roles = response.data.roles;
        const pagination = response.data.pagination;

        // Update pagination UI
        const pageInfo = document.getElementById('rolesPageInfo');
        const prevBtn = document.getElementById('prevRolesBtn');
        const nextBtn = document.getElementById('nextRolesBtn');

        if (pagination && pageInfo && prevBtn && nextBtn) {
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
            prevBtn.disabled = pagination.page === 1;
            nextBtn.disabled = !pagination.hasNextPage;
            currentRolesPage = pagination.page;
        }

        const tbody = document.getElementById('rolesTableBody');
        tbody.innerHTML = '';

        if (roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No roles found</td></tr>';
            return;
        }

        roles.forEach(role => {
            const row = document.createElement('tr');
            const visibleTo = role.visibleToRoles && role.visibleToRoles.length > 0 
                ? role.visibleToRoles.join(', ') 
                : 'Only Super Admin & Admin';
            
            // Handle both id and _id (lean() returns _id, toJSON() returns id)
            const roleId = role.id || role._id?.toString() || '';
            
            if (!roleId) {
                console.warn('Role missing ID:', role);
            }
            
            const canEdit = hasPermission('role', 'update');
            const canDelete = hasPermission('role', 'delete');
            const isDefaultRole = ['super_admin', 'admin', 'user', 'academy', 'student', 'guardian', 'employee', 'agent'].includes(role.name);
            
            const actionButtons = [];
            if (canEdit && roleId) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="editRole('${roleId}')">Edit</button>`);
            }
            if (canDelete && !isDefaultRole && roleId) {
                actionButtons.push(`<button class="btn btn-sm btn-danger" onclick="deleteRole('${roleId}')">Delete</button>`);
            } else if (isDefaultRole) {
                actionButtons.push(`<span class="text-muted" title="Default system role cannot be deleted">Protected</span>`);
            }
            const actionsHtml = actionButtons.length > 0 ? actionButtons.join(' ') : '<span class="text-muted">No actions</span>';

            row.innerHTML = `
                <td>${roleId || 'N/A'}</td>
                <td><strong>${role.name}</strong></td>
                <td>${role.description || 'No description'}</td>
                <td>${visibleTo}</td>
                <td class="action-buttons">${actionsHtml}</td>
            `;
            tbody.appendChild(row);
        });

        // Show/hide add button based on permission
        const addBtn = document.getElementById('addRoleBtn');
        if (addBtn) {
            addBtn.style.display = hasPermission('role', 'create') ? 'inline-flex' : 'none';
        }
    } catch (error) {
        showToast(error.message || 'Failed to load roles', 'error');
    } finally {
        hideLoading();
    }
}

function openRoleModal(roleId = null) {
    if (!hasPermission('role', 'create') && !roleId) {
        showToast('You do not have permission to create roles', 'error');
        return;
    }
    if (roleId && !hasPermission('role', 'update')) {
        showToast('You do not have permission to edit roles', 'error');
        return;
    }

    editingRoleId = roleId;
    const modal = document.getElementById('roleModal');
    const form = document.getElementById('roleForm');
    const title = document.getElementById('roleModalTitle');
    const nameGroup = document.getElementById('roleNameGroup');
    const nameInput = document.getElementById('roleName');

    if (roleId) {
        title.textContent = 'Edit Role';
        nameInput.disabled = true;
        nameGroup.style.display = 'block';
        // Load role data
        loadRoleForEdit(roleId);
    } else {
        title.textContent = 'Create New Role';
        form.reset();
        nameInput.disabled = false;
        nameGroup.style.display = 'block';
    }

    loadRolesForVisibleTo();
    modal.classList.add('active');
}

function closeRoleModal() {
    document.getElementById('roleModal').classList.remove('active');
    editingRoleId = null;
    document.getElementById('roleForm').reset();
}

async function loadRoleForEdit(roleId) {
    try {
        showLoading();
        const response = await apiRequest(`/admin/roles/${roleId}`);
        const role = response.data.role;

        document.getElementById('roleName').value = role.name;
        document.getElementById('roleDescription').value = role.description || '';
        
        // Set visibleToRoles
        const visibleToSelect = document.getElementById('roleVisibleTo');
        Array.from(visibleToSelect.options).forEach(option => {
            option.selected = role.visibleToRoles && role.visibleToRoles.includes(option.value);
        });
    } catch (error) {
        showToast(error.message || 'Failed to load role', 'error');
        closeRoleModal();
    } finally {
        hideLoading();
    }
}

async function loadRolesForVisibleTo() {
    try {
        const response = await apiRequest('/admin/roles');
        const roles = response.data.roles;
        
        const select = document.getElementById('roleVisibleTo');
        if (!select) return;
        
        select.innerHTML = '';
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.name;
            option.textContent = role.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load roles:', error);
    }
}

async function handleSaveRole(e) {
    e.preventDefault();
    try {
        showLoading();
        
        const visibleToSelect = document.getElementById('roleVisibleTo');
        const selectedVisibleTo = Array.from(visibleToSelect.selectedOptions).map(option => option.value);

        const data = {
            name: document.getElementById('roleName').value,
            description: document.getElementById('roleDescription').value || null,
            visibleToRoles: selectedVisibleTo.length > 0 ? selectedVisibleTo : null,
        };

        if (editingRoleId) {
            // Update role
            if (!hasPermission('role', 'update')) {
                showToast('You do not have permission to update roles', 'error');
                return;
            }
            // Remove name from update data
            delete data.name;
            await apiRequest(`/admin/roles/${editingRoleId}`, {
                method: 'PATCH',
                body: data,
            });
            showToast('Role updated successfully!', 'success');
        } else {
            // Create role
            if (!hasPermission('role', 'create')) {
                showToast('You do not have permission to create roles', 'error');
                return;
            }
            await apiRequest('/admin/roles', {
                method: 'POST',
                body: data,
            });
            showToast('Role created successfully!', 'success');
        }

        closeRoleModal();
        loadRolesForManagement();
    } catch (error) {
        showToast(error.message || 'Failed to save role', 'error');
    } finally {
        hideLoading();
    }
}

function editRole(roleId) {
    if (!hasPermission('role', 'update')) {
        showToast('You do not have permission to edit roles', 'error');
        return;
    }
    openRoleModal(roleId);
}

async function deleteRole(roleId) {
    if (!hasPermission('role', 'delete')) {
        showToast('You do not have permission to delete roles', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this role? This action cannot be undone. Make sure no users are assigned to this role.')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/roles/${roleId}`, {
            method: 'DELETE',
        });

        showToast('Role deleted successfully!', 'success');
        loadRolesForManagement();
    } catch (error) {
        showToast(error.message || 'Failed to delete role', 'error');
    } finally {
        hideLoading();
    }
}

// Auto-refresh token before expiration (every 14 minutes)
setInterval(() => {
    if (accessToken && refreshToken) {
        handleRefreshToken();
    }
}, 14 * 60 * 1000); // 14 minutes

// Handle API errors globally
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('401') || event.reason?.message?.includes('Unauthorized')) {
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => handleLogout(), 2000);
    }
});

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Banner Management Functions
async function loadBanners() {
    if (!hasPermission('banner', 'view')) {
        showToast('You do not have permission to view banners', 'error');
        return;
    }

    try {
        showLoading();
        const position = document.getElementById('bannerPositionFilter')?.value || '';
        const status = document.getElementById('bannerStatusFilter')?.value || '';
        const search = document.getElementById('bannerSearchInput')?.value || '';
        
        let url = `/admin/banners?page=${currentBannersPage}&limit=10`;
        if (position) url += `&position=${position}`;
        if (status) url += `&status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const response = await apiRequest(url);
        const banners = response.data.banners;
        const pagination = response.data.pagination;

        const tbody = document.getElementById('bannersTableBody');
        tbody.innerHTML = '';

        if (banners.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No banners found</td></tr>';
            return;
        }

        banners.forEach(banner => {
            const row = document.createElement('tr');
            const statusBadge = getStatusBadge(banner.status);
            const imageUrl = banner.imageUrl || banner.mobileImageUrl || '';
            const imagePreview = imageUrl ? 
                `<img src="${imageUrl}" alt="${banner.title}" style="width: 80px; height: 50px; object-fit: cover; border-radius: 4px;">` : 
                '<span style="color: var(--text-secondary);">No image</span>';

            row.innerHTML = `
                <td>${imagePreview}</td>
                <td><strong>${banner.title || 'Untitled'}</strong></td>
                <td><span class="badge badge-info">${formatPosition(banner.position)}</span></td>
                <td>${banner.priority || 0}</td>
                <td>${statusBadge}</td>
                <td>${banner.viewCount || 0}</td>
                <td>${banner.clickCount || 0}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="editBanner('${banner.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBanner('${banner.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        const pageInfo = document.getElementById('bannersPageInfo');
        const prevBtn = document.getElementById('prevBannersBtn');
        const nextBtn = document.getElementById('nextBannersBtn');

        if (pagination && pageInfo && prevBtn && nextBtn) {
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
            prevBtn.disabled = pagination.page === 1;
            nextBtn.disabled = !pagination.hasNextPage;
            currentBannersPage = pagination.page;
        }
    } catch (error) {
        showToast(error.message || 'Failed to load banners', 'error');
    } finally {
        hideLoading();
    }
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="badge badge-success">Active</span>',
        'inactive': '<span class="badge badge-danger">Inactive</span>',
        'expired': '<span class="badge badge-secondary">Expired</span>',
        'draft': '<span class="badge badge-info">Draft</span>',
    };
    return badges[status] || '<span class="badge">Unknown</span>';
}

function formatPosition(position) {
    return position.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function openBannerModal(bannerId = null) {
    if (!hasPermission('banner', bannerId ? 'update' : 'create')) {
        showToast(`You do not have permission to ${bannerId ? 'edit' : 'create'} banners`, 'error');
        return;
    }

    editingBannerId = bannerId;
    const modal = document.getElementById('bannerModal');
    if (!modal) {
        console.error('Banner modal not found in DOM');
        showToast('Banner modal not found. Please refresh the page.', 'error');
        return;
    }

    const form = document.getElementById('bannerForm');
    const title = document.getElementById('bannerModalTitle');
    
    if (title) {
        title.textContent = bannerId ? 'Edit Banner' : 'Create New Banner';
    }
    
    if (form) {
        form.reset();
    }
    
    // Reset image previews
    const desktopPreview = document.getElementById('desktopImagePreview');
    const mobilePreview = document.getElementById('mobileImagePreview');
    const desktopImageUrl = document.getElementById('bannerImageUrl');
    const mobileImageUrl = document.getElementById('bannerMobileImageUrl');
    
    if (desktopPreview) desktopPreview.style.display = 'none';
    if (mobilePreview) mobilePreview.style.display = 'none';
    if (desktopImageUrl) desktopImageUrl.value = '';
    if (mobileImageUrl) mobileImageUrl.value = '';

    if (bannerId) {
        loadBannerData(bannerId);
    }

    modal.classList.add('active');
}

function closeBannerModal() {
    document.getElementById('bannerModal').classList.remove('active');
    editingBannerId = null;
}

async function loadBannerData(bannerId) {
    try {
        showLoading();
        const response = await apiRequest(`/admin/banners/${bannerId}`);
        const banner = response.data.banner;

        document.getElementById('bannerTitle').value = banner.title || '';
        document.getElementById('bannerDescription').value = banner.description || '';
        document.getElementById('bannerLinkUrl').value = banner.linkUrl || '';
        document.getElementById('bannerLinkType').value = banner.linkType || 'internal';
        document.getElementById('bannerPosition').value = banner.position || '';
        document.getElementById('bannerPriority').value = banner.priority || 0;
        document.getElementById('bannerStatus').value = banner.status || 'draft';
        document.getElementById('bannerTargetAudience').value = banner.targetAudience || 'all';
        document.getElementById('bannerIsActive').checked = banner.isActive !== false;

        // Set image URLs
        if (banner.imageUrl) {
            document.getElementById('bannerImageUrl').value = banner.imageUrl;
            document.getElementById('desktopImagePreviewImg').src = banner.imageUrl;
            document.getElementById('desktopImageUrl').textContent = banner.imageUrl;
            document.getElementById('desktopImagePreview').style.display = 'block';
        }
        if (banner.mobileImageUrl) {
            document.getElementById('bannerMobileImageUrl').value = banner.mobileImageUrl;
            document.getElementById('mobileImagePreviewImg').src = banner.mobileImageUrl;
            document.getElementById('mobileImageUrl').textContent = banner.mobileImageUrl;
            document.getElementById('mobileImagePreview').style.display = 'block';
        }
    } catch (error) {
        showToast(error.message || 'Failed to load banner data', 'error');
    } finally {
        hideLoading();
    }
}

async function uploadBannerImage(type) {
    const fileInput = type === 'desktop' ? 
        document.getElementById('bannerDesktopImage') : 
        document.getElementById('bannerMobileImage');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select an image file', 'error');
        return;
    }

    const file = fileInput.files[0];
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Invalid file type. Allowed: JPEG, PNG, WebP, GIF', 'error');
        return;
    }

    try {
        showLoading();
        const formData = new FormData();
        formData.append('image', file);

        const endpoint = type === 'desktop' ? 
            `/admin/banners/upload-image?type=desktop` : 
            `/admin/banners/upload-image?type=mobile`;
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload image');
        }

        const data = await response.json();
        const imageUrl = data.data.imageUrl;

        if (type === 'desktop') {
            document.getElementById('bannerImageUrl').value = imageUrl;
            document.getElementById('desktopImagePreviewImg').src = imageUrl;
            document.getElementById('desktopImageUrl').textContent = imageUrl;
            document.getElementById('desktopImagePreview').style.display = 'block';
        } else {
            document.getElementById('bannerMobileImageUrl').value = imageUrl;
            document.getElementById('mobileImagePreviewImg').src = imageUrl;
            document.getElementById('mobileImageUrl').textContent = imageUrl;
            document.getElementById('mobileImagePreview').style.display = 'block';
        }

        showToast('Image uploaded successfully!', 'success');
        fileInput.value = ''; // Clear file input
    } catch (error) {
        showToast(error.message || 'Failed to upload image', 'error');
    } finally {
        hideLoading();
    }
}

async function handleSaveBanner(e) {
    e.preventDefault();

    const action = editingBannerId ? 'update' : 'create';
    if (!hasPermission('banner', action)) {
        showToast(`You do not have permission to ${action} banners`, 'error');
        return;
    }

    const imageUrl = document.getElementById('bannerImageUrl').value;
    if (!imageUrl) {
        showToast('Please upload a desktop image', 'error');
        return;
    }

    const status = document.getElementById('bannerStatus').value;

    try {
        showLoading();
        const bannerData = {
            title: document.getElementById('bannerTitle').value,
            description: document.getElementById('bannerDescription').value,
            imageUrl: imageUrl,
            mobileImageUrl: document.getElementById('bannerMobileImageUrl').value || null,
            linkUrl: document.getElementById('bannerLinkUrl').value || null,
            linkType: document.getElementById('bannerLinkType').value || 'internal',
            position: document.getElementById('bannerPosition').value,
            priority: parseInt(document.getElementById('bannerPriority').value) || 0,
            status: status,
            targetAudience: document.getElementById('bannerTargetAudience').value,
            isActive: document.getElementById('bannerIsActive').checked,
        };

        if (editingBannerId) {
            await apiRequest(`/admin/banners/${editingBannerId}`, {
                method: 'PATCH',
                body: JSON.stringify(bannerData)
            });
            showToast('Banner updated successfully!', 'success');
        } else {
            await apiRequest('/admin/banners', {
                method: 'POST',
                body: JSON.stringify(bannerData)
            });
            showToast('Banner created successfully!', 'success');
        }

        closeBannerModal();
        loadBanners();
    } catch (error) {
        showToast(error.message || `Failed to ${action} banner`, 'error');
    } finally {
        hideLoading();
    }
}

function editBanner(bannerId) {
    if (!hasPermission('banner', 'update')) {
        showToast('You do not have permission to edit banners', 'error');
        return;
    }
    openBannerModal(bannerId);
}

async function deleteBanner(bannerId) {
    if (!hasPermission('banner', 'delete')) {
        showToast('You do not have permission to delete banners', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this banner? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/banners/${bannerId}`, {
            method: 'DELETE'
        });

        showToast('Banner deleted successfully!', 'success');
        loadBanners();
    } catch (error) {
        showToast(error.message || 'Failed to delete banner', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== HIGHLIGHT MANAGEMENT ====================

async function loadHighlights() {
    if (!hasPermission('highlight', 'view')) {
        showToast('You do not have permission to view highlights', 'error');
        return;
    }

    try {
        showLoading();
        const status = document.getElementById('highlightStatusFilter')?.value || '';
        const videoProcessingStatus = document.getElementById('highlightVideoProcessingStatusFilter')?.value || '';
        const search = document.getElementById('highlightSearchInput')?.value || '';
        
        let url = `/admin/highlights?page=${currentHighlightsPage}&limit=10`;
        if (status) url += `&status=${status}`;
        if (videoProcessingStatus) url += `&videoProcessingStatus=${videoProcessingStatus}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const response = await apiRequest(url);
        const highlights = response.data.highlights;
        const pagination = response.data.pagination;

        const tbody = document.getElementById('highlightsTableBody');
        tbody.innerHTML = '';

        if (highlights.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No highlights found</td></tr>';
            return;
        }

        highlights.forEach(highlight => {
            const row = document.createElement('tr');
            const thumbnail = highlight.thumbnailUrl || 'https://via.placeholder.com/100x60?text=No+Thumbnail';
            const statusClass = {
                'published': 'status-success',
                'archived': 'status-info',
                'blocked': 'status-danger',
                'deleted': 'status-muted'
            }[highlight.status] || 'status-muted';
            
            const videoProcessingStatusClass = {
                'not_started': 'status-muted',
                'processing': 'status-warning',
                'completed': 'status-success',
                'failed': 'status-danger'
            }[highlight.videoProcessingStatus] || 'status-muted';
            
            const canEdit = hasPermission('highlight', 'update');
            const canDelete = hasPermission('highlight', 'delete');
            
            const actionButtons = [];
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="editHighlight('${highlight.id}')">Edit</button>`);
            }
            if (canDelete && highlight.status !== 'deleted') {
                actionButtons.push(`<button class="btn btn-sm btn-danger" onclick="deleteHighlight('${highlight.id}')">Delete</button>`);
            }
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="updateHighlightStatus('${highlight.id}', '${highlight.status}')">Change Status</button>`);
            }
            if (canEdit && highlight.videoUrl) {
                actionButtons.push(`<button class="btn btn-sm btn-primary" onclick="reprocessHighlightVideo('${highlight.id}')" title="Reprocess video (works for both processed and unprocessed videos)">Reprocess Video</button>`);
            }
            const actionsHtml = actionButtons.length > 0 ? actionButtons.join(' ') : '<span class="text-muted">No actions</span>';

            const userName = highlight.userId?.firstName && highlight.userId?.lastName 
                ? `${highlight.userId.firstName} ${highlight.userId.lastName}`
                : highlight.userId?.email || 'N/A';

            row.innerHTML = `
                <td><img src="${thumbnail}" alt="Thumbnail" style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px;"></td>
                <td><strong>${highlight.title}</strong><br><small style="color: var(--text-secondary);">${highlight.description || 'No description'}</small></td>
                <td>${userName}</td>
                <td><span class="status-badge ${statusClass}">${highlight.status}</span></td>
                <td><span class="status-badge ${videoProcessingStatusClass}">${highlight.videoProcessingStatus || 'not_started'}</span></td>
                <td>${highlight.viewsCount || 0}</td>
                <td>${highlight.likesCount || 0}</td>
                <td>${new Date(highlight.createdAt).toLocaleDateString()}</td>
                <td class="action-buttons">${actionsHtml}</td>
            `;
            tbody.appendChild(row);
        });

        const pageInfo = document.getElementById('highlightsPageInfo');
        const prevBtn = document.getElementById('prevHighlightsBtn');
        const nextBtn = document.getElementById('nextHighlightsBtn');

        if (pagination && pageInfo && prevBtn && nextBtn) {
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
            prevBtn.disabled = pagination.page === 1;
            nextBtn.disabled = !pagination.hasNextPage;
            currentHighlightsPage = pagination.page;
        }
    } catch (error) {
        showToast(error.message || 'Failed to load highlights', 'error');
    } finally {
        hideLoading();
    }
}

function openHighlightModal(highlightId = null) {
    if (!hasPermission('highlight', 'create') && !highlightId) {
        showToast('You do not have permission to create highlights', 'error');
        return;
    }
    if (highlightId && !hasPermission('highlight', 'update')) {
        showToast('You do not have permission to edit highlights', 'error');
        return;
    }

    editingHighlightId = highlightId;
    const modal = document.getElementById('highlightModal');
    const form = document.getElementById('highlightForm');
    const title = document.getElementById('highlightModalTitle');

    if (highlightId) {
        title.textContent = 'Edit Highlight';
        loadHighlightForEdit(highlightId);
    } else {
        title.textContent = 'Create New Highlight';
        form.reset();
        document.getElementById('highlightVideoUrl').value = '';
        document.getElementById('highlightThumbnailUrl').value = '';
        document.getElementById('videoPreview').style.display = 'none';
        document.getElementById('thumbnailPreview').style.display = 'none';
    }

    modal.classList.add('active');
}

function closeHighlightModal() {
    document.getElementById('highlightModal').classList.remove('active');
    editingHighlightId = null;
    document.getElementById('highlightForm').reset();
    document.getElementById('highlightVideoUrl').value = '';
    document.getElementById('highlightThumbnailUrl').value = '';
    document.getElementById('videoPreview').style.display = 'none';
    document.getElementById('thumbnailPreview').style.display = 'none';
}

async function loadHighlightForEdit(highlightId) {
    try {
        showLoading();
        const response = await apiRequest(`/admin/highlights/${highlightId}`);
        const highlight = response.data.highlight;

        document.getElementById('highlightTitle').value = highlight.title || '';
        document.getElementById('highlightDescription').value = highlight.description || '';
        // Use ObjectId (_id) for userId
        document.getElementById('highlightUserId').value = highlight.userId?._id?.toString() || highlight.userId?.toString() || '';
        document.getElementById('highlightCoachingCenterId').value = highlight.coachingCenterId?._id?.toString() || highlight.coachingCenterId?.toString() || '';
        document.getElementById('highlightDuration').value = highlight.duration || 0;
        document.getElementById('highlightStatus').value = highlight.status || 'published';
        
        if (highlight.videoUrl) {
            document.getElementById('highlightVideoUrl').value = highlight.videoUrl;
            const videoPreview = document.getElementById('videoPreview');
            const videoPlayer = document.getElementById('videoPreviewPlayer');
            videoPlayer.src = highlight.videoUrl;
            videoPreview.style.display = 'block';
            document.getElementById('videoUrl').textContent = highlight.videoUrl;
        }
        
        if (highlight.thumbnailUrl) {
            document.getElementById('highlightThumbnailUrl').value = highlight.thumbnailUrl;
            const thumbnailPreview = document.getElementById('thumbnailPreview');
            document.getElementById('thumbnailPreviewImg').src = highlight.thumbnailUrl;
            thumbnailPreview.style.display = 'block';
            document.getElementById('thumbnailUrl').textContent = highlight.thumbnailUrl;
        }
    } catch (error) {
        showToast(error.message || 'Failed to load highlight', 'error');
        closeHighlightModal();
    } finally {
        hideLoading();
    }
}

async function loadUsersForHighlight() {
    try {
        const response = await apiRequest('/admin/users?limit=1000');
        const users = response.data.users;
        
        const select = document.getElementById('highlightUserId');
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select User</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            // Use ObjectId (_id) instead of custom id
            option.value = user._id || user.id;
            const name = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName} (${user.email})`
                : user.email;
            option.textContent = name;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function loadCoachingCentersForHighlight() {
    try {
        const response = await apiRequest('/admin/coaching-centers?limit=1000');
        const centers = response.data.coachingCenters || response.data.centers || [];
        
        const select = document.getElementById('highlightCoachingCenterId');
        if (!select) return;
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">None</option>';
        centers.forEach(center => {
            const option = document.createElement('option');
            // Use ObjectId (_id) instead of custom id
            option.value = center._id || center.id;
            option.textContent = center.center_name || center.name || center.id;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Failed to load coaching centers:', error);
    }
}

async function uploadHighlightVideo() {
    const fileInput = document.getElementById('highlightVideo');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select a video file', 'error');
        return;
    }

    const file = fileInput.files[0];
    
    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
        showToast('File size must be less than 100MB', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Invalid file type. Allowed: MP4, MPEG, MOV, AVI, WebM, MKV', 'error');
        return;
    }

    try {
        showLoading();
        const formData = new FormData();
        formData.append('video', file);

        const url = `${API_BASE_URL}/admin/highlights/upload-video`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        const videoUrl = data.data.videoUrl;
        document.getElementById('highlightVideoUrl').value = videoUrl;
        
        const videoPreview = document.getElementById('videoPreview');
        const videoPlayer = document.getElementById('videoPreviewPlayer');
        videoPlayer.src = videoUrl;
        videoPreview.style.display = 'block';
        document.getElementById('videoUrl').textContent = videoUrl;

        showToast('Video uploaded successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to upload video', 'error');
    } finally {
        hideLoading();
    }
}

async function uploadHighlightThumbnail() {
    const fileInput = document.getElementById('highlightThumbnail');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select an image file', 'error');
        return;
    }

    const file = fileInput.files[0];
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Invalid file type. Allowed: JPEG, PNG, WebP', 'error');
        return;
    }

    try {
        showLoading();
        const formData = new FormData();
        formData.append('thumbnail', file);

        const url = `${API_BASE_URL}/admin/highlights/upload-thumbnail`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        const thumbnailUrl = data.data.thumbnailUrl;
        document.getElementById('highlightThumbnailUrl').value = thumbnailUrl;
        
        const thumbnailPreview = document.getElementById('thumbnailPreview');
        document.getElementById('thumbnailPreviewImg').src = thumbnailUrl;
        thumbnailPreview.style.display = 'block';
        document.getElementById('thumbnailUrl').textContent = thumbnailUrl;

        showToast('Thumbnail uploaded successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to upload thumbnail', 'error');
    } finally {
        hideLoading();
    }
}

async function handleSaveHighlight(e) {
    e.preventDefault();

    const action = editingHighlightId ? 'update' : 'create';
    if (!hasPermission('highlight', action)) {
        showToast(`You do not have permission to ${action} highlights`, 'error');
        return;
    }

    const videoUrl = document.getElementById('highlightVideoUrl').value;
    if (!videoUrl && !editingHighlightId) {
        showToast('Please upload a video', 'error');
        return;
    }

    try {
        showLoading();
        const highlightData = {
            title: document.getElementById('highlightTitle').value,
            description: document.getElementById('highlightDescription').value || null,
            userId: document.getElementById('highlightUserId').value,
            coachingCenterId: document.getElementById('highlightCoachingCenterId').value || null,
            duration: parseFloat(document.getElementById('highlightDuration').value) || 0,
            status: document.getElementById('highlightStatus').value,
        };

        if (videoUrl) {
            highlightData.videoUrl = videoUrl;
        }
        
        const thumbnailUrl = document.getElementById('highlightThumbnailUrl').value;
        if (thumbnailUrl) {
            highlightData.thumbnailUrl = thumbnailUrl;
        }

        if (editingHighlightId) {
            await apiRequest(`/admin/highlights/${editingHighlightId}`, {
                method: 'PATCH',
                body: highlightData
            });
            showToast('Highlight updated successfully!', 'success');
        } else {
            await apiRequest('/admin/highlights', {
                method: 'POST',
                body: highlightData
            });
            showToast('Highlight created successfully! Video processing will start automatically.', 'success');
        }

        closeHighlightModal();
        loadHighlights();
    } catch (error) {
        showToast(error.message || `Failed to ${action} highlight`, 'error');
    } finally {
        hideLoading();
    }
}

function editHighlight(highlightId) {
    if (!hasPermission('highlight', 'update')) {
        showToast('You do not have permission to edit highlights', 'error');
        return;
    }
    openHighlightModal(highlightId);
}

async function deleteHighlight(highlightId) {
    if (!hasPermission('highlight', 'delete')) {
        showToast('You do not have permission to delete highlights', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this highlight? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/highlights/${highlightId}`, {
            method: 'DELETE'
        });

        showToast('Highlight deleted successfully!', 'success');
        loadHighlights();
    } catch (error) {
        showToast(error.message || 'Failed to delete highlight', 'error');
    } finally {
        hideLoading();
    }
}

async function updateHighlightStatus(highlightId, currentStatus) {
    if (!hasPermission('highlight', 'update')) {
        showToast('You do not have permission to update highlight status', 'error');
        return;
    }

    const statuses = ['published', 'archived', 'blocked'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    const newStatus = prompt(`Current status: ${currentStatus}\nEnter new status (published, archived, blocked):`, nextStatus);
    
    if (!newStatus || !statuses.includes(newStatus.toLowerCase())) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/highlights/${highlightId}/status`, {
            method: 'PATCH',
            body: { status: newStatus.toLowerCase() }
        });

        showToast('Highlight status updated successfully!', 'success');
        loadHighlights();
    } catch (error) {
        showToast(error.message || 'Failed to update highlight status', 'error');
    } finally {
        hideLoading();
    }
}

async function reprocessHighlightVideo(highlightId) {
    if (!hasPermission('highlight', 'update')) {
        showToast('You do not have permission to reprocess videos', 'error');
        return;
    }

    if (!confirm('Are you sure you want to reprocess this video? This will process the video again in the background, regardless of its current processing status.')) {
        return;
    }

    try {
        showLoading();
        const response = await apiRequest(`/admin/highlights/${highlightId}/process-video`, {
            method: 'POST'
        });

        showToast(response.message || 'Video processing job has been queued. The video will be reprocessed in the background.', 'success');
        loadHighlights();
    } catch (error) {
        showToast(error.message || 'Failed to reprocess video', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== QUEUE MANAGEMENT ====================

let currentQueuesPage = 1;
let currentLogsPage = 1;
let currentLogType = 'application';

async function loadQueues() {
    console.log('loadQueues() called');
    if (!hasPermission('settings', 'view')) {
        console.log('Permission check failed in loadQueues()');
        showToast('You do not have permission to view queues', 'error');
        return;
    }

    try {
        console.log('Making API request to /admin/queues');
        showLoading();
        const response = await apiRequest('/admin/queues');
        console.log('API response received:', response);
        const queues = response.data.queues || [];

        const container = document.getElementById('queuesContainer');
        container.innerHTML = '';

        if (queues.length === 0) {
            container.innerHTML = '<div class="text-center">No queues found</div>';
            return;
        }

        queues.forEach(queue => {
            const queueCard = document.createElement('div');
            queueCard.className = 'card';
            queueCard.style.marginBottom = '20px';

            const pausedClass = queue.paused ? 'status-danger' : 'status-success';
            const canUpdate = hasPermission('settings', 'update');
            const canDelete = hasPermission('settings', 'delete');

            queueCard.innerHTML = `
                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0;">${queue.name}</h3>
                        <span class="status-badge ${pausedClass}">${queue.paused ? 'Paused' : 'Active'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div>
                            <strong>Active:</strong> ${queue.active || 0}
                        </div>
                        <div>
                            <strong>Waiting:</strong> ${queue.waiting || 0}
                        </div>
                        <div>
                            <strong>Completed:</strong> ${queue.completed || 0}
                        </div>
                        <div>
                            <strong>Failed:</strong> ${queue.failed || 0}
                        </div>
                        <div>
                            <strong>Delayed:</strong> ${queue.delayed || 0}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${canUpdate ? `
                            <button class="btn btn-sm btn-outline" onclick="viewQueueJobs('${queue.name}')">View Jobs</button>
                            ${queue.paused ? 
                                `<button class="btn btn-sm btn-primary" onclick="resumeQueue('${queue.name}')">Resume</button>` :
                                `<button class="btn btn-sm btn-warning" onclick="pauseQueue('${queue.name}')">Pause</button>`
                            }
                        ` : ''}
                        ${canDelete ? `
                            <button class="btn btn-sm btn-danger" onclick="cleanQueue('${queue.name}')">Clean</button>
                        ` : ''}
                    </div>
                </div>
            `;
            container.appendChild(queueCard);
        });
    } catch (error) {
        showToast(error.message || 'Failed to load queues', 'error');
    } finally {
        hideLoading();
    }
}

async function viewQueueJobs(queueName) {
    if (!hasPermission('settings', 'view')) {
        showToast('You do not have permission to view queue jobs', 'error');
        return;
    }

    const status = prompt('Enter job status filter (active, waiting, completed, failed, delayed, all):', 'all');
    if (!status) return;

    try {
        showLoading();
        const response = await apiRequest(`/admin/queues/${queueName}/jobs?status=${status}&page=1&limit=50`);
        const jobs = response.data.jobs || [];

        let jobsHtml = `<h3>Jobs in ${queueName} (${status})</h3><table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>State</th><th>Progress</th><th>Actions</th></tr></thead><tbody>`;
        
        if (jobs.length === 0) {
            jobsHtml += '<tr><td colspan="5" class="text-center">No jobs found</td></tr>';
        } else {
            jobs.forEach(job => {
                const canUpdate = hasPermission('settings', 'update');
                const canDelete = hasPermission('settings', 'delete');
                const actions = [];
                
                if (canUpdate && job.state === 'failed') {
                    actions.push(`<button class="btn btn-sm btn-primary" onclick="retryJob('${queueName}', '${job.id}')">Retry</button>`);
                }
                if (canDelete) {
                    actions.push(`<button class="btn btn-sm btn-danger" onclick="removeJob('${queueName}', '${job.id}')">Remove</button>`);
                }

                jobsHtml += `
                    <tr>
                        <td>${job.id}</td>
                        <td>${job.name || 'N/A'}</td>
                        <td><span class="status-badge">${job.state || 'unknown'}</span></td>
                        <td>${typeof job.progress === 'object' ? JSON.stringify(job.progress) : job.progress || 'N/A'}</td>
                        <td>${actions.join(' ') || 'No actions'}</td>
                    </tr>
                `;
            });
        }
        jobsHtml += '</tbody></table>';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>Queue Jobs: ${queueName}</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div style="padding: 20px;">
                    ${jobsHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        showToast(error.message || 'Failed to load queue jobs', 'error');
    } finally {
        hideLoading();
    }
}

async function pauseQueue(queueName) {
    if (!hasPermission('settings', 'update')) {
        showToast('You do not have permission to pause queues', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to pause the queue "${queueName}"?`)) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/queues/${queueName}/pause`, { method: 'POST' });
        showToast('Queue paused successfully', 'success');
        loadQueues();
    } catch (error) {
        showToast(error.message || 'Failed to pause queue', 'error');
    } finally {
        hideLoading();
    }
}

async function resumeQueue(queueName) {
    if (!hasPermission('settings', 'update')) {
        showToast('You do not have permission to resume queues', 'error');
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/queues/${queueName}/resume`, { method: 'POST' });
        showToast('Queue resumed successfully', 'success');
        loadQueues();
    } catch (error) {
        showToast(error.message || 'Failed to resume queue', 'error');
    } finally {
        hideLoading();
    }
}

async function retryJob(queueName, jobId) {
    if (!hasPermission('settings', 'update')) {
        showToast('You do not have permission to retry jobs', 'error');
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/queues/${queueName}/jobs/${jobId}/retry`, { method: 'POST' });
        showToast('Job retried successfully', 'success');
        viewQueueJobs(queueName);
    } catch (error) {
        showToast(error.message || 'Failed to retry job', 'error');
    } finally {
        hideLoading();
    }
}

async function removeJob(queueName, jobId) {
    if (!hasPermission('settings', 'delete')) {
        showToast('You do not have permission to remove jobs', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to remove job ${jobId}?`)) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/queues/${queueName}/jobs/${jobId}`, { method: 'DELETE' });
        showToast('Job removed successfully', 'success');
        viewQueueJobs(queueName);
    } catch (error) {
        showToast(error.message || 'Failed to remove job', 'error');
    } finally {
        hideLoading();
    }
}

async function cleanQueue(queueName) {
    if (!hasPermission('settings', 'delete')) {
        showToast('You do not have permission to clean queues', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to clean the queue "${queueName}"? This will remove completed and failed jobs.`)) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/queues/${queueName}/clean?grace=1000&limit=1000`, { method: 'POST' });
        showToast('Queue cleaned successfully', 'success');
        loadQueues();
    } catch (error) {
        showToast(error.message || 'Failed to clean queue', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== LOG VIEWER ====================

async function loadLogs() {
    console.log('loadLogs() called');
    if (!hasPermission('settings', 'view')) {
        console.log('Permission check failed in loadLogs()');
        showToast('You do not have permission to view logs', 'error');
        return;
    }

    try {
        showLoading();
        const logType = document.getElementById('logTypeFilter')?.value || 'application';
        const level = document.getElementById('logLevelFilter')?.value || '';
        const search = document.getElementById('logSearchInput')?.value || '';

        let url = `/admin/queues/logs/${logType}?page=${currentLogsPage}&limit=100`;
        if (level) url += `&level=${level}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        console.log('Making API request to:', url);
        const response = await apiRequest(url);
        console.log('API response received:', response);
        const logs = response.data.logs || [];
        const pagination = response.data.pagination || {};

        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No logs found</td></tr>';
            return;
        }

        logs.forEach(log => {
            const levelClass = {
                'debug': 'status-muted',
                'info': 'status-info',
                'warn': 'status-warning',
                'error': 'status-danger'
            }[log.level] || 'status-muted';

            const details = typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data || '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td><span class="status-badge ${levelClass}">${log.level || 'N/A'}</span></td>
                <td style="max-width: 400px; word-break: break-word;">${log.message || 'N/A'}</td>
                <td style="max-width: 500px; word-break: break-word; font-size: 12px;">
                    ${details ? `<pre style="margin: 0; white-space: pre-wrap;">${details}</pre>` : 'N/A'}
                </td>
            `;
            tbody.appendChild(row);
        });

        const pageInfo = document.getElementById('logsPageInfo');
        const prevBtn = document.getElementById('prevLogsBtn');
        const nextBtn = document.getElementById('nextLogsBtn');

        if (pagination && pageInfo && prevBtn && nextBtn) {
            pageInfo.textContent = `Page ${pagination.page || 1} of ${pagination.totalPages || 1}`;
            prevBtn.disabled = (pagination.page || 1) === 1;
            nextBtn.disabled = !pagination.hasNextPage;
            currentLogsPage = pagination.page || 1;
        }
    } catch (error) {
        showToast(error.message || 'Failed to load logs', 'error');
    } finally {
        hideLoading();
    }
}
// ==================== REEL MANAGEMENT ====================

async function loadReels() {
    if (!hasPermission('reel', 'view')) {
        showToast('You do not have permission to view reels', 'error');
        return;
    }

    try {
        showLoading();
        const status = document.getElementById('reelStatusFilter')?.value || '';
        const videoProcessedStatus = document.getElementById('reelVideoProcessedStatusFilter')?.value || '';
        const search = document.getElementById('reelSearchInput')?.value || '';
        
        let url = `/admin/reels?page=${currentReelsPage}&limit=10`;
        if (status) url += `&status=${status}`;
        if (videoProcessedStatus) url += `&videoProcessedStatus=${videoProcessedStatus}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const response = await apiRequest(url);
        const reels = response.data.reels;
        const pagination = response.data.pagination;

        const tbody = document.getElementById('reelsTableBody');
        tbody.innerHTML = '';

        if (reels.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No reels found</td></tr>';
            return;
        }

        reels.forEach(reel => {
            const row = document.createElement('tr');
            const thumbnail = reel.thumbnailPath || 'https://via.placeholder.com/100x60?text=No+Thumbnail';
            const statusClass = {
                'approved': 'status-success',
                'rejected': 'status-danger',
                'blocked': 'status-danger',
                'pending': 'status-warning'
            }[reel.status] || 'status-muted';

            const videoProcessingStatusClass = {
                'proccesing': 'status-warning',
                'failed': 'status-danger',
                'done': 'status-success',
                '': 'status-muted'
            }[reel.videoProcessedStatus] || 'status-muted';
            
            const canEdit = hasPermission('reel', 'update');
            const canDelete = hasPermission('reel', 'delete');
            
            const actionButtons = [];
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="editReel('${reel.id}')">Edit</button>`);
            }
            if (canDelete && reel.status !== 'deleted') {
                actionButtons.push(`<button class="btn btn-sm btn-danger" onclick="deleteReel('${reel.id}')">Delete</button>`);
            }
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-sm btn-outline" onclick="updateReelStatus('${reel.id}', '${reel.status}')">Change Status</button>`);
            }
            if (canEdit && reel.originalPath) {
                actionButtons.push(`<button class="btn btn-sm btn-primary" onclick="reprocessReelVideo('${reel.id}')" title="Reprocess video (works for both processed and unprocessed videos)">Reprocess Video</button>`);
            }
            const actionsHtml = actionButtons.length > 0 ? actionButtons.join(' ') : '<span class="text-muted">No actions</span>';

            const userName = reel.userId?.firstName && reel.userId?.lastName 
                ? `${reel.userId.firstName} ${reel.userId.lastName}`
                : reel.userId?.email || 'N/A';

            row.innerHTML = `
                <td><img src="${thumbnail}" alt="Thumbnail" style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px;"></td>
                <td><strong>${reel.title}</strong><br><small style="color: var(--text-secondary);">${reel.description || 'No description'}</small></td>
                <td>${userName}</td>
                <td><span class="status-badge ${statusClass}">${reel.status}</span></td>
                <td><span class="status-badge ${videoProcessingStatusClass}">${reel.videoProcessedStatus || 'empty'}</span></td>
                <td>${reel.viewsCount || 0}</td>
                <td>${reel.likesCount || 0}</td>
                <td>${new Date(reel.createdAt).toLocaleDateString()}</td>
                <td class="action-buttons">${actionsHtml}</td>
            `;
            tbody.appendChild(row);
        });

        const pageInfo = document.getElementById('reelsPageInfo');
        const prevBtn = document.getElementById('prevReelsBtn');
        const nextBtn = document.getElementById('nextReelsBtn');

        if (pagination && pageInfo && prevBtn && nextBtn) {
            pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
            prevBtn.disabled = pagination.page === 1;
            nextBtn.disabled = !pagination.hasNextPage;
            currentReelsPage = pagination.page;
        }
    } catch (error) {
        showToast(error.message || 'Failed to load reels', 'error');
    } finally {
        hideLoading();
    }
}

function openReelModal(reelId = null) {
    if (!hasPermission('reel', 'create') && !reelId) {
        showToast('You do not have permission to create reels', 'error');
        return;
    }
    if (reelId && !hasPermission('reel', 'update')) {
        showToast('You do not have permission to edit reels', 'error');
        return;
    }

    editingReelId = reelId;
    const modal = document.getElementById('reelModal');
    const form = document.getElementById('reelForm');
    const title = document.getElementById('reelModalTitle');
    
    if (!modal || !form || !title) {
        console.error('Reel modal elements not found');
        showToast('Error: Modal elements not found', 'error');
        return;
    }
    
    if (reelId) {
        title.textContent = 'Edit Reel';
        loadReelForEdit(reelId);
    } else {
        title.textContent = 'Create New Reel';
        form.reset();
        document.getElementById('reelOriginalPath').value = '';
        document.getElementById('reelThumbnailPath').value = '';
        const videoPreview = document.getElementById('reelVideoPreview');
        const thumbnailPreview = document.getElementById('reelThumbnailPreview');
        if (videoPreview) videoPreview.style.display = 'none';
        if (thumbnailPreview) thumbnailPreview.style.display = 'none';
        const titleCount = document.getElementById('reelTitleCount');
        const descCount = document.getElementById('reelDescriptionCount');
        if (titleCount) titleCount.textContent = '0/60';
        if (descCount) descCount.textContent = '0/300';
        
        // Load users and sports for new reel
        loadUsersForReel();
        loadSportsForReel();
    }
    
    modal.classList.add('active');
}

function closeReelModal() {
    const modal = document.getElementById('reelModal');
    if (modal) {
        modal.classList.remove('active');
    }
    editingReelId = null;
}

async function loadReelForEdit(reelId) {
    try {
        showLoading();
        const response = await apiRequest(`/admin/reels/${reelId}`);
        const reel = response.data.reel;

        document.getElementById('reelTitle').value = reel.title || '';
        document.getElementById('reelDescription').value = reel.description || '';
        document.getElementById('reelUserId').value = reel.userId?._id || reel.userId?.id || '';
        document.getElementById('reelStatus').value = reel.status || 'pending';
        document.getElementById('reelOriginalPath').value = reel.originalPath || '';
        document.getElementById('reelThumbnailPath').value = reel.thumbnailPath || '';

        // Update character counters
        document.getElementById('reelTitleCount').textContent = `${(reel.title || '').length}/60`;
        document.getElementById('reelDescriptionCount').textContent = `${(reel.description || '').length}/300`;

        // Load sports
        await loadSportsForReel();
        if (reel.sportIds && reel.sportIds.length > 0) {
            const sportSelect = document.getElementById('reelSportIds');
            Array.from(sportSelect.options).forEach(option => {
                if (reel.sportIds.includes(option.value)) {
                    option.selected = true;
                }
            });
        }

        // Show previews if URLs exist
        if (reel.originalPath) {
            const videoPreview = document.getElementById('reelVideoPreview');
            const videoPlayer = document.getElementById('reelVideoPreviewPlayer');
            videoPlayer.src = reel.originalPath;
            videoPreview.style.display = 'block';
            document.getElementById('reelVideoUrl').textContent = reel.originalPath;
        }

        if (reel.thumbnailPath) {
            const thumbnailPreview = document.getElementById('reelThumbnailPreview');
            document.getElementById('reelThumbnailPreviewImg').src = reel.thumbnailPath;
            document.getElementById('reelThumbnailUrl').textContent = reel.thumbnailPath;
            thumbnailPreview.style.display = 'block';
        }
    } catch (error) {
        showToast(error.message || 'Failed to load reel', 'error');
        closeReelModal();
    } finally {
        hideLoading();
    }
}

async function loadUsersForReel() {
    try {
        const response = await apiRequest('/admin/users?page=1&limit=1000');
        const users = response.data.users;
        const select = document.getElementById('reelUserId');
        
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select User</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user._id || user.id;
            option.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.id;
            select.appendChild(option);
        });
        if (currentValue) {
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function loadSportsForReel() {
    try {
        const response = await apiRequest('/sports?page=1&limit=1000');
        const sports = response.data.sports || [];
        const select = document.getElementById('reelSportIds');
        
        select.innerHTML = '<option value="">Select Sports</option>';
        sports.forEach(sport => {
            const option = document.createElement('option');
            option.value = sport.id || sport._id;
            option.textContent = sport.name || sport.id;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load sports:', error);
    }
}

async function uploadReelVideo() {
    const fileInput = document.getElementById('reelVideo');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select a video file', 'error');
        return;
    }

    const file = fileInput.files[0];
    
    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
        showToast('File size must be less than 100MB', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Invalid file type. Allowed: MP4, MPEG, MOV, AVI, WebM, MKV', 'error');
        return;
    }

    try {
        showLoading();
        const formData = new FormData();
        formData.append('video', file);

        const url = `${API_BASE_URL}/admin/reels/upload-video`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        const videoUrl = data.data.videoUrl;
        document.getElementById('reelOriginalPath').value = videoUrl;
        
        const videoPreview = document.getElementById('reelVideoPreview');
        const videoPlayer = document.getElementById('reelVideoPreviewPlayer');
        videoPlayer.src = videoUrl;
        videoPreview.style.display = 'block';
        document.getElementById('reelVideoUrl').textContent = videoUrl;

        showToast('Video uploaded successfully! Note: Video must be 90 seconds or less. Duration will be validated when creating the reel.', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to upload video', 'error');
    } finally {
        hideLoading();
    }
}

async function uploadReelThumbnail() {
    const fileInput = document.getElementById('reelThumbnail');
    
    if (!fileInput.files || !fileInput.files[0]) {
        showToast('Please select an image file', 'error');
        return;
    }

    const file = fileInput.files[0];
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Invalid file type. Allowed: JPEG, PNG, WebP', 'error');
        return;
    }

    try {
        showLoading();
        const formData = new FormData();
        formData.append('thumbnail', file);

        const url = `${API_BASE_URL}/admin/reels/upload-thumbnail`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }

        const thumbnailUrl = data.data.thumbnailUrl;
        document.getElementById('reelThumbnailPath').value = thumbnailUrl;
        
        const thumbnailPreview = document.getElementById('reelThumbnailPreview');
        document.getElementById('reelThumbnailPreviewImg').src = thumbnailUrl;
        document.getElementById('reelThumbnailUrl').textContent = thumbnailUrl;
        thumbnailPreview.style.display = 'block';

        showToast('Thumbnail uploaded successfully!', 'success');
        fileInput.value = '';
    } catch (error) {
        showToast(error.message || 'Failed to upload thumbnail', 'error');
    } finally {
        hideLoading();
    }
}

async function handleSaveReel(e) {
    e.preventDefault();

    const action = editingReelId ? 'update' : 'create';
    if (!hasPermission('reel', action)) {
        showToast(`You do not have permission to ${action} reels`, 'error');
        return;
    }

    const originalPath = document.getElementById('reelOriginalPath').value;
    if (!originalPath) {
        showToast('Please upload a video', 'error');
        return;
    }

    try {
        showLoading();
        const sportSelect = document.getElementById('reelSportIds');
        const selectedSports = Array.from(sportSelect.selectedOptions)
            .map(option => option.value)
            .filter(value => value !== '');

        const reelData = {
            title: document.getElementById('reelTitle').value.trim(),
            description: document.getElementById('reelDescription').value.trim() || null,
            originalPath: originalPath,
            thumbnailPath: document.getElementById('reelThumbnailPath').value || null,
            userId: document.getElementById('reelUserId').value,
            sportIds: selectedSports.length > 0 ? selectedSports : undefined,
        };

        if (editingReelId) {
            reelData.status = document.getElementById('reelStatus').value;
            await apiRequest(`/admin/reels/${editingReelId}`, {
                method: 'PATCH',
                body: JSON.stringify(reelData)
            });
            showToast('Reel updated successfully!', 'success');
        } else {
            await apiRequest('/admin/reels', {
                method: 'POST',
                body: JSON.stringify(reelData)
            });
            showToast('Reel created successfully! Video processing will start automatically.', 'success');
        }

        closeReelModal();
        loadReels();
    } catch (error) {
        showToast(error.message || `Failed to ${action} reel`, 'error');
    } finally {
        hideLoading();
    }
}

function editReel(reelId) {
    if (!hasPermission('reel', 'update')) {
        showToast('You do not have permission to edit reels', 'error');
        return;
    }
    openReelModal(reelId);
}

async function deleteReel(reelId) {
    if (!hasPermission('reel', 'delete')) {
        showToast('You do not have permission to delete reels', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this reel? This action cannot be undone.')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/reels/${reelId}`, {
            method: 'DELETE'
        });

        showToast('Reel deleted successfully!', 'success');
        loadReels();
    } catch (error) {
        showToast(error.message || 'Failed to delete reel', 'error');
    } finally {
        hideLoading();
    }
}

async function updateReelStatus(reelId, currentStatus) {
    if (!hasPermission('reel', 'update')) {
        showToast('You do not have permission to update reel status', 'error');
        return;
    }

    const statuses = ['approved', 'rejected', 'blocked', 'pending'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    if (!confirm(`Change reel status from "${currentStatus}" to "${nextStatus}"?`)) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/reels/${reelId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
        });

        showToast('Reel status updated successfully!', 'success');
        loadReels();
    } catch (error) {
        showToast(error.message || 'Failed to update reel status', 'error');
    } finally {
        hideLoading();
    }
}

async function reprocessReelVideo(reelId) {
    if (!hasPermission('reel', 'update')) {
        showToast('You do not have permission to reprocess videos', 'error');
        return;
    }

    if (!confirm('Reprocess this video? This will process the video again regardless of current processing status.')) {
        return;
    }

    try {
        showLoading();
        await apiRequest(`/admin/reels/${reelId}/process-video`, {
            method: 'POST'
        });

        showToast('Video reprocessing job queued successfully!', 'success');
        loadReels();
    } catch (error) {
        showToast(error.message || 'Failed to reprocess video', 'error');
    } finally {
        hideLoading();
    }
}

