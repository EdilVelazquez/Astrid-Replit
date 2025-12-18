import { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, Loader2, AlertCircle } from 'lucide-react';
import { getAllUsers, updateUserRole, isAdmin } from '../../services/permissionsService';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile } from '../../types';

export function UserRoleManagement() {
  const { user: currentUser, reloadUserProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    loadUsers();
    checkPermissions();
  }, [currentUser]);

  const checkPermissions = async () => {
    if (!currentUser?.id) return;
    const hasPermission = await isAdmin(currentUser.id);
    setCanManage(hasPermission);
  };

  const loadUsers = async () => {
    setLoading(true);
    const allUsers = await getAllUsers();
    setUsers(allUsers);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    if (!currentUser?.id) return;

    setUpdating(userId);
    setError('');

    const result = await updateUserRole(userId, newRole, currentUser.id);

    if (result.success) {
      await loadUsers();

      if (userId === currentUser.id) {
        await reloadUserProfile();
      }
    } else {
      setError(result.error || 'Error al actualizar rol');
    }

    setUpdating(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <UserCheck className="w-4 h-4" />;
    }
  };

  if (!canManage) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Acceso No Autorizado
        </h3>
        <p className="text-gray-700">
          Solo los administradores y owners pueden gestionar roles de usuarios.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 rounded-lg p-2">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestión de Roles</h2>
            <p className="text-sm text-gray-600">Administra los permisos de los usuarios</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Niveles de Acceso:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• <strong>Owner:</strong> Control total del sistema (no modificable)</li>
            <li>• <strong>Admin:</strong> Puede gestionar usuarios y sus roles</li>
            <li>• <strong>User:</strong> Acceso básico al sistema de validación</li>
          </ul>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Rol Actual
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.full_name || 'Sin nombre'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(u.role)}`}>
                      {getRoleIcon(u.role)}
                      {u.role === 'owner' ? 'Owner' : u.role === 'admin' ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'owner' ? (
                      <span className="text-xs text-gray-500">No modificable</span>
                    ) : u.id === currentUser?.id ? (
                      <span className="text-xs text-gray-500">Tu cuenta</span>
                    ) : updating === u.id ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <div className="flex gap-2">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                          >
                            Hacer Admin
                          </button>
                        )}
                        {u.role !== 'user' && (
                          <button
                            onClick={() => handleRoleChange(u.id, 'user')}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                          >
                            Hacer Usuario
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay usuarios registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
