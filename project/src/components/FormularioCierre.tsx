import { useState } from 'react';
import { CheckCircle, Loader2, Camera, X, Plus, Trash2, User } from 'lucide-react';
import { ExpedienteServicio } from '../types';
import { notificarTrabajoCompletado } from '../services/serviceTransitionService';
import { guardarCierreDatosParciales, guardarCierreFotos, marcarCierreCompletado } from '../services/cierreService';
import { SignaturePad } from './SignaturePad';

interface FormularioCierreProps {
  expediente: ExpedienteServicio;
  onCompleted: () => void;
  onCancel?: () => void;
}

interface FotoAdicional {
  id: string;
  descripcion: string;
  fotos: File[];
  previews: string[];
}

interface FotoObligatoria {
  id: string;
  label: string;
  file: File | null;
  preview: string;
}

export function FormularioCierre({ expediente, onCompleted, onCancel }: FormularioCierreProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>('');

  const [tipoCorte, setTipoCorte] = useState<string>('');

  const [fotosObligatorias, setFotosObligatorias] = useState<FotoObligatoria[]>([
    { id: 'instalacion', label: 'Foto(s) de cómo y dónde quedó instalado el equipo', file: null, preview: '' },
    { id: 'corriente', label: 'Foto de dónde está conectada la corriente', file: null, preview: '' },
    { id: 'tierra', label: 'Foto de dónde está conectada la tierra', file: null, preview: '' },
    { id: 'ignicion', label: 'Foto de dónde está conectada ignición', file: null, preview: '' },
    { id: 'ignicionCorte', label: 'Foto de dónde está conectada ignición y corte', file: null, preview: '' },
    { id: 'botonPanico', label: 'Foto del botón de pánico', file: null, preview: '' },
  ]);

  const [fotosAdicionales, setFotosAdicionales] = useState<FotoAdicional[]>([]);

  const [nombreRecibe, setNombreRecibe] = useState('');
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);
  const [fotoPersonaRecibe, setFotoPersonaRecibe] = useState<File | null>(null);
  const [fotoPersonaRecibePreview, setFotoPersonaRecibePreview] = useState<string>('');

  const handleFotoObligatoriaChange = (id: string, file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotosObligatorias(prev => prev.map(foto => 
          foto.id === id ? { ...foto, file, preview: reader.result as string } : foto
        ));
      };
      reader.readAsDataURL(file);
    } else {
      setFotosObligatorias(prev => prev.map(foto => 
        foto.id === id ? { ...foto, file: null, preview: '' } : foto
      ));
    }
  };

  const agregarBloqueAdicional = () => {
    if (fotosAdicionales.length >= 5) return;
    setFotosAdicionales(prev => [...prev, {
      id: `adicional-${Date.now()}`,
      descripcion: '',
      fotos: [],
      previews: []
    }]);
  };

  const eliminarBloqueAdicional = (id: string) => {
    setFotosAdicionales(prev => prev.filter(bloque => bloque.id !== id));
  };

  const actualizarDescripcionAdicional = (id: string, descripcion: string) => {
    setFotosAdicionales(prev => prev.map(bloque => 
      bloque.id === id ? { ...bloque, descripcion } : bloque
    ));
  };

  const agregarFotoAdicional = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotosAdicionales(prev => prev.map(bloque => {
        if (bloque.id === id && bloque.fotos.length < 5) {
          return {
            ...bloque,
            fotos: [...bloque.fotos, file],
            previews: [...bloque.previews, reader.result as string]
          };
        }
        return bloque;
      }));
    };
    reader.readAsDataURL(file);
  };

  const eliminarFotoAdicional = (bloqueId: string, fotoIndex: number) => {
    setFotosAdicionales(prev => prev.map(bloque => {
      if (bloque.id === bloqueId) {
        return {
          ...bloque,
          fotos: bloque.fotos.filter((_, i) => i !== fotoIndex),
          previews: bloque.previews.filter((_, i) => i !== fotoIndex)
        };
      }
      return bloque;
    }));
  };

  const handleFotoPersonaRecibeChange = (file: File | null) => {
    if (file) {
      setFotoPersonaRecibe(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPersonaRecibePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFotoPersonaRecibe(null);
      setFotoPersonaRecibePreview('');
    }
  };

  const validarFormulario = (): boolean => {
    if (!tipoCorte) {
      setError('Debes seleccionar cómo queda el corte');
      return false;
    }

    for (const foto of fotosObligatorias) {
      if (!foto.file) {
        setError(`Debes subir: ${foto.label}`);
        return false;
      }
    }

    if (!nombreRecibe.trim()) {
      setError('Debes ingresar el nombre de quien recibe el vehículo');
      return false;
    }

    if (!firmaDataUrl) {
      setError('Debes capturar la firma de recepción');
      return false;
    }

    if (!fotoPersonaRecibe) {
      setError('Debes tomar la foto de la persona que recibe el vehículo');
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

      const resultadoDatos = await guardarCierreDatosParciales(
        expediente.id,
        expediente.appointment_name || '',
        {
          tipo_corte: tipoCorte,
          nombre_recibe: nombreRecibe.trim(),
          firma_data_url: firmaDataUrl!,
        }
      );

      if (!resultadoDatos.success) {
        setError(`Error al guardar datos: ${resultadoDatos.error}`);
        setGuardando(false);
        return;
      }

      console.log('✅ [CIERRE] Datos parciales guardados, subiendo fotos...');

      const fotosObligatoriasParaSubir = fotosObligatorias
        .filter(f => f.file !== null)
        .map(f => ({ id: f.id, label: f.label, file: f.file! }));

      const fotosAdicionalesParaSubir = fotosAdicionales
        .filter(b => b.fotos.length > 0)
        .map(b => ({ descripcion: b.descripcion, fotos: b.fotos }));

      const resultadoFotos = await guardarCierreFotos(
        expediente.id,
        expediente.appointment_name || '',
        fotosObligatoriasParaSubir,
        fotosAdicionalesParaSubir,
        fotoPersonaRecibe
      );

      if (!resultadoFotos.success) {
        console.error('❌ [CIERRE] Error al subir fotos:', resultadoFotos.error);
        setError(`Error al subir fotos: ${resultadoFotos.error}. Intenta de nuevo.`);
        setGuardando(false);
        return;
      }

      console.log('✅ [CIERRE] Fotos subidas exitosamente');

      const resultadoCompletar = await marcarCierreCompletado(expediente.id);
      if (!resultadoCompletar.success) {
        setError(`Error al completar cierre: ${resultadoCompletar.error}`);
        setGuardando(false);
        return;
      }

      console.log('✅ [CIERRE] Cierre marcado como completado');

      console.log('🔔 [CIERRE] Enviando notificación de trabajo completado...');

      const resultadoTransicion = await notificarTrabajoCompletado({
        appointment_name: expediente.appointment_name || '',
        work_order_name: expediente.work_order_name || '',
        esn: expediente.device_esn || '',
        technician_email: expediente.email_tecnico || '',
        company_Id: expediente.company_Id || ''
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Cierre de Servicio</h2>
          <p className="text-sm text-gray-600">
            Completa la documentación final de la instalación
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

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">1. Tipo de Corte</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              ¿Cómo queda el corte? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['Ignición', 'Bomba', 'Marcha'].map((opcion) => (
                <label
                  key={opcion}
                  className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${
                    tipoCorte === opcion
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoCorte"
                    value={opcion}
                    checked={tipoCorte === opcion}
                    onChange={(e) => setTipoCorte(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{opcion}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">2. Evidencias Fotográficas</h3>
          <div className="space-y-4">
            {fotosObligatorias.map((foto) => (
              <div key={foto.id} className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {foto.label} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFotoObligatoriaChange(foto.id, e.target.files?.[0] || null)}
                    className="hidden"
                    id={`foto-${foto.id}`}
                  />
                  <label
                    htmlFor={`foto-${foto.id}`}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${
                      foto.file
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {foto.file ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Foto capturada - Cambiar</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span className="text-sm font-medium">Tomar foto</span>
                      </>
                    )}
                  </label>
                  {foto.preview && (
                    <div className="relative">
                      <img
                        src={foto.preview}
                        alt={foto.label}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleFotoObligatoriaChange(foto.id, null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-800">3. Fotos Adicionales</h3>
            {fotosAdicionales.length < 5 && (
              <button
                type="button"
                onClick={agregarBloqueAdicional}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar foto
              </button>
            )}
          </div>

          {fotosAdicionales.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No hay fotos adicionales. Usa el botón "Agregar foto" si necesitas documentar algo extra.
            </p>
          ) : (
            <div className="space-y-4">
              {fotosAdicionales.map((bloque, index) => (
                <div key={bloque.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Foto adicional {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => eliminarBloqueAdicional(bloque.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Descripción (ej: Foto solicitada por cliente)"
                    value={bloque.descripcion}
                    onChange={(e) => actualizarDescripcionAdicional(bloque.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="flex flex-wrap gap-2 mb-2">
                    {bloque.previews.map((preview, fotoIndex) => (
                      <div key={fotoIndex} className="relative w-20 h-20">
                        <img
                          src={preview}
                          alt={`Foto ${fotoIndex + 1}`}
                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarFotoAdicional(bloque.id, fotoIndex)}
                          className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {bloque.fotos.length < 5 && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            agregarFotoAdicional(bloque.id, e.target.files[0]);
                          }
                          e.target.value = '';
                        }}
                        className="hidden"
                        id={`foto-adicional-${bloque.id}`}
                      />
                      <label
                        htmlFor={`foto-adicional-${bloque.id}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-300 text-sm"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Agregar foto ({bloque.fotos.length}/5)</span>
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">4. Recepción del Vehículo</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de quien recibe el vehículo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombreRecibe}
              onChange={(e) => setNombreRecibe(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firma de recepción <span className="text-red-500">*</span>
            </label>
            <SignaturePad onSignatureChange={setFirmaDataUrl} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de la persona que recibe <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Esta foto debe tomarse en el momento (no subir desde galería)
            </p>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => handleFotoPersonaRecibeChange(e.target.files?.[0] || null)}
                className="hidden"
                id="foto-persona-recibe"
              />
              <label
                htmlFor="foto-persona-recibe"
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-colors border ${
                  fotoPersonaRecibe
                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {fotoPersonaRecibe ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Foto capturada - Cambiar</span>
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium">Tomar foto de quien recibe</span>
                  </>
                )}
              </label>
              {fotoPersonaRecibePreview && (
                <div className="relative max-w-xs mx-auto">
                  <img
                    src={fotoPersonaRecibePreview}
                    alt="Persona que recibe"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleFotoPersonaRecibeChange(null)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={guardando}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-lg"
          >
            {guardando ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Finalizando servicio...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                <span>Finalizar Servicio</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
