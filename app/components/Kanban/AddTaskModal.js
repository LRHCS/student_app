import { useState, useEffect } from 'react';
import { supabase } from '@/app/utils/client';

const AddTaskModal = ({ isOpen, onClose, status, type, onAdd }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const getCurrentUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setCurrentUser(session?.user);

            if (session?.user) {
                // Fetch only user's coursesx
                const { data: userCourses } = await supabase
                    .from('Courses')
                    .select('*')
                    .eq('user_id', session.user.id);
                
                setCourses(userCourses || []);
            }
        };
        getCurrentUser();
    }, []);

    // Update topics when course is selected
    useEffect(() => {
        const fetchTopics = async () => {
            if (selectedCourse) {
                const { data: courseTopics } = await supabase
                    .from('Topics')
                    .select('*')
                    .eq('course_id', selectedCourse);
                
                setTopics(courseTopics || []);
            } else {
                setTopics([]);
            }
        };
        fetchTopics();
    }, [selectedCourse]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Please log in to add tasks');
            return;
        }

        const newTask = {
            title,
            date,
            status,
            course_id: selectedCourse,
            topic_id: selectedTopic,
            uid: currentUser.id,
            created_at: new Date().toISOString()
        };

        // Add to appropriate table based on type
        const table = type === 'Exams' ? 'Exams' : 'Assignments';
        const { data, error } = await supabase
            .from(table)
            .insert([newTask])
            .select()
            .single();

        if (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task');
        } else {
            onAdd({ ...data, type: type.toLowerCase().slice(0, -1) });
            onClose();
        }

        // Reset form
        setTitle('');
        setDate('');
        setSelectedCourse('');
        setSelectedTopic('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-full">
                <h2 className="text-xl font-semibold mb-4">Add {type.slice(0, -1)}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Course
                        </label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => {
                                setSelectedCourse(e.target.value);
                                setSelectedTopic(''); // Reset topic when course changes
                            }}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Course</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Topic
                        </label>
                        <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Topic</option>
                            {topics.map((topic) => (
                                <option key={topic.id} value={topic.id}>
                                    {topic.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Add {type.slice(0, -1)}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal; 