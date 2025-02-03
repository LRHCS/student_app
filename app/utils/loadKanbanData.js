// src/utils/loadLearningSessionData.js
import { supabase } from "@/app/utils/client";

export async function loadKanbanData() {
    const [assignmentsRes, examsRes, lessonsRes] = await Promise.all([
        supabase.from("Assignments").select("*"),
        supabase.from("Exams").select("*"),
        supabase.from("Lessons").select(`
      id, title, status, topic_id,
      Topics (
        title,
        Courses ( title )
      )
    `),
    ]);

    if (assignmentsRes.error || examsRes.error || lessonsRes.error) {
        console.error(
            "Error fetching data:",
            assignmentsRes.error,
            examsRes.error,
            lessonsRes.error
        );
        // Return empty arrays in case of error.
        return { assignments: [], exams: [], lessons: [] };
    }

    return {
        assignments: assignmentsRes.data,
        exams: examsRes.data,
        lessons: lessonsRes.data,
    };
}
