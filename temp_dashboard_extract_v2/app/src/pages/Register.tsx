import { useState } from 'react';
import { fetchApi } from '@/lib/api'; // Use shared api
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Mail, User, Terminal, ArrowLeft } from 'lucide-react';

interface RegisterProps {
    onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: RegisterProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            await fetchApi('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, role: 'user' }), // Default role user
            });

            setSuccess('Account created successfully! You can now sign in.');
            setName('');
            setEmail('');
            setPassword('');
            // Optional: Auto-switch to login after delay
            // setTimeout(onSwitchToLogin, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)] p-4 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
            </div>

            <Card className="glass-card w-full max-w-md z-10 border-slate-700/50">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/20">
                            <Terminal className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center text-white font-bold">Create Account</CardTitle>
                    <CardDescription className="text-center text-slate-400">
                        Join the PowerMTA Dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-md text-center">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-md text-center">
                                {success}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2 rounded-md shadow-lg shadow-green-900/20 transition-all duration-300 transform hover:scale-[1.02]"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </Button>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={onSwitchToLogin}
                                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center w-full gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Sign In
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="absolute bottom-4 text-xs text-slate-600">
                &copy; 2026 PMTA Dashboard.
            </div>
        </div>
    );
}
