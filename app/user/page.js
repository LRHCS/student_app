"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/client";
import { redirect } from "next/navigation";
import Image from "next/image";

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("");
    const [avatar_url, setAvatarUrl] = useState("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setUser(user);
                let { data, error, status } = await supabase
                    .from("Profiles")
                    .select(`firstname, lastname, avatar`)
                    .eq("id", user.id)
                    .single();

                if (error && status !== 406) {
                    throw error;
                }

                if (data) {
                    setUsername(`${data.firstname} ${data.lastname}`);
                    setAvatarUrl(data.avatar);
                }
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    }

    async function updateProfile() {
        try {
            setLoading(true);


            if (error) throw error;
            alert('Profile updated!');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    }

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
            setAvatarUrl(urlData.publicUrl);

        } catch (error) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    }



    async function signOut() {
        await supabase.auth.signOut();
        redirect("/");
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-gray-500">Loading...</div>;
    }

    return (
        <div>
            <button
                onClick={() => redirect("/")}
                className="absolute top-4 left-4 w-fit bg-gray-800 text-white py-2 rounded-lg hover:bg-gray-900 transition"
            >
                Homepage
            </button>
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-sm">
                    {/* Profile Image */}
                    <div className="flex flex-col items-center">
                        <div className="h-24 w-24 relative ">
                            <Image
                                src={avatar_url || '/default-avatar.png'}
                                alt="avatar"
                                fill={true}
                                className="rounded-full shadow-md object-cover"
                            />
                        </div>

                        <label className="button primary block mt-2" htmlFor="single">
                            {uploading ? 'Uploading ...' : 'Upload Avatar'}
                        </label>
                        <input
                            style={{
                                visibility: 'hidden',
                                position: 'absolute',
                            }}
                            type="file"
                            id="single"
                            accept="image/*"
                            onChange={uploadAvatar}
                            disabled={uploading}
                        />
                        <h2 className="mt-4 text-lg font-semibold text-gray-800">{username}</h2>
                    </div>




                    {/* Buttons */}
                    <div className="mt-6 flex flex-col gap-2">

                        <button
                            onClick={signOut}
                            className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
