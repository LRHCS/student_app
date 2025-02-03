import { useState, useMemo } from "react";
import { DndProvider, useDrop } from "react-dnd";
import KanbanCard from "./KanbanCard";
import { supabase } from "@/app/utils/client";
import { HTML5Backend } from "react-dnd-html5-backend";

const statuses = [
    { id: 0, title: "Not Started" },
    { id: 1, title: "In Progress" },
    { id: 2, title: "Finished" },
];

const KanbanBoard = ({ data }) => {

    // Initialize local state for tasks
    const [tasks, setTasks] = useState(() => {
        return [
            ...data.assignments.map((a) => ({ ...a, type: "assignment" })),
            ...data.lessons.map((lesson) => ({
                ...lesson,
                type: "lesson",
                topic_name: lesson.Topics?.title || "Unknown Topic",
                course_name: lesson.Topics?.Courses?.title || "Unknown Course",
                parentExam:
                    data.exams.find((exam) => exam.topicId === lesson.topic_id) || null,
            })),
        ];
    });

    // When updating a task, update in local state and Supabase
    const moveTask = async (task, newStatus) => {
        // Update status in Supabase
        if (task.type === "lesson") {
            await supabase.from("Lessons").update({ status: newStatus }).match({ id: task.id });
        } else {
            await supabase.from("Assignments").update({ status: newStatus }).match({ id: task.id });
        }

        // Update local state
        setTasks((prevTasks) =>
            prevTasks.map((t) =>
                t.id === task.id ? { ...t, status: newStatus } : t
            )
        );
    };

    // Render each column using a custom drop zone component
    const KanbanColumn = ({ status, tasks, moveTask }) => {
        const [{ isOver }, drop] = useDrop({
            accept: "CARD",
            drop: (task) => moveTask(task, status.id),
            collect: (monitor) => ({
                isOver: monitor.isOver(),
            }),
        });

        return (
            <div ref={drop} className={`p-4 border rounded bg-gray-100 ${isOver ? "bg-gray-200" : ""}`}>
                <h2 className="text-lg font-bold">{status.title}</h2>
                {tasks
                    .filter((task) => task.status === status.id)
                    .map((task) => (
                        <KanbanCard key={task.id} task={task} />
                    ))}
            </div>
        );
    };

    return (
        // Wrap the entire board with a single DndProvider
        <DndProvider backend={HTML5Backend}>
            <div className="grid grid-cols-3 gap-4">
                {statuses.map((status) => (
                    <KanbanColumn key={status.id} status={status} tasks={tasks} moveTask={moveTask} />
                ))}
            </div>
        </DndProvider>
    );
};

export default KanbanBoard;
