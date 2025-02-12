"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../utils/client";
import Link from "next/link";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MdDelete } from "react-icons/md";
import { AiOutlinePlus } from "react-icons/ai";

const STATUS_LABELS = {
    0: "Not Started",
    1: "In Progress",
    2: "Good",
    3: "Completed",
};

// Lesson card component (Draggable)
const LessonCard = ({ lesson, moveLesson, exam, onDelete }) => {
    const [{ isDragging }, drag] = useDrag({
        type: "LESSON",
        item: { id: lesson.id, status: lesson.status },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    return (
        <div
            ref={drag}
            className={`p-2 m-2 bg-white rounded-md shadow-md cursor-pointer relative ${isDragging ? "opacity-100" : ""}`}
        >
            <Link href={`/course/${exam.course.title}/topic/${exam.topic.title}/notes/${lesson.id}`} className="font-semibold">
                {lesson.title}
            </Link>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete(lesson.id);
                }}
                className="absolute top-1 right-1 text-red-500 hover:text-red-700 cursor-pointer"
                title="Delete Lesson"
            >
                <MdDelete />
            </button>
        </div>
    );
};

// Column component (Droppable)
const StatusColumn = ({ status, lessons, moveLesson, exam, addLesson, deleteLesson }) => {
    const [{ isOver }, drop] = useDrop({
        accept: "LESSON",
        drop: (item) => moveLesson(item.id, status),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });
    const [isAddingLesson, setIsAddingLesson] = useState(false);
    const [newLessonTitle, setNewLessonTitle] = useState("");

    const handleAddLesson = () => {
        if (newLessonTitle.trim()) {
            addLesson(status, newLessonTitle.trim());
            setNewLessonTitle("");
            setIsAddingLesson(false);
        }
    };

    return (
        <div ref={drop} className={`w-1/4 p-4 bg-gray-100 rounded-md ${isOver ? "bg-gray-200" : ""}`}>
            <h2 className="text-lg font-bold mb-2 flex items-center">
                {STATUS_LABELS[status]}
                <button onClick={() => setIsAddingLesson(true)} className="ml-2" title="Add Note">
                    <AiOutlinePlus className="text-xl text-gray-500 hover:text-gray-700" />
                </button>
            </h2>
            {isAddingLesson && (
                <div className="mb-4 p-2 bg-white rounded-md shadow-md">
                    <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Enter lesson title..."
                        className="w-full p-2 border rounded mb-2"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleAddLesson();
                            } else if (e.key === 'Escape') {
                                setIsAddingLesson(false);
                                setNewLessonTitle("");
                            }
                        }}
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setIsAddingLesson(false);
                                setNewLessonTitle("");
                            }}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddLesson}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            disabled={!newLessonTitle.trim()}
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}
            {lessons.map((lesson) => (
                <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    moveLesson={moveLesson}
                    exam={exam}
                    onDelete={deleteLesson}
                />
            ))}
        </div>
    );
};

const ExamDetails = () => {
    const { id } = useParams();
    const [exam, setExam] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchExamDetails(id);
        }
    }, [id]);

    const fetchExamDetails = async (examId) => {
        setLoading(true);

        console.log("Fetching exam with ID:", examId);

        const {data: examData, error: examError} = await supabase
            .from("Exams")
            .select("id, title, date, topicId")
            .eq("id", examId)
            .single();

        if (examError) {
            console.error("Error fetching exam:", examError);
            setLoading(false);
            return;
        }

        console.log("Exam data received:", examData);

        // Fetch topic including course_id
        const {data: topicData, error: topicError} = await supabase
            .from("Topics")
            .select("id, title, course_id")  // <-- Added course_id
            .eq("id", examData.topicId)
            .single();

        if (topicError) {
            console.error("Error fetching topic:", topicError);
        }

        // Fetch course using course_id from topic
        const {data: courseData, error: courseError} = topicData
            ? await supabase.from("Courses").select("id, title").eq("id", topicData.course_id).single()
            : {data: null, error: "Missing topicData"};

        if (courseError) {
            console.error("Error fetching course:", courseError);
        }

        // Fetch lessons
        const {data: lessonsData, error: lessonsError} = await supabase
            .from("Lessons")
            .select("id, title, content, status")
            .eq("topic_id", examData.topicId);

        if (lessonsError) {
            console.error("Error fetching lessons:", lessonsError);
        }

        setExam({...examData, topic: topicData, course: courseData});
        setLessons(lessonsData || []);
        setLoading(false);
    };

    const moveLesson = async (lessonId, newStatus) => {
        // Update status in state
        setLessons((prevLessons) =>
            prevLessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, status: newStatus } : lesson
            )
        );

        // Update status in Supabase
        const { error } = await supabase
            .from("Lessons")
            .update({ status: newStatus })
            .eq("id", lessonId);

        if (error) {
            console.error("Error updating lesson status:", error);
        }
    };

    const deleteLesson = async (lessonId) => {
        // Update state
        setLessons((prevLessons) =>
            prevLessons.filter((lesson) => lesson.id !== lessonId)
        );

        // Delete from Supabase
        const { error } = await supabase
            .from("Lessons")
            .delete()
            .eq("id", lessonId);

        if (error) {
            console.error("Error deleting lesson:", error);
        }
    };

    // Function to add a new lesson (note) with the given status
    const addLesson = async (status, title) => {
        const newLesson = { 
            title: title,
            content: "",
            status,
            topic_id: exam.topic.id
        };
        
        const { error } = await supabase
            .from("Lessons")
            .insert(newLesson);

        if (error) {
            console.error("Error adding lesson:", error);
            return;
        }

        // Fetch updated lessons
        const { data: updatedLessons } = await supabase
            .from("Lessons")
            .select("id, title, content, status")
            .eq("topic_id", exam.topic.id);

        setLessons(updatedLessons || []);
    };

    if (loading) return <p>Loading...</p>;
    if (!exam) return <p>Exam not found</p>;

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="p-6">
                <Link href="../" className="hover:underline mb-4 inline-block">
                    Dashboard
                </Link>
                <span> /</span>
                <span className="font-bold"> {exam.title}</span>
                <h1 className="text-2xl font-bold">{exam.title}</h1>
                <p className="text-gray-600">Date: {new Date(exam.date).toLocaleDateString()}</p>
                {exam.topic && <p className="text-gray-700">Topic: {exam.topic.title}</p>}

                <h2 className="text-xl font-semibold mt-4">Lessons</h2>
                <div className="flex space-x-4 mt-4">
                    {[0, 1, 2, 3].map((status) => (
                        <StatusColumn
                            key={status}
                            status={status}
                            lessons={lessons.filter((lesson) => lesson?.status === status)}
                            moveLesson={moveLesson}
                            exam={exam}
                            addLesson={addLesson}
                            deleteLesson={deleteLesson}
                        />
                    ))}
                </div>
            </div>
        </DndProvider>
    );
};

export default ExamDetails;
