export const colors = {
  primary: {
    900: '#0F1C3F',
    800: '#1A2B52',
    700: '#253A65',
    600: '#304978',
    500: '#3B588B',
    400: '#5A7AAE',
    300: '#7A9CC6',
    200: '#A3C1DE',
    100: '#D1E2F2',
    50: '#E8F0FE',
  },

  neutral: {
    900: '#1F2937',
    800: '#374151',
    700: '#4B5563',
    600: '#6B7280',
    500: '#9CA3AF',
    400: '#D1D5DB',
    300: '#E5E7EB',
    200: '#F3F4F6',
    100: '#F9FAFB',
    50: '#FAFBFC',
  },

  success: {
    600: '#047857',
    500: '#059669',
    100: '#D1FAE5',
    50: '#ECFDF5',
  },

  warning: {
    600: '#B45309',
    500: '#D97706',
    100: '#FEF3C7',
    50: '#FFFBEB',
  },

  error: {
    600: '#DC2626',
    500: '#EF4444',
    100: '#FEE2E2',
    50: '#FEF2F2',
  },

  info: {
    600: '#2563EB',
    500: '#3B82F6',
    100: '#DBEAFE',
    50: '#EFF6FF',
  },
};

export const buttonStyles = {
  primary: 'bg-primary-900 text-white hover:bg-primary-800 border border-primary-900',
  secondary: 'bg-white text-primary-900 hover:bg-neutral-100 border border-neutral-300',
  ghost: 'bg-transparent text-primary-900 hover:bg-neutral-100',
  danger: 'bg-error-600 text-white hover:bg-error-500 border border-error-600',
  success: 'bg-success-600 text-white hover:bg-success-500 border border-success-600',
  disabled: 'bg-neutral-200 text-neutral-500 cursor-not-allowed border border-neutral-200',
};

export const tailwindColors = {
  btnPrimary: 'bg-[#0F1C3F] text-white hover:bg-[#1A2B52] border border-[#0F1C3F]',
  btnSecondary: 'bg-white text-[#0F1C3F] hover:bg-gray-50 border border-gray-300',
  btnGhost: 'bg-transparent text-[#0F1C3F] hover:bg-gray-100',
  btnDanger: 'bg-red-600 text-white hover:bg-red-500',
  btnSuccess: 'bg-emerald-600 text-white hover:bg-emerald-500',
  btnDisabled: 'bg-gray-200 text-gray-500 cursor-not-allowed',

  bgPrimary: 'bg-[#E8F0FE]',
  bgCard: 'bg-white',
  bgSubtle: 'bg-gray-50',

  textPrimary: 'text-[#0F1C3F]',
  textSecondary: 'text-gray-600',
  textMuted: 'text-gray-400',

  borderDefault: 'border-gray-200',
  borderFocus: 'border-[#3B588B]',

  statusSuccess: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  statusWarning: 'bg-amber-50 text-amber-700 border-amber-200',
  statusError: 'bg-red-50 text-red-700 border-red-200',
  statusInfo: 'bg-blue-50 text-blue-700 border-blue-200',
  statusNeutral: 'bg-gray-100 text-gray-600 border-gray-200',
};
