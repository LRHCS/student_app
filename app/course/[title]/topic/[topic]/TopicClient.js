"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AiOutlinePlus } from "react-icons/ai";
import { supabase } from "../../../../utils/supabase/client";
import ProfileLink from "../../../../components/Header";
import PracticeQuestionsList from "../../../../exam/[id]/PracticeQuestionsList";
import LoadingCard from "../../../../components/LoadingCard";
import { PiCardsFill } from "react-icons/pi";

export default function TopicClient({ initialData }) {
    const [lessons, setLessons] = useState(initialData.lessons);
    const [assignments, setAssignments] = useState(initialData.assignments);
    const router = useRouter();

    const addLesson = async () => {
        const newLessonTitle = prompt("Enter the new lesson title:");
        if (!newLessonTitle) return;

        const { data, error } = await supabase
            .from('Lessons')
            .insert([{ 
                title: newLessonTitle, 
                topic_id: initialData.topic.id 
            }])
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
                <Link href="../../../" className="hover:underline">
                    Dashboard
                </Link>
                <span> / </span>
                <Link href=".." className="hover:underline">
                    {initialData.courseTitle}
                </Link>
                <span> /</span>
                <span className="font-bold"> {initialData.topicTitle}</span>
            </div>

            <div className="flex items-center">
                <h1 className="text-4xl font-bold m-4 mb-6 ml-0 align-middle text-center">
                    {initialData.topicTitle} Notes
                </h1>
                <button
                    onClick={addLesson}
                    className="text-xl text-gray-500 bold hover:text-gray-700"
                >
                    <AiOutlinePlus className="text-2xl"/>
                </button>
            </div>

            {/* Study Tools Section */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <h2 className="text-2xl font-semibold mb-4">Practice Questions</h2>
                    <PracticeQuestionsList examId={initialData.topic.id} />
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Flashcards</h2>
                        <Link 
                            href={`/flashcards?topicId=${initialData.topic.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <PiCardsFill className="text-xl" />
                            <span>Study Now</span>
                        </Link>
                    </div>
                    <p className="text-gray-600">
                        Review key concepts and test your knowledge with interactive flashcards
                    </p>
                </div>
            </div>

            {/* Lessons Section */}
            <div>
                <h2 className="text-2xl font-semibold mb-4">Lessons</h2>
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
                                    href={`${initialData.topicTitle}/notes/${lesson.id}`}
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

            {/* Assignments Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Assignments</h2>
                {assignments.length > 0 ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assignments.map(assignment => (
                            <li key={assignment.id} className="p-4 border border-gray-300 rounded shadow-sm">
                                <span className="font-medium">{assignment.title}</span>
                                <span className="text-sm text-gray-500 block">
                                    {assignment.date}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No assignments found.</p>
                )}
            </div>
        </div>
    );
} 