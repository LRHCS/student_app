"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export default function NotePage({ params }) {
    const { lessonId } = params;
    const pathname = usePathname();
    const router = useRouter();
    const [note, setNote] = useState("");
    const courseTitle = pathname.split('/')[2];
    const topicTitle = pathname.split('/')[4];
    const lessonTitle = decodeURIComponent(pathname.split('/')[6]);

    useEffect(() => {
        // Load the note when the component mounts
        const appData = JSON.parse(localStorage.getItem('appData') || '{}');
        const courseTitle = pathname.split('/')[2];
        const topicTitle = pathname.split('/')[4];
        const lessonTitle = decodeURIComponent(pathname.split('/')[6]);

        const course = appData.courses.find(c => c.title === courseTitle);
        const topic = course?.topics.find(t => t.title === topicTitle);
        const lesson = topic?.lessons.find(l => l.title === lessonTitle);

        if (lesson) {
            setNote(lesson.note || '');
        }
    }, [pathname]);

    const handleNoteChange = (e) => {
        const newNote = e.target.value;
        setNote(newNote);

        // Update the note in localStorage
        const appData = JSON.parse(localStorage.getItem('appData') || '{}');


        const updatedCourses = appData.courses.map(course => {
            if (course.title === courseTitle) {
                const updatedTopics = course.topics.map(topic => {
                    if (topic.title === topicTitle) {
                        const updatedLessons = topic.lessons.map(lesson => {
                            if (lesson.title === lessonTitle) {
                                return { ...lesson, note: newNote };
                            }
                            return lesson;
                        });
                        return { ...topic, lessons: updatedLessons };
                    }
                    return topic;
                });
                return { ...course, topics: updatedTopics };
            }
            return course;
        });

        localStorage.setItem('appData', JSON.stringify({ ...appData, courses: updatedCourses }));
    };


    return (
        <div className="h-screen flex flex-col">
            <div className="flex items-center p-4 border-b border-gray-300 bg-gray-100">
                <div className="mb-6">
                    <Link href="../../../../../" className="hover:underline text-blue-500">
                        Courses
                    </Link>
                    <Link href="../../../" className="hover:underline text-blue-500">
                        / {courseTitle}
                    </Link>
                    <Link href="../" className="hover:underline text-blue-500">
                        / {topicTitle}
                    </Link>
                    <span> / {lessonTitle}</span>
                </div>
            </div>
            <textarea
                value={note}
                onInput={handleNoteChange}
                placeholder="Write your note here..."
                className="flex-grow p-4 text-lg border-none outline-none resize-none"
            ></textarea>
        </div>
    );
}
