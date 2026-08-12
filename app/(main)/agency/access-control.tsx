import { DashboardLayout } from '@/components/main';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
    getRolePermissions,
    getTeamMenus,
    getTeamProfile,
    getTeamRoles,
    RolePermissions,
    TeamMenu,
    TeamRole,
    updateRolePermissions
} from '@/services/dashboardService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { AGENCY_BG, AGENCY_MENU_ITEMS, AgencyLogo } from './index';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://api.zien.ai/api';

// Custom API integrations for Role & Menu CRUD
const createRoleApi = async (accessToken: string, companyId: number, name: string, description: string) => {
    const response = await fetch(`${API_BASE_URL}/teams/roles`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId,
            name,
            description,
            status: 1
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create role');
    }
    return response.json();
};

const updateRoleApi = async (accessToken: string, companyId: number, roleId: number, name: string, description: string) => {
    const response = await fetch(`${API_BASE_URL}/teams/roles/${roleId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId,
            name,
            description,
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update role');
    }
    return response.json();
};

const deleteRoleApi = async (accessToken: string, companyId: number, roleId: number) => {
    const response = await fetch(`${API_BASE_URL}/teams/roles/${roleId}?company_id=${companyId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete role');
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
};

const createMenuApi = async (
    accessToken: string,
    companyId: number,
    data: { name: string; slug: string; path: string; icon: string; sort_order: number; parent_id: number | null }
) => {
    const response = await fetch(`${API_BASE_URL}/teams/menus`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId,
            ...data,
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create menu');
    }
    return response.json();
};

const updateMenuApi = async (
    accessToken: string,
    companyId: number,
    menuId: number,
    data: { name: string; slug: string; path: string; icon: string; sort_order: number; parent_id: number | null }
) => {
    const response = await fetch(`${API_BASE_URL}/teams/menus/${menuId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId,
            ...data,
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update menu');
    }
    return response.json();
};

const deleteMenuApi = async (accessToken: string, companyId: number, menuId: number) => {
    const response = await fetch(`${API_BASE_URL}/teams/menus/${menuId}?company_id=${companyId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete menu');
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
};

export default function AccessControl() {
    const { colors } = useAppTheme();
    const styles = getStyles(colors);
    const { accessToken } = useAuth();
    const queryClient = useQueryClient();

    // Custom Toast notifications
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTranslateY = useRef(new Animated.Value(-100)).current;

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
    };

    useEffect(() => {
        if (toast.visible) {
            // Animate in
            Animated.parallel([
                Animated.timing(toastOpacity, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                }),
                Animated.timing(toastTranslateY, {
                    toValue: 0,
                    duration: 350,
                    useNativeDriver: true,
                })
            ]).start();

            // Animate out after 2.5 seconds
            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(toastOpacity, {
                        toValue: 0,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.timing(toastTranslateY, {
                        toValue: -100,
                        duration: 350,
                        useNativeDriver: true,
                    })
                ]).start(() => {
                    setToast(prev => ({ ...prev, visible: false }));
                });
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [toast.visible, toastOpacity, toastTranslateY]);

    // 1. Navigation / Tabs State
    const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'menus'>('roles');

    // 2. Fetch Profile to get companyId
    const { data: profile } = useQuery({
        queryKey: ['teamProfile'],
        queryFn: () => getTeamProfile(accessToken!),
        enabled: !!accessToken,
    });

    const companyId = profile?.company_id;

    // 3. Fetch Roles
    const { data: roles, isLoading: loadingRoles } = useQuery<TeamRole[]>({
        queryKey: ['teamRoles', companyId],
        queryFn: () => getTeamRoles(accessToken!, companyId!),
        enabled: !!accessToken && !!companyId,
    });

    // 4. Fetch All Menus
    const { data: allMenus, isLoading: loadingMenus } = useQuery<TeamMenu[]>({
        queryKey: ['teamMenus', companyId],
        queryFn: () => getTeamMenus(accessToken!, companyId!),
        enabled: !!accessToken && !!companyId,
    });

    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

    // Set initial selected role when roles are loaded
    useEffect(() => {
        if (roles && roles.length > 0 && selectedRoleId === null) {
            setSelectedRoleId(roles[0].id);
        }
    }, [roles, selectedRoleId]);

    // 5. Fetch Permissions for selected role
    const { data: rolePerms, isLoading: loadingPerms } = useQuery<RolePermissions>({
        queryKey: ['rolePermissions', selectedRoleId],
        queryFn: () => getRolePermissions(accessToken!, selectedRoleId!),
        enabled: !!accessToken && !!selectedRoleId,
    });

    // Local state for permissions management
    const [permissions, setPermissions] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (rolePerms) {
            const initial: Record<number, boolean> = {};
            rolePerms.assigned_menu_ids.forEach(id => {
                initial[id] = true;
            });
            setPermissions(initial);
        }
    }, [rolePerms]);

    const handleToggle = (menuId: number) => {
        setPermissions(prev => ({
            ...prev,
            [menuId]: !prev[menuId]
        }));
    };

    // --- MUTATIONS ---

    // Sync Permissions
    const syncMutation = useMutation({
        mutationFn: (menuIds: number[]) =>
            updateRolePermissions(accessToken!, selectedRoleId!, companyId!, menuIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolePermissions', selectedRoleId] });
            showToast('Access control permissions saved successfully!', 'success');
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to save permissions.', 'error');
        }
    });

    const handleSavePermissions = () => {
        if (!selectedRoleId || !companyId) {
            showToast('Invalid role or company configuration.', 'error');
            return;
        }
        const activeMenuIds = Object.keys(permissions)
            .map(Number)
            .filter(id => permissions[id]);

        syncMutation.mutate(activeMenuIds);
    };

    // Role Operations State & Mutations
    const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
    const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<TeamRole | null>(null);
    const [roleName, setRoleName] = useState('');
    const [roleDesc, setRoleDesc] = useState('');

    const createRoleMutation = useMutation({
        mutationFn: (data: { name: string; description: string }) =>
            createRoleApi(accessToken!, companyId!, data.name, data.description),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamRoles', companyId] });
            showToast('Role created successfully!', 'success');
            setIsAddRoleOpen(false);
            setRoleName('');
            setRoleDesc('');
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to create role', 'error');
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: (data: { id: number; name: string; description: string }) =>
            updateRoleApi(accessToken!, companyId!, data.id, data.name, data.description),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamRoles', companyId] });
            showToast('Role updated successfully!', 'success');
            setIsEditRoleOpen(false);
            setEditingRole(null);
            setRoleName('');
            setRoleDesc('');
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to update role', 'error');
        }
    });

    const deleteRoleMutation = useMutation({
        mutationFn: (roleId: number) =>
            deleteRoleApi(accessToken!, companyId!, roleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamRoles', companyId] });
            showToast('Role deleted successfully!', 'success');
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to delete role', 'error');
        }
    });

    // Menu Operations State & Mutations
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<TeamMenu | null>(null);
    const [menuName, setMenuName] = useState('');
    const [menuSlug, setMenuSlug] = useState('');
    const [menuPath, setMenuPath] = useState('');
    const [menuIcon, setMenuIcon] = useState('circle-outline');
    const [menuOrder, setMenuOrder] = useState('0');
    const [menuParentId, setMenuParentId] = useState('');
    const [nameError, setNameError] = useState('');
    const [slugError, setSlugError] = useState('');
    const [pathError, setPathError] = useState('');
    const [isAddParentDropdownOpen, setIsAddParentDropdownOpen] = useState(false);
    const [isEditParentDropdownOpen, setIsEditParentDropdownOpen] = useState(false);

    const createMenuMutation = useMutation({
        mutationFn: (data: { name: string; slug: string; path: string; icon: string; sort_order: number; parent_id: number | null }) =>
            createMenuApi(accessToken!, companyId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMenus', companyId] });
            showToast('Menu item created successfully!', 'success');
            setIsAddMenuOpen(false);
            setMenuName('');
            setMenuSlug('');
            setMenuPath('');
            setMenuIcon('circle-outline');
            setMenuOrder('0');
            setMenuParentId('');
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to create menu', 'error');
        }
    });

    const updateMenuMutation = useMutation({
        mutationFn: (data: { id: number; name: string; slug: string; path: string; icon: string; sort_order: number; parent_id: number | null }) =>
            updateMenuApi(accessToken!, companyId!, data.id, {
                name: data.name,
                slug: data.slug,
                path: data.path,
                icon: data.icon,
                sort_order: data.sort_order,
                parent_id: data.parent_id
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMenus', companyId] });
            showToast('Menu item updated successfully!', 'success');
            setIsEditMenuOpen(false);
            setEditingMenu(null);
            setMenuName('');
            setMenuSlug('');
            setMenuPath('');
            setMenuIcon('circle-outline');
            setMenuOrder('0');
            setMenuParentId('');
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to update menu', 'error');
        }
    });

    const deleteMenuMutation = useMutation({
        mutationFn: (menuId: number) =>
            deleteMenuApi(accessToken!, companyId!, menuId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMenus', companyId] });
            showToast('Menu item deleted successfully!', 'success');
        },
        onError: (err: any) => {
            showToast(err?.message || 'Failed to delete menu', 'error');
        }
    });

    // Form Submissions
    const handleAddRoleSubmit = () => {
        if (!roleName.trim()) {
            showToast('Role name is required.', 'error');
            return;
        }
        createRoleMutation.mutate({ name: roleName, description: roleDesc });
    };

    const handleEditRoleSubmit = () => {
        if (!editingRole) return;
        if (!roleName.trim()) {
            showToast('Role name is required.', 'error');
            return;
        }
        updateRoleMutation.mutate({ id: editingRole.id, name: roleName, description: roleDesc });
    };

    const handleDeleteRole = (roleId: number, roleNameStr: string) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete the role "${roleNameStr}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteRoleMutation.mutate(roleId)
                }
            ]
        );
    };

    const handleAddMenuSubmit = () => {
        let hasError = false;
        if (!menuName.trim()) {
            setNameError('Name is required');
            hasError = true;
        }
        if (!menuSlug.trim()) {
            setSlugError('Slug is required');
            hasError = true;
        }
        if (!menuPath.trim()) {
            setPathError('Path is required');
            hasError = true;
        }

        if (hasError) return;

        createMenuMutation.mutate({
            name: menuName,
            slug: menuSlug,
            path: menuPath,
            icon: menuIcon || 'circle-outline',
            sort_order: parseInt(menuOrder) || 0,
            parent_id: menuParentId ? parseInt(menuParentId) : null
        });
    };

    const handleEditMenuSubmit = () => {
        if (!editingMenu) return;
        let hasError = false;
        if (!menuName.trim()) {
            setNameError('Name is required');
            hasError = true;
        }
        if (!menuSlug.trim()) {
            setSlugError('Slug is required');
            hasError = true;
        }
        if (!menuPath.trim()) {
            setPathError('Path is required');
            hasError = true;
        }

        if (hasError) return;

        updateMenuMutation.mutate({
            id: editingMenu.id,
            name: menuName,
            slug: menuSlug,
            path: menuPath,
            icon: menuIcon || 'circle-outline',
            sort_order: parseInt(menuOrder) || 0,
            parent_id: menuParentId ? parseInt(menuParentId) : null
        });
    };

    const handleDeleteMenu = (menuId: number, menuNameStr: string) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete the menu item "${menuNameStr}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteMenuMutation.mutate(menuId)
                }
            ]
        );
    };

    const isLargeScreen = width >= 768;

    return (
        <DashboardLayout
            menuItems={AGENCY_MENU_ITEMS}
            customLogo={<AgencyLogo />}
            customBackground={AGENCY_BG}
            customHeaderBackground={colors.cardBackground}
            backToMainRoute="/(main)/dashboard"
            isAgency={true}
        >
            {toast.visible && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            opacity: toastOpacity,
                            transform: [{ translateY: toastTranslateY }],
                            backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                            borderColor: toast.type === 'success' ? '#10B981' : '#EF4444',
                        }
                    ]}
                >
                    <MaterialCommunityIcons
                        name={toast.type === 'success' ? 'check-circle' : 'alert-circle'}
                        size={18}
                        color={toast.type === 'success' ? '#10B981' : '#EF4444'}
                    />
                    <Text
                        style={[
                            styles.toastText,
                            { color: toast.type === 'success' ? '#065F46' : '#991B1B' }
                        ]}
                    >
                        {toast.message}
                    </Text>
                </Animated.View>
            )}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.headerArea}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <MaterialCommunityIcons name="shield-lock" size={24} color={colors.textPrimary} />
                        <Text style={[styles.mainHeading, { color: colors.textPrimary }]}>Roles & Permissions</Text>
                    </View>
                    <Text style={[styles.mainSubheading, { color: colors.textSecondary }]}>
                        {activeTab === 'menus'
                            ? 'Define the navigation hierarchy for the agency dashboard.'
                            : 'Manage role lifecycle and role-wise workspace module access'}
                    </Text>
                </View>

                {/* Sub-Navigation Sub-Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('roles')}
                        style={[
                            styles.subTab,
                            activeTab === 'roles' && styles.subTabActive
                        ]}
                    >
                        <Text style={[
                            styles.subTabText,
                            activeTab === 'roles' ? styles.subTabTextActive : { color: colors.textSecondary }
                        ]}>
                            Roles
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('permissions')}
                        style={[
                            styles.subTab,
                            activeTab === 'permissions' && styles.subTabActive
                        ]}
                    >
                        <Text style={[
                            styles.subTabText,
                            activeTab === 'permissions' ? styles.subTabTextActive : { color: colors.textSecondary }
                        ]}>
                            Permissions
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('menus')}
                        style={[
                            styles.subTab,
                            activeTab === 'menus' && styles.subTabActive
                        ]}
                    >
                        <Text style={[
                            styles.subTabText,
                            activeTab === 'menus' ? styles.subTabTextActive : { color: colors.textSecondary }
                        ]}>
                            Menu Management
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* CONTENT AREA BY TAB */}
                {activeTab === 'roles' && (
                    <View style={[styles.mainCard, { borderColor: colors.cardBorder }]}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Role List</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setRoleName('');
                                    setRoleDesc('');
                                    setIsAddRoleOpen(true);
                                }}
                                style={styles.actionBtn}
                            >
                                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                                <Text style={styles.actionBtnText}>Add Role</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingRoles ? (
                            <ActivityIndicator size="large" color={colors.accentTeal} style={{ marginVertical: 40 }} />
                        ) : (
                            <View style={styles.listContainer}>
                                {roles?.map(role => (
                                    <View
                                        key={role.id}
                                        style={[styles.roleItemCard, { borderColor: colors.cardBorder }]}
                                    >
                                        <View style={{ flex: 1, paddingRight: 12 }}>
                                            <Text style={[styles.roleNameText, { color: colors.textPrimary }]}>
                                                {role.name}
                                            </Text>
                                            <Text style={[styles.roleDescText, { color: colors.textSecondary }]}>
                                                {role.description || 'No description provided'}
                                            </Text>
                                        </View>
                                        <View style={styles.itemActions}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingRole(role);
                                                    setRoleName(role.name);
                                                    setRoleDesc(role.description);
                                                    setIsEditRoleOpen(true);
                                                }}
                                                style={styles.editIconBtn}
                                            >
                                                <MaterialCommunityIcons name="pencil-outline" size={16} color="#64748B" />
                                            </TouchableOpacity>
                                            {role.slug !== 'owner' && role.slug !== 'admin' && (
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteRole(role.id, role.name)}
                                                    style={styles.deleteIconBtn}
                                                >
                                                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'permissions' && (
                    <View style={[styles.splitLayout, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
                        {/* Sidebar Workspace Roles */}
                        <View style={[styles.sidebarCard, { flex: isLargeScreen ? 1 : undefined, borderColor: colors.cardBorder }]}>
                            <Text style={styles.sidebarHeading}>WORKSPACE ROLES</Text>
                            <ScrollView
                                horizontal={!isLargeScreen}
                                showsVerticalScrollIndicator={false}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={isLargeScreen ? styles.sidebarList : styles.sidebarListHorizontal}
                            >
                                {roles?.map(role => {
                                    const isSelected = selectedRoleId === role.id;
                                    return (
                                        <TouchableOpacity
                                            key={role.id}
                                            onPress={() => setSelectedRoleId(role.id)}
                                            style={[
                                                styles.sidebarRoleItem,
                                                isSelected && styles.sidebarRoleItemActive
                                            ]}
                                        >
                                            <Text style={[
                                                styles.sidebarRoleText,
                                                isSelected ? styles.sidebarRoleTextActive : { color: colors.textPrimary }
                                            ]}>
                                                {role.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Main Permissions Panel */}
                        <View style={[styles.mainPermissionsCard, { flex: isLargeScreen ? 3 : undefined, borderColor: colors.cardBorder }]}>
                            <View style={styles.cardHeaderRow}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                                        Module Access for{' '}
                                        <Text style={{ color: '#F97316' }}>
                                            {roles?.find(r => r.id === selectedRoleId)?.name || 'Selected Role'}
                                        </Text>
                                    </Text>
                                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                                        Assign workspace modules to this role by toggling the switches below.
                                    </Text>
                                </View>


                            </View>
                            <TouchableOpacity
                                onPress={handleSavePermissions}
                                disabled={syncMutation.isPending}
                                style={[styles.saveBtn, syncMutation.isPending && { opacity: 0.7 }]}
                            >
                                {syncMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                                ) : (
                                    <MaterialCommunityIcons name="content-save" size={16} color="#fff" style={{ marginRight: 6 }} />
                                )}
                                <Text style={styles.saveBtnText}>
                                    {syncMutation.isPending ? 'Saving...' : 'Save Permissions'}
                                </Text>
                            </TouchableOpacity>

                            {loadingPerms || loadingMenus ? (
                                <ActivityIndicator size="large" color={colors.accentTeal} style={{ marginVertical: 40 }} />
                            ) : (
                                <View style={styles.permissionsGrid}>
                                    {allMenus?.map(mod => {
                                        const isEnabled = permissions[mod.id] || false;
                                        return (
                                            <View
                                                key={mod.id}
                                                style={[styles.moduleCardRow, { borderColor: colors.cardBorder }]}
                                            >
                                                <View style={styles.moduleIconBox}>
                                                    <MaterialCommunityIcons
                                                        name="menu"
                                                        size={18}
                                                        color="#64748B"
                                                    />
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={[styles.moduleNameText, { color: colors.textPrimary }]}>
                                                        {mod.name}
                                                    </Text>
                                                    <Text style={styles.modulePathText}>
                                                        {mod.path}
                                                    </Text>
                                                </View>
                                                <View style={styles.switchWrapper}>
                                                    {isLargeScreen && <Text style={styles.switchLabel}>Enable Access</Text>}
                                                    <Switch
                                                        value={isEnabled}
                                                        onValueChange={() => handleToggle(mod.id)}
                                                        trackColor={{ false: 'rgba(0,0,0,0.1)', true: '#10B981' }}
                                                        thumbColor="#fff"
                                                        ios_backgroundColor="rgba(0,0,0,0.1)"
                                                        style={{ transform: [{ scale: 0.8 }] }}
                                                    />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {activeTab === 'menus' && (
                    <View style={[styles.mainCard, { borderColor: colors.cardBorder }]}>
                        <View style={styles.cardHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Menu Management</Text>
                                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                                    Define the navigation hierarchy for the agency dashboard.
                                </Text>
                            </View>

                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                setMenuName('');
                                setMenuSlug('');
                                setMenuPath('');
                                setMenuIcon('circle-outline');
                                setMenuOrder('0');
                                setMenuParentId('');
                                setNameError('');
                                setSlugError('');
                                setPathError('');
                                setIsAddParentDropdownOpen(false);
                                setIsAddMenuOpen(true);
                            }}
                            style={[
                                styles.actionBtn,
                                {
                                    justifyContent: 'center',
                                    marginVertical: 16,
                                    paddingVertical: 12
                                }
                            ]}
                        >
                            <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Add Menu</Text>
                        </TouchableOpacity>

                        {loadingMenus ? (
                            <ActivityIndicator size="large" color={colors.accentTeal} style={{ marginVertical: 40 }} />
                        ) : (
                            <View style={styles.listContainer}>
                                {allMenus?.map(menu => (
                                    <View
                                        key={menu.id}
                                        style={[styles.menuItemCard, { borderColor: colors.cardBorder }]}
                                    >
                                        <View style={styles.dragHandle}>
                                            <MaterialCommunityIcons name="menu" size={18} color="#94A3B8" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12, marginRight: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <Text style={[styles.menuNameText, { color: colors.textPrimary }]}>
                                                    {menu.name}
                                                </Text>
                                                {menu.slug && (
                                                    <View style={styles.badgeContainer}>
                                                        <Text style={styles.badgeText}>
                                                            {menu.slug.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.menuPathText}>
                                                {menu.path}
                                            </Text>
                                        </View>
                                        <View style={styles.itemActions}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingMenu(menu);
                                                    setMenuName(menu.name);
                                                    setMenuSlug(menu.slug);
                                                    setMenuPath(menu.path);
                                                    setMenuIcon(menu.icon);
                                                    setMenuOrder(menu.sort_order.toString());
                                                    setMenuParentId(menu.parent_id?.toString() || '');
                                                    setNameError('');
                                                    setSlugError('');
                                                    setPathError('');
                                                    setIsEditParentDropdownOpen(false);
                                                    setIsEditMenuOpen(true);
                                                }}
                                                style={styles.editIconBtn}
                                            >
                                                <MaterialCommunityIcons name="pencil-outline" size={16} color="#64748B" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteMenu(menu.id, menu.name)}
                                                style={styles.deleteIconBtn}
                                            >
                                                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* --- ADD ROLE MODAL --- */}
            <Modal
                visible={isAddRoleOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsAddRoleOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Role</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Role Name <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Sales Agent"
                                    placeholderTextColor="#94A3B8"
                                    value={roleName}
                                    onChangeText={setRoleName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                                    placeholder="e.g. Handles sales pipelines and agency client communication."
                                    placeholderTextColor="#94A3B8"
                                    multiline={true}
                                    value={roleDesc}
                                    onChangeText={setRoleDesc}
                                />
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    onPress={() => setIsAddRoleOpen(false)}
                                    style={styles.modalCancelBtn}
                                >
                                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleAddRoleSubmit}
                                    disabled={createRoleMutation.isPending}
                                    style={styles.modalSubmitBtn}
                                >
                                    {createRoleMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSubmitBtnText}>Create Role</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- EDIT ROLE MODAL --- */}
            <Modal
                visible={isEditRoleOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsEditRoleOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Edit Role</Text>
                                <TouchableOpacity
                                    onPress={() => setIsEditRoleOpen(false)}
                                    style={styles.editIconBtn}
                                >
                                    <MaterialCommunityIcons name="close" size={16} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Role name <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Sales Agent"
                                    placeholderTextColor="#94A3B8"
                                    value={roleName}
                                    onChangeText={setRoleName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                                    placeholder="e.g. Handles sales pipelines and agency client communication."
                                    placeholderTextColor="#94A3B8"
                                    multiline={true}
                                    value={roleDesc}
                                    onChangeText={setRoleDesc}
                                />
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    onPress={() => setIsEditRoleOpen(false)}
                                    style={styles.modalCancelBtn}
                                >
                                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleEditRoleSubmit}
                                    disabled={updateRoleMutation.isPending}
                                    style={styles.modalSubmitBtn}
                                >
                                    {updateRoleMutation.isPending ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSubmitBtnText}>Update Role</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- ADD MENU MODAL --- */}
            <Modal
                visible={isAddMenuOpen}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setIsAddMenuOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: colors.cardBackground }}
                >
                    <View style={{ flex: 1, backgroundColor: colors.cardBackground, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 0 }]}>Add Menu</Text>
                            <TouchableOpacity
                                onPress={() => setIsAddMenuOpen(false)}
                                style={styles.modalCloseBtn}
                            >
                                <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>
                                        Name <Text style={{ color: '#EF4444' }}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, nameError ? { borderColor: '#EF4444' } : {}]}
                                        placeholder="e.g. Dashboard"
                                        placeholderTextColor="#94A3B8"
                                        value={menuName}
                                        onChangeText={(val) => {
                                            setMenuName(val);
                                            setNameError('');
                                        }}
                                    />
                                    {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>
                                        Slug <Text style={{ color: '#EF4444' }}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, slugError ? { borderColor: '#EF4444' } : {}]}
                                        placeholder="e.g. dashboard"
                                        placeholderTextColor="#94A3B8"
                                        value={menuSlug}
                                        onChangeText={(val) => {
                                            setMenuSlug(val);
                                            setSlugError('');
                                        }}
                                    />
                                    {slugError ? <Text style={styles.errorText}>{slugError}</Text> : null}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Path <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <TextInput
                                    style={[styles.textInput, pathError ? { borderColor: '#EF4444' } : {}]}
                                    placeholder="e.g. /agency/dashboard"
                                    placeholderTextColor="#94A3B8"
                                    value={menuPath}
                                    onChangeText={(val) => {
                                        setMenuPath(val);
                                        setPathError('');
                                    }}
                                />
                                {pathError ? <Text style={styles.errorText}>{pathError}</Text> : null}
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>Icon (Lucide name)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. layout"
                                        placeholderTextColor="#94A3B8"
                                        value={menuIcon}
                                        onChangeText={setMenuIcon}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Sort Order</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#94A3B8"
                                        value={menuOrder}
                                        onChangeText={setMenuOrder}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Parent Menu</Text>
                                <TouchableOpacity
                                    onPress={() => setIsAddParentDropdownOpen(!isAddParentDropdownOpen)}
                                    style={[
                                        styles.dropdownSelector,
                                        isAddParentDropdownOpen ? {
                                            borderColor: colors.accentTeal,
                                            borderBottomLeftRadius: 0,
                                            borderBottomRightRadius: 0,
                                        } : {}
                                    ]}
                                >
                                    <Text style={[
                                        styles.dropdownSelectorText,
                                        { color: isAddParentDropdownOpen ? '#0a2341' : colors.textPrimary }
                                    ]}>
                                        {menuParentId ? allMenus?.find(m => m.id === parseInt(menuParentId))?.name || 'No Parent (Root)' : 'No Parent (Root)'}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={isAddParentDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={isAddParentDropdownOpen ? "#0a2341" : "#64748B"}
                                    />
                                </TouchableOpacity>

                                {isAddParentDropdownOpen && (
                                    <View style={styles.dropdownOptionsConnected}>
                                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuParentId('');
                                                    setIsAddParentDropdownOpen(false);
                                                }}
                                                style={styles.dropdownOptionItem}
                                            >
                                                <Text style={[
                                                    styles.dropdownOptionText,
                                                    !menuParentId && { fontWeight: '700', color: colors.accentTeal }
                                                ]}>
                                                    No Parent (Root)
                                                </Text>
                                            </TouchableOpacity>
                                            {allMenus?.map(m => {
                                                const isOptionSelected = menuParentId === m.id.toString();
                                                return (
                                                    <TouchableOpacity
                                                        key={m.id}
                                                        onPress={() => {
                                                            setMenuParentId(m.id.toString());
                                                            setIsAddParentDropdownOpen(false);
                                                        }}
                                                        style={styles.dropdownOptionItem}
                                                    >
                                                        <Text style={[
                                                            styles.dropdownOptionText,
                                                            isOptionSelected && { fontWeight: '700', color: colors.accentTeal }
                                                        ]}>
                                                            {m.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <View style={[styles.modalActions, { marginTop: 16 }]}>
                            <TouchableOpacity
                                onPress={() => setIsAddMenuOpen(false)}
                                style={styles.modalCancelBtn}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleAddMenuSubmit}
                                disabled={createMenuMutation.isPending}
                                style={styles.modalSubmitBtn}
                            >
                                {createMenuMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitBtnText}>Create Menu</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- EDIT MENU MODAL --- */}
            <Modal
                visible={isEditMenuOpen}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setIsEditMenuOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: colors.cardBackground }}
                >
                    <View style={{ flex: 1, backgroundColor: colors.cardBackground, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: 22, fontWeight: '900', marginBottom: 0 }]}>Edit Menu</Text>
                            <TouchableOpacity
                                onPress={() => setIsEditMenuOpen(false)}
                                style={styles.modalCloseBtn}
                            >
                                <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>
                                        Name <Text style={{ color: '#EF4444' }}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, nameError ? { borderColor: '#EF4444' } : {}]}
                                        placeholder="e.g. Dashboard"
                                        placeholderTextColor="#94A3B8"
                                        value={menuName}
                                        onChangeText={(val) => {
                                            setMenuName(val);
                                            setNameError('');
                                        }}
                                    />
                                    {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>
                                        Slug <Text style={{ color: '#EF4444' }}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, slugError ? { borderColor: '#EF4444' } : {}]}
                                        placeholder="e.g. dashboard"
                                        placeholderTextColor="#94A3B8"
                                        value={menuSlug}
                                        onChangeText={(val) => {
                                            setMenuSlug(val);
                                            setSlugError('');
                                        }}
                                    />
                                    {slugError ? <Text style={styles.errorText}>{slugError}</Text> : null}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                    Path <Text style={{ color: '#EF4444' }}>*</Text>
                                </Text>
                                <TextInput
                                    style={[styles.textInput, pathError ? { borderColor: '#EF4444' } : {}]}
                                    placeholder="e.g. /agency/dashboard"
                                    placeholderTextColor="#94A3B8"
                                    value={menuPath}
                                    onChangeText={(val) => {
                                        setMenuPath(val);
                                        setPathError('');
                                    }}
                                />
                                {pathError ? <Text style={styles.errorText}>{pathError}</Text> : null}
                            </View>

                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>Icon (Lucide name)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. layout"
                                        placeholderTextColor="#94A3B8"
                                        value={menuIcon}
                                        onChangeText={setMenuIcon}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Sort Order</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor="#94A3B8"
                                        value={menuOrder}
                                        onChangeText={setMenuOrder}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Parent Menu</Text>
                                <TouchableOpacity
                                    onPress={() => setIsEditParentDropdownOpen(!isEditParentDropdownOpen)}
                                    style={[
                                        styles.dropdownSelector,
                                        isEditParentDropdownOpen ? {
                                            borderColor: colors.accentTeal,
                                            borderBottomLeftRadius: 0,
                                            borderBottomRightRadius: 0,
                                        } : {}
                                    ]}
                                >
                                    <Text style={[
                                        styles.dropdownSelectorText,
                                        { color: isEditParentDropdownOpen ? '#0a2341' : colors.textPrimary }
                                    ]}>
                                        {menuParentId ? allMenus?.find(m => m.id === parseInt(menuParentId))?.name || 'No Parent (Root)' : 'No Parent (Root)'}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={isEditParentDropdownOpen ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={isEditParentDropdownOpen ? "#0a2341" : "#64748B"}
                                    />
                                </TouchableOpacity>

                                {isEditParentDropdownOpen && (
                                    <View style={styles.dropdownOptionsConnected}>
                                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setMenuParentId('');
                                                    setIsEditParentDropdownOpen(false);
                                                }}
                                                style={styles.dropdownOptionItem}
                                            >
                                                <Text style={[
                                                    styles.dropdownOptionText,
                                                    !menuParentId && { fontWeight: '700', color: colors.accentTeal }
                                                ]}>
                                                    No Parent (Root)
                                                </Text>
                                            </TouchableOpacity>
                                            {allMenus?.filter(m => m.id !== editingMenu?.id).map(m => {
                                                const isOptionSelected = menuParentId === m.id.toString();
                                                return (
                                                    <TouchableOpacity
                                                        key={m.id}
                                                        onPress={() => {
                                                            setMenuParentId(m.id.toString());
                                                            setIsEditParentDropdownOpen(false);
                                                        }}
                                                        style={styles.dropdownOptionItem}
                                                    >
                                                        <Text style={[
                                                            styles.dropdownOptionText,
                                                            isOptionSelected && { fontWeight: '700', color: colors.accentTeal }
                                                        ]}>
                                                            {m.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <View style={[styles.modalActions, { marginTop: 16 }]}>
                            <TouchableOpacity
                                onPress={() => setIsEditMenuOpen(false)}
                                style={styles.modalCancelBtn}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleEditMenuSubmit}
                                disabled={updateMenuMutation.isPending}
                                style={styles.modalSubmitBtn}
                            >
                                {updateMenuMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </DashboardLayout>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    scrollContent: {
        padding: 24,
    },
    headerArea: {
        marginBottom: 24,
    },
    mainHeading: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    mainSubheading: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBorder,
        paddingBottom: 8,
    },
    subTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    subTabActive: {
        backgroundColor: colors.accentTeal,
    },
    subTabText: {
        fontSize: 13,
        fontWeight: '700',
    },
    subTabTextActive: {
        color: '#FFFFFF',
    },
    mainCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
    },
    cardSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.accentTeal,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    listContainer: {
        gap: 12,
    },
    roleItemCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: colors.surfaceSoft,
    },
    roleNameText: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    roleDescText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    },
    itemActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    editIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    splitLayout: {
        gap: 20,
    },
    sidebarCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        minWidth: 220,
    },
    sidebarHeading: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textSecondary,
        letterSpacing: 1,
        marginBottom: 12,
    },
    sidebarList: {
        gap: 8,
    },
    sidebarListHorizontal: {
        flexDirection: 'row',
        gap: 8,
    },
    sidebarRoleItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.surfaceSoft,
    },
    sidebarRoleItemActive: {
        backgroundColor: colors.accentTeal,
    },
    sidebarRoleText: {
        fontSize: 13,
        fontWeight: '700',
    },
    sidebarRoleTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    mainPermissionsCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accentTeal,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginVertical: 16,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    permissionsGrid: {
        gap: 12,
    },
    moduleCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: colors.surfaceSoft,
    },
    moduleIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moduleNameText: {
        fontSize: 13,
        fontWeight: '800',
    },
    modulePathText: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '500',
        marginTop: 1,
    },
    menuPathText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
        marginTop: 1,
    },
    switchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    switchLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    menuItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.cardBackground,
        shadowColor: colors.cardShadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    dragHandle: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.surfaceSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuNameText: {
        fontSize: 14,
        fontWeight: '800',
    },
    badgeContainer: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: '#EEF2FF',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#4F46E5',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 480,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.textSecondary,
        marginBottom: 6,
    },
    textInput: {
        borderWidth: 1.5,
        borderColor: colors.cardBorder,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    modalCancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCancelBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    modalSubmitBtn: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.accentTeal,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100,
    },
    modalSubmitBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 48 : 16,
        paddingBottom: 16,
        borderBottomWidth: 1.5,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
        gap: 10,
    },
    toastText: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        backgroundColor: colors.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: colors.cardBorder,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.cardBackground,
    },
    dropdownSelectorText: {
        fontSize: 13,
        fontWeight: '600',
    },
    dropdownOptionsContainer: {
        marginTop: 6,
        borderWidth: 1.5,
        borderColor: colors.cardBorder,
        borderRadius: 12,
        backgroundColor: colors.cardBackground,
        shadowColor: colors.cardShadowColor || '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        overflow: 'hidden',
    },
    dropdownOptionsConnected: {
        borderWidth: 1.5,
        borderColor: colors.accentTeal,
        borderTopWidth: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        backgroundColor: colors.cardBackground,
        overflow: 'hidden',
    },
    dropdownOptionItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    dropdownOptionText: {
        fontSize: 13,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
});
