import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { TasksProvider } from './state/TasksContext';

export default function App() {
  return (
    <TasksProvider>
      <RouterProvider router={router} />
    </TasksProvider>
  );
}
