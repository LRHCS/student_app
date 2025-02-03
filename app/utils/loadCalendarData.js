// src/utils/loadCalendarData.js
import { supabase } from "./client";

export async function loadCalendarData() {
    try {
        const [examsResponse, assignmentsResponse, coursesResponse, topicsResponse] =
            await Promise.all([
                supabase.from("Exams").select("id, date, title, topicId"),
                supabase.from("Assignments").select("id, date, title, topicId"),
                supabase.from("Courses").select("*"),
                supabase.from("Topics").select("id, title, course_id"),
            ]);

        if (examsResponse.error)
            console.error("Error fetching exams:", examsResponse.error);
        if (assignmentsResponse.error)
            console.error("Error fetching assignments:", assignmentsResponse.error);
        if (coursesResponse.error)
            console.error("Error fetching courses:", coursesResponse.error);
        if (topicsResponse.error)
            console.error("Error fetching topics:", topicsResponse.error);

        return {
            exams: examsResponse.data || [],
            assignments: assignmentsResponse.data || [],
            courses: coursesResponse.data || [],
            topics: topicsResponse.data || [],
        };
    } catch (error) {
        console.error("Error loading calendar data:", error);
        return {
            exams: [],
            assignments: [],
            courses: [],
            topics: [],
        };
    }
}
