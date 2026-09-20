import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { TasksProvider } from './state/TasksContext';
import { ProjectsProvider } from './state/ProjectsContext';

export default function App() {
  return (
    <TasksProvider>
      <ProjectsProvider>
        <RouterProvider router={router} />
      </ProjectsProvider>
    </TasksProvider>
  );
}
