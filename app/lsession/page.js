"use client";
import PomodoroTimer from "./components/PomodoroTimer";
import KanbanBoard from "../components/Kanban/KanbanBoard";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadKanbanData } from "@/app/utils/loadKanbanData";
import {HTML5Backend} from "react-dnd-html5-backend";
import {DndProvider} from "react-dnd";

const LearningSession = () => {
    const [data, setData] = useState({ assignments: [], exams: [], lessons: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const fetchedData = await loadKanbanData();
            setData(fetchedData);
            setLoading(false);
        };
        fetchData();
    }, []);

    return (
            <div>
                <Link href={"../"} className="top-4 left-4">
                    Homepage
                </Link>
                <PomodoroTimer />
                <div className="mt-8">
                    <h2 className="text-xl font-bold flex text-center align-center justify-center">
                        To Do List
                    </h2>
                    {loading ? <p>Loading...</p> : <KanbanBoard data={data} />}
                </div>
            </div>
    );
};

export default LearningSession;
