"use client";
import KanbanBoard from "../components/Kanban/KanbanBoard";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadKanbanData } from "@/app/utils/loadKanbanData";


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
                <div className="absolute top-4 left-4">
                <Link href={"../"} className="font-bold hover:underline h-12 w-12">
                    Dashboard
                </Link>
                <span> / </span>
                </div>

                <div className="mt-12 rounded-lg">
                    {loading ? <p>Loading...</p> : <KanbanBoard data={data} />}
                </div>
            </div>
    );
};

export default LearningSession;
