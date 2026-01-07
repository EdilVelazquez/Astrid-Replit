import { useState } from 'react';
import { AlertTriangle, X, Loader2, CheckCircle } from 'lucide-react';
import { ExpedienteServicio } from '../types';
import { supabase } from '../supabaseClient';

interface VolverEnFalsoModalProps {
  isOpen: boolean;
  onClose: () => void;
  servicio: ExpedienteServicio;
  onSuccess: (servicio: ExpedienteServicio) => void;
}

type ModalState = 'form' | 'saving' | 'success' | 'error';

const WEBHOOK_URL = 'https://aiwebhookn8n.numaris.com/webhook/327d1dd6-eb64-4fd9-9ba4-cdd2592dbb97';

export function VolverEnFalsoModal({ isOpen, onClose, servicio, onSuccess }: VolverEnFalsoModalProps) {
  const [notes, setNotes] = useState('');
  const [modalState, setModalState] = useState<ModalState>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const canConfirm = notes.trim().length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setModalState('saving');
    setErrorMessage(null);

    try {
      const updateData = {
        status: 'vuelta_en_falso',
        notes_terminate: notes.trim(),
        validation_end_timestamp: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('expedientes_servicio')
        .update(updateData)
        .eq('id', servicio.id);

      if (dbError) {
        console.error('Error guardando vuelta en falso:', dbError);
        throw new Error('Error al guardar en base de datos');
      }

      const webhookPayload = {
        action: 'terminate',
        appointment_id: servicio.appointment_id,
        appointment_name: servicio.appointment_name,
        work_order_name: servicio.work_order_name,
        esn: servicio.device_esn,
        technician_email: servicio.email_tecnico,
        company_Id: servicio.company_Id,
        notes_terminate: notes.trim(),
        timestamp: new Date().toISOString()
      };

      const webhookResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!webhookResponse.ok) {
        console.warn('Webhook failed but DB update succeeded:', webhookResponse.status);
      }

      setModalState('success');

      const updatedServicio: ExpedienteServicio = {
        ...servicio,
        status: 'vuelta_en_falso',
        notes_terminate: notes.trim()
      };

      setTimeout(() => {
        onSuccess(updatedServicio);
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error en vuelta en falso:', error);
      setModalState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const handleClose = () => {
    if (modalState === 'saving') return;
    setNotes('');
    setModalState('form');
    setErrorMessage(null);
    onClose();
  };

  const handleRetry = () => {
    setModalState('form');
    setErrorMessage(null);
  };

  const renderContent = () => {
    if (modalState === 'saving') {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Procesando vuelta en falso...</p>
          <p className="text-gray-400 text-sm mt-2">Guardando y notificando al sistema</p>
        </div>
      );
    }

    if (modalState === 'success') {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Vuelta en falso registrada</h3>
          <p className="text-gray-600 text-sm">
            El servicio ha sido marcado como "Vuelta en falso" y no podrá continuar.
          </p>
          <p className="text-gray-500 text-xs mt-3">
            Solo se podrá continuar cuando se genere un nuevo registro.
          </p>
        </div>
      );
    }

    if (modalState === 'error') {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al procesar</h3>
          <p className="text-gray-600 text-sm mb-4">
            {errorMessage || 'Ocurrió un error al registrar la vuelta en falso.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="py-2">
        <div className="flex items-start gap-3 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-medium text-sm">Esta acción es irreversible</p>
            <p className="text-amber-700 text-xs mt-1">
              El servicio quedará bloqueado y no podrá iniciarse ni continuar.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">Servicio:</p>
          <p className="font-medium text-gray-900">{servicio.appointment_name}</p>
          {servicio.work_order_name && (
            <p className="text-xs text-gray-400 font-mono">WO: {servicio.work_order_name}</p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motivo de la vuelta en falso <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explica el motivo por el cual no se puede realizar el servicio..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none text-sm"
            rows={4}
            required
          />
          {notes.trim().length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Campo obligatorio para continuar</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              canConfirm
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Confirmar vuelta en falso
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Volver en falso</h2>
          {modalState !== 'saving' && (
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
