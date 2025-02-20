"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "../../UI";
import { CiEdit } from "react-icons/ci";
import { RiDeleteBin5Line } from "react-icons/ri";
import { AiOutlinePlus } from "react-icons/ai";
import { supabase } from "../../utils/client";
import ProfileLink from "../../components/ProfileLink";
import LoadingCard from "../../components/LoadingCard";

export default function Page({ params }) {
    const resolvedParams = use(params);
    const title = decodeURIComponent(resolvedParams.title);
    const [topics, setTopics] = useState([]);
    const [courseId, setCourseId] = useState(null);
    const [exams, setExams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [loadingExams, setLoadingExams] = useState(true);
    const [loadingAssignments, setLoadingAssignments] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("add"); // 'add', 'edit', 'delete', 'addExam', 'addAssignment'
    const [currentTopic, setCurrentTopic] = useState(null);
    const [newTopicTitle, setNewTopicTitle] = useState("");
    const [newExamData, setNewExamData] = useState({ title: '', date: '', topicId: '' });
    const [newAssignmentData, setNewAssignmentData] = useState({ title: '', date: '', topicId: '' });
    const [examLessons, setExamLessons] = useState({});

    useEffect(() => {
        const fetchCourseData = async (title) => {
            const { data: course } = await supabase
                .from('courses')
                .select('*')
                .eq('title', title)
                .single();

            if (!course) return null;

            const { data: topics } = await supabase
                .from('topics')
                .select('*')
                .eq('course_id', course.user_id)
                .order('created_at');

            return { course, topics };
        };

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
            setLoadingTopics(false);
        };

        fetchTopics();
    }, [title]);

    // Once topics are fetched, load Exams and Assignments for the course.
    useEffect(() => {
        if (topics.length === 0) return;
        
        const topicIds = topics.map((topic) => topic.id);

        const fetchExamsAndLessons = async () => {
            // Modify the exam query to include today's exams
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day
            
            const { data: examsData, error: examsError } = await supabase
                .from("Exams")
                .select("*")
                .in("topicId", topicIds)
                .gte("date", today.toISOString());
            
            if (examsError) {
                console.error("Error fetching exams:", examsError);
                return;
            }
            
            setExams(examsData);

            // For each upcoming exam, fetch its lessons (lessons for past exams are skipped because the exam is filtered out)
            const lessonsMap = {};
            for (const exam of examsData) {
                const { data: lessonData, error: lessonError } = await supabase
                    .from("Lessons")
                    .select("*")
                    .eq("topic_id", exam.topicId);
                
                if (lessonError) {
                    console.error("Error fetching lessons:", lessonError);
                    continue;
                }
                
                lessonsMap[exam.id] = lessonData;
            }
            setExamLessons(lessonsMap);
            setLoadingExams(false);
        };

        const fetchAssignments = async () => {
            const topicIds = topics.map((topic) => topic.id);
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from("Assignments")
                .select("*")
                .in("topicId", topicIds);
            if (assignmentsError) {
                console.error("Error fetching assignments:", assignmentsError);
            } else {
                // Optionally filter for upcoming assignments:
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const upcomingAssignments = [];
                for (const assignment of assignmentsData) {
                    const assignmentDate = new Date(assignment.date);
                    assignmentDate.setHours(0, 0, 0, 0);
                    if (assignmentDate >= today) {
                        upcomingAssignments.push(assignment);
                    } else {
                        // Optionally update status for past assignments here...
                    }
                }
                setAssignments(upcomingAssignments);
            }
            setLoadingAssignments(false);
        };

        fetchExamsAndLessons();
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
        } else if (modalMode === "addExam") {
            await addExam();
        } else if (modalMode === "addAssignment") {
            await addAssignment();
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

    const addExam = async () => {
        if (newExamData.title && newExamData.date && newExamData.topicId) {
            const { data, error } = await supabase
                .from("Exams")
                .insert([{
                    title: newExamData.title,
                    date: newExamData.date,
                    topicId: newExamData.topicId
                }])
                .select();

            if (error) {
                console.error("Error adding exam:", error);
                return;
            }

            setExams([...exams, data[0]]);
            setNewExamData({ title: '', date: '', topicId: '' });
        }
    };

    const addAssignment = async () => {
        if (newAssignmentData.title && newAssignmentData.date && newAssignmentData.topicId) {
            const { data, error } = await supabase
                .from("Assignments")
                .insert([{
                    title: newAssignmentData.title,
                    date: newAssignmentData.date,
                    topicId: newAssignmentData.topicId,
                    status: 0
                }])
                .select();

            if (error) {
                console.error("Error adding assignment:", error);
                return;
            }

            setAssignments([...assignments, data[0]]);
            setNewAssignmentData({ title: '', date: '', topicId: '' });
        }
    };

    // Add this helper function at the top of your component to convert status codes to text
    const getStatusText = (status) => {
        switch (status) {
            case 0:
                return { text: 'Not Started', color: 'bg-gray-200' };
            case 1:
                return { text: 'In Progress', color: 'bg-yellow-200' };
            case 2:
                return { text: 'Completed', color: 'bg-green-200' };
            default:
                return { text: 'Unknown', color: 'bg-gray-200' };
        }
    };

    // Add this function to handle status updates
    const updateAssignmentStatus = async (assignmentId, newStatus) => {
        const { error } = await supabase
            .from("Assignments")
            .update({ status: newStatus })
            .eq("id", assignmentId);

        if (error) {
            console.error("Error updating assignment status:", error);
            return;
        }

        setAssignments(assignments.map(assignment => 
            assignment.id === assignmentId 
                ? { ...assignment, status: newStatus }
                : assignment
        ));
    };

    // Add this function to handle lesson status updates
    const updateLessonStatus = async (lessonId, newStatus) => {
        const { error } = await supabase
            .from("Lessons")
            .update({ status: newStatus })
            .eq("id", lessonId);

        if (error) {
            console.error("Error updating lesson status:", error);
            return;
        }

        // Update the local state
        setExamLessons(prevLessons => {
            const newLessons = { ...prevLessons };
            Object.keys(newLessons).forEach(examId => {
                newLessons[examId] = newLessons[examId].map(lesson =>
                    lesson.id === lessonId ? { ...lesson, status: newStatus } : lesson
                );
            });
            return newLessons;
        });
    };

    // New function to delete a lesson (note)
    const deleteLesson = async (lessonId) => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        const { error } = await supabase
            .from("Lessons")
            .delete()
            .eq("id", lessonId);

        if (error) {
            console.error("Error deleting lesson:", error);
            return;
        }

        setExamLessons(prevLessons => {
            const newLessons = { ...prevLessons };
            Object.keys(newLessons).forEach(examId => {
                newLessons[examId] = newLessons[examId].filter(lesson => lesson.id !== lessonId);
            });
            return newLessons;
        });
    };

    // Add these new functions after updateLessonStatus
    const updateExamDate = async (examId, newDate) => {
        const { error } = await supabase
            .from("Exams")
            .update({ date: newDate })
            .eq("id", examId);

        if (error) {
            console.error("Error updating exam date:", error);
            return;
        }

        setExams(exams.map(exam => 
            exam.id === examId 
                ? { ...exam, date: newDate }
                : exam
        ));
    };

    const updateAssignmentDate = async (assignmentId, newDate) => {
        const { error } = await supabase
            .from("Assignments")
            .update({ date: newDate })
            .eq("id", assignmentId);

        if (error) {
            console.error("Error updating assignment date:", error);
            return;
        }

        setAssignments(assignments.map(assignment => 
            assignment.id === assignmentId 
                ? { ...assignment, date: newDate }
                : assignment
        ));
    };

    return (
        <div className="p-4 relative">
            <ProfileLink />

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
                {loadingTopics ? (
                    [1, 2, 3].map(i => (
                        <LoadingCard key={i} className="mb-2 min-w-[250px]" />
                    ))
                ) : topics.length > 0 ? (
                    topics.map((topic) => (
                        <Card key={topic.id} className="p-4 relative group flex items-center justify-between w-full">
                            <Link href={`/course/${title}/topic/${topic.title}`} className="text-lg font-medium">
                                {topic.title}
                            </Link>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                                <button onClick={() => openModal("edit", topic)} className="p-2 text-gray-950">
                                    <CiEdit />
                                </button>
                                <button onClick={() => openModal("delete", topic)} className="p-2 text-red-700 rounded">
                                    <RiDeleteBin5Line />
                                </button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <p>No topics found.</p>
                )}
            </ul>

            <div className="flex w-full gap-4">
                {/* Exams List */}
                <div className="w-1/2">
                    <div className="flex items-center mb-2">
                        <h2 className="text-2xl font-bold">Exams</h2>
                        <button
                            onClick={() => openModal("addExam")}
                            className="ml-2 text-xl text-gray-500 bold hover:text-gray-700"
                        >
                            <AiOutlinePlus className="text-2xl" />
                        </button>
                    </div>
                    {loadingExams ? (
                        [1, 2].map(i => (
                            <LoadingCard key={i} className="mb-2 min-w-[250px]" />
                        ))
                    ) : exams.length > 0 ? (
                        <ul className="mb-8">
                            {exams.map((exam) => (
                                <li key={exam.id} className="p-4 border border-gray-300 rounded mb-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <Link href={`/exam/${exam.id}`} className="hover:underline font-semibold">
                                            {exam.title}
                                        </Link>
                                        <input
                                            type="date"
                                            value={exam.date}
                                            onChange={(e) => updateExamDate(exam.id, e.target.value)}
                                            className="p-1 border rounded text-sm"
                                        />
                                    </div>
                                    
                                    {/* Notes/Lessons section */}
                                    {examLessons[exam.id]?.length > 0 ? (
                                        <div className="ml-4">
                                            <ul className="space-y-2">
                                                {examLessons[exam.id].map((lesson) => (
                                                    <li key={lesson.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                        <Link 
                                                            href={`/course/${encodeURIComponent(title)}/topic/${encodeURIComponent(topics.find(t => t.id === lesson.topic_id)?.title || '')}/notes/${lesson.id}`}
                                                            className="text-sm hover:underline"
                                                        >
                                                            {lesson.title}
                                                        </Link>
                                                        <div className="flex items-center">
                                                            <select
                                                                value={lesson.status || 0}
                                                                onChange={(e) => updateLessonStatus(lesson.id, Number(e.target.value))}
                                                                className={`text-sm p-1 rounded ${getStatusText(lesson.status).color}`}
                                                            >
                                                                <option className="bg-gray-200" value={0}>Not Started</option>
                                                                <option className="bg-yellow-200" value={1}>In Progress</option>
                                                                <option className="bg-green-200" value={2}>Completed</option>
                                                            </select>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    deleteLesson(lesson.id);
                                                                }}
                                                                className="p-1 ml-2 text-red-700"
                                                            >
                                                                <RiDeleteBin5Line />
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 ml-4">No notes available</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mb-8">No exams found for this course.</p>
                    )}
                </div>

                <div className="w-1/2">
                    {/* Assignments List */}
                    <div className="flex items-center mb-2">
                        <h2 className="text-2xl font-bold">Assignments</h2>
                        <button
                            onClick={() => openModal("addAssignment")}
                            className="ml-2 text-xl text-gray-500 bold hover:text-gray-700"
                        >
                            <AiOutlinePlus className="text-2xl" />
                        </button>
                    </div>
                    {loadingAssignments ? (
                        [1, 2].map(i => (
                            <LoadingCard key={i} className="mb-2 min-w-[250px]" />
                        ))
                    ) : assignments.length > 0 ? (
                        <ul className="mb-8">
                            {assignments.map((assignment) => (
                                <li key={assignment.id} className="p-4 border border-gray-300 rounded mb-4">
                                    <div className="flex items-center justify-between">
                                        <Link href={`/assignment/${assignment.id}`} className="font-semibold hover:underline">
                                            {assignment.title}
                                        </Link>
                                        <input
                                            type="date"
                                            value={assignment.date}
                                            onChange={(e) => updateAssignmentDate(assignment.id, e.target.value)}
                                            className="p-1 border rounded text-sm"
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mb-8">No assignments found for this course.</p>
                    )}
                </div>

            </div>

            {/* Modal for Topic/Exam/Assignment CRUD */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg">
                        <h2 className="text-xl font-bold mb-4">
                            {modalMode === "add"
                                ? "Add New Topic"
                                : modalMode === "edit"
                                    ? "Edit Topic"
                                    : modalMode === "delete"
                                        ? "Delete Topic"
                                        : modalMode === "addExam"
                                            ? "Add New Exam"
                                            : "Add New Assignment"}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            {modalMode === "addExam" && (
                                <>
                                    <input
                                        type="text"
                                        value={newExamData.title}
                                        onChange={(e) => setNewExamData({...newExamData, title: e.target.value})}
                                        className="w-full p-2 border rounded mb-4"
                                        placeholder="Exam title"
                                        required
                                    />
                                    <input
                                        type="date"
                                        value={newExamData.date}
                                        onChange={(e) => setNewExamData({...newExamData, date: e.target.value})}
                                        className="w-full p-2 border rounded mb-4"
                                        required
                                    />
                                    <select
                                        value={newExamData.topicId}
                                        onChange={(e) => setNewExamData({...newExamData, topicId: e.target.value})}
                                        className="w-full p-2 border rounded mb-4"
                                        required
                                    >
                                        <option value="">Select a topic</option>
                                        {topics.map(topic => (
                                            <option key={topic.id} value={topic.id}>{topic.title}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                            {modalMode === "addAssignment" && (
                                <>
                                    <input
                                        type="text"
                                        value={newAssignmentData.title}
                                        onChange={(e) => setNewAssignmentData({...newAssignmentData, title: e.target.value})}
                                        className="w-full p-2 border rounded mb-4"
                                        placeholder="Assignment title"
                                        required
                                    />
                                    <input
                                        type="date"
                                        value={newAssignmentData.date}
                                        onChange={(e) => setNewAssignmentData({...newAssignmentData, date: e.target.value})}
                                        className="w-full p-2 border rounded mb-4"
                                        required
                                    />
                                    <select
                                        value={newAssignmentData.topicId}
                                        onChange={(e) => setNewAssignmentData({...newAssignmentData, topicId: e.target.value})}
                                        className="w-full p-2 border rounded mb-4"
                                        required
                                    >
                                        <option value="">Select a topic</option>
                                        {topics.map(topic => (
                                            <option key={topic.id} value={topic.id}>{topic.title}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                            {(modalMode !== "delete" && modalMode !== "addExam" && modalMode !== "addAssignment") && (
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
                                <p>Are you sure you want to delete this topic?</p>
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
                                    {modalMode === "add" ? "Add" : 
                                     modalMode === "edit" ? "Save" : 
                                     modalMode === "delete" ? "Delete" :
                                     "Add"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}