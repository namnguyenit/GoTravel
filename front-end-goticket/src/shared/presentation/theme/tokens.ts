/**
 * Design Tokens chuẩn của GoTicket
 * GoTicket dùng bộ nhận diện Go family; màu tương tác lấy từ token CSS dùng chung.
 */
export const tokens = {
  colors: {
    primary: 'var(--gt-brand)',
    primaryHover: 'var(--gt-brand-hover)',
    accent: 'var(--gt-brand)',
    accentHover: 'var(--gt-brand-hover)',
    background: '#F6F7F8',
    surface: '#FFFFFF',
    textMain: '#23313D',
    textMuted: '#576574',
    border: '#D7E0E6',
    borderLight: '#EDF2F5',
    status: {
      success: '#176B47',
      successBg: '#EAF7F0',
      warning: '#875800',
      warningBg: '#FFF8E6',
      error: '#B42318',
      errorBg: '#FDF2F1',
      info: '#1D5DA8',
      infoBg: '#EDF5FC',
    },
    seat: {
      available: '#FFFFFF',
      availableBorder: 'var(--gt-brand)',
      selected: 'var(--gt-brand)',
      selectedText: '#FFFFFF',
      held: '#E29500',
      sold: '#D7E0E6',
      soldText: '#8B98A5',
      blocked: '#F1F3F5',
    },
  },
  radius: {
    input: '10px',
    button: '10px',
    card: '14px',
    modal: '18px',
    pill: '9999px',
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    card: '0 2px 8px -2px rgba(20, 127, 204, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
    dropdown: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    modal: '0 20px 35px -10px rgba(0, 0, 0, 0.2)',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif',
  },
} as const;
