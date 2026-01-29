import { toast } from 'sonner';

const notify = {
  success: (message, options = {}) => {
    toast.success(message, {
      ...options,
      style: {
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-success)',
        color: 'var(--color-success)',
        borderWidth: '1px',
        borderRadius: 'var(--radius-card)',
      },
    });
  },
  error: (message, options = {}) => {
    toast.error(message, {
      ...options,
      style: {
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-error)',
        color: 'var(--color-error)',
        borderWidth: '1px',
        borderRadius: 'var(--radius-card)',
      },
    });
  },
  warning: (message, options = {}) => {
    toast.warning(message, {
      ...options,
      style: {
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-warning)',
        color: 'var(--color-warning)',
        borderWidth: '1px',
        borderRadius: 'var(--radius-card)',
      },
    });
  },
  info: (message, options = {}) => {
    toast.info(message, {
      ...options,
      style: {
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-primary)',
        color: 'var(--color-primary)',
        borderWidth: '1px',
        borderRadius: 'var(--radius-card)',
      },
    });
  },
};

export default notify;