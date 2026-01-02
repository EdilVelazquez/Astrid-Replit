import { ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ModalVariant = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  variant?: ModalVariant;
  showCloseButton?: boolean;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const variantConfig = {
  info: {
    icon: Info,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    headerBorder: 'border-blue-100',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    headerBorder: 'border-emerald-100',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    headerBorder: 'border-amber-100',
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    headerBorder: 'border-red-100',
  },
  confirm: {
    icon: AlertTriangle,
    iconBg: 'bg-[#E8F0FE]',
    iconColor: 'text-[#0F1C3F]',
    headerBorder: 'border-[#D1E2F2]',
  },
};

const sizeConfig = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  variant = 'info',
  showCloseButton = true,
  actions,
  size = 'md',
}: ModalProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className={`relative bg-white rounded-xl shadow-2xl w-full ${sizeConfig[size]} transform transition-all animate-in fade-in zoom-in-95 duration-200`}
      >
        {(title || showCloseButton) && (
          <div className={`flex items-start gap-4 p-5 border-b ${config.headerBorder}`}>
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-[#0F1C3F]">{title}</h3>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {children && (
          <div className="p-5 text-gray-600 text-sm leading-relaxed">
            {children}
          </div>
        )}

        {actions && (
          <div className="flex items-center justify-end gap-3 p-5 pt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface ModalButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
}

export function ModalButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ModalButtonProps) {
  const baseStyles = 'px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 min-w-[100px]';

  const variantStyles = {
    primary: 'bg-[#0F1C3F] text-white hover:bg-[#1A2B52] border border-[#0F1C3F] shadow-sm',
    secondary: 'bg-white text-[#0F1C3F] hover:bg-gray-50 border border-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-500 border border-red-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-600',
  };

  const disabledStyles = 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${disabled ? disabledStyles : variantStyles[variant]}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'error' | 'confirm';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'confirm',
  loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      actions={
        <>
          <ModalButton variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </ModalButton>
          <ModalButton
            variant={variant === 'error' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </ModalButton>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: ModalVariant;
  buttonText?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'Entendido',
}: AlertModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant={variant}
      actions={
        <ModalButton variant="primary" onClick={onClose}>
          {buttonText}
        </ModalButton>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
