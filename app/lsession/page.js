
import { loadKanbanData } from "../utils/loadKanbanData";
import ClientLearningSession from "../components/ClientLearningSession";

// Server Component
async function LearningSession() {
    // Fetch data on the server
    const initialData = await loadKanbanData();

    return (
        <ClientLearningSession initialData={initialData} />
    );
}

export default LearningSession;
