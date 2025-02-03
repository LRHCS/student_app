// Login

"use client";

import { useState } from "react";
import { supabase } from "@/app/utils/client";

export default function AuthPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
        });

        if (error) {
            console.error("Error logging in with Google:", error.message);
            setMessage("Failed to sign in with Google");
        }
    };

    const signInWithEmail = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
        });

        if (error) {
            console.error("Error logging in with email:", error.message);
            setMessage("Failed to send login link. Check your email.");
        } else {
            setMessage("Check your email for the login link!");
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Sign In</h1>
            <button
                onClick={signInWithGoogle}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
                Sign In with Google
            </button>
            <div className="mt-4">
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={signInWithEmail}
                    disabled={loading}
                    className={`ml-2 px-4 py-2 rounded-md text-white ${
                        loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-600"
                    }`}
                >
                    {loading ? "Sending..." : "Sign In with Email"}
                </button>
            </div>
            {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
        </div>
    );
}
