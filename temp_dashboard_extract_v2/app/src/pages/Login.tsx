import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock, Mail, Terminal, ArrowRight, Sparkles, Shield, Zap, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const floatingFeatures = [
    { icon: Shield, label: 'Enterprise Security', x: '10%', y: '20%', delay: 0 },
    { icon: Zap, label: 'Instant Deploy', x: '65%', y: '15%', delay: 0.3 },
    { icon: Globe, label: 'DNS Automation', x: '15%', y: '70%', delay: 0.6 },
    { icon: Terminal, label: 'CLI Access', x: '70%', y: '65%', delay: 0.9 },
];

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [needs2FA, setNeeds2FA] = useState(false);
    const [totpCode, setTotpCode] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const body: Record<string, string> = { email, password };
            if (needs2FA && totpCode) {
                body.totp_code = totpCode;
            }

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Check if 2FA is required
            if (data.requires_2fa) {
                setNeeds2FA(true);
                return;
            }

            // Detect token from multiple possible response formats
            const token = data.token || data.access_token || data?.data?.token || null;
            if (!token) {
                console.error('[Login] Login response missing token. Full response:', data);
                throw new Error('Login failed: no token received from server');
            }
            console.log('[Login] Saved token:', token);
            login(token, data.user);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[hsl(222,47%,6%)]">
            {/* Left Panel — Branding & Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-cyan-600/20" />
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/15 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/15 rounded-full blur-[120px]" />

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
                />

                {/* Floating Feature Badges */}
                {floatingFeatures.map((feat, i) => (
                    <motion.div
                        key={feat.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: feat.delay + 0.5 }}
                        className="absolute"
                        style={{ left: feat.x, top: feat.y }}
                    >
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg"
                        >
                            <feat.icon className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-slate-300 font-medium whitespace-nowrap">{feat.label}</span>
                        </motion.div>
                    </motion.div>
                ))}

                {/* Center Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-900/40 mx-auto mb-8">
                            <Terminal className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold mb-4">
                            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">VelkoMTA</span>
                            <span className="text-blue-400 ml-2">Cloud</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-sm leading-relaxed">
                            Deploy and manage your email infrastructure with enterprise-grade tools.
                        </p>

                        {/* Mini Stats */}
                        <div className="flex gap-8 mt-10 justify-center">
                            {[
                                { val: '1000+', label: 'IPs Deployed' },
                                { val: '99.9%', label: 'Uptime' },
                                { val: '<30s', label: 'Deploy Time' },
                            ].map((s) => (
                                <div key={s.label} className="text-center">
                                    <div className="text-xl font-bold text-white">{s.val}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
                {/* Background blobs for mobile */}
                <div className="lg:hidden absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/15 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/15 rounded-full blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="w-full max-w-md z-10"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <Terminal className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
                            <Sparkles className="w-3 h-3" />
                            Secure Access
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
                        <p className="text-slate-400">Sign in to your VelkoMTA Cloud Console</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-3 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors duration-200" />
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 transition-all duration-200"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-slate-300">Password</label>
                                <a href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-3 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors duration-200" />
                                <input
                                    type="password"
                                    placeholder="••••••••••"
                                    className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/60 transition-all duration-200"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* 2FA TOTP Code Input */}
                        {needs2FA && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                            >
                                <label className="text-sm font-medium text-slate-300 ml-1">2FA Code</label>
                                <p className="text-xs text-slate-500 ml-1">Enter the 6-digit code from your authenticator app</p>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    className="w-full bg-slate-900/60 border border-emerald-500/40 rounded-xl py-3 px-4 text-center text-2xl text-white tracking-[0.5em] font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 transition-all duration-200"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                />
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-900/25 transition-all duration-300 hover:shadow-blue-900/40 hover:scale-[1.02] group text-base"
                            disabled={isLoading || (needs2FA && totpCode.length !== 6)}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {needs2FA ? 'Verifying...' : 'Signing in...'}
                                </div>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {needs2FA ? 'Verify & Sign In' : 'Sign In'}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </Button>

                        <div className="text-center text-sm text-slate-500 pt-2">
                            Don't have an account?{' '}
                            <Link
                                to="/register"
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Create an account
                            </Link>
                        </div>
                    </form>

                    {/* Bottom Trust Indicators */}
                    <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Shield className="w-3.5 h-3.5" />
                            256-bit SSL
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Lock className="w-3.5 h-3.5" />
                            Encrypted
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Zap className="w-3.5 h-3.5" />
                            Fast Login
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
