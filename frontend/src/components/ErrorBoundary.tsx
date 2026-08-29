import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  huboError: boolean;
}

// Red de contencion para el contenido dentro del armazon. Sin esto, una
// excepcion de render en cualquier pantalla (formulario, dashboard, lo que
// sea) desmonta el arbol de React entero y deja pantalla blanca sin ningun
// mensaje - el usuario no tiene forma de saber que paso ni de recuperarse
// sin recargar a ciegas.
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { huboError: false };
  }

  static getDerivedStateFromError(): State {
    return { huboError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Error atrapado por ErrorBoundary:', error);
  }

  render() {
    if (this.state.huboError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Algo salio mal</h1>
          <p style={{ color: '#666', marginTop: 8 }}>
            Ocurrio un error inesperado en esta pantalla. Recarga la pagina para intentar de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20, padding: '10px 18px', background: '#dc2626', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Recargar pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
