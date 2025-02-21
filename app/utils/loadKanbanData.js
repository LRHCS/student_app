// src/utils/loadLearningSessionData.js
import { supabase } from "./supabase/client";

export async function loadKanbanData() {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const [assignmentsRes, examsRes] = await Promise.all([
        supabase
            .from("Assignments")
            .select("*, Topics(title, Courses(title))")
            .order('date', { ascending: true }),
        supabase
            .from("Exams")
            .select(`
                *,
                Topics (
                    title,
                    Courses ( title )
                )
            `)
            .order('date', { ascending: true })
    ]);

    if (assignmentsRes.error || examsRes.error) {
        console.error(
            "Error fetching data:",
            assignmentsRes.error,
            examsRes.error
        );
        return { assignments: [], exams: [] };
    }

    // Process assignments data
    const assignments = (assignmentsRes.data || []).map(assignment => ({
        ...assignment,
        type: "assignment",
        status: assignment.status || 0,
        course_name: assignment.Topics?.Courses?.title || "Unknown Course",
        topic_name: assignment.Topics?.title || "Unknown Topic"
    }));

    // Process exams data
    const exams = (examsRes.data || []).map(exam => ({
        ...exam,
        type: "exam",
        status: exam.status || 0,
        course_name: exam.Topics?.Courses?.title || "Unknown Course",
        topic_name: exam.Topics?.title || "Unknown Topic"
    }));

    return {
        assignments,
        exams
    };
}
