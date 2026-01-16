import { useState, useEffect } from 'react';
import { getEstadisticas } from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await getEstadisticas();
      setStats(response.data);
    } catch (err) {
      setError('Error al cargar estadísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Cargando estadísticas...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Dashboard - Estadísticas Generales</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_registros}</div>
          <div className="stat-label">Total Registros</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.peso_total_kg.toLocaleString()}</div>
          <div className="stat-label">Kg Totales</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.ultimos_7_dias}</div>
          <div className="stat-label">Últimos 7 Días</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Registros por Estado</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Cantidad</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.por_estado).map(([estado, cantidad]) => (
                <tr key={estado}>
                  <td>
                    <span className={`badge badge-${estado.toLowerCase().replace('_', '-')}`}>
                      {estado}
                    </span>
                  </td>
                  <td>{cantidad}</td>
                  <td>{((cantidad / stats.total_registros) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Registros por Tipología</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tipología</th>
                <th>Cantidad</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.por_tipologia)
                .sort((a, b) => b[1] - a[1])
                .map(([tipologia, cantidad]) => (
                  <tr key={tipologia}>
                    <td>{tipologia}</td>
                    <td>{cantidad}</td>
                    <td>{((cantidad / stats.total_registros) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
