import { useState, useEffect } from 'react';
import { supabase } from '../../utils/client';

const AddExamModal = ({ isOpen, onClose, status, onAdd }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [topics, setTopics] = useState([]);

    useEffect(() => {
        loadTopics();
    }, []);

    const loadTopics = async () => {
        const { data, error } = await supabase
            .from('Topics')
            .select(`
                id,
                title,
                course_id,
                Courses (
                    title
                )
            `);
        if (data) setTopics(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const newExam = {
            title,
            date,
            status,
            topicId: selectedTopic || null
        };

        const response = await supabase
            .from('Exams')
            .insert([newExam])
            .select(`
                *,
                Topics (
                    title,
                    Courses (
                        title
                    )
                )
            `);

        if (response.data) {
            const addedExam = {
                ...response.data[0],
                type: 'exam',
                topic_name: response.data[0].Topics?.title || "Unassigned",
                course_name: response.data[0].Topics?.Courses?.title || "Unassigned"
            };
            onAdd(addedExam);
            onClose();
            setTitle('');
            setDate('');
            setSelectedTopic('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Add New Exam</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Topic</label>
                        <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Unassigned</option>
                            {topics.map((topic) => (
                                <option key={topic.id} value={topic.id}>
                                    {topic.Courses.title} - {topic.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            Add Exam
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddExamModal; 