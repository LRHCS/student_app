"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/client";
import { IoMdAdd } from "react-icons/io";
import { GrFormPreviousLink, GrFormNextLink } from "react-icons/gr";
import Link from "next/link";
import { PiExam } from "react-icons/pi";
import { MdOutlineAssignment, MdDelete, MdEdit } from "react-icons/md";
import { redirect } from "next/navigation";
import { loadCalendarData } from "../../utils/loadCalendarData";

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

const hasContent = (date, exams, assignments) => {
    return exams.some(item => item.date.startsWith(date)) || 
           assignments.some(item => item.date.startsWith(date));
};

const DayContentModal = ({ date, exams, assignments, onClose, updateAssignmentStatus }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                    {new Date(date).toLocaleDateString('default', { 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                    })}
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                    ×
                </button>
            </div>
            <div className="p-4 space-y-3">
                {exams.map((item) => (
                    <div
                        key={`exam-${item.id}`}
                        className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-900"
                        onClick={() => window.location.href = `/exam/${item.id}`}
                    >
                        <PiExam className="text-xl" />
                        <span>{item.title}</span>
                    </div>
                ))}
                {assignments.map((item) => (
                    <div
                        key={`assignment-${item.id}`}
                        className="flex items-center justify-between p-2 border rounded-lg"
                    >
                        <div className="flex items-center gap-2">
                            <MdOutlineAssignment className="text-xl" />
                            <span>{item.title}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateAssignmentStatus(item.id, 0)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                                    ${item.status === 0 ? 'bg-gray-200 border-gray-400' : 'border-gray-200'}`}
                            >
                                🔴
                            </button>
                            <button
                                onClick={() => updateAssignmentStatus(item.id, 1)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                                    ${item.status === 1 ? 'bg-yellow-200 border-yellow-400' : 'border-gray-200'}`}
                            >
                                🟡
                            </button>
                            <button
                                onClick={() => updateAssignmentStatus(item.id, 2)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                                    ${item.status === 2 ? 'bg-green-200 border-green-400' : 'border-gray-200'}`}
                            >
                                ✅
                            </button>
                        </div>
                    </div>
                ))}
                {!exams.length && !assignments.length && (
                    <p className="text-gray-500 text-center">No events for this day</p>
                )}
            </div>
        </div>
    </div>
);

// Add this new component for the status indicator
const StatusIndicator = ({ status, isMobile }) => {
    const statusColors = {
        0: 'bg-gray-500',
        1: 'bg-yellow-200',
        2: 'bg-green-200'
    };

    if (isMobile) {
        return (
            <div className={`w-3 h-3 rounded-full ${statusColors[status || 0]}`} />
        );
    }

    return (
        <div className={`text-xs px-2 py-1 rounded ${statusColors[status || 0]}`}>
            {getStatusText(status).text}
        </div>
    );
};

const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [exams, setExams] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedExam, setSelectedExam] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    // New states to track which exam/assignment is hovered:
    const [hoveredExamId, setHoveredExamId] = useState(null);
    const [hoveredAssignmentId, setHoveredAssignmentId] = useState(null);

    // For handling add modal for exam/assignment
    const [isChoosingModal, setIsChoosingModal] = useState(false);
    const [modalType, setModalType] = useState(null); // 'exam' or 'assignment'
    const [newExam, setNewExam] = useState({ title: "", date: "", topicId: "" });
    const [newAssignment, setNewAssignment] = useState({ title: "", date: "", topicId: "" });

    // Helper function to initiate the drag event with item data.
    const handleDragStart = (e, item, type) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ id: item.id, type }));
    };

    // Allow drop by preventing default behavior.
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Handle drop event: update the item's date in the backend and local state.
    const handleDrop = async (e, dropDate) => {
        e.preventDefault();
        const data = e.dataTransfer.getData("application/json");
        if (data) {
            const { id, type } = JSON.parse(data);
            if (type === "exam") {
                const { error, data: updatedExam } = await supabase
                    .from("Exams")
                    .update({ date: dropDate })
                    .eq("id", id)
                    .select()
                    .single();
                if (!error && updatedExam) {
                    setExams((prev) => prev.map((exam) => (exam.id === id ? updatedExam : exam)));
                } else {
                    console.error("Error updating exam date:", error);
                }
            } else if (type === "assignment") {
                const { error, data: updatedAssignment } = await supabase
                    .from("Assignments")
                    .update({ date: dropDate })
                    .eq("id", id)
                    .select()
                    .single();
                if (!error && updatedAssignment) {
                    setAssignments((prev) =>
                        prev.map((assignment) => (assignment.id === id ? updatedAssignment : assignment))
                    );
                } else {
                    console.error("Error updating assignment date:", error);
                }
            }
        }
    };

    // Data loading using the extracted utility function
    useEffect(() => {
        const fetchData = async () => {
            const data = await loadCalendarData();
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Set to start of day

            // Mark past exams but keep them in the list
            const allExams = data.exams.map(exam => {
                const examDate = new Date(exam.date);
                examDate.setHours(0, 0, 0, 0);
                return {
                    ...exam,
                    isPast: examDate < now // Today is not considered past
                };
            });

            // For assignments, update status to completed if past due but keep them
            const allAssignments = [];
            for (const assignment of data.assignments) {
                const assignmentDate = new Date(assignment.date);
                assignmentDate.setHours(0, 0, 0, 0);
                
                if (assignmentDate < now) { // Today is not considered past
                    if (assignment.status !== 2) {
                        const { error } = await supabase
                            .from("Assignments")
                            .update({ status: 2 })
                            .eq("id", assignment.id);
                        if (error) {
                            console.error("Error updating assignment status:", error);
                        }
                    }
                    // Include past assignments with isPast flag
                    allAssignments.push({ ...assignment, status: 2, isPast: true });
                } else {
                    allAssignments.push({ ...assignment, isPast: false });
                }
            }

            setExams(allExams);
            setAssignments(allAssignments);
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
    const handleExamClick = (e, examId) => {
        e.stopPropagation(); // Prevent triggering the day click
        window.location.href = `/exam/${examId}`;
    };

    // ----------------------------
    // Submit Handlers for Adding Items
    // ----------------------------
    const handleSubmitExam = async (e) => {
        e.preventDefault();
        
        if (newExam.id) {
            // Update existing exam
            const { data, error } = await supabase
                .from("Exams")
                .update({
                    title: newExam.title,
                    date: newExam.date,
                    topicId: newExam.topicId
                })
                .eq('id', newExam.id)
                .select()
                .single();

            if (!error && data) {
                setExams(exams.map(exam => 
                    exam.id === newExam.id ? data : exam
                ));
                resetModals();
            } else {
                console.error("Error updating exam:", error);
            }
        } else {
            // Create new exam
            const { data, error } = await supabase
                .from("Exams")
                .insert([newExam])
                .select()
                .single();

            if (!error && data) {
                setExams([...exams, data]);
                resetModals();
            } else {
                console.error("Error creating exam:", error);
            }
        }
    };

    const handleSubmitAssignment = async (e) => {
        e.preventDefault();
        
        if (newAssignment.id) {
            // Update existing assignment
            const { data, error } = await supabase
                .from("Assignments")
                .update({
                    title: newAssignment.title,
                    date: newAssignment.date,
                    topicId: newAssignment.topicId
                })
                .eq('id', newAssignment.id)
                .select()
                .single();

            if (!error && data) {
                setAssignments(assignments.map(assignment => 
                    assignment.id === newAssignment.id ? { ...data, status: assignment.status } : assignment
                ));
                resetModals();
            } else {
                console.error("Error updating assignment:", error);
            }
        } else {
            // Create new assignment
            const { data, error } = await supabase
                .from("Assignments")
                .insert([{
                    ...newAssignment,
                    status: 0
                }])
                .select()
                .single();

            if (!error && data) {
                setAssignments([...assignments, data]);
                resetModals();
            } else {
                console.error("Error creating assignment:", error);
            }
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

    // Add this function to handle click events
    const handleDayClick = (date, dayExams, isMobile) => {
        if (isMobile) {
            setSelectedDate(date);
        }
    };

    const handleDeleteExam = async (examId) => {
        if (window.confirm('Are you sure you want to delete this exam?')) {
            const { error } = await supabase
                .from("Exams")
                .delete()
                .eq("id", examId);

            if (!error) {
                setExams(exams.filter(exam => exam.id !== examId));
            } else {
                console.error("Error deleting exam:", error);
            }
        }
    };

    const handleDeleteAssignment = async (assignmentId) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            const { error } = await supabase
                .from("Assignments")
                .delete()
                .eq("id", assignmentId);

            if (!error) {
                setAssignments(assignments.filter(assignment => assignment.id !== assignmentId));
            } else {
                console.error("Error deleting assignment:", error);
            }
        }
    };

    const handleEditExam = (exam) => {
        setNewExam({
            title: exam.title,
            date: exam.date,
            topicId: exam.topicId,
            id: exam.id
        });
        setModalType("exam");
    };

    const handleEditAssignment = (assignment) => {
        setNewAssignment({
            title: assignment.title,
            date: assignment.date,
            topicId: assignment.topicId,
            id: assignment.id
        });
        setModalType("assignment");
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

            {/* Calendar grid with responsive design */}
            <div className="grid grid-cols-7 gap-2 border border-gray-400 rounded-lg p-4">
                {weekDays.map((day) => (
                    <div key={day} className="font-bold text-center p-2 h-8">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day[0]}</span>
                    </div>
                ))}
                {Array(adjustedFirstDay).fill(null).map((_, i) => (
                    <div key={`empty-${i}`} className="p-4"></div>
                ))}
                {[...Array(daysInMonth)].map((_, day) => {
                    const date = new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        day + 2
                    ).toISOString().split('T')[0];
                    
                    const dayExams = exams.filter((item) => item.date.startsWith(date));
                    const dayAssignments = assignments.filter((item) => item.date.startsWith(date));
                    const hasEvents = hasContent(date, exams, assignments);

                    return (
                        <div
                            key={day}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, date)}
                            onClick={() => {
                                const isMobile = window.innerWidth < 1020;
                                handleDayClick(date, dayExams, isMobile);
                            }}
                            className={`border p-2 relative group cursor-pointer border border-gray-300 rounded-lg p-2
                                ${date === new Date().toISOString().split('T')[0] ? "bg-gray-300 rounded" : ""}
                                sm:min-h-24 min-h-12 rounded-lg `}
                        >
                            {/* Add button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddClick(date);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-full p-1"
                            >
                                <IoMdAdd className="text-gray-600" />
                            </button>

                            <div className="flex flex-col items-center sm:items-start">
                                <span>
                                    {new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1).getDate()}
                                </span>
                                
                                {/* Content for mobile and medium screens */}
                                <div className="xl:hidden mt-1 flex flex-wrap gap-1 justify-center rounded-lg p-2">
                                    {dayExams.length > 0 && (
                                        <div className="w-3 h-3 rounded-full bg-blue-400" 
                                             title={`${dayExams.length} exam${dayExams.length > 1 ? 's' : ''}`} />
                                    )}
                                    {dayAssignments.map((item) => (
                                        <StatusIndicator 
                                            key={item.id} 
                                            status={item.status} 
                                            isMobile={true}
                                        />
                                    ))}
                                </div>

                                {/* Full content for larger screens */}
                                <div className="hidden xl:block w-full ">
                                    {dayExams.map((item) => (
                                        <div 
                                            key={`exam-${item.id}`}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, item, "exam")}
                                            onClick={(e) => handleExamClick(e, item.id)}
                                            className={`flex items-center justify-between mt-1 p-1 text-sm border rounded-lg  
                                                ${item.isPast 
                                                    ? 'bg-gray-100 text-gray-500 border-none' 
                                                    : 'hover:bg-gray-300'} cursor-pointer border-none`}
                                            onMouseEnter={() => setHoveredExamId(item.id)}
                                            onMouseLeave={() => setHoveredExamId(null)}
                                        >
                                            <div className="flex items-center gap-2 border w-full border-gray-400 rounded-lg p-2">
                                                <PiExam className="text-xl" />
                                                {item.title}
                                            </div>
                                        </div>
                                    ))}
                                    {dayAssignments.map((item) => (
                                        <div 
                                            key={`assignment-${item.id}`}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, item, "assignment")}
                                            className={`flex flex-col gap-1 mt-1 p-1 text-sm border rounded-lg 
                                                ${item.isPast 
                                                    ? 'bg-gray-100 text-gray-500 border-none' 
                                                    : 'hover:bg-gray-300'} cursor-pointer border-none`}
                                            onMouseEnter={() => setHoveredAssignmentId(item.id)}
                                            onMouseLeave={() => setHoveredAssignmentId(null)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex flex-col gap-1 border border-gray-400 rounded-lg p-2">
                                                <div className="flex items-center gap-2">
                                                    <MdOutlineAssignment className="text-xl" />
                                                    {item.title}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={item.status || 0}
                                                        onChange={(e) => updateAssignmentStatus(item.id, Number(e.target.value))}
                                                        className={`text-xs p-1 rounded ${getStatusText(item.status).color}`}
                                                    >
                                                        <option className="bg-gray-200" value={0}>Not Started</option>
                                                        <option className="bg-yellow-200" value={1}>In Progress</option>
                                                        <option className="bg-green-200" value={2}>Completed</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile view modal */}
            {selectedDate && window.innerWidth < 1020 && (
                <DayContentModal
                    date={selectedDate}
                    exams={exams.filter(item => item.date.startsWith(selectedDate))}
                    assignments={assignments.filter(item => item.date.startsWith(selectedDate))}
                    onClose={() => setSelectedDate(null)}
                    updateAssignmentStatus={updateAssignmentStatus}
                />
            )}

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
