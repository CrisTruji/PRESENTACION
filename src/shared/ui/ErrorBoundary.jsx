import React from 'react';

/**
 * Error Boundary para manejo robusto de errores en React
 * Captura errores en el árbol de componentes hijos
 *
 * Uso:
 *   <ErrorBoundary>
 *     <MiComponente />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // En producción, enviar a servicio de monitoreo (Sentry, LogRocket, etc.)
    if (import.meta.env.PROD) {
      // logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Algo salió mal
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ha ocurrido un error inesperado
                </p>
              </div>
            </div>

            {/* Error Details (solo en desarrollo) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                  Detalles del error (solo en desarrollo)
                </summary>
                <div className="mt-2 space-y-2">
                  <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Mensaje para usuario */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Por favor, intenta recargar la página. Si el problema persiste, contacta a soporte técnico.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg
                           hover:bg-orange-600 transition-colors font-medium"
              >
                Recargar página
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700
                           text-gray-800 dark:text-white rounded-lg
                           hover:bg-gray-300 dark:hover:bg-gray-600
                           transition-colors font-medium"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
