import { useState, useEffect } from 'react';
import { supabase } from "@/app/utils/client";

const EditTaskModal = ({ isOpen, onClose, task, onUpdate }) => {
    const [title, setTitle] = useState(task?.title || '');
    const [date, setDate] = useState(task?.date ? new Date(task.date).toISOString().split('T')[0] : '');
    const [selectedTopic, setSelectedTopic] = useState(task?.topicId || '');
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
        
        const updates = {
            title,
            date,
            topicId: selectedTopic || null
        };

        let response;
        if (task.type === 'exam') {
            response = await supabase
                .from('Exams')
                .update(updates)
                .match({ id: task.id })
                .select(`
                    *,
                    Topics (
                        title,
                        Courses (
                            title
                        )
                    )
                `);
        } else {
            response = await supabase
                .from('Assignments')
                .update(updates)
                .match({ id: task.id })
                .select();
        }

        if (response.data) {
            const updatedTask = {
                ...response.data[0],
                type: task.type,
                topic_name: response.data[0].Topics?.title || "Unassigned",
                course_name: response.data[0].Topics?.Courses?.title || "Unassigned"
            };
            onUpdate(updatedTask);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                    Edit {task.type === 'exam' ? 'Exam' : 'Assignment'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTaskModal; 