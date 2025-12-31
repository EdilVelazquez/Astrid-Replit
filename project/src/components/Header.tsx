import { useState, useRef, useEffect } from 'react';
import { Calendar, FileText, ClipboardList, LogOut, ChevronDown } from 'lucide-react';

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
      etiqueta: 'Agenda',
      visible: mostrarAgenda
    },
    { 
      id: 'servicio' as ModuloActivo, 
      icono: ClipboardList, 
      etiqueta: 'Servicio',
      visible: mostrarServicio
    },
    { 
      id: 'historial' as ModuloActivo, 
      icono: FileText, 
      etiqueta: 'Historial',
      visible: mostrarHistorial
    }
  ];

  const modulosVisibles = modulos.filter(m => m.visible);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <div className="flex items-center">
              <span className="text-xl font-semibold tracking-tight text-gray-900">
                Astrid
              </span>
            </div>

            {modulosVisibles.length > 0 && (
              <nav className="flex items-center gap-1">
                {modulosVisibles.map(modulo => {
                  const Icono = modulo.icono;
                  const activo = moduloActivo === modulo.id;
                  
                  return (
                    <button
                      key={modulo.id}
                      onClick={() => onNavegar(modulo.id)}
                      className={`
                        relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all
                        ${activo 
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icono className={`w-4 h-4 ${activo ? 'text-blue-600' : ''}`} />
                      <span>{modulo.etiqueta}</span>
                      {activo && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">
                {obtenerIniciales(user?.email)}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${menuPerfilAbierto ? 'rotate-180' : ''}`} />
            </button>

            {menuPerfilAbierto && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">
                      {obtenerIniciales(user?.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.email?.split('@')[0] || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                      {user?.role && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                          {user.role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="py-1">
                  <button
                    onClick={() => {
                      setMenuPerfilAbierto(false);
                      onCerrarSesion();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
