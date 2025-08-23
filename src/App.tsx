import FocusStudioStarter from "./FocusStudioStarter";
import PlanningChatbot from "./PlanningChatbot";
import { TaskProvider } from "@/lib/taskContext";

export default function App() {
  return (
    <TaskProvider>
      <div className="min-h-screen bg-background text-foreground">
        <FocusStudioStarter />
        <PlanningChatbot />
      </div>
    </TaskProvider>
  );
}