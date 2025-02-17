"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AiOutlinePlus } from "react-icons/ai";
import { supabase } from "@/app/utils/client";
import ProfileLink from "@/app/components/ProfileLink";
import PracticeQuestionsList from "@/app/components/PracticeQuestionsList";

export default function Page({ params }) {
    const [lessons, setLessons] = useState([]);
    const [topicData, setTopicData] = useState(null);

    const pathname = usePathname();
    const router = useRouter();
    const topicTitle = decodeURIComponent(pathname.split("/").pop());
    const courseTitle = decodeURIComponent(pathname.split("/")[2]);

    useEffect(() => {
        fetchLessons();
    }, [topicTitle]);

    const fetchLessons = async () => {
        const { data: topic, error: topicError } = await supabase
            .from('Topics')
            .select('id')
            .eq('title', topicTitle)
            .single();

        if (topicError) {
            console.error('Error fetching topic:', topicError);
            return;
        }

        // Save topic data for use in PracticeQuestionsList
        setTopicData(topic);

        const { data: lessons, error: lessonsError } = await supabase
            .from('Lessons')
            .select('*')
            .eq('topic_id', topic.id)
            .order('id', { ascending: true });

        if (lessonsError) {
            console.error('Error fetching lessons:', lessonsError);
        } else {
            setLessons(lessons);
        }
    };

    const addLesson = async () => {
        const newLessonTitle = prompt("Enter the new lesson title:");
        if (!newLessonTitle) return;

        const { data: topic, error: topicError } = await supabase
            .from('Topics')
            .select('id')
            .eq('title', topicTitle)
            .single();

        if (topicError) {
            console.error('Error fetching topic:', topicError);
            return;
        }

        const { data, error } = await supabase
            .from('Lessons')
            .insert([{ title: newLessonTitle, topic_id: topic.id }])
            .select();

        if (error) {
            console.error('Error adding lesson:', error);
        } else {
            setLessons([...lessons, data[0]]);
        }
    };

    const deleteLesson = async (lessonId) => {
        const { error } = await supabase
            .from('Lessons')
            .delete()
            .eq('id', lessonId);

        if (error) {
            console.error('Error deleting lesson:', error);
        } else {
            setLessons(lessons.filter(lesson => lesson.id !== lessonId));
        }
    };

    const updateLessonTitle = async (lessonId, newTitle) => {
        if (!newTitle) return;

        const { error } = await supabase
            .from('Lessons')
            .update({ title: newTitle })
            .eq('id', lessonId);

        if (error) {
            console.error('Error updating lesson title:', error);
        } else {
            setLessons(lessons.map(lesson =>
                lesson.id === lessonId ? { ...lesson, title: newTitle } : lesson
            ));
        }
    };

    return (
        <div className="p-6 relative">
            <ProfileLink />
            <div className="mb-6">
                <Link href="../../.." className="hover:underline ">
                    Dashboard
                </Link>
                <span> / </span>
                <Link href=".." className="hover:underline ">
                     {courseTitle}
                </Link>
                <span> /</span>
                <span className="font-bold"> {topicTitle}</span>
            </div>
            <div className="flex items-center">
                <h1 className="text-4xl font-bold m-4 mb-6 ml-0 align-middle text-center">{topicTitle} Notes</h1>
                <button
                    onClick={addLesson}
                    className="text-xl text-gray-500 bold hover:text-gray-700"
                >
                    <AiOutlinePlus className="text-2xl"/>
                </button>
            </div>
            { topicData && <PracticeQuestionsList examId={topicData.id} /> }
            <div>
                <h2 className="text-2xl font-semibold mb-4"></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lessons.map((lesson) => (
                        <div
                            key={lesson.id}
                            className="p-4 border border-gray-300 rounded shadow-sm flex flex-col"
                        >
                            <input
                                className="text-lg font-medium mb-2 p-2"
                                value={lesson.title}
                                onChange={(e) => updateLessonTitle(lesson.id, e.target.value)}
                            />
                            <div className="mt-auto flex justify-between items-center">
                                <Link
                                    href={`${pathname}/notes/${lesson.id}`}
                                    className="font-bold underline"
                                >
                                    Open Notes
                                </Link>
                                <button
                                    onClick={() => deleteLesson(lesson.id)}
                                    className="p-2 border rounded-lg border-gray-500"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
