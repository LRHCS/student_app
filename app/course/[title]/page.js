import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CourseClient from './CourseClient';
import { redirect } from 'next/navigation';

// Helper function for date formatting
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default async function CoursePage(props) {
    const params = await props.params;
    const supabase = createServerComponentClient({ cookies });
    const title = decodeURIComponent(params.title);

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect('/');
    }

    try {
        // Fetch course data
        const { data: course, error: courseError } = await supabase
                .from("Courses")
                .select("id")
                .eq("title", title)
                .single();

        if (courseError) throw courseError;

        // Fetch topics
        const { data: topics, error: topicsError } = await supabase
                .from("Topics")
                .select("*")
            .eq("course_id", course.id)

        if (topicsError) throw topicsError;

        // Fetch exams and lessons for topics
        const topicIds = topics.map(topic => topic.id);
        
        const [
            { data: exams, error: examsError },
            { data: assignments, error: assignmentsError },
            { data: lessons, error: lessonsError }
        ] = await Promise.all([
            supabase
                .from("Exams")
                .select("*")
                .in("topicId", topicIds),
            supabase
                .from("Assignments")
                .select("*")
                .in("topicId", topicIds),
            supabase
                .from("Lessons")
                .select("*")
                .in("topic_id", topicIds)
        ]);

        if (examsError) throw examsError;
        if (assignmentsError) throw assignmentsError;
        if (lessonsError) throw lessonsError;

        // Process assignments to get only upcoming ones
                const today = new Date();
                today.setHours(0, 0, 0, 0);
        const upcomingAssignments = assignments.filter(assignment => {
                    const assignmentDate = new Date(assignment.date);
                    assignmentDate.setHours(0, 0, 0, 0);
            return assignmentDate >= today;
        });

        // Group lessons by exam
        const examLessonsMap = {};
        exams.forEach(exam => {
            examLessonsMap[exam.id] = lessons.filter(lesson => 
                lesson.topic_id === exam.topicId
            );
        });

        // Format dates before sending to client
        const formattedExams = exams.map(exam => ({
            ...exam,
            date: formatDate(exam.date)
        }));

        const formattedAssignments = upcomingAssignments.map(assignment => ({
            ...assignment,
            date: formatDate(assignment.date)
        }));

        const initialData = {
            courseId: course.id,
            title,
            topics,
            exams: formattedExams,
            assignments: formattedAssignments,
            examLessons: examLessonsMap
        };

        return <CourseClient initialData={initialData} />;

    } catch (error) {
        console.error('Error loading course:', error);
        redirect('/dashboard');
    }
}