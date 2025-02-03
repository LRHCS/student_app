import { useState, useEffect } from "react";

const PomodoroTimer = () => {
    const [workTime, setWorkTime] = useState(25 * 60);
    const [breakTime, setBreakTime] = useState(5 * 60);
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
        }
        return () => clearInterval(timer);
    }, [isRunning, timeLeft, isWorkSession, workTime, breakTime]);

    const adjustTime = (type, amount) => {
        if (type === "work") {
            const newWorkTime = Math.max(60, workTime + amount);
            setWorkTime(newWorkTime);
            if (isWorkSession) setTimeLeft(newWorkTime);
        } else {
            const newBreakTime = Math.max(60, breakTime + amount);
            setBreakTime(newBreakTime);
            if (!isWorkSession) setTimeLeft(newBreakTime);
        }
    };

    return (
        <div className="text-center">
            <h1 className="text-2xl font-bold">{isWorkSession ? "Work Session" : "Break Session"}</h1>
            <p className="text-6xl my-4">
                {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                {String(timeLeft % 60).padStart(2, "0")}
            </p>
            <div className="flex justify-center space-x-6 my-4">
                {["work", "break"].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                        <button onClick={() => adjustTime(type, 60)} className="px-3 py-1 border border-gray-400 rounded">+</button>
                        <span className="text-lg">{type === "work" ? "Work" : "Break"}: {Math.floor((type === "work" ? workTime : breakTime) / 60)} min</span>
                        <button onClick={() => adjustTime(type, -60)} className="px-3 py-1 border border-gray-400 rounded">-</button>
                    </div>
                ))}
            </div>

            <button onClick={() => setIsRunning(!isRunning)} className="px-4 py-2 bold rounded">
                {isRunning ? "Pause" : "Start"}
            </button>
            <button onClick={() => setTimeLeft(isWorkSession ? workTime : breakTime)} className="ml-2 px-4 py-2 text-red-700 rounded">
                Reset
            </button>
        </div>
    );
};

export default PomodoroTimer;
