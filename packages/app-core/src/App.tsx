import './i18n';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AuthProvider, useAuthContext } from './state/AuthContext';
import { TasksProvider } from './state/TasksContext';
import { ProjectsProvider } from './state/ProjectsContext';
import { GoalsProvider } from './state/GoalsContext';
import { HabitsProvider } from './state/HabitsContext';
import { SettingsProvider } from './state/SettingsContext';
import { LoginPage } from './pages/Auth/LoginPage';

/**
 * Phase 27 — gates everything else behind a real session. Not-yet-
 * authenticated renders LoginPage alone, no Sidebar/Topbar/router at
 * all; the entity providers (Tasks/Projects/Goals/Habits) only mount
 * once there's a token, since their first fetch would 401 otherwise.
 * `isHydrating` avoids a one-frame flash of the login form while
 * AuthProvider is still reading localStorage.
 */
function AuthGate() {
  const { isAuthenticated, isHydrating } = useAuthContext();

  if (isHydrating) return null;
  if (!isAuthenticated) return <LoginPage />;

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

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
