"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/app/UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import Calendar from "@/app/components/calendar";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/app/utils/client";
import Image from "next/image";

export default function Dashboard() {
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [exams, setExams] = useState([]);
    const [user, setUser] = useState({});
    const [isAddingCourse, setIsAddingCourse] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: '' });

    useEffect(() => {
        const loadData = async () => {
            // Fetch User Info & User ID
            const {
                data: { user },
                error: userError
            } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error("Error fetching user:", userError);
                return;
            }

            const userID = user.id;

            // Fetch Courses, Topics, Exams & Profile in one batch
            const [{ data: coursesData, error: coursesError },
                { data: topicsData, error: topicsError },
                { data: examsData, error: examsError },
                { data: profileData, error: profileError }] = await Promise.all([
                supabase.from("Courses").select("id, title").eq("user_id", userID),
                supabase.from("Topics").select("id, title, course_id"),
                supabase.from("Exams").select("id, title, date, topicId"),
                supabase.from("Profiles").select("firstname, lastname, avatar").eq("id", userID).single()
            ]);

            // Error handling
            if (coursesError) console.error("Error fetching courses:", coursesError);
            if (topicsError) console.error("Error fetching topics:", topicsError);
            if (examsError) console.error("Error fetching exams:", examsError);
            if (profileError) console.error("Error fetching profile:", profileError);

            // Set state with fetched data
            setCourses(coursesData || []);
            setTopics(topicsData || []);
            setExams(examsData || []);
            setUser(profileData || {});
        };

        loadData();
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
            setNewCourse({ title: '' });
        }
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
                    <Link href="/lsession" className="underline text-red-700 bold absolute top-4 right-24">
                        Learning Session
                    </Link>
                    <Link href="/user" className="w-12 h-12 absolute top-4 right-4">
                        {user.avatar ? (
                            <Image src={user.avatar} alt="User Avatar" fill={true} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                {user.firstname && user.lastname}
                            </div>
                        )}
                    </Link>
                </div>
            </div>

            <ul className="flex-wrap flex-row flex gap-4">
                {courses.map((course) => (
                    <Card key={course.id} className="mb-2 flex items-center">
                        <div className="w-fit">
                            <Link href={`/course/${course.title}`} className="mr-4">
                                {course.title}
                            </Link>
                        </div>
                        <button className="text-gray-950 mr-2 p-1">
                            <CiEdit />
                        </button>
                        <button className="p-1 text-red-700">
                            <RiDeleteBin5Line />
                        </button>
                    </Card>
                ))}
            </ul>

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
                            <button type="submit" className="px-4 py-2 border rounded">Add Course</button>
                            <button type="button" onClick={() => setIsAddingCourse(false)} className="px-4 py-2 border rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
