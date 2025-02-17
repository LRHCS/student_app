import Link from "next/link";
import { useDrag } from "react-dnd";

const KanbanCard = ({ task, onEdit, onDelete }) => {
    const [{ isDragging }, drag] = useDrag({
        type: "CARD",
        item: { ...task },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const examUrl = task.type === "exam" ? `/exam/${task.id}` : "#";

    return (
        <div
            ref={drag}
            className={`p-3 md:p-4 bg-white shadow-md rounded-lg ${
                isDragging ? "opacity-50" : "opacity-100"
            }`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    {task.type === "exam" ? (
                        <Link href={examUrl} className="text-lg font-semibold text-blue-600 hover:text-blue-800">
                            {task.title}
                        </Link>
                    ) : (
                        <div className="font-semibold">{task.title}</div>
                    )}
                    {task.date && (
                        <div className="text-xs md:text-sm text-gray-500">
                            Due: {new Date(task.date).toLocaleDateString()}
                        </div>
                    )}
                    {(task.topic_name || task.course_name) && (
                        <div className="text-xs md:text-sm text-gray-600 mt-1">
                            {task.course_name && <span>{task.course_name}</span>}
                            {task.topic_name && (
                                <>
                                    {task.course_name && <span> - </span>}
                                    <span>{task.topic_name}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex space-x-1 md:space-x-2">
                    <button
                        onClick={onEdit}
                        className="text-gray-400 hover:text-gray-600 p-1 md:p-2"
                    >
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-gray-400 hover:text-red-600 p-1 md:p-2"
                    >
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KanbanCard;
