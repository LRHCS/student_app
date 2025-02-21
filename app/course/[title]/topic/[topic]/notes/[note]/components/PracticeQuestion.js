"use client";

import React, { useState, useEffect, forwardRef } from "react";
import { supabase } from "../../../../../../../utils/supabase/client";
import { MdKeyboardArrowUp, MdKeyboardArrowDown, MdAdd } from 'react-icons/md';

function PracticeQuestion({ lessonId, title }, ref) {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingStates, setEditingStates] = useState({});
  const [expandedAnswers, setExpandedAnswers] = useState({});

  useEffect(() => {
    fetchQuestions();
  }, [lessonId]);

  const fetchQuestions = async () => {
    if (!lessonId) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("Lessons")
      .select("practice_question")
      .eq("id", lessonId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching practice questions:", error);
    }
    
    if (data?.practice_question?.questions) {
      setQuestions(data.practice_question.questions);
    } else {
      setQuestions([]);
    }
    setIsLoading(false);
  };

  const handleSave = async (questionId, newQuestion, newAnswer) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId 
        ? { ...q, question: newQuestion, answer: newAnswer }
        : q
    );

    const { error } = await supabase
      .from("Lessons")
      .update({
        practice_question: {
          questions: updatedQuestions
        }
      })
      .eq("id", lessonId);

    if (error) {
      console.error("Error updating practice question:", error);
    } else {
      setQuestions(updatedQuestions);
      setEditingStates(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const addNewQuestion = async () => {
    const newQuestion = {
      id: Date.now().toString(),
      question: "",
      answer: ""
    };

    const updatedQuestions = [...questions, newQuestion];
    
    const { error } = await supabase
      .from("Lessons")
      .update({
        practice_question: {
          questions: updatedQuestions
        }
      })
      .eq("id", lessonId);

    if (error) {
      console.error("Error adding new question:", error);
    } else {
      setQuestions(updatedQuestions);
      setEditingStates(prev => ({ ...prev, [newQuestion.id]: true }));
      setExpandedAnswers(prev => ({ ...prev, [newQuestion.id]: true }));
    }
  };

  const deleteQuestion = async (questionId) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    
    const { error } = await supabase
      .from("Lessons")
      .update({
        practice_question: {
          questions: updatedQuestions
        }
      })
      .eq("id", lessonId);

    if (error) {
      console.error("Error deleting question:", error);
    } else {
      setQuestions(updatedQuestions);
    }
  };

  return (
    <div className="bg-white border-t border-gray-500 shadow-lg" ref={ref}>
      <div 
        className="flex items-center justify-between px-4 py-2 bg-gray-100 cursor-pointer hover:bg-gray-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <MdKeyboardArrowDown size={20} /> : <MdKeyboardArrowUp size={20} />}
          <span className="font-medium">Practice Questions</span>
        </div>
        <span className="text-gray-500 text-sm">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isExpanded && (
        <div className="absolute bottom-full w-full bg-white border-t border-gray-200 shadow-lg" 
             style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="w-16 h-16 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {questions.map((q) => (
                <div key={q.id} className="border rounded-lg p-4">
                  {editingStates[q.id] ? (
                    <div className="space-y-2">
                      <textarea
                        value={q.question}
                        onChange={(e) => {
                          const updatedQuestions = questions.map(quest => 
                            quest.id === q.id ? { ...quest, question: e.target.value } : quest
                          );
                          setQuestions(updatedQuestions);
                        }}
                        placeholder="Write your question here..."
                        className="w-full border rounded p-2"
                        rows="2"
                      />
                      <textarea
                        value={q.answer}
                        onChange={(e) => {
                          const updatedQuestions = questions.map(quest => 
                            quest.id === q.id ? { ...quest, answer: e.target.value } : quest
                          );
                          setQuestions(updatedQuestions);
                        }}
                        placeholder="Write your answer here..."
                        className="w-full border rounded p-2"
                        rows="3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(q.id, q.question, q.answer)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingStates(prev => ({ ...prev, [q.id]: false }))}
                          className="bg-gray-300 text-black px-3 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{q.question || "No question set"}</p>
                        <button
                          onClick={() => setEditingStates(prev => ({ ...prev, [q.id]: true }))}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-200"
                        >
                          Edit
                        </button>
                      </div>
                      <div 
                        className="mt-2 cursor-pointer text-gray-600 hover:text-gray-900"
                        onClick={() => setExpandedAnswers(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                      >
                        <div className="flex items-center gap-1">
                          {expandedAnswers[q.id] ? <MdKeyboardArrowDown size={16} /> : <MdKeyboardArrowUp size={16} />}
                          <span className="text-sm">Answer</span>
                        </div>
                        {expandedAnswers[q.id] && (
                          <p className="mt-1 pl-5 text-gray-700">{q.answer || "No answer provided"}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={addNewQuestion}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-200"
              >
                <MdAdd size={20} />
                Add Question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default forwardRef(PracticeQuestion); 