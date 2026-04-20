import FocusStudioStarter from "./FocusStudioStarter";
import PlannerBar from "./features/dailyPlanner/PlannerBar";
import { TaskProvider } from "@/lib/taskContext";
import { TemplateProvider } from "@/lib/templateContext";
import { ProjectProvider } from "@/lib/projectContext";
import { TimeProvider } from "@/lib/timeContext";
import { AuthProvider } from "@/lib/authContext";
import { AuthGate } from "@/components/AuthGate";

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <ProjectProvider>
          <TemplateProvider>
            <TaskProvider>
              <TimeProvider>
                <div className="min-h-screen bg-background text-foreground pb-28">
                  <FocusStudioStarter />
                  <PlannerBar />
                </div>
              </TimeProvider>
            </TaskProvider>
          </TemplateProvider>
        </ProjectProvider>
      </AuthGate>
    </AuthProvider>
  );
}
