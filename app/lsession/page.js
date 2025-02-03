"use client";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import PomodoroTimer from "./components/PomodoroTimer";
import KanbanBoard from "./components/KanbanBoard";
import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/client";
import Link from "next/link";

const LearningSession = () => {
    const [data, setData] = useState({ assignments: [], exams: [], lessons: [] });
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        const [assignmentsRes, examsRes, lessonsRes] = await Promise.all([
            supabase.from("Assignments").select("*"),
            supabase.from("Exams").select("*"),
            supabase
                .from("Lessons")
                .select(`
          id, title, status, topic_id,
          Topics (
            title,
            Courses ( title )
          )
        `),
        ]);

        if (assignmentsRes.error || examsRes.error || lessonsRes.error) {
            console.error("Error fetching data:", assignmentsRes.error, examsRes.error, lessonsRes.error);
            return;
        }

        setData({
            assignments: assignmentsRes.data,
            exams: examsRes.data,
            lessons: lessonsRes.data,
        });

        setLoading(false);
    }

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <DndProvider backend={HTML5Backend}>
            <div>
                <Link href={"../"} className="top-4 left-4">Homepage</Link>
                <PomodoroTimer />
                <div className="mt-8">
                    <h2 className="text-xl font-bold flex text-center align-center justify-center">To Do List</h2>
                    {loading ? <p>Loading...</p> : <KanbanBoard data={data} />}
                </div>
            </div>
        </DndProvider>
    );
};

export default LearningSession;
