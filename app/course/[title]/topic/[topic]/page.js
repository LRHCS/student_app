"use client";

import {use, useEffect, useState} from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {AiOutlinePlus} from "react-icons/ai";

export default function Page({params}) {
    const resolvedParams = use(params);
    const title = decodeURIComponent(resolvedParams.title);

    const pathname = usePathname();
    const [lessons, setLessons] = useState([]);
    const [newLessonTitle, setNewLessonTitle] = useState("");
    const topicTitle = decodeURIComponent(pathname.split("/").pop());
    const courseTitle = decodeURIComponent(pathname.split("/")[2]);

    useEffect(() => {
        const data = JSON.parse(localStorage.getItem("appData") || "{}");

        const getLessonsByTopicTitle = (courses, topicTitle) => {
            for (const course of courses) {
                for (const topic of course.topics || []) {
                    if (topic.title === topicTitle) {
                        return topic.lessons || [];
                    }
                }
            }
            return [];
        };

        const topicLessons = getLessonsByTopicTitle(data.courses, topicTitle);
        setLessons(topicLessons);
    }, [topicTitle]);

    const addLesson = () => {
        const newLessonTitle = prompt("Enter the new lesson title:");

        if (!newLessonTitle) return;

        const newLesson = {
            id: Date.now(),
            title: newLessonTitle,
            note: ""
        };

        const updatedCourses = JSON.parse(localStorage.getItem("appData") || "{}");
        const courseIndex = updatedCourses.courses.findIndex((course) =>
            course.topics.some((topic) => topic.title === topicTitle)
        );

        if (courseIndex > -1) {
            const topicIndex = updatedCourses.courses[courseIndex].topics.findIndex(
                (topic) => topic.title === topicTitle
            );
            updatedCourses.courses[courseIndex].topics[topicIndex].lessons.push(newLesson);
            localStorage.setItem("appData", JSON.stringify(updatedCourses));
            setLessons(updatedCourses.courses[courseIndex].topics[topicIndex].lessons);
        }

        setNewLessonTitle("");
    };

    const deleteLesson = (lessonId) => {
        const updatedCourses = JSON.parse(localStorage.getItem("appData") || "{}");
        const courseIndex = updatedCourses.courses.findIndex((course) =>
            course.topics.some((topic) => topic.title === topicTitle)
        );

        if (courseIndex > -1) {
            const topicIndex = updatedCourses.courses[courseIndex].topics.findIndex(
                (topic) => topic.title === topicTitle
            );
            updatedCourses.courses[courseIndex].topics[topicIndex].lessons = updatedCourses.courses[courseIndex].topics[
                topicIndex
                ].lessons.filter((lesson) => lesson.id !== lessonId);

            localStorage.setItem("appData", JSON.stringify(updatedCourses));
            setLessons(updatedCourses.courses[courseIndex].topics[topicIndex].lessons);
        }
    };

    const updateLessonTitle = (lessonId, newTitle) => {
        if (!newTitle) return;

        const updatedCourses = JSON.parse(localStorage.getItem("appData") || "{}");
        const courseIndex = updatedCourses.courses.findIndex((course) =>
            course.topics.some((topic) => topic.title === topicTitle)
        );

        if (courseIndex > -1) {
            const topicIndex = updatedCourses.courses[courseIndex].topics.findIndex(
                (topic) => topic.title === topicTitle
            );
            const lesson = updatedCourses.courses[courseIndex].topics[topicIndex].lessons.find(
                (lesson) => lesson.id === lessonId
            );

            if (lesson) {
                lesson.title = newTitle;
                localStorage.setItem("appData", JSON.stringify(updatedCourses));
                setLessons([...updatedCourses.courses[courseIndex].topics[topicIndex].lessons]);
            }
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <Link href="../../../" className="hover:underline text-blue-500">
                    Courses
                </Link>
                <Link href="../" className="hover:underline text-blue-500">
                    / {courseTitle} /
                </Link>
                <span> {topicTitle}</span>
            </div>

            <h1 className="text-4xl font-bold mb-6">{topicTitle}</h1>


            <button
                onClick={addLesson}
                className="fixed bottom-8 right-8 p-4 rounded-full shadow-lg hover:bg-gray-300 bg-gray-200"
            >
                <AiOutlinePlus className="text-2xl"/>
            </button>

            <div>
                <h2 className="text-2xl font-semibold mb-4">Lessons:</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lessons.map((lesson) => (
                        <div
                            key={lesson.id}
                            className="p-4 border border-gray-300 rounded shadow-sm flex flex-col"
                        >
                            <input
                                className="text-lg font-medium mb-2 p-2 border border-gray-200 rounded"
                                value={lesson.title}
                                onChange={(e) => updateLessonTitle(lesson.id, e.target.value)}
                            />
                            <div className="mt-auto flex justify-between items-center">
                                <Link
                                    href={`${pathname}/notes/${lesson.title}`}
                                    className="text-blue-500 underline"
                                >
                                    Open Notes
                                </Link>
                                <button
                                    onClick={() => deleteLesson(lesson.id)}
                                    className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
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
