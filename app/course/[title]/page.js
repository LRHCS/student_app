"use client";

import {use, useEffect, useState} from "react";
import Link from "next/link";
import { Card } from "@/app/UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import {useParams} from "next/navigation";

export default function Page({ params }) {
    const resolvedParams = use(params);
    const title = decodeURIComponent(resolvedParams.title);
    const [topics, setTopics] = useState([]);

    // Load topics for the selected course
    useEffect(() => {
        const data = JSON.parse(localStorage.getItem("appData") || "{}");

        const getTopicsByCourseTitle = (courses, courseTitle) => {
            const course = courses?.find((course) => course.title === courseTitle);
            return course ? course.topics || [] : []; // Default to an empty array
        };

        const courseTopics = getTopicsByCourseTitle(data.courses || [], title); // Handle missing courses
        setTopics(courseTopics);
    }, [title]);

    // Add a new topic via prompt
    const addTopic = () => {
        const newTopicTitle = prompt("Enter the new topic title:");
        if (newTopicTitle) {
            const newTopic = { id: Date.now(), title: newTopicTitle, lessons: [] };
            const updatedCourses = JSON.parse(localStorage.getItem("appData") || "{}");
            const courseIndex = updatedCourses.courses?.findIndex((course) => course.title === title);

            if (courseIndex > -1) {
                updatedCourses.courses[courseIndex].topics = updatedCourses.courses[courseIndex].topics || [];
                updatedCourses.courses[courseIndex].topics.push(newTopic);
                localStorage.setItem("appData", JSON.stringify(updatedCourses));
                setTopics([...updatedCourses.courses[courseIndex].topics]);
            }
        }
    };

    // Edit a topic title
    const editTopic = (topicId) => {
        const newTitle = prompt("Enter the new topic title:");
        if (newTitle) {
            const updatedCourses = JSON.parse(localStorage.getItem("appData") || "{}");
            const courseIndex = updatedCourses.courses?.findIndex((course) => course.title === title);

            if (courseIndex > -1) {
                const topicIndex = updatedCourses.courses[courseIndex].topics?.findIndex(
                    (topic) => topic.id === topicId
                );
                if (topicIndex > -1) {
                    updatedCourses.courses[courseIndex].topics[topicIndex].title = newTitle;
                    localStorage.setItem("appData", JSON.stringify(updatedCourses));
                    setTopics([...updatedCourses.courses[courseIndex].topics]);
                }
            }
        }
    };

    // Delete a topic
    const deleteTopic = (topicId) => {
        const updatedCourses = JSON.parse(localStorage.getItem("appData") || "{}");
        const courseIndex = updatedCourses.courses?.findIndex((course) => course.title === title);

        if (courseIndex > -1) {
            updatedCourses.courses[courseIndex].topics = updatedCourses.courses[courseIndex].topics?.filter(
                (topic) => topic.id !== topicId
            );
            localStorage.setItem("appData", JSON.stringify(updatedCourses));
            setTopics(updatedCourses.courses[courseIndex].topics || []);
        }
    };

    return (
        <div className="p-4 relative">
            <Link href="../" className="hover:underline mb-4 inline-block text-blue-500">
                Courses
            </Link>
            <span> / {title}</span>

            <h1 className="text-4xl font-bold mb-6">{title}</h1>
            <h2 className="text-2xl font-semibold mb-4">Topics:</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic) => (
                    <Card key={topic.id} className="p-4 flex items-center justify-between w-full">
                        <Link href={`${title}/topic/${topic.title}`} className="text-lg font-medium">
                            {topic.title}
                        </Link>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => editTopic(topic.id)}
                                className="p-2 text-gray-950"
                            >
                                <CiEdit/>
                            </button>
                            <button
                                onClick={() => deleteTopic(topic.id)}
                                className="p-2  text-red-700 rounded"
                            >
                                <RiDeleteBin5Line/>
                            </button>
                        </div>
                    </Card>
                ))}
            </ul>

            <button
                onClick={addTopic}
                className="fixed bottom-8 right-8 p-4 rounded-full shadow-lg hover:bg-gray-300 bg-gray-200"
            >
                <AiOutlinePlus className="text-2xl"/>
            </button>
        </div>
    );
}
