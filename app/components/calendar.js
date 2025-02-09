"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../utils/client";
import { IoMdAdd } from "react-icons/io";
import { GrFormPreviousLink, GrFormNextLink } from "react-icons/gr";
import Link from "next/link";
import { PiExam } from "react-icons/pi";
import { MdOutlineAssignment } from "react-icons/md";
import { redirect } from "next/navigation";
import { loadCalendarData } from "../utils/loadCalendarData";

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

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [exams, setExams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedExam, setSelectedExam] = useState(null);

    // For handling add modal for exam/assignment
    const [isChoosingModal, setIsChoosingModal] = useState(false);
    const [modalType, setModalType] = useState(null); // 'exam' or 'assignment'
    const [newExam, setNewExam] = useState({ title: "", date: "", topicId: "" });
    const [newAssignment, setNewAssignment] = useState({ title: "", date: "", topicId: "" });

    // Data loading using the extracted utility function
    useEffect(() => {
        const fetchData = async () => {
            const data = await loadCalendarData();
            setExams(data.exams);
            setAssignments(data.assignments);
            setCourses(data.courses);
            setTopics(data.topics);
        };
        fetchData();
    }, []);

    // ----------------------------
    // Navigation Functions
    // ----------------------------
    const prevMonth = () =>
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () =>
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();
    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    // ----------------------------
    // Handling Cell Clicks and Modal Choice
    // ----------------------------
    const handleAddClick = (date) => {
        // When clicking plus icon, record the date for new item and show choice modal
        setNewExam({ ...newExam, date });
        setNewAssignment({ ...newAssignment, date });
        setIsChoosingModal(true);
    };

    const chooseItemType = (type) => {
        // type is either 'exam' or 'assignment'
        setModalType(type);
        setIsChoosingModal(false);
    };

    // ----------------------------
    // Detailed Exam View: Using redirect
    // ----------------------------
    // Instead of opening a modal, we simply redirect to a separate page.
    const handleExamClick = (exam) => {
        redirect(`/exam/${exam.id}`);
    };

    // ----------------------------
    // Submit Handlers for Adding Items
    // ----------------------------
    const handleSubmitExam = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("Exams").insert([newExam]);
        if (!error) {
            setExams([...exams, { ...newExam, id: Date.now() }]);
            resetModals();
        }
    };

    const handleSubmitAssignment = async (e) => {
        e.preventDefault();
        const { error } = await supabase
            .from("Assignments")
            .insert([{
                ...newAssignment,
                status: 0 // Set initial status to "Not Started"
            }]);
        if (!error) {
            setAssignments([...assignments, { ...newAssignment, id: Date.now(), status: 0 }]);
            resetModals();
        }
    };

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

    const resetModals = () => {
        setModalType(null);
        setIsChoosingModal(false);
        setNewExam({ title: "", date: "", topicId: "" });
        setNewAssignment({ title: "", date: "", topicId: "" });
    };

    return (
        <div className="mx-auto p-4 rounded-lg">
            {/* Navigation header */}
            <div className="flex justify-between items-center mb-4">
                <button className="text-2xl" onClick={prevMonth}>
                    <GrFormPreviousLink />
                </button>
                <h2 className="font-bold text-xl">
                    {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
                </h2>
                <button className="text-2xl" onClick={nextMonth}>
                    <GrFormNextLink />
                </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2 border border-gray-400 h-fit rounded-lg p-4">
                {weekDays.map((day) => (
                    <div key={day} className="font-bold text-center p-2 h-8">
                        {day}
                    </div>
                ))}
                {Array(adjustedFirstDay)
                    .fill(null)
                    .map((_, i) => (
                        <div key={`empty-${i}`} className="p-4"></div>
                    ))}
                {[...Array(daysInMonth)].map((_, day) => {
                    // Create the date string for each cell
                    const date = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        day + 2
                    )
                        .toISOString()
                        .split("T")[0];
                    // Filter exams and assignments for this date
                    const dayExams = exams.filter((item) => item.date.startsWith(date));
                    const dayAssignments = assignments.filter((item) => item.date.startsWith(date));
                    return (
                        <div
                            key={day}
                            className={`border p-2 relative group h-fit min-h-24 rounded-lg border-gray-300 ${
                                date === new Date().toISOString().split("T")[0]
                                    ? "bg-gray-400 p-1 rounded"
                                    : ""
                            }`}
                        >
                            <div
                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleAddClick(date)}
                            >
                                <IoMdAdd className="text-xl" />
                            </div>

                            <span>
                {new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day + 1
                ).getDate()}
              </span>
                            {/* Render exam events */}
                            {dayExams.map((item) => (
                                <div
                                    key={`exam-${item.id}`}
                                    className="flex items-center gap-2 mt-1 p-1 text-sm cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-400"
                                    onClick={() => handleExamClick(item)}
                                >
                                    <PiExam className="text-xl" />
                                    {item.title}
                                </div>
                            ))}
                            {/* Render assignment events */}
                            {dayAssignments.map((item) => (
                                <div
                                    key={`assignment-${item.id}`}
                                    className={`flex items-center justify-between mt-1 p-1 text-sm border rounded-lg`}
                                >
                                    <div className="flex items-center gap-2">
                                        <MdOutlineAssignment className="text-xl" />
                                        {item.title}
                                    </div>
                                    <select
                                        value={item.status || 0}
                                        onChange={(e) => updateAssignmentStatus(item.id, Number(e.target.value))}
                                        className={`text-xs p-1 rounded border-none focus:ring-0 cursor-pointer ${getStatusText(item.status).color}`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option className="bg-gray-200" value={0}>Not Started</option>
                                        <option className="bg-yellow-200" value={1}>In Progress</option>
                                        <option className="bg-green-200" value={2}>Completed</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Choice Modal: Ask user whether to add Exam or Assignment */}
            {isChoosingModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-4 rounded shadow-md w-80">
                        <h3 className="text-xl mb-4">What would you like to add?</h3>
                        <div className="flex justify-around">
                            <button onClick={() => chooseItemType("exam")} className="px-4 py-2 border rounded">
                                Exam
                            </button>
                            <button onClick={() => chooseItemType("assignment")} className="px-4 py-2 border rounded">
                                Assignment
                            </button>
                        </div>
                        <button className="mt-4 text-sm text-gray-500" onClick={resetModals}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Form Modal: Either for Exam or Assignment */}
            {modalType === "exam" && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <form className="bg-white p-4 rounded shadow-md w-96" onSubmit={handleSubmitExam}>
                        <h3 className="text-xl mb-4">Add Exam</h3>
                        <label className="block mb-2">
                            Exam Title:
                            <input
                                type="text"
                                value={newExam.title}
                                onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </label>
                        <label className="block mb-2">
                            Course:
                            <select
                                value={selectedCourse}
                                onChange={async (e) => {
                                    const courseId = e.target.value;
                                    setSelectedCourse(courseId);
                                    const { data } = await supabase.from("Topics").select("*").eq("course_id", courseId);
                                    if (data) setTopics(data);
                                    setNewExam({ ...newExam, topicId: "" });
                                }}
                                className="w-full p-2 border rounded"
                                required
                            >
                                <option value="">Select a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block mb-2">
                            Topic:
                            <select
                                value={newExam.topicId}
                                onChange={(e) => setNewExam({ ...newExam, topicId: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                                disabled={!selectedCourse}
                            >
                                <option value="">Select a topic</option>
                                {topics.map((topic) => (
                                    <option key={topic.id} value={topic.id}>
                                        {topic.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex justify-between mt-4">
                            <button type="submit" className="px-4 py-2 border rounded">
                                Add Exam
                            </button>
                            <button type="button" onClick={resetModals} className="px-4 py-2 border rounded">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {modalType === "assignment" && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <form className="bg-white p-4 rounded shadow-md w-96" onSubmit={handleSubmitAssignment}>
                        <h3 className="text-xl mb-4">Add Assignment</h3>
                        <label className="block mb-2">
                            Assignment Title:
                            <input
                                type="text"
                                value={newAssignment.title}
                                onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </label>
                        <label className="block mb-2">
                            Course:
                            <select
                                value={selectedCourse}
                                onChange={async (e) => {
                                    const courseId = e.target.value;
                                    setSelectedCourse(courseId);
                                    const { data } = await supabase.from("Topics").select("*").eq("course_id", courseId);
                                    if (data) setTopics(data);
                                    setNewAssignment({ ...newAssignment, topicId: "" });
                                }}
                                className="w-full p-2 border rounded"
                                required
                            >
                                <option value="">Select a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block mb-2">
                            Topic:
                            <select
                                value={newAssignment.topicId}
                                onChange={(e) => setNewAssignment({ ...newAssignment, topicId: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                                disabled={!selectedCourse}
                            >
                                <option value="">Select a topic</option>
                                {topics.map((topic) => (
                                    <option key={topic.id} value={topic.id}>
                                        {topic.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex justify-between mt-4">
                            <button type="submit" className="px-4 py-2 border rounded">
                                Add Assignment
                            </button>
                            <button type="button" onClick={resetModals} className="px-4 py-2 border rounded">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Calendar;
