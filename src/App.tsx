import FocusStudioStarter from "./FocusStudioStarter";
import PlanningChatbot from "./PlanningChatbot";
import { TaskProvider } from "@/lib/taskContext";
import { TemplateProvider } from "@/lib/templateContext";

export default function App() {
  return (
    <TemplateProvider>
      <TaskProvider>
        <div className="min-h-screen bg-background text-foreground">
          <FocusStudioStarter />
          <PlanningChatbot />
        </div>
      </TaskProvider>
    </TemplateProvider>
  );
}