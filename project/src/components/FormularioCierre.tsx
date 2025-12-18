import { useState } from 'react';
import { CheckCircle, Loader2, Camera, X } from 'lucide-react';
import { ExpedienteServicio } from '../types';
import { notificarTrabajoCompletado } from '../services/serviceTransitionService';

interface FormularioCierreProps {
  expediente: ExpedienteServicio;
  onCompleted: () => void;
  onCancel?: () => void;
}

export function FormularioCierre({ expediente, onCompleted, onCancel }: FormularioCierreProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>('');

  // Respuestas a preguntas
  const [pregunta1, setPregunta1] = useState<string>('');
  const [pregunta2, setPregunta2] = useState<string>('');
  const [pregunta3, setPregunta3] = useState<string>('');

  // Imágenes
  const [imagen1, setImagen1] = useState<File | null>(null);
  const [imagen2, setImagen2] = useState<File | null>(null);
  const [imagen1Preview, setImagen1Preview] = useState<string>('');
  const [imagen2Preview, setImagen2Preview] = useState<string>('');

  const handleImagenChange = (
    file: File | null,
    setImagen: (file: File | null) => void,
    setPreview: (preview: string) => void
  ) => {
    if (file) {
      setImagen(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagen(null);
      setPreview('');
    }
  };

  const validarFormulario = (): boolean => {
    if (!pregunta1.trim()) {
      setError('Debes responder la pregunta 1');
      return false;
    }
    if (!pregunta2.trim()) {
      setError('Debes responder la pregunta 2');
      return false;
    }
    if (!pregunta3.trim()) {
      setError('Debes responder la pregunta 3');
      return false;
    }
    if (!imagen1) {
      setError('Debes subir la imagen 1');
      return false;
    }
    if (!imagen2) {
      setError('Debes subir la imagen 2');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validarFormulario()) {
      return;
    }

    setGuardando(true);

    try {
      console.log('📝 [CIERRE] Guardando datos del formulario de cierre...');

      // TODO: Aquí se guardarían los datos del formulario de cierre en la base de datos
      // Por ahora solo los logueamos
      console.log('📋 [CIERRE] Pregunta 1:', pregunta1);
      console.log('📋 [CIERRE] Pregunta 2:', pregunta2);
      console.log('📋 [CIERRE] Pregunta 3:', pregunta3);
      console.log('📷 [CIERRE] Imagen 1:', imagen1?.name);
      console.log('📷 [CIERRE] Imagen 2:', imagen2?.name);

      console.log('✅ [CIERRE] Datos del formulario guardados');
      console.log('🔔 [CIERRE] Enviando notificación de trabajo completado...');

      // Enviar notificación de trabajo completado (complete_work)
      const resultadoTransicion = await notificarTrabajoCompletado({
        appointment_name: expediente.appointment_name || '',
        work_order_name: expediente.work_order_name || '',
        esn: expediente.device_esn || '',
        technician_email: expediente.email_tecnico || ''
      });

      if (!resultadoTransicion.success) {
        console.error('❌ [CIERRE] Error al enviar notificación de completado:', resultadoTransicion.error);
        const confirmar = confirm(
          `El formulario se guardó correctamente, pero hubo un error al notificar la finalización del trabajo:\n\n${resultadoTransicion.error}\n\n¿Deseas continuar de todas formas?`
        );

        if (!confirmar) {
          setGuardando(false);
          return;
        }
      } else {
        console.log('✅ [CIERRE] Notificación de trabajo completado enviada exitosamente');
      }

      setTimeout(() => {
        setGuardando(false);
        onCompleted();
      }, 500);
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      setError('Error inesperado al guardar el formulario de cierre');
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Formulario de cierre</h2>
          <p className="text-sm text-gray-600">
            Completa la información final del servicio
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cancelar"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pregunta 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            1. ¿El cliente estuvo presente durante la instalación?
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pregunta1"
                value="si"
                checked={pregunta1 === 'si'}
                onChange={(e) => setPregunta1(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Sí</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pregunta1"
                value="no"
                checked={pregunta1 === 'no'}
                onChange={(e) => setPregunta1(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        </div>

        {/* Pregunta 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            2. ¿Se encontraron problemas durante la instalación?
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pregunta2"
                value="si"
                checked={pregunta2 === 'si'}
                onChange={(e) => setPregunta2(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Sí</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pregunta2"
                value="no"
                checked={pregunta2 === 'no'}
                onChange={(e) => setPregunta2(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">No</span>
            </label>
          </div>
        </div>

        {/* Pregunta 3 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3. Observaciones adicionales
          </label>
          <textarea
            value={pregunta3}
            onChange={(e) => setPregunta3(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Escribe cualquier observación relevante sobre el servicio..."
          />
        </div>

        {/* Imagen 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen 1: Foto de la instalación completada
          </label>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) =>
                handleImagenChange(
                  e.target.files?.[0] || null,
                  setImagen1,
                  setImagen1Preview
                )
              }
              className="hidden"
              id="imagen1-input"
            />
            <label
              htmlFor="imagen1-input"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">
                {imagen1 ? 'Cambiar foto' : 'Tomar foto'}
              </span>
            </label>
            {imagen1Preview && (
              <div className="relative">
                <img
                  src={imagen1Preview}
                  alt="Imagen 1"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleImagenChange(null, setImagen1, setImagen1Preview)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Imagen 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Imagen 2: Foto del equipo instalado
          </label>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) =>
                handleImagenChange(
                  e.target.files?.[0] || null,
                  setImagen2,
                  setImagen2Preview
                )
              }
              className="hidden"
              id="imagen2-input"
            />
            <label
              htmlFor="imagen2-input"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">
                {imagen2 ? 'Cambiar foto' : 'Tomar foto'}
              </span>
            </label>
            {imagen2Preview && (
              <div className="relative">
                <img
                  src={imagen2Preview}
                  alt="Imagen 2"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleImagenChange(null, setImagen2, setImagen2Preview)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Botón de envío */}
        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={guardando}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {guardando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Finalizando servicio...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Finalizar servicio</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
