import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ExamClient from './ExamClient';

// Add this helper function at the top
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default async function ExamPage({ params }) {
    const { id } = await params;
    
    // Wait for cookies to be available
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        redirect('/');
    }

    try {
        // Fetch exam details
        const { data: examData, error: examError } = await supabase
            .from("Exams")
            .select("id, title, date, topicId")
            .eq("id", id)
            .single();

        if (examError) throw examError;

        // Fetch topic including course_id
        const { data: topicData, error: topicError } = await supabase
            .from("Topics")
            .select("id, title, course_id")
            .eq("id", examData.topicId)
            .single();

        if (topicError) throw topicError;

        // Fetch course using course_id from topic
        const { data: courseData, error: courseError } = await supabase
            .from("Courses")
            .select("id, title")
            .eq("id", topicData.course_id)
            .single();

        if (courseError) throw courseError;

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
            .from("Lessons")
            .select("id, title, content, status")
            .eq("topic_id", examData.topicId);

        if (lessonsError) throw lessonsError;

        const initialData = {
            exam: {
                ...examData,
                // Format the date before sending to client
                date: formatDate(examData.date),
                topic: topicData,
                course: courseData
            },
            lessons: lessonsData || []
        };

        return <ExamClient initialData={initialData} />;

    } catch (error) {
        console.error('Error loading exam:', error);
        redirect('/dashboard');
    }
}
