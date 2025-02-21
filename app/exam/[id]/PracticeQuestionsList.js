"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase/client";
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from "react-icons/md";

export default function PracticeQuestionsList({ examId }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [expandedAnswers, setExpandedAnswers] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuestions();
    }, [examId]);

    const fetchQuestions = async () => {
        setLoading(true);
        const { data: lessonsData } = await supabase
            .from("Lessons")
            .select("id, title, practice_question")
            .eq("topic_id", examId);

        if (lessonsData) {
            const allQuestions = lessonsData.reduce((acc, lesson) => {
                if (lesson.practice_question?.questions) {
                    return [...acc, ...lesson.practice_question.questions.map(q => ({
                        ...q,
                        lessonTitle: lesson.title
                    }))];
                }
                return acc;
            }, []);
            setQuestions(allQuestions);
        }
        setLoading(false);
    };

    return (
        <div className="mb-6 bg-white rounded-lg shadow-md">
            <div 
                className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-t-lg 
                    cursor-pointer hover:bg-gray-200"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <MdKeyboardArrowDown size={20} /> : <MdKeyboardArrowUp size={20} />}
                    <span className="font-medium">Practice Questions</span>
                </div>
                <span className="text-gray-500 text-sm">
                    {loading ? ("Loading...") : 
                     `${questions.length} question${questions.length !== 1 ? 's' : ''}`}
                </span>
            </div>

            {isExpanded && (
                <div className="p-4 space-y-4 max-h-[60vh] md:max-h-[40vh] overflow-y-auto">
                    {loading ? (
                        <div className="text-gray-500 text-center py-4">
                            Loading questions...
                        </div>
                    ) : questions.length > 0 ? (
                        questions.map((q) => (
                            <div key={q.id} className="border rounded-lg p-4">
                                <div className="text-sm text-gray-500 mb-2">
                                    From: {q.lessonTitle}
                                </div>
                                <div className="font-medium mb-2">{q.question}</div>
                                <div 
                                    className="cursor-pointer text-gray-600 hover:text-gray-900"
                                    onClick={() => setExpandedAnswers(prev => ({ 
                                        ...prev, 
                                        [q.id]: !prev[q.id] 
                                    }))}
                                >
                                    <div className="flex items-center gap-1">
                                        {expandedAnswers[q.id] ? 
                                            <MdKeyboardArrowDown size={16} /> : 
                                            <MdKeyboardArrowUp size={16} />
                                        }
                                        <span className="text-sm">Answer</span>
                                    </div>
                                    {expandedAnswers[q.id] && (
                                        <p className="mt-2 pl-5 text-gray-700 whitespace-pre-wrap">
                                            {q.answer}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500 text-center py-4">
                            No practice questions available. Add questions in your lesson notes.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};