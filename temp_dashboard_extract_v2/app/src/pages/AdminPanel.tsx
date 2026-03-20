import { useState, useEffect, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users, Trash2, Shield, User as UserIcon, Search,
    Crown, UserCheck, RefreshCw, AlertTriangle, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, type Variants, AnimatePresence } from 'framer-motion';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const rowVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
    exit: { opacity: 0, x: 10, transition: { duration: 0.2 } }
};

interface User {
    id: number;
    name?: string;
    email: string;
    role?: 'admin' | 'user';
    created_at?: string;
    is_active?: boolean;
    plan?: string | null;
    server_limit?: number | null;
    is_verified?: boolean;
    roleKnown?: boolean;
}

type RoleFilter = 'all' | 'admin' | 'user';

// ── Stat Card ──
function StatCard({ label, value, icon: Icon, gradient }: {
    label: string;
    value: number;
    icon: React.ElementType;
    gradient: string;
}) {
    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-slate-900/50 border-slate-700/50 hover:border-slate-600/60 transition-all duration-300 group">
                <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{value}</p>
                        <p className="text-xs text-slate-400 font-medium">{label}</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ── Delete Confirm Modal ──
function DeleteModal({ user, onConfirm, onCancel, isDeleting }: {
    user: User;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Delete User</h3>
                </div>
                <p className="text-sm text-slate-300 mb-1">
                    Are you sure you want to delete <span className="font-semibold text-white">{user.name}</span>?
                </p>
                <p className="text-xs text-slate-500 mb-6">
                    This action cannot be undone. All data associated with this user will be permanently removed.
                </p>
                <div className="flex gap-3">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" /> Deleting…
                            </span>
                        ) : 'Delete'}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Main Component ──
export function AdminPanel() {
    console.log('AdminPanel rendered');

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [togglingStatusId, setTogglingStatusId] = useState<number | null>(null);
    const [verifyingId, setVerifyingId] = useState<number | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // ── Load users ──
    const loadUsers = async () => {
        try {
            setError(null);
            const data = await fetchApi<User[] | { users: User[] }>('/api/admin/users');
            const usersList = Array.isArray(data) ? data : (data.users || []);
            const normalized = (usersList || []).map((u: any): User => {
                const roleKnown = typeof u.role !== 'undefined' && u.role !== null;
                const role = roleKnown ? u.role : 'user';
                return {
                    id: u.id,
                    email: u.email,
                    name: u.name ?? u.email ?? 'User',
                    role: role,
                    roleKnown,
                    created_at: u.created_at ?? undefined,
                    is_active: typeof u.is_active === 'boolean' ? u.is_active : true,
                    is_verified: typeof u.is_verified === 'boolean' ? u.is_verified : false,
                    plan: u.plan ?? null,
                    server_limit: u.server_limit ?? null,
                };
            });
            console.log('[AdminPanel] Users loaded:', usersList.length);
            setUsers(normalized);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load users';
            console.error('[AdminPanel] Load error:', msg);
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    // ── Filtered users ──
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const nameStr = (u.name ?? u.email ?? '').toLowerCase();
            const matchesSearch = !searchQuery ||
                nameStr.includes(searchQuery.toLowerCase()) ||
                (u.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchQuery, roleFilter]);

    // ── Stats ──
    const totalUsers = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;

    // ── Actions ──
    const handleToggleRole = async (user: User) => {
        if (!user.roleKnown) return;
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        setTogglingId(user.id);
        try {
            await fetchApi(`/api/admin/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            toast.success(`${user.name} is now ${newRole === 'admin' ? 'an Admin' : 'a User'}`);
            loadUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update role');
        } finally {
            setTogglingId(null);
        }
    };

    const handleVerifyUser = async (user: User) => {
        setVerifyingId(user.id);
        const newStatus = !user.is_verified;
        try {
            await fetchApi(`/api/admin/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_verified: newStatus })
            });
            toast.success(`${user.name} has been ${newStatus ? 'Verified' : 'Unverified'}`);
            loadUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update verification status');
        } finally {
            setVerifyingId(null);
        }
    };

    const handleToggleStatus = async (user: User) => {
        if (typeof user.is_active !== 'boolean') return;
        setTogglingStatusId(user.id);
        try {
            await fetchApi(`/api/admin/user/toggle-status`, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.id,
                    is_active: !user.is_active
                })
            });
            toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
            loadUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update user status');
        } finally {
            setTogglingStatusId(null);
        }
    };

    const handleDelete = async () => {
        if (!deletingUser) return;
        setIsDeleting(true);
        try {
            await fetchApi(`/api/admin/users/${deletingUser.id}`, { method: 'DELETE' });
            toast.success(`${deletingUser.name} has been deleted`);
            setDeletingUser(null);
            loadUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete user');
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                        <p className="text-sm text-slate-400">Loading…</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 rounded-xl bg-slate-900/50 border border-slate-700/30 animate-pulse" />
                    ))}
                </div>
                <div className="h-64 rounded-xl bg-slate-900/50 border border-slate-700/30 animate-pulse" />
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
                <Button
                    onClick={() => { setLoading(true); loadUsers(); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
            </div>
        );
    }

    // ── Main render ──
    return (
        <motion.div
            className="p-6 space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                        <p className="text-sm text-slate-400">Manage users and permissions</p>
                        <p className="text-xs text-emerald-400 mt-0.5">✅ Latest build: {new Date().toLocaleString()}</p>
                    </div>
                </div>
                <Button
                    onClick={() => { setLoading(true); loadUsers(); }}
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    label="Total Users"
                    value={totalUsers}
                    icon={Users}
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
                />
                <StatCard
                    label="Admin Users"
                    value={adminCount}
                    icon={Crown}
                    gradient="bg-gradient-to-br from-purple-500 to-pink-600"
                />
                <StatCard
                    label="Normal Users"
                    value={userCount}
                    icon={UserCheck}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
            </div>

            {/* Search + Filter Bar */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name or email…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all duration-200"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Role Filter Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/80 text-sm text-slate-300 hover:border-purple-500/50 hover:text-white transition-all duration-200 min-w-[140px]"
                    >
                        <Shield className="w-4 h-4" />
                        <span className="flex-1 text-left capitalize">{roleFilter === 'all' ? 'All Roles' : roleFilter}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showFilterDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute right-0 top-full mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-20"
                            >
                                {(['all', 'admin', 'user'] as RoleFilter[]).map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => { setRoleFilter(role); setShowFilterDropdown(false); }}
                                        className={`w-full px-4 py-2.5 text-sm text-left transition-colors capitalize ${
                                            roleFilter === role
                                                ? 'bg-purple-500/20 text-purple-300'
                                                : 'text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        {role === 'all' ? 'All Roles' : role}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Results info */}
            {(searchQuery || roleFilter !== 'all') && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-xs text-slate-500"
                >
                    Showing {filteredUsers.length} of {totalUsers} users
                    {searchQuery && <span> matching "<span className="text-slate-300">{searchQuery}</span>"</span>}
                    {roleFilter !== 'all' && <span> with role <span className="text-purple-400 capitalize">{roleFilter}</span></span>}
                </motion.div>
            )}

            {/* Users Table */}
            <motion.div variants={itemVariants}>
                <Card className="bg-slate-900/50 border-slate-700/50 overflow-hidden">
                    <CardHeader className="border-b border-slate-800/80 pb-4">
                        <CardTitle className="flex items-center gap-2 text-white text-base">
                            <Users className="w-5 h-5 text-purple-400" />
                            Users ({filteredUsers.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800/80">
                                        <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                                        <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                                        <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                                        <th className="text-left py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Joined</th>
                                        <th className="text-right py-3.5 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Users className="w-10 h-10 text-slate-700" />
                                                        <p className="text-slate-500 text-sm">No users found</p>
                                                        {searchQuery && (
                                                            <button
                                                                onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}
                                                                className="text-xs text-purple-400 hover:text-purple-300"
                                                            >
                                                                Clear filters
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <motion.tr
                                                    key={user.id}
                                                    variants={rowVariants}
                                                    layout
                                                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors duration-200 group"
                                                >
                                                    {/* Name + Avatar */}
                                                    <td className="py-3.5 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-md ${
                                                                user.is_active
                                                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                                                    : 'bg-gradient-to-br from-red-500 to-rose-600'
                                                            }`}>
                                                                {String(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                                <p className="text-xs text-slate-500 truncate sm:hidden">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Email */}
                                                    <td className="py-3.5 px-5 hidden sm:table-cell">
                                                        <span className="text-sm text-slate-300">{user.email}</span>
                                                    </td>

                                                    {/* Role Badge */}
                                                    <td className="py-3.5 px-5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                            user.is_active
                                                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                                                                : 'bg-red-500/15 text-red-300 border border-red-500/20'
                                                        }`}>
                                                            {user.is_active ? (
                                                                <><Shield className="w-3 h-3" /> Active</>
                                                            ) : (
                                                                <><AlertTriangle className="w-3 h-3" /> Inactive</>
                                                            )}
                                                        </span>
                                                    </td>

                                                    {/* Created */}
                                                    <td className="py-3.5 px-5 hidden md:table-cell">
                                                        <span className="text-sm text-slate-400">
                                                            {user.created_at
                                                                ? new Date(user.created_at).toLocaleDateString('en-US', {
                                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                                })
                                                                : '—'}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-3.5 px-5">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* Verify User Toggle */}
                                                            <button
                                                                onClick={() => handleVerifyUser(user)}
                                                                disabled={verifyingId === user.id}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                                                                    user.is_verified 
                                                                        ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200' 
                                                                        : 'bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200'
                                                                }`}
                                                                title={user.is_verified ? "Remove Verification" : "Verify user account"}
                                                            >
                                                                {verifyingId === user.id ? (
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                ) : user.is_verified ? (
                                                                    <><AlertTriangle className="w-3.5 h-3.5" /> Unverify</>
                                                                ) : (
                                                                    <><UserCheck className="w-3.5 h-3.5" /> Verify</>
                                                                )}
                                                            </button>

                                                            {/* Toggle Role */}
                                                            <button
                                                                onClick={() => handleToggleRole(user)}
                                                                disabled={!user.roleKnown || togglingId === user.id}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                                                                    user.is_active
                                                                        ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white'
                                                                        : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200'
                                                                }`}
                                                                title={user.roleKnown
                                                                    ? (user.role === 'admin' ? 'Demote to User' : 'Promote to Admin')
                                                                    : 'Role not available from server response'}
                                                            >
                                                                {togglingId === user.id ? (
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                ) : user.roleKnown && user.role === 'admin' ? (
                                                                    <><UserIcon className="w-3.5 h-3.5" /> Demote</>
                                                                ) : (
                                                                    <><Crown className="w-3.5 h-3.5" /> Promote</>
                                                                )}
                                                            </button>

                                                            {/* Toggle Status */}
                                                            <button
                                                                onClick={() => handleToggleStatus(user)}
                                                                disabled={togglingStatusId === user.id || typeof user.is_active !== 'boolean'}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                                                                    user.is_active
                                                                        ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                                                                        : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                                                }`}
                                                                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                                                            >
                                                                {togglingStatusId === user.id ? (
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                ) : user.is_active ? (
                                                                    <><AlertTriangle className="w-3.5 h-3.5" /> Deactivate</>
                                                                ) : (
                                                                    <><Shield className="w-3.5 h-3.5" /> Activate</>
                                                                )}
                                                            </button>

                                                            {/* Delete */}
                                                            <button
                                                                onClick={() => setDeletingUser(user)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                                                title="Delete user"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deletingUser && (
                    <DeleteModal
                        user={deletingUser}
                        onConfirm={handleDelete}
                        onCancel={() => setDeletingUser(null)}
                        isDeleting={isDeleting}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
