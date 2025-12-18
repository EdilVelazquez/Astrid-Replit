import { useState, useRef } from 'react';
import { ExternalLink, RefreshCcw, AlertCircle, Loader2 } from 'lucide-react';

export function AstridViewer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const ASTRID_URL = 'https://service-track-dashbo-tm06.bolt.host/home';

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const openInNewTab = () => {
    window.open(ASTRID_URL, '_blank', 'noopener,noreferrer');
  };

  const reloadIframe = () => {
    if (iframeRef.current) {
      setLoading(true);
      setError(false);
      iframeRef.current.src = ASTRID_URL;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">ASTRID</h2>
          <p className="text-sm text-gray-600">Sistema de Rastreo y Análisis</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadIframe}
            className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
            title="Recargar"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Recargar</span>
          </button>
          <button
            onClick={openInNewTab}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Abrir en nueva pestaña"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Abrir en nueva pestaña</span>
          </button>
        </div>
      </div>

      <div className="relative" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Cargando ASTRID...</p>
            <p className="text-sm text-gray-500 mt-2">Por favor espera un momento</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Error al cargar ASTRID</h3>
                  <p className="text-sm text-red-700 mt-1">
                    No se pudo cargar la aplicación embebida. Esto puede deberse a restricciones de seguridad del navegador.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={reloadIframe}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Reintentar
                </button>
                <button
                  onClick={openInNewTab}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir en pestaña nueva
                </button>
              </div>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={ASTRID_URL}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full border-0"
          title="ASTRID - Sistema de Rastreo y Análisis"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="no-referrer"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
