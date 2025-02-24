import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NotesClient from './NotesClient';
import { DragProvider } from '../../../../../../contexts/DragContext';

// Dynamically generate SEO metadata based on the note title
export async function generateMetadata({ params }) {
    const { note } = params;
    const supabase = createServerComponentClient({ cookies });
    let noteTitle = 'Note';

    const { data: noteData, error } = await supabase
        .from('Lessons')
        .select('title')
        .eq('id', note)
        .single();

    if (error) {
        console.error('Error fetching note title:', error);
    }

    if (noteData && noteData.title) {
        noteTitle = noteData.title;
    }

    return {
        title: `${noteTitle} | MyApp`,
        description: `View and manage note: ${noteTitle}.`,
        openGraph: {
            title: `${noteTitle} | MyApp`,
            description: `View and manage note: ${noteTitle}.`,
            url: 'https://yourdomain.com', // Replace with your actual domain
        },
        twitter: {
            card: 'summary_large_image',
            site: '@your_twitter_handle', // Replace with your Twitter handle
            title: `${noteTitle} | MyApp`,
            description: `View and manage note: ${noteTitle}.`
        }
    };
}

export default async function NotePage({ params }) {
    const { note, topic, title } = await params;
    
    // Wait for cookies to be available
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        redirect('/');
    }

    try {
        // Fetch lesson data
        const { data: lesson, error: lessonError } = await supabase
            .from('Lessons')
            .select('*')
            .eq('id', note)
            .single();

        if (lessonError) throw lessonError;

        let parsedContent = [];
        try {
            parsedContent = JSON.parse(lesson.content || '[]');
            } catch (e) {
                console.error('Error parsing content:', e);
        }

        const initialData = {
            lessonId: note,
            courseTitle: decodeURIComponent(title),
            topicTitle: decodeURIComponent(topic),
            content: parsedContent,
            title: lesson.title || ''
        };

    return (
        <DragProvider>
                <NotesClient initialData={initialData} />
        </DragProvider>
    );

    } catch (error) {
        console.error('Error loading note:', error);
        redirect(`/course/${decodeURIComponent(title)}/topic/${decodeURIComponent(topic)}`);
    }
}