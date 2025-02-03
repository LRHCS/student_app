"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/app/UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import { supabase } from "@/app/utils/client";

export default function Page({ params }) {
    const resolvedParams = use(params);
    const title = decodeURIComponent(resolvedParams.title);
    const [topics, setTopics] = useState([]);
    const [courseId, setCourseId] = useState(null);
    const [exams, setExams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // 'add', 'edit', or 'delete'
    const [currentTopic, setCurrentTopic] = useState(null);
    const [newTopicTitle, setNewTopicTitle] = useState("");

    useEffect(() => {
        const fetchTopics = async () => {
            const { data: courseData, error: courseError } = await supabase
                .from("Courses")
                .select("id")
                .eq("title", title)
                .single();

            if (courseError) {
                console.error("Error fetching course:", courseError);
                return;
            }

            setCourseId(courseData.id);

            const { data: topicsData, error: topicsError } = await supabase
                .from("Topics")
                .select("*")
                .eq("course_id", courseData.id);

            if (topicsError) {
                console.error("Error fetching topics:", topicsError);
                return;
            }

            setTopics(topicsData);
        };

        fetchTopics();
    }, [title]);

    // Once topics are fetched, load Exams and Assignments for the course.
    useEffect(() => {
        if (topics.length === 0) return;

        const topicIds = topics.map((topic) => topic.id);

        const fetchExams = async () => {
            const { data: examsData, error: examsError } = await supabase
                .from("Exams")
                .select("*")
                .in("topicId", topicIds);
            if (examsError) {
                console.error("Error fetching exams:", examsError);
                return;
            }
            setExams(examsData);
        };

        const fetchAssignments = async () => {
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from("Assignments")
                .select("*")
                .in("topicId", topicIds); // Adjust field name if needed (here it is assumed as topic_id)
            if (assignmentsError) {
                console.error("Error fetching assignments:", assignmentsError);
                return;
            }
            setAssignments(assignmentsData);
        };

        fetchExams();
        fetchAssignments();
    }, [topics]);

    const openModal = (mode, topic = null) => {
        setModalMode(mode);
        setCurrentTopic(topic);
        setNewTopicTitle(topic ? topic.title : "");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewTopicTitle("");
        setCurrentTopic(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (modalMode === "add") {
            await addTopic();
        } else if (modalMode === "edit") {
            await editTopic();
        } else if (modalMode === "delete") {
            await deleteTopic();
        }
        closeModal();
    };

    const addTopic = async () => {
        if (newTopicTitle && courseId) {
            const { data, error } = await supabase
                .from("Topics")
                .insert([{ title: newTopicTitle, course_id: courseId }])
                .select();

            if (error) {
                console.error("Error adding topic:", error);
                return;
            }

            setTopics([...topics, data[0]]);
        }
    };

    const editTopic = async () => {
        if (newTopicTitle && currentTopic) {
            const { error } = await supabase
                .from("Topics")
                .update({ title: newTopicTitle })
                .eq("id", currentTopic.id);

            if (error) {
                console.error("Error updating topic:", error);
                return;
            }

            setTopics(
                topics.map((topic) =>
                    topic.id === currentTopic.id ? { ...topic, title: newTopicTitle } : topic
                )
            );
        }
    };

    const deleteTopic = async () => {
        if (currentTopic) {
            const { error } = await supabase
                .from("Topics")
                .delete()
                .eq("id", currentTopic.id);

            if (error) {
                console.error("Error deleting topic:", error);
                return;
            }

            setTopics(topics.filter((topic) => topic.id !== currentTopic.id));
        }
    };

    return (
        <div className="p-4 relative">
            <Link href="../" className="hover:underline mb-4 inline-block">
                Dashboard
            </Link>
            <span> /</span>
            <span className="font-bold"> {title}</span>

            <div className="flex items-center">
                <h1 className="text-4xl font-bold m-4 mb-6 ml-0 align-middle text-center">
                    {title} Topics
                </h1>
                <button
                    onClick={() => openModal("add")}
                    className="text-xl text-gray-500 bold hover:text-gray-700"
                >
                    <AiOutlinePlus className="text-2xl" />
                </button>
            </div>

            {/* Topics List */}
            <ul className="flex-wrap flex-row flex gap-4 mb-8">
                {topics.map((topic) => (
                    <Card key={topic.id} className="p-4 flex items-center justify-between w-full">
                        <Link href={`/course/${title}/topic/${topic.title}`} className="text-lg font-medium">
                            {topic.title}
                        </Link>
                        <div className="flex items-center gap-2">
                            <button onClick={() => openModal("edit", topic)} className="p-2 text-gray-950">
                                <CiEdit />
                            </button>
                            <button onClick={() => openModal("delete", topic)} className="p-2 text-red-700 rounded">
                                <RiDeleteBin5Line />
                            </button>
                        </div>
                    </Card>
                ))}
            </ul>

            <div className="flex w-full gap-4">
                {/* Exams List */}
                <div className="w-1/2">
                    <h2 className="text-2xl font-bold mb-2 ">Exams</h2>
                    {exams.length > 0 ? (
                        <ul className="mb-8">
                            {exams.map((exam) => (
                                <li key={exam.id} className="p-2 border border-gray-300 rounded mb-2">
                                    <Link href={`/exam/${exam.id}`} className="hover:underline">
                                        {exam.title} – {exam.date}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mb-8">No exams found for this course.</p>
                    )}
                </div>

                <div className="w-1/2">
                    {/* Assignments List */}
                    <h2 className="text-2xl font-bold mb-2">Assignments</h2>
                    {assignments.length > 0 ? (
                        <ul className="mb-8">
                            {assignments.map((assignment) => (
                                <li key={assignment.id} className="p-2 border rounded mb-2 border-gray-300">
                                    <Link href={`${title}/assignment/${assignment.id}`} className="hover:underline">
                                        {assignment.title} – {assignment.date}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mb-8">No assignments found for this course.</p>
                    )}
                </div>

            </div>


            {/* Modal for Topic CRUD */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg">
                        <h2 className="text-xl font-bold mb-4">
                            {modalMode === "add"
                                ? "Add New Topic"
                                : modalMode === "edit"
                                    ? "Edit Topic"
                                    : "Delete Topic"}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            {modalMode !== "delete" && (
                                <input
                                    type="text"
                                    value={newTopicTitle}
                                    onChange={(e) => setNewTopicTitle(e.target.value)}
                                    className="w-full p-2 border rounded mb-4"
                                    placeholder="Topic title"
                                    required
                                />
                            )}
                            {modalMode === "delete" && (
                                <p>
                                    Are you sure you want to delete this page?
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-200 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`px-4 py-2 rounded text-white ${
                                        modalMode === "delete" ? "bg-red-500" : "bg-blue-500"
                                    }`}
                                >
                                    {modalMode === "add" ? "Add" : modalMode === "edit" ? "Save" : "Delete"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
