import { useState, useMemo, useEffect, useRef } from "react";
import { DndProvider, useDrop } from "react-dnd";
import KanbanCard from "./KanbanCard";
import { supabase } from "@/app/utils/client";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from 'react-dnd-touch-backend';
import EditTaskModal from "./EditTaskModal";
import AddTaskModal from "./AddTaskModal";

// Add a function to detect touch device
const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const statuses = [
    { id: 0, title: "Not Started" },
    { id: 1, title: "In Progress" },
    { id: 2, title: "Finished" },
];

const KanbanBoard = ({ data }) => {
    const [currentUser, setCurrentUser] = useState(null);

    // Add this useEffect to get the current user
    useEffect(() => {
        const getCurrentUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setCurrentUser(session?.user);
        };
        getCurrentUser();
    }, []);

    // Filter tasks to only show user's own items
    const [tasks, setTasks] = useState(() => {
        const userTasks = [
            ...data.assignments.filter(a => a.user_id === currentUser?.id).map(a => ({ ...a, type: "assignment" })),
            ...data.exams.filter(e => e.user_id === currentUser?.id)
        ];
        return userTasks;
    });

    // Update tasks when currentUser changes
    useEffect(() => {
        if (currentUser) {
            const userTasks = [
                ...data.assignments.filter(a => a.user_id === currentUser.id).map(a => ({ ...a, type: "assignment" })),
                ...data.exams.filter(e => e.user_id === currentUser.id)
            ];
            setTasks(userTasks);
        }
    }, [currentUser, data]);

    const [editingTask, setEditingTask] = useState(null);
    const [addingTask, setAddingTask] = useState(null);
    const [addingTaskType, setAddingTaskType] = useState(null);
    const [collapsedGroups, setCollapsedGroups] = useState({
        assignments: false,
        exams: false
    });
    const [selectedStatus, setSelectedStatus] = useState(0); // For mobile view

    // Track heights per status and group type
    const heightsRef = useRef({
        assignments: {},
        exams: {}
    });

    const updateGroupHeight = (status, groupType, height) => {
        const currentMax = Math.max(
            ...Object.values(heightsRef.current[groupType]),
            height
        );
        
        // Update all columns for this group type to the maximum height
        Object.keys(heightsRef.current[groupType]).forEach(key => {
            heightsRef.current[groupType][key] = currentMax;
        });
    };

    const toggleGroup = (group) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [group]: !prev[group]
        }));
    };

    const deleteTask = async (task) => {
        if (confirm('Are you sure you want to delete this task?')) {
            const table = task.type === 'exam' ? 'Exams' : 'Assignments';
            const { error } = await supabase
                .from(table)
                .delete()
                .match({ id: task.id });

            if (!error) {
                setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
            }
        }
    };

    const moveTask = async (task, newStatus) => {
        if (task.type === "exam") {
            await supabase.from("Exams").update({ status: newStatus }).match({ id: task.id });
        } else {
            await supabase.from("Assignments").update({ status: newStatus }).match({ id: task.id });
        }

        setTasks((prevTasks) =>
            prevTasks.map((t) =>
                t.id === task.id ? { ...t, status: newStatus } : t
            )
        );
    };

    const addNewTask = async (type, status) => {
        if (!currentUser) {
            alert("Please log in to add tasks");
            return;
        }
        setAddingTask(status);
        setAddingTaskType(type);
    };

    const handleTaskUpdate = (updatedTask) => {
        setTasks((prevTasks) =>
            prevTasks.map((t) =>
                t.id === updatedTask.id ? updatedTask : t
            )
        );
    };

    const handleAddTask = (newTask) => {
        const taskWithUser = {
            ...newTask,
            user_id: currentUser.id
        };
        setTasks(prevTasks => [...prevTasks, taskWithUser]);
    };

    const TaskGroup = ({ title, tasks, status }) => {
        const groupKey = title.toLowerCase();
        const isCollapsed = collapsedGroups[groupKey];
        const contentRef = useRef(null);

        useEffect(() => {
            if (contentRef.current && !isCollapsed) {
                const height = contentRef.current.scrollHeight;
                heightsRef.current[groupKey][status] = height;
                updateGroupHeight(status, groupKey, height);
            }
        }, [tasks.length, isCollapsed, status, groupKey]);

        const currentHeight = heightsRef.current[groupKey][status] || 0;

        return (
            <div className="mb-6 border rounded-lg overflow-hidden">
                <div 
                    className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer h-auto"
                    onClick={() => toggleGroup(groupKey)}
                >
                    <div className="flex items-center space-x-2">
                        <svg 
                            className={`w-4 h-4 transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        <h3 className="text-md font-medium text-gray-700">{title}</h3>
                        <span className="text-sm text-gray-500">({tasks.length})</span>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            addNewTask(title, status);
                        }}
                        className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-full transition"
                    >
                        + Add {title.slice(0, -1)}
                    </button>
                </div>
                <div 
                    className={`transition-all duration-300 ${isCollapsed ? 'h-0' : ''}`}
                    style={{ 
                        height: isCollapsed ? 0 : currentHeight,
                        overflow: isCollapsed ? 'hidden' : 'visible'
                    }}
                >
                    <div ref={contentRef} className="p-3 space-y-3">
                        {tasks.map((task) => (
                            <KanbanCard 
                                key={task.id} 
                                task={task} 
                                onEdit={() => setEditingTask(task)}
                                onDelete={() => deleteTask(task)}
                            />
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-gray-400 text-sm italic">
                                No {title.toLowerCase()} yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const KanbanColumn = ({ status, tasks, moveTask }) => {
        const [{ isOver }, drop] = useDrop({
            accept: "CARD",
            drop: (task) => moveTask(task, status.id),
            collect: (monitor) => ({
                isOver: monitor.isOver(),
            }),
        });

        const sortedTasks = useMemo(() => {
            const tasksInColumn = tasks.filter((task) => task.status === status.id);
            
            const assignments = tasksInColumn
                .filter(task => task.type === "assignment")
                .sort((a, b) => new Date(a.date || '9999') - new Date(b.date || '9999'));

            const exams = tasksInColumn
                .filter(task => task.type === "exam")
                .sort((a, b) => new Date(a.date || '9999') - new Date(b.date || '9999'));

            return { assignments, exams };
        }, [tasks, status.id]);

        return (
            <div ref={drop} className={`p-4 border rounded bg-gray-100 ${isOver ? "bg-gray-200" : ""}`}>
                <h2 className="text-lg font-bold mb-4">{status.title}</h2>               
                <TaskGroup 
                    title="Assignments" 
                    tasks={sortedTasks.assignments} 
                    status={status.id} 
                />
                <TaskGroup 
                    title="Exams" 
                    tasks={sortedTasks.exams} 
                    status={status.id} 
                />
            </div>
        );
    };

    // Mobile status selector
    const StatusSelector = () => (
        <div className="md:hidden mb-4">
            <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(Number(e.target.value))}
                className="w-full p-2 border rounded-lg bg-white"
            >
                {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                        {status.title}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
            <div className="">
                <StatusSelector />
                <div className="">
                    {/* Mobile: Show only selected status */}
                    <div className="md:hidden">
                        <KanbanColumn 
                            status={statuses[selectedStatus]} 
                            tasks={tasks} 
                            moveTask={moveTask} 
                        />
                    </div>

                    {/* Desktop: Show all statuses */}
                    <div className="hidden md:grid md:grid-cols-3 md:gap-4">
                        {statuses.map((status) => (
                            <KanbanColumn 
                                key={status.id} 
                                status={status} 
                                tasks={tasks} 
                                moveTask={moveTask} 
                            />
                        ))}
                    </div>
                </div>
            </div>
            <EditTaskModal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                task={editingTask}
                onUpdate={handleTaskUpdate}
            />
            <AddTaskModal
                isOpen={addingTask !== null}
                onClose={() => {
                    setAddingTask(null);
                    setAddingTaskType(null);
                }}
                status={addingTask}
                type={addingTaskType}
                onAdd={handleAddTask}
            />
        </DndProvider>
    );
};

export default KanbanBoard;
