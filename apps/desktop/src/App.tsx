import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { TasksProvider } from './state/TasksContext';
import { ProjectsProvider } from './state/ProjectsContext';
import { GoalsProvider } from './state/GoalsContext';
import { HabitsProvider } from './state/HabitsContext';
import { SettingsProvider } from './state/SettingsContext';

export default function App() {
  return (
    <TasksProvider>
      <ProjectsProvider>
        <GoalsProvider>
          <HabitsProvider>
            <SettingsProvider>
              <RouterProvider router={router} />
            </SettingsProvider>
          </HabitsProvider>
        </GoalsProvider>
      </ProjectsProvider>
    </TasksProvider>
  );
}
