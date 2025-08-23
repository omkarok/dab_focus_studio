import FocusStudioStarter from "./FocusStudioStarter";
import PlanningChatbot from "./PlanningChatbot";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <FocusStudioStarter />
      <PlanningChatbot />
    </div>
  );
}