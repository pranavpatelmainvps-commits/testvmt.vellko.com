import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    created_at: string;
}

export function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const loadUsers = async () => {
        try {
            const data = await fetchApi<{ users: User[] }>('/api/admin/users');
            setUsers(data.users);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleDelete = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await fetchApi(`/api/admin/users/${userId}`, { method: 'DELETE' });
            toast.success('User deleted successfully');
            loadUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete user');
        }
    };

    const handleToggleRole = async (user: User) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        try {
            await fetchApi(`/api/admin/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            toast.success(`User role updated to ${newRole}`);
            loadUsers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to update role');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-slate-400">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-sm text-slate-400">Manage users and permissions</p>
                </div>
            </div>

            <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Users className="w-5 h-5" />
                        All Users ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Role</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Created</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                                    <UserIcon className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-white font-medium">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleToggleRole(user)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${user.role === 'admin'
                                                    ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-sm">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
