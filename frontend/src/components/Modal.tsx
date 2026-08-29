import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: React.CSSProperties;
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  className = '',
  title,
  size = 'lg',
  style = {}
}) => {
  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevenir scroll del body cuando el modal esta abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        paddingTop: '80px',
        zIndex: 50,
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: size === 'md' ? '500px' : (sizeClasses[size] || '672px'),
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          ...style
        }}
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          {title && (
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1a202c',
              margin: 0,
              paddingRight: '12px',
            }}>{title}</h3>
          )}
          <button
            style={{
              marginLeft: 'auto',
              padding: '10px',
              minWidth: '44px',
              minHeight: '44px',
              color: '#a0aec0',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#4a5568';
              e.currentTarget.style.backgroundColor = '#edf2f7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a0aec0';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Cerrar"
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};
