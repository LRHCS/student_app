"use client";

import React, { useEffect, useRef } from 'react';
import NoteSummary from './NoteSummary';
import PracticeQuestion from './PracticeQuestion';

function NoteFooter({ lessonId, title }) {
  const practiceRef = useRef(null);

  useEffect(() => {
    const updatePracticeHeight = () => {
      if (practiceRef.current) {
        const height = practiceRef.current.offsetHeight;
        document.documentElement.style.setProperty('--practice-height', `${height}px`);
      }
    };

    // Initial update
    updatePracticeHeight();

    // Update on resize
    const observer = new ResizeObserver(updatePracticeHeight);
    if (practiceRef.current) {
      observer.observe(practiceRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="note-footer flex-shrink-0 sticky bottom-0 bg-white z-40">
      <NoteSummary lessonId={lessonId} title={title} />
      <PracticeQuestion lessonId={lessonId} title={title} ref={practiceRef} />
    </div>
  );
}

export default NoteFooter; 