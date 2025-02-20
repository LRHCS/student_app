"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../../../../../utils/client";
import { MdKeyboardArrowUp, MdKeyboardArrowDown, MdEdit, MdSave, MdClose } from 'react-icons/md';

function NoteSummary({ lessonId, title }) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempSummary, setTempSummary] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!lessonId) return;
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from("Lessons")
          .select("summary")
          .eq("id", lessonId)
          .maybeSingle();

        if (error) throw error;
        if (isMounted) {
          setSummary(data?.summary || "");
        }
      } catch (error) {
        console.error("Error fetching summary:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  const handleSave = async () => {
    const { error } = await supabase
      .from("Lessons")
      .update({ summary: tempSummary })
      .eq("id", lessonId);

    if (error) {
      console.error("Error updating summary:", error);
    } else {
      setSummary(tempSummary);
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setTempSummary(summary);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempSummary("");
  };

  const fetchNoteDetails = async (noteId) => {
    const { data: note } = await supabase
      .from('notes')
      .select(`
        *,
        topics(title),
        courses(title)
      `)
      .eq('uid', noteId)
      .single();

    return note;
  };

  return (
    <div className="bg-white border-t border-gray-500 relative">
      <div 
        className="flex items-center justify-between px-4 py-2 bg-gray-100 cursor-pointer hover:bg-gray-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <MdKeyboardArrowDown size={20} /> : <MdKeyboardArrowUp size={20} />}
          <span className="font-medium">Note Summary</span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && summary && (
            <span className="text-xl">
              {summary.length > 30 ? summary.substring(0, 30) + "..." : summary}
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="absolute bottom-full w-full bg-white border-t border-gray-200 shadow-lg">
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={tempSummary}
                  onChange={(e) => setTempSummary(e.target.value)}
                  placeholder="Write your summary here..."
                  className="w-full border rounded p-2 min-h-[100px] resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    <MdSave size={16} />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1 bg-gray-300 text-black px-3 py-1 rounded text-sm hover:bg-gray-400"
                  >
                    <MdClose size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {summary || "No summary yet. Click edit to add one."}
                  </p>
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-200 ml-4"
                  >
                    <MdEdit size={16} />
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteSummary; 