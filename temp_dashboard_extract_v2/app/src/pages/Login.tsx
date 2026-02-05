import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Mail, Terminal } from 'lucide-react';

interface LoginProps {
    onSwitchToRegister?: () => void;
}

export function Login({ onSwitchToRegister }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            login(data.token, data.user);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
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
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <Terminal className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center text-white font-bold">Welcome Back</CardTitle>
                    <CardDescription className="text-center text-slate-400">
                        Sign in to access your PMTA Dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-md text-center">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <a href="#" className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 rounded-md shadow-lg shadow-blue-900/20 transition-all duration-300 transform hover:scale-[1.02]"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>

                        <div className="text-center text-sm text-slate-500 mt-4">
                            Don't have an account? <button type="button" onClick={onSwitchToRegister} className="text-blue-400 hover:text-blue-300 font-medium">Create an account</button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Footer / Copyright */}
            <div className="absolute bottom-4 text-xs text-slate-600">
                &copy; 2026 PMTA Dashboard v2.0. Secure Access Required.
            </div>
        </div>
    );
}
