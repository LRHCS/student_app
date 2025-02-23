"use client";

import { useState } from "react";
import KanbanBoard from "./Kanban/KanbanBoard";
import PomodoroTimer from "./PomodoroTimer";
import Link from "next/link";

const ClientLearningSession = ({ initialData }) => {
    const [sessionStarted, setSessionStarted] = useState(false);
    const [data] = useState(initialData);

    if (!sessionStarted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">Ready to Start Learning?</h1>
                    <p className="text-gray-600">Set your timer and begin your focused study session</p>
                </div>
                
                <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg">
                    <PomodoroTimer 
                        initiallyMinimized={false} 
                        startOnSession={true}
                        onStart={() => setSessionStarted(true)} 
                    />
                </div>
                
                <button
                    onClick={() => setSessionStarted(true)}
                    className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 shadow-md"
                >
                    Start Session
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="absolute top-4 left-4">
                <Link href={"../"} className="font-bold hover:underline h-12 w-12">
                    Dashboard
                </Link>
                <span> / </span>
            </div>

            <div className="mt-12 rounded-lg">
                <KanbanBoard data={data} />
            </div>
        </div>
    );
};

export default ClientLearningSession; 