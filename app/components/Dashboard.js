"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/app/UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import Calendar from "@/app/components/calendar";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/app/utils/client";
import Image from "next/image";
import { loadDashboardData } from "@/app/utils/loadDashboardData"; // Import the data loader
import { RiFocus2Line } from "react-icons/ri";
import ProfileLink from "@/app/components/ProfileLink";
import { PiExam } from "react-icons/pi";
import { MdOutlineAssignment } from "react-icons/md";
export default function Dashboard() {
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [exams, setExams] = useState([]);
    const [user, setUser] = useState({});
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: "" });
    const [assignments, setAssignments] = useState([]);
    const [lessons, setLessons] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const data = await loadDashboardData();
            if (data) {
                setCourses(data.courses);
                setTopics(data.topics);
                setExams(data.exams);
                setUser(data.user);
                setAssignments(data.assignments || []);
                setLessons(data.lessons || []);
            }
        };

        fetchData();
    }, []);

    const handleSubmitCourse = async (e) => {
        e.preventDefault();
        const { data, error } = await supabase
            .from("Courses")
            .insert([{ title: newCourse.title, id: uuidv4(), user_id: user.id }])
            .select();

        if (error) {
            console.error("Error adding course:", error);
        } else {
            setCourses([...courses, data[0]]);
            setIsAddingCourse(false);
            setNewCourse({ title: "" });
        }
    };

    const getUnfinishedCounts = (courseId) => {
        // Get topics for this course
        const courseTopics = topics.filter(topic => topic.course_id === courseId);
        const topicIds = courseTopics.map(topic => topic.id);

        // Count unfinished assignments
        const unfinishedAssignments = assignments.filter(assignment => 
            topicIds.includes(assignment.topicId) && 
            (assignment.status === 0 || assignment.status === 1)
        ).length;

        // Count unfinished lessons/notes
        const unfinishedLessons = lessons.filter(lesson => 
            topicIds.includes(lesson.topic_id) && 
            (lesson.status === 0 || lesson.status === 1)
        ).length;

        return { assignments: unfinishedAssignments, lessons: unfinishedLessons };
    };

    return (
        <div className="p-4 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <h1 className="text-4xl font-bold m-4 mb-6 align-middle text-center">Courses</h1>
                    <button onClick={() => setIsAddingCourse(true)} className="p-2 flex items-center justify-center">
                        <AiOutlinePlus className="text-xl text-gray-500 bold hover:text-gray-700" />
                    </button>
                </div>

                <div>
                    <Link href="/lsession" className="underline bold absolute top-4 right-24 text-3xl">
                        <RiFocus2Line />
                    </Link>

                </div>
            </div>

            <ul className="flex-wrap flex-row flex gap-4">
                {courses.map((course) => {
                    const counts = getUnfinishedCounts(course.id);
                    return (
                        <Card key={course.id} className="mb-2 flex flex-col relative group">
                            <div className="w-fit">
                                <Link href={`/course/${course.title}`} className="mr-4 text-xl font-bold">
                                    {course.title}
                                </Link>
                                <div className="text-sm text-gray-600 mt-2 flex gap-2"><MdOutlineAssignment className="text-xl" alt="assignment"/>
                                    <p>{counts.assignments}</p>
                                </div>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-4">
                                <button className="text-gray-950 p-1">
                                    <CiEdit />
                                </button>
                                <button className="p-1 text-red-700">
                                    <RiDeleteBin5Line />
                                </button>
                            </div>
                        </Card>
                    );
                })}
            </ul>
            <ProfileLink />
            <div className="calendar-container">
                <Calendar exam={exams} />
            </div>

            {isAddingCourse && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <form className="bg-white p-4 rounded shadow-md w-96" onSubmit={handleSubmitCourse}>
                        <h3 className="text-xl mb-4">Add Course</h3>
                        <label className="block mb-2">
                            Course Title:
                            <input
                                type="text"
                                value={newCourse.title}
                                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </label>
                        <div className="flex justify-between mt-4">
                            <button type="submit" className="px-4 py-2 border rounded">
                                Add Course
                            </button>
                            <button type="button" onClick={() => setIsAddingCourse(false)} className="px-4 py-2 border rounded">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
