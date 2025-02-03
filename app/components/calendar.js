"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../utils/client";
import { IoMdAdd } from "react-icons/io";
import { GrFormPreviousLink, GrFormNextLink } from "react-icons/gr";
import Link from "next/link";
import { PiExam } from "react-icons/pi";
import { MdOutlineAssignment } from "react-icons/md";
import { redirect } from "next/navigation";

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

    // Instead of calling each fetch function separately, use one effect that does all requests concurrently
    useEffect(() => {
        const loadData = async () => {
            try {
                const [examsResponse, assignmentsResponse, coursesResponse, topicsResponse] =
                    await Promise.all([
                        supabase.from("Exams").select("id, date, title, topicId"),
                        supabase.from("Assignments").select("id, date, title, topicId"),
                        supabase.from("Courses").select("*"),
                        // Modify fetchTopics: if a courseId is provided, you could filter;
                        // otherwise, fetch all topics.
                        supabase.from("Topics").select("id, title, course_id"),
                    ]);

                if (!examsResponse.error) setExams(examsResponse.data);
                else console.error("Error fetching exams:", examsResponse.error);

                if (!assignmentsResponse.error) setAssignments(assignmentsResponse.data);
                else console.error("Error fetching assignments:", assignmentsResponse.error);

                if (!coursesResponse.error) setCourses(coursesResponse.data);
                else console.error("Error fetching courses:", coursesResponse.error);

                if (!topicsResponse.error) setTopics(topicsResponse.data);
                else console.error("Error fetching topics:", topicsResponse.error);
            } catch (error) {
                console.error("Error loading data:", error);
            }
        };
        loadData();
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
        const { error } = await supabase.from("Assignments").insert([newAssignment]);
        if (!error) {
            setAssignments([...assignments, { ...newAssignment, id: Date.now() }]);
            resetModals();
        }
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
                        day +2
                    )
                        .toISOString()
                        .split("T")[0];
                    // Filter exams and assignments for this date
                    const dayExams = exams.filter((item) => item.date.startsWith(date));
                    const dayAssignments = assignments.filter((item) => item.date.startsWith(date));
                    return (
                        <div
                            key={day}
                            className={`border p-2 relative group h-fit min-h-24 rounded-lg border-gray-300 ${date === new Date().toISOString().split("T")[0] ? "bg-gray-400 p-1 rounded" : ""}`}
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
                                    className="flex items-center gap-2 mt-1 p-1 text-sm cursor-pointer border border-gray-300 rounded-lg hover:bg-gray-400"
                                >
                                    <MdOutlineAssignment className="text-xl" />
                                    {item.title}
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
