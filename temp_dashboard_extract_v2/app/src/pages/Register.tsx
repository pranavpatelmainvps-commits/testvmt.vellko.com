import { useState } from 'react';
import { fetchApi } from '@/lib/api'; // Use shared api
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Mail, User, Terminal, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Register() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validatePassword = (password: string) => {
        // Minimum 8 characters, at least 2 uppercase, 2 lowercase, 2 numbers, and 2 special characters
        const re = /^(?=(?:.*[A-Z]){2})(?=(?:.*[a-z]){2})(?=(?:.*\d){2})(?=(?:.*[@$!%*#?&]){2})[A-Za-z\d@$!%*#?&]{8,}$/;
        return re.test(password);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (firstName.trim().length < 2) {
            setError('First name must be at least 2 characters long.');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address (e.g., user@example.com)');
            return;
        }

        if (!validatePassword(password)) {
            setError('Password must contain at least 2 uppercase letters, 2 lowercase letters, 2 numbers, and 2 special characters.');
            return;
        }

        setIsLoading(true);

        try {
            await fetchApi('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password, role: 'user' }), // Default role user
            });

            setSuccess('Account created successfully! You can now sign in.');
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            // Auto-switch to login after delay
            setTimeout(() => navigate('/login'), 2000);
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
                        Join the VelkoMTA Dashboard
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">First Name</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 group-focus-within:text-green-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="John"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 pl-10 pr-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        minLength={2}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">Last Name</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Doe (Optional)"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-md py-2 px-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                </div>
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
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                Requires at least: 2 uppercase, 2 lowercase, 2 numbers, and 2 special characters (@$!%*#?&).
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2 rounded-md shadow-lg shadow-green-900/20 transition-all duration-300 transform hover:scale-[1.02]"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </Button>

                        <div className="text-center mt-4">
                            <Link
                                to="/login"
                                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center w-full gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Sign In
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="absolute bottom-4 text-xs text-slate-600">
                &copy; 2026 VelkoMTA Dashboard.
            </div>
        </div>
    );
}
