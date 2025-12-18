import { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { getAllUsers, updateUserProfile, toggleUserActive } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, ShieldAlert, ShieldCheck, UserCheck, UserX, Edit2, Save, X } from 'lucide-react';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const allUsers = await getAllUsers();
    setUsers(allUsers);
    setLoading(false);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user.id);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      active: user.active,
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleSaveEdit = async (userId: string) => {
    const result = await updateUserProfile(userId, editForm);

    if (result.success) {
      await loadUsers();
      setEditingUser(null);
      setEditForm({});
    } else {
      alert(`Error al actualizar usuario: ${result.error}`);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const result = await toggleUserActive(userId, !currentActive);

    if (result.success) {
      await loadUsers();
    } else {
      alert(`Error al cambiar estado: ${result.error}`);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      case 'admin':
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      owner: 'bg-red-100 text-red-800 border-red-200',
      admin: 'bg-blue-100 text-blue-800 border-blue-200',
      user: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return badges[role as keyof typeof badges] || badges.user;
  };

  const canEditUser = (targetUser: UserProfile) => {
    if (currentUser?.role === 'owner') return true;
    if (currentUser?.role === 'admin') return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {users.length} usuarios
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Usuario</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rol</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha Creación</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    {editingUser === user.id ? (
                      <input
                        type="text"
                        value={editForm.full_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name || 'Sin nombre'}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {editingUser === user.id ? (
                      <select
                        value={editForm.role || user.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'owner' | 'admin' | 'user' })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="user">Técnico</option>
                        <option value="admin">Administrador</option>
                        {currentUser?.role === 'owner' && <option value="owner">Owner</option>}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(user.role)}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {user.active ? (
                      <span className="flex items-center gap-2 text-green-600">
                        <UserCheck className="w-4 h-4" />
                        Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-600">
                        <UserX className="w-4 h-4" />
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {editingUser === user.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(user.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {canEditUser(user) && (
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canEditUser(user) && user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleToggleActive(user.id, user.active)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.active
                                  ? 'text-red-600 hover:bg-red-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.active ? 'Desactivar' : 'Activar'}
                            >
                              {user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
