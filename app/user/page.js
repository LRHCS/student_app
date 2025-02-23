"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "../contexts/UserContext";

export default function UserProfile() {
    const router = useRouter();
    const { user } = useUser()
    const [loading, setLoading] = useState(false);
    const [avatar_url, setAvatarUrl] = useState("");
    const [uploading, setUploading] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (user?.avatar) {
            setAvatarUrl(user.avatar);
        }
    }, [user]);

    console.log(user);

    async function uploadAvatar(event) {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error("You must select an image to upload.");
            }

            const file = event.target.files[0];
            const fileExt = file.name.split(".").pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // **Step 1: List and delete existing files in user's avatar folder**
            const { data: existingFiles, error: listError } = await supabase.storage
                .from("avatar")
                .list(user.id);

            if (listError) {
                throw listError;
            }

            for (const file of existingFiles) {
                await supabase.storage.from("avatar").remove([`${user.id}/${file.name}`]);
            }

            // **Step 2: Upload new file**
            const { error: uploadError } = await supabase.storage
                .from("avatar")
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // **Step 3: Get public URL**
            const { data: urlData } = supabase.storage
                .from("avatar")
                .getPublicUrl(filePath);

            // **Step 4: Update profile**
            const { error: updateError } = await supabase
                .from("Profiles")
                .update({ avatar: urlData.publicUrl })
                .eq("id", user.id);

            if (updateError) {
                throw updateError;
            }

            // **Step 5: Update local state**
            if (urlData?.publicUrl) {
                setAvatarUrl(urlData.publicUrl);
            }
            location.reload();


        } catch (error) {
            alert(error.message);
        } finally {
            setUploading(false);
        }

    }

    async function submitFeedback(e) {
        e.preventDefault();
        try {
            setFeedbackLoading(true);
            const { error } = await supabase
                .from("feedback")
                .insert({ 
                    feedback,
                    user_id: user.id,
                    username: `${user.display_name}`
                });
            if (error) throw error;
            setFeedback("");
            alert("Thank you for your feedback!");
        } catch (error) {
            alert(error.message);
        } finally {
            setFeedbackLoading(false);
        }
    }

    async function signOut() {
        await supabase.auth.signOut();
        router.push("/");
    }

    async function updateDisplayName(e) {
        e.preventDefault();
        try {
            setIsUpdating(true);
            
            const { error } = await supabase
                .from('Profiles')
                .update({ display_name: newDisplayName })
                .eq('id', user.id);

            if (error) throw error;

            // Update the user context or reload the page
            location.reload();
            router.push("/dashboard");
        } catch (error) {
            alert('Error updating display name: ' + error.message);
        } finally {
            setIsUpdating(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <button
                onClick={() => router.push("/dashboard")}
                className="fixed top-4 left-4 px-4 py-2 bg-white text-gray-700 rounded-lg shadow hover:bg-gray-50 transition flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back
            </button>

            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-8">
                    <div className="flex flex-col items-center">
                        <div className="relative h-32 w-32 mb-4">
                            <Image
                                src={user?.avatar || '/default-avatar.png'}
                                alt="Profile"
                                fill
                                className="rounded-full object-cover border-4 border-white shadow-lg"
                            />
                            <label 
                                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-blue-600 transition"
                                htmlFor="avatar-upload"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={uploadAvatar}
                                disabled={uploading}
                                className="hidden"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {user?.display_name}
                            </h2>
                            <button
                                onClick={() => {
                                    setNewDisplayName(user?.display_name || '');
                                    setIsEditModalOpen(true);
                                }}
                                className="p-1 text-gray-500 hover:text-gray-700 transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-gray-500">{user?.email}</p>

                        <div className="mt-8 w-full">
                            <form onSubmit={submitFeedback} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Share Your Feedback
                                    </label>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="We'd love to hear your thoughts..."
                                        rows="4"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={feedbackLoading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    {feedbackLoading ? "Submitting..." : "Submit Feedback"}
                                </button>
                            </form>

                            <button
                                onClick={signOut}
                                className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Display Name Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Edit Display Name
                            </h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={updateDisplayName} className="space-y-4">
                            <div>
                                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    id="displayName"
                                    value={newDisplayName}
                                    onChange={(e) => setNewDisplayName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="Enter new display name"
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    {isUpdating ? "Updating..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
