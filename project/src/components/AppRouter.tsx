import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Login } from './Login';
import { AdminPanel } from './admin/AdminPanel';
import { Loader2 } from 'lucide-react';

interface AppRouterProps {
  children: React.ReactNode;
}

export function AppRouter({ children }: AppRouterProps) {
  const { user, loading } = useAuth();
  const [viewAsUser, setViewAsUser] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login key="login-view" />;
  }

  const isAdminUser = user.role === 'owner' || user.role === 'admin';

  if (isAdminUser && !viewAsUser) {
    return <AdminPanel key="admin-panel" onSwitchToUserView={() => setViewAsUser(true)} />;
  }

  if (isAdminUser && viewAsUser) {
    return (
      <div key="user-view-mode">
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <p className="text-sm text-yellow-800">
            Modo Vista de Usuario (como Técnico)
            <button
              onClick={() => setViewAsUser(false)}
              className="ml-3 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs font-medium"
            >
              Volver al Panel de Admin
            </button>
          </p>
        </div>
        {children}
      </div>
    );
  }

  return <div key="technician-view">{children}</div>;
}
