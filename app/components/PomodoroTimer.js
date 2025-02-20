"use client"
import { useState, useEffect } from "react";

const PomodoroTimer = ({ initiallyMinimized = true, onStart, startOnSession = false }) => {
    // Use localStorage to load saved time lengths (simulating Profiles.work_time and Profiles.rest_time)
    // Also, add a mounted flag to prevent SSR/client hydration mismatches.
    const [mounted, setMounted] = useState(false);
    const [isMinimized, setIsMinimized] = useState(initiallyMinimized);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Start timer automatically if startOnSession is true and component is not minimized
        if (startOnSession && !initiallyMinimized && !isRunning) {
            handleStart();
        }
    }, [startOnSession, initiallyMinimized]);

    const [workTime, setWorkTime] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('work_time');
            return stored ? parseInt(stored, 10) : 25 * 60;
        }
        return 25 * 60;
    });
    const [breakTime, setBreakTime] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('rest_time');
            return stored ? parseInt(stored, 10) : 5 * 60;
        }
        return 5 * 60;
    });
    const [timeLeft, setTimeLeft] = useState(workTime);
    const [isRunning, setIsRunning] = useState(false);
    const [isWorkSession, setIsWorkSession] = useState(true);

    useEffect(() => {
        let timer;
        if (isRunning) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        }
        if (timeLeft === 0) {
            setTimeLeft(isWorkSession ? breakTime : workTime);
            setIsWorkSession(!isWorkSession);
            // Play sound or show notification when timer ends
            new Audio('/notification.mp3').play().catch(e => console.log('Audio failed to play:', e));
            if (Notification.permission === 'granted') {
                new Notification(isWorkSession ? 'Break Time!' : 'Back to Work!');
            }
        }
        return () => clearInterval(timer);
    }, [isRunning, timeLeft, isWorkSession, workTime, breakTime]);

    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const adjustTime = (type, amount) => {
        if (type === "work") {
            const newWorkTime = Math.max(60, workTime + amount);
            setWorkTime(newWorkTime);
            if (isWorkSession) setTimeLeft(newWorkTime);
            localStorage.setItem('work_time', newWorkTime); // Update Profiles.work_time
        } else {
            const newBreakTime = Math.max(60, breakTime + amount);
            setBreakTime(newBreakTime);
            if (!isWorkSession) setTimeLeft(newBreakTime);
            localStorage.setItem('rest_time', newBreakTime); // Update Profiles.rest_time
        }
    };

    const handleStart = () => {
        setIsRunning(true);
        if (onStart) {
            onStart();
        }
    };

    // Don't show the timer on the login page
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        return null;
    }

    return mounted ? (
        <div className={`${initiallyMinimized ? 'fixed bottom-4 right-4 z-50' : ''} 
            ${!initiallyMinimized ? 'w-full' : ''}`}>
            <div className={`bg-white rounded-lg shadow-lg transition-all duration-300 ${
                isMinimized ? 'w-[130px]' : 'w-[400px]'
            }`}>
                {/* Minimized View */}
                <div 
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setIsMinimized(!isMinimized)}
                >
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="font-mono text-[1.5rem]">
                            {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                            {String(timeLeft % 60).padStart(2, "0")}
                        </span>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isRunning) {
                                handleStart();
                            } else {
                                setIsRunning(false);
                            }
                        }}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        {isRunning ? '⏸️' : '▶️'}
                    </button>
                </div>

                {/* Expanded View */}
                {!isMinimized && (
                    <div className="p-4 border-t">
                        <h1 
                            style={{ fontFamily: "Monoton, cursive" }} 
                            className="text-2xl text-gray-800 mb-4"
                        >
                            {isWorkSession ? "Work Session" : "Break Session"}
                        </h1>
                        
                        <div className="space-y-4">
                            {["work", "break"].map((type) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">
                                        {type === "work" ? "Work" : "Break"}: {Math.floor((type === "work" ? workTime : breakTime) / 60)} min
                                    </span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => adjustTime(type, -60)}
                                            className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none transition"
                                        >
                                            -
                                        </button>
                                        <button
                                            onClick={() => adjustTime(type, 60)}
                                            className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none transition"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={() => setTimeLeft(isWorkSession ? workTime : breakTime)}
                                className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-100 transition"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    ) : null;
};

export default PomodoroTimer; 