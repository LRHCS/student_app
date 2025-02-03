import { useState } from "react";
import { supabase } from "@/app/utils/client";

export default function AuthPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
        });

        if (error) {
            console.error("Error logging in with Google:", error.message);
            setMessage("Failed to sign in with Google");
        }
    };

    const signInWithEmailAndPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email : email,
            password: password,
        });

        if (error) {
            console.error("Error logging in:", error.message);
            setMessage("Failed to log in. Check your credentials.");
        } else {
            setMessage("Logged in successfully!");
        }
        setLoading(false);
    };

    const signUpWithEmailAndPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Error signing up:", error.message);
            setMessage("Failed to sign up. Please try again.");
        } else {
            const { error: profileError } = await supabase
                .from('Profiles')
                .insert({
                    id: data.user.id,
                    firstname: firstName,
                    lastname: lastName,
                    password: password,
                    email: email,
                });

            if (profileError) {
                console.error("Error creating profile:", profileError.message);
                setMessage("Account created, but profile setup failed.");
            } else {
                setMessage("Account created successfully! Please check your email to verify your account.");
            }
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">{isSignUp ? "Sign Up" : "Sign In"}</h1>
            <button
                onClick={signInWithGoogle}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 mb-4"
            >
                Sign In with Google
            </button>
            <form onSubmit={isSignUp ? signUpWithEmailAndPassword : signInWithEmailAndPassword} className="space-y-4">
                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                {isSignUp && (
                    <>
                        <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full px-4 py-2 rounded-md text-white ${
                        loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                    }`}
                >
                    {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
                </button>
            </form>
            <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="mt-4 text-blue-500 hover:underline"
            >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
            {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
        </div>
    );
}
