"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/app/utils/client";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const topicId = searchParams.get("topicId");

  const handleNext = useCallback(() => {
    setShowAnswer(false);
    setCurrentIndex((prev) =>
      prev === flashcards.length - 1 ? 0 : prev + 1
    );
  }, [flashcards.length]);

  const handlePrev = useCallback(() => {
    setShowAnswer(false);
    setCurrentIndex((prev) =>
      prev === 0 ? flashcards.length - 1 : prev - 1
    );
  }, [flashcards.length]);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  // Keyboard shortcuts: Space or ArrowUp/ArrowDown flip card, ArrowLeft/ArrowRight for navigation.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        setShowAnswer((prev) => !prev);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNext, handlePrev]);

  // Fetch lessons that have practice questions and extract individual flashcards.
  // If topicId is provided in the URL, filter lessons by topic_id.
  const fetchFlashcards = async () => {
    setLoading(true);
    let query = supabase.from("Lessons").select("id, title, practice_question");
    if (topicId) {
      query = query.eq("topic_id", topicId);
    }
    const { data: lessonsData, error } = await query;

    if (error) {
      console.error("Error fetching lessons:", error);
      setLoading(false);
      return;
    }

    const cards = [];
    lessonsData.forEach((lesson) => {
      if (
        lesson.practice_question &&
        lesson.practice_question.questions &&
        Array.isArray(lesson.practice_question.questions)
      ) {
        lesson.practice_question.questions.forEach((q) => {
          cards.push({
            ...q,
            lessonTitle: lesson.title,
            lessonId: lesson.id,
          });
        });
      }
    });

    setFlashcards(cards);
    setLoading(false);
  };

  return (
  <div>
    <div className="top-4 left-4 absolute">
          <Link href="../../.." className="hover:underline font-bold text-white ">
          Dashboard
    </Link><span className="text-white"> / </span>
    </div>

    <div className="min-h-screen bg-gray-600  p-4 flex flex-col items-center justify-center">
      
      
      {loading ? (
        <div className="text-gray-600">Loading flashcards...</div>
      ) : flashcards.length === 0 ? (
        <div className="text-white">
          No flashcards available. Add practice questions in your lessons.
        </div>
      ) : (
        <div className="w-full ">
          {/* Flashcard container with 3D perspective */}
          <div className="mb-6 flex justify-center items-center">
            <div
              onClick={() => setShowAnswer((prev) => !prev)}
              className="relative w-[30vw] h-[50vh] cursor-pointer transition-transform duration-700"
              style={{ 
                transformStyle: "preserve-3d",
                transform: showAnswer ? "rotateY(180deg)" : "rotateY(0deg)"
              }}
            >
              {/* Front Side (Question) */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-white rounded-lg shadow-xl p-6"
                style={{ 
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden"
                }}
              >
                <span className="text-2xl font-semibold p-4">
                  {flashcards[currentIndex].question}
                </span>
              </div>
              {/* Back Side (Answer) */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-white rounded-lg shadow-xl p-6"
                style={{ 
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)"
                }}
              >
                <span className="text-2xl font-semibold p-4">
                  {flashcards[currentIndex].answer}
                </span>
              </div>
            </div>
          </div>
          {/* Navigation Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handlePrev}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              <MdKeyboardArrowLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              <MdKeyboardArrowRight size={24} />
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-500 text-center">
            {currentIndex + 1} / {flashcards.length}
          </div>
        </div>
      )}
    </div>
    </div>
  );
} 