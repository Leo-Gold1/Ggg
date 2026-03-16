import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider, useNavigate } from './hooks/useNavigate';
import { CommentsPage } from './pages/CommentsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ModerationPage } from './pages/ModerationPage';
import { AdminPage } from './pages/AdminPage';
import { NotificationsPage } from './pages/NotificationsPage';

function AppContent() {
  const { currentPage } = useNavigate();

  switch (currentPage) {
    case 'profile':
      return <ProfilePage />;
    case 'moderation':
      return <ModerationPage />;
    case 'admin':
      return <AdminPage />;
    case 'notifications':
      return <NotificationsPage />;
    default:
      return <CommentsPage />;
  }
}

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
