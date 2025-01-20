"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/app/UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";

export default function Dashboard() {
    const [courses, setCourses] = useState([]);

    // Load courses from localStorage on mount
    useEffect(() => {
        const data = JSON.parse(localStorage.getItem("appData")) || { courses: [] };
        setCourses(data.courses);
    }, []);

    // Add a new course via prompt
    const addCourse = () => {
        const courseTitle = prompt("Enter the course title:");
        if (courseTitle) {
            const newCourse = { id: Date.now(), title: courseTitle, topics: [] };
            const updatedCourses = [...courses, newCourse];
            setCourses(updatedCourses);
            localStorage.setItem("appData", JSON.stringify({ courses: updatedCourses }));
        }
    };

    // Edit an existing course
    const editCourse = (courseId) => {
        const newTitle = prompt("Enter the new course title:");
        if (newTitle) {
            const updatedCourses = courses.map((course) =>
                course.id === courseId ? { ...course, title: newTitle } : course
            );
            setCourses(updatedCourses);
            localStorage.setItem("appData", JSON.stringify({ courses: updatedCourses }));
        }
    };

    // Delete a course
    const deleteCourse = (courseId) => {
        const updatedCourses = courses.filter((course) => course.id !== courseId);
        setCourses(updatedCourses);
        localStorage.setItem("appData", JSON.stringify({ courses: updatedCourses }));
    };

    return (
        <div className="p-4 relative">
            <h1 className="text-4xl font-bold mb-6">Courses</h1>

            <ul className="flex-wrap flex-row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                    <Card key={course.id} className="mb-2 flex items-center">
                        <Link href={`/course/${course.title}`} className="mr-4">
                            {course.title}
                        </Link>

                        <button
                            onClick={() => editCourse(course.id)}
                            className="text-gray-950 mr-2 p-1"
                        >
                            <CiEdit />
                        </button>
                        <button
                            onClick={() => deleteCourse(course.id)}
                            className="p-1 text-red-700"
                        >
                            <RiDeleteBin5Line />
                        </button>
                    </Card>
                ))}
            </ul>
            <button
                onClick={addCourse}
                className="fixed bottom-8 right-8 p-4 rounded-full shadow-xl hover:bg-gray-300 bg-gray-200"
            >
                <AiOutlinePlus className="text-2xl" />
            </button>
        </div>
    );
}
