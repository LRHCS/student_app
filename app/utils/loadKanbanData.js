// src/utils/loadLearningSessionData.js
import { supabase } from "@/app/utils/client";

export async function loadKanbanData() {
    const [assignmentsRes, examsRes] = await Promise.all([
        supabase.from("Assignments").select("*"),
        supabase.from("Exams").select(`
            *,
            Topics (
                title,
                Courses ( title )
            )
        `)
    ]);

    if (assignmentsRes.error || examsRes.error) {
        console.error(
            "Error fetching data:",
            assignmentsRes.error,
            examsRes.error
        );
        return { assignments: [], exams: [] };
    }

    return {
        assignments: assignmentsRes.data,
        exams: examsRes.data.map(exam => ({
            ...exam,
            type: "exam",
            status: exam.status || 0,
            course_name: exam.Topics?.Courses?.title || "Unknown Course",
            topic_name: exam.Topics?.title || "Unknown Topic"
        }))
    };
}
