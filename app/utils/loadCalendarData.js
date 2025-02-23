import { supabase } from "./supabase/client";

export async function loadCalendarData(userId) {
    try {
        if (!userId) {
            throw new Error("No user id provided");
        }

        const [examsData, assignmentsData, coursesData, topicsData] = await Promise.all([
            supabase.from("Exams").select("*").eq("uid", userId),
            supabase.from("Assignments").select("*").eq("uid", userId),
            supabase.from("Courses").select("*").eq("user_id", userId),
            supabase.from("Topics").select("*")
        ]);

        return {
            exams: examsData.data || [],
            assignments: assignmentsData.data || [],
            courses: coursesData.data || [],
            topics: topicsData.data || []
        };
    } catch (error) {
        console.error("Error loading calendar data:", error);
        return {
            exams: [],
            assignments: [],
            courses: [],
            topics: []
        };
    }
}
