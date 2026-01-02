import { useState, useRef, useEffect } from 'react';
import { Calendar, FileText, ClipboardList, LogOut } from 'lucide-react';

type ModuloActivo = 'agenda' | 'servicio' | 'historial' | null;

interface HeaderProps {
  user: {
    email?: string;
    role?: string;
  } | null;
  moduloActivo: ModuloActivo;
  onNavegar: (modulo: ModuloActivo) => void;
  onCerrarSesion: () => void;
  mostrarAgenda?: boolean;
  mostrarServicio?: boolean;
  mostrarHistorial?: boolean;
}

function AstridLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#374151" />
      <rect x="18" y="4" width="10" height="10" rx="2" fill="#6B7280" />
      <rect x="4" y="18" width="10" height="10" rx="2" fill="#6B7280" />
      <rect x="18" y="18" width="10" height="10" rx="2" fill="#374151" />
    </svg>
  );
}

export function Header({
  user,
  moduloActivo,
  onNavegar,
  onCerrarSesion,
  mostrarAgenda = true,
  mostrarServicio = false,
  mostrarHistorial = true
}: HeaderProps) {
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPerfilAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const obtenerIniciales = (email?: string) => {
    if (!email) return 'U';
    const partes = email.split('@')[0].split(/[._-]/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
  };

  const modulos = [
    { 
      id: 'agenda' as ModuloActivo, 
      icono: Calendar, 
      tooltip: 'Agenda',
      visible: mostrarAgenda
    },
    { 
      id: 'servicio' as ModuloActivo, 
      icono: ClipboardList, 
      tooltip: 'Servicio',
      visible: mostrarServicio
    },
    { 
      id: 'historial' as ModuloActivo, 
      icono: FileText, 
      tooltip: 'Historial',
      visible: mostrarHistorial
    }
  ];

  const modulosVisibles = modulos.filter(m => m.visible);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <AstridLogo />
              <span className="text-lg font-semibold tracking-wide text-gray-800">
                ASTRID
              </span>
            </div>

            {modulosVisibles.length > 0 && (
              <nav className="hidden sm:flex items-center gap-0.5 ml-4">
                {modulosVisibles.map(modulo => {
                  const Icono = modulo.icono;
                  const activo = moduloActivo === modulo.id;
                  
                  return (
                    <button
                      key={modulo.id}
                      onClick={() => onNavegar(modulo.id)}
                      title={modulo.tooltip}
                      className={`
                        relative p-2.5 rounded-lg transition-all group
                        ${activo 
                          ? 'text-gray-900' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icono className="w-5 h-5" />
                      {activo && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-gray-800 rounded-full" />
                      )}
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {modulo.tooltip}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            {modulosVisibles.length > 0 && (
              <nav className="flex sm:hidden items-center gap-0.5">
                {modulosVisibles.map(modulo => {
                  const Icono = modulo.icono;
                  const activo = moduloActivo === modulo.id;
                  
                  return (
                    <button
                      key={modulo.id}
                      onClick={() => onNavegar(modulo.id)}
                      className={`
                        relative p-2 rounded-lg transition-all
                        ${activo 
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-400 hover:text-gray-600'
                        }
                      `}
                    >
                      <Icono className="w-5 h-5" />
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
                className="flex items-center p-1 rounded-full hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {obtenerIniciales(user?.email)}
                </div>
              </button>

              {menuPerfilAbierto && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email?.split('@')[0] || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {user?.email}
                    </p>
                    {user?.role && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        {user.role}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      setMenuPerfilAbierto(false);
                      onCerrarSesion();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
