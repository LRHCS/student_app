import Link from "next/link";
import { useDrag } from "react-dnd";

const KanbanCard = ({ task }) => {
    const [{ isDragging }, drag] = useDrag({
        type: "CARD",
        item: { ...task },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const noteUrl =
        task.type === "lesson" && task.course_name && task.topic_name
            ? `/course/${encodeURIComponent(task.course_name)}/topic/${encodeURIComponent(
                task.topic_name
            )}/notes/${task.id}`
            : "#";

    return (
        <div
            ref={drag}
            className={`p-2 m-2 bg-white shadow rounded ${
                isDragging ? "opacity-50" : "opacity-100"
            }`}
        >
            {task.type === "lesson" ? (
                <Link href={noteUrl} className="font-bold text-blue-500 hover:underline">
                    {task.title}
                </Link>
            ) : (
                <h3 className="font-bold">{task.title}</h3>
            )}
            {task.date && <p>{task.date}</p>}
            {task.type === "lesson" && task.parentExam && (
                <p className="text-sm italic text-gray-600">Exam: {task.parentExam.title}</p>
            )}
        </div>
    );
};

export default KanbanCard;
