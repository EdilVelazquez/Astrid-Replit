import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Activity, LogOut, Shield, Eye, Sparkles } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { ServiceMonitoring } from './ServiceMonitoring';
import { UserRoleManagement } from './UserRoleManagement';
import { AstridViewer } from './AstridViewer';

type TabType = 'monitoring' | 'astrid' | 'users' | 'roles';

interface AdminPanelProps {
  onSwitchToUserView?: () => void;
}

export function AdminPanel({ onSwitchToUserView }: AdminPanelProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('monitoring');

  const handleSignOut = async () => {
    await signOut();
  };

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const isOwner = user?.role === 'owner';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-sm text-gray-600">{user?.email} - {user?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {onSwitchToUserView && (
                <button
                  onClick={onSwitchToUserView}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver como Usuario
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'monitoring'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-5 h-5" />
              Monitoreo de Servicios
            </button>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setActiveTab('astrid')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'astrid'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                ASTRID
              </button>
            )}
            {isOwnerOrAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-5 h-5" />
                Gestión de Usuarios
              </button>
            )}
            {isOwnerOrAdmin && (
              <button
                onClick={() => setActiveTab('roles')}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'roles'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Shield className="w-5 h-5" />
                Gestión de Roles
              </button>
            )}
          </div>
        </div>

        {activeTab === 'monitoring' && <ServiceMonitoring />}
        {activeTab === 'astrid' && isOwnerOrAdmin && <AstridViewer />}
        {activeTab === 'users' && isOwnerOrAdmin && <UserManagement />}
        {activeTab === 'roles' && isOwnerOrAdmin && <UserRoleManagement />}
      </div>
    </div>
  );
}
