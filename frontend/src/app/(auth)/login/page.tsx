"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        const next = searchParams.get("next") || "/chat";
        router.push(next);
        router.refresh();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-12"
        >
            {/* Logo & Branding */}
            <div className="flex flex-col items-center space-y-6">
                <div className="flex items-center gap-3.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a1a]" />
                    <span className="text-[11px] font-bold tracking-[0.4em] uppercase text-[#1a1a1a] opacity-60">
                        HeyPoco
                    </span>
                </div>
                <h1 className="text-[40px] font-medium text-[#1a1a1a] tracking-tight text-center leading-[1.1]">
                    Welcome back.
                </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-8">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-[10px] font-bold text-[#1a1a1a]/40 uppercase tracking-[0.15em] ml-1">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full h-14 rounded-2xl border border-[#e5e5e5] bg-white px-5 text-[15px] text-[#1a1a1a] placeholder:text-[#1a1a1a]/15 focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)]"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-[10px] font-bold text-[#1a1a1a]/40 uppercase tracking-[0.15em] ml-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full h-14 rounded-2xl border border-[#e5e5e5] bg-white px-5 text-[15px] text-[#1a1a1a] placeholder:text-[#1a1a1a]/15 focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)]"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs text-red-500 font-medium text-center"
                    >
                        {error}
                    </motion.p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 rounded-2xl bg-[#1a1a1a] text-[15px] font-bold text-white hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-black/10 active:scale-[0.98] mt-2"
                >
                    {loading ? "Verifying..." : "Sign in"}
                </button>
            </form>

            <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-[1px] flex-1 bg-[#e5e5e5]/50" />
                    <span className="text-[10px] font-bold text-[#1a1a1a]/20 uppercase tracking-[0.2em]">or</span>
                    <div className="h-[1px] flex-1 bg-[#e5e5e5]/50" />
                </div>

                <button
                    type="button"
                    className="w-full h-14 rounded-2xl border border-[#e5e5e5] bg-white flex items-center justify-center gap-3 text-[15px] font-medium text-[#1a1a1a] hover:bg-[#faf9f6] transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] active:scale-[0.98]"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Continue with Google
                </button>
            </div>

            <div className="flex flex-col items-center space-y-5 pt-8 border-t border-[#e5e5e5]/40">
                <p className="text-[14px] text-[#1a1a1a]/40 tracking-tight">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-[#1a1a1a] font-bold hover:underline underline-offset-4">
                        Create one
                    </Link>
                </p>
            </div>
        </motion.div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
