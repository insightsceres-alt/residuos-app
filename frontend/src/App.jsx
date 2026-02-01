import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import RegistrosList from './pages/RegistrosList';
import NuevoRegistro from './pages/NuevoRegistro';
import Login from './pages/Login';

// Componente para proteger rutas
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f7fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🌱</div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function Navigation() {
  const location = useLocation();
  const { empresa, user, logout } = useAuth();
  
  return (
    <header className="header">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1>🌱 Sistema de Gestión de Residuos</h1>
            {empresa && (
              <p style={{ margin: '5px 0 0 0' }}>
                <span style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  padding: '4px 10px', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  🏭 {empresa.nombre}
                </span>
                <span style={{ marginLeft: '10px', fontSize: '13px', opacity: 0.9 }}>
                  👤 {user?.nombre}
                </span>
              </p>
            )}
          </div>
          <button 
            onClick={logout}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
        <nav className="nav" style={{ marginTop: '15px' }}>
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            📊 Dashboard
          </Link>
          <Link 
            to="/registros" 
            className={`nav-link ${location.pathname === '/registros' ? 'active' : ''}`}
          >
            📋 Registros
          </Link>
          <Link 
            to="/nuevo" 
            className={`nav-link ${location.pathname === '/nuevo' ? 'active' : ''}`}
          >
            ➕ Nuevo Registro
          </Link>
        </nav>
      </div>
    </header>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f7fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🌱</div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/*" element={
          <ProtectedRoute>
            <>
              <Navigation />
              <div className="container">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/registros" element={<RegistrosList />} />
                  <Route path="/nuevo" element={<NuevoRegistro />} />
                </Routes>
              </div>
            </>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
