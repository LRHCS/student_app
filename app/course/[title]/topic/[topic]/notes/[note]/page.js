"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import MDEditor from '@uiw/react-md-editor';
import { supabase } from "@/app/utils/client";

export default function NotePage({ params }) {
    const pathname = usePathname();
    const router = useRouter();
    const [note, setNote] = useState("");
    const [title, setTitle] = useState("");

    const courseTitle = decodeURIComponent(pathname.split('/')[2]);
    const topicTitle = decodeURIComponent(pathname.split('/')[4]);
    const lessonTitle = decodeURIComponent(pathname.split('/')[6]);
    const lessonId  = decodeURIComponent(pathname.split('/')[6]);


    useEffect(() => {
        fetchLesson();
        const fetchTitle = async () => {
            const fetchedTitle = await noteTitle();
            setTitle(fetchedTitle);
        };

        fetchTitle();
    }, [lessonId]);

    const fetchLesson = async () => {
        console.log('Params:', params);
        console.log('Lesson ID:', lessonId);
        if (!lessonId) {
            console.error('Lesson ID is undefined');
            return;
        }

        const { data, error } = await supabase
            .from('Lessons')
            .select('*')
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error fetching lesson:', error.message);
        } else if (data) {
            setNote(data.content || '');
        }
    };

    const handleNoteChange = async (value) => {
        setNote(value);

        if (!lessonId) {
            console.error('Lesson ID is undefined');
            return;
        }

        const { error } = await supabase
            .from('Lessons')
            .update({ content: value })
            .eq('id', lessonId);

        if (error) {
            console.error('Error updating lesson content:', error.message);
        }
    };

    const noteTitle = async () => {
        const { data, error } = await supabase
            .from('Lessons')
            .select('title') // Only fetch the title column
            .eq('id', lessonId)
            .single();

        if (error) {
            console.error('Error fetching note title:', error.message);
            return null;
        }

        return data?.title || 'Untitled'; // Return the title or fallback
    };



    return (
        <div className="h-screen flex flex-col" data-color-mode="light">
            <div className="flex items-center p-4 border-b border-gray-300 bg-gray-100">
                <div className="mb-6">
                    <Link href="../../../../../" className="hover:underline">
                        Dashboard
                    </Link>
                    <span> / </span>
                    <Link href="../../../" className="hover:underline ">
                        {courseTitle}
                    </Link>
                    <span> / </span>

                    <Link href=".." className="hover:underline">
                        {topicTitle}
                    </Link>
                    <span> / </span>

                    <span className="font-bold">{title}</span>
                </div>
            </div>
            <MDEditor
                value={note}
                onChange={handleNoteChange}
                placeholder="Write your note here..."
                className="flex-grow p-4 text-lg border-none outline-none resize-none"
            />
        </div>
    );
}
