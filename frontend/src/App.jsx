import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RegistrosList from './pages/RegistrosList';
import NuevoRegistro from './pages/NuevoRegistro';

function Navigation() {
  const location = useLocation();
  
  return (
    <header className="header">
      <div className="container">
        <h1>🌱 Sistema de Gestión de Residuos</h1>
        <p>AGROIA - Gestión Inteligente de Transporte de Residuos</p>
        <nav className="nav">
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

function App() {
  return (
    <Router>
      <Navigation />
      <div className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registros" element={<RegistrosList />} />
          <Route path="/nuevo" element={<NuevoRegistro />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
