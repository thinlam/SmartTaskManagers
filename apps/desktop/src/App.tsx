import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { TasksProvider } from './state/TasksContext';
import { ProjectsProvider } from './state/ProjectsContext';
import { GoalsProvider } from './state/GoalsContext';

export default function App() {
  return (
    <TasksProvider>
      <ProjectsProvider>
        <GoalsProvider>
          <RouterProvider router={router} />
        </GoalsProvider>
      </ProjectsProvider>
    </TasksProvider>
  );
}
