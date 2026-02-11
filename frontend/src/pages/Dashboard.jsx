import { useState, useEffect } from 'react';
import { getEstadisticas, getEvolutivoMensual, getGruposLER } from '../services/api';

// Colores para los grupos LER
const COLORES_GRUPOS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', 
  '#795548', '#E91E63', '#607D8B', '#CDDC39', '#3F51B5',
  '#FF5722', '#009688', '#673AB7', '#FFC107', '#8BC34A',
  '#F44336', '#03A9F4', '#FFEB3B', '#9E9E9E', '#00E676'
];

// Función para obtener color consistente
const getColor = (index) => COLORES_GRUPOS[index % COLORES_GRUPOS.length];

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [evolutivo, setEvolutivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gruposLER, setGruposLER] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null); // null = todos, string = código grupo
  const [seriesVisibles, setSeriesVisibles] = useState({}); // {nombreSerie: true/false}

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadEvolutivo();
  }, [grupoSeleccionado]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [statsRes, evolutivoRes, gruposRes] = await Promise.all([
        getEstadisticas(),
        getEvolutivoMensual(12),
        getGruposLER()
      ]);
      setStats(statsRes.data);
      setEvolutivo(evolutivoRes.data);
      setGruposLER(gruposRes.data || []);
      
      // Inicializar todas las series como visibles
      if (evolutivoRes.data?.series) {
        const visibles = {};
        Object.keys(evolutivoRes.data.series).forEach(key => {
          visibles[key] = true;
        });
        setSeriesVisibles(visibles);
      }
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvolutivo = async () => {
    if (!stats) return;
    try {
      const evolutivoRes = await getEvolutivoMensual(12, grupoSeleccionado);
      setEvolutivo(evolutivoRes.data);
      
      // Actualizar series visibles
      if (evolutivoRes.data?.series) {
        const visibles = {};
        Object.keys(evolutivoRes.data.series).forEach(key => {
          visibles[key] = seriesVisibles[key] !== false; // Mantener estado o true por defecto
        });
        setSeriesVisibles(visibles);
      }
    } catch (err) {
      console.error('Error al cargar evolutivo:', err);
    }
  };

  // Toggle visibilidad de una serie
  const toggleSerie = (nombre) => {
    setSeriesVisibles(prev => ({
      ...prev,
      [nombre]: !prev[nombre]
    }));
  };

  // Mostrar solo una serie (clic en la leyenda)
  const mostrarSoloSerie = (nombre) => {
    const todasVisibles = Object.values(seriesVisibles).every(v => v);
    const soloEstaVisible = Object.entries(seriesVisibles).every(([k, v]) => 
      k === nombre ? v : !v
    );
    
    if (soloEstaVisible) {
      // Si solo esta está visible, mostrar todas
      const visibles = {};
      Object.keys(seriesVisibles).forEach(key => {
        visibles[key] = true;
      });
      setSeriesVisibles(visibles);
    } else {
      // Mostrar solo esta
      const visibles = {};
      Object.keys(seriesVisibles).forEach(key => {
        visibles[key] = key === nombre;
      });
      setSeriesVisibles(visibles);
    }
  };

  // Función para calcular el máximo valor para el gráfico
  const getMaxValue = () => {
    if (!evolutivo?.series) return 100;
    let max = 0;
    Object.entries(evolutivo.series).forEach(([nombre, valores]) => {
      if (seriesVisibles[nombre]) {
        valores.forEach(val => {
          if (val > max) max = val;
        });
      }
    });
    return Math.ceil(max * 1.1) || 100;
  };

  // Nombres de meses en español
  const formatearMes = (mesKey) => {
    const meses = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    const [year, month] = mesKey.split('-');
    return `${meses[month]} ${year.slice(2)}`;
  };

  if (loading) return <div className="loading">Cargando estadísticas...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  const maxValue = getMaxValue();
  const series = evolutivo?.series ? Object.keys(evolutivo.series) : [];
  const meses = evolutivo?.meses || [];
  const chartHeight = 300;
  const chartPadding = { top: 20, right: 20, bottom: 50, left: 70 };
  const chartWidth = Math.max(800, meses.length * 60);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

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

      {/* Gráfico de Evolución Mensual con Líneas */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            📈 Evolución Mensual por Categoría LER (Últimos 12 meses)
          </h3>
          
          {/* Selector de Grupo LER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>🔍 Filtrar:</label>
            <select
              value={grupoSeleccionado || ''}
              onChange={(e) => setGrupoSeleccionado(e.target.value || null)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                maxWidth: '350px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">📊 Todas las categorías</option>
              {gruposLER.map((grupo, idx) => (
                <option key={idx} value={grupo.code}>
                  {grupo.code} - {grupo.name.length > 45 ? grupo.name.substring(0, 45) + '...' : grupo.name}
                </option>
              ))}
            </select>
            {grupoSeleccionado && (
              <button
                onClick={() => setGrupoSeleccionado(null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#f44336',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
        
        {evolutivo && meses.length > 0 && series.length > 0 ? (
          <>
            {/* Leyenda interactiva */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '10px', 
              marginBottom: '20px',
              justifyContent: 'center'
            }}>
              {series.map((nombre, idx) => (
                <div 
                  key={nombre} 
                  onClick={() => mostrarSoloSerie(nombre)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    backgroundColor: seriesVisibles[nombre] ? '#f5f5f5' : '#e0e0e0',
                    opacity: seriesVisibles[nombre] ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    border: `2px solid ${getColor(idx)}`
                  }}
                  title="Click para mostrar solo esta categoría, doble click para toggle"
                >
                  <div style={{ 
                    width: '20px', 
                    height: '4px', 
                    backgroundColor: getColor(idx),
                    borderRadius: '2px'
                  }}></div>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>
                    {nombre.length > 30 ? nombre.substring(0, 30) + '...' : nombre}
                  </span>
                </div>
              ))}
            </div>

            {/* Gráfico de líneas SVG */}
            <div style={{ overflowX: 'auto', backgroundColor: '#fafafa', borderRadius: '8px', padding: '10px' }}>
              <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
                {/* Líneas de guía horizontales */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                  <g key={i}>
                    <line
                      x1={chartPadding.left}
                      y1={chartPadding.top + plotHeight * (1 - pct)}
                      x2={chartPadding.left + plotWidth}
                      y2={chartPadding.top + plotHeight * (1 - pct)}
                      stroke="#ddd"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={chartPadding.left - 10}
                      y={chartPadding.top + plotHeight * (1 - pct) + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#666"
                    >
                      {Math.round(maxValue * pct).toLocaleString()}
                    </text>
                  </g>
                ))}
                
                {/* Etiqueta eje Y */}
                <text
                  x={15}
                  y={chartHeight / 2}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#666"
                  transform={`rotate(-90, 15, ${chartHeight / 2})`}
                >
                  Peso (kg)
                </text>

                {/* Líneas de datos */}
                {series.map((nombre, serieIdx) => {
                  if (!seriesVisibles[nombre]) return null;
                  
                  const valores = evolutivo.series[nombre];
                  const puntos = valores.map((val, i) => {
                    const x = chartPadding.left + (i / (meses.length - 1)) * plotWidth;
                    const y = chartPadding.top + plotHeight - (val / maxValue) * plotHeight;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <g key={nombre}>
                      {/* Línea */}
                      <polyline
                        points={puntos}
                        fill="none"
                        stroke={getColor(serieIdx)}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {/* Puntos */}
                      {valores.map((val, i) => {
                        const x = chartPadding.left + (i / (meses.length - 1)) * plotWidth;
                        const y = chartPadding.top + plotHeight - (val / maxValue) * plotHeight;
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="5"
                            fill={getColor(serieIdx)}
                            stroke="white"
                            strokeWidth="2"
                            style={{ cursor: 'pointer' }}
                          >
                            <title>{`${nombre}: ${val.toLocaleString()} kg (${formatearMes(meses[i])})`}</title>
                          </circle>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Etiquetas de meses (eje X) */}
                {meses.map((mes, i) => {
                  const x = chartPadding.left + (i / (meses.length - 1)) * plotWidth;
                  return (
                    <text
                      key={i}
                      x={x}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#666"
                    >
                      {formatearMes(mes)}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Tabla resumen */}
            <div style={{ marginTop: '20px', overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Total (kg)</th>
                    {series.filter(s => seriesVisibles[s]).map((nombre, idx) => (
                      <th key={nombre} style={{ 
                        borderBottom: `3px solid ${getColor(series.indexOf(nombre))}`,
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} title={nombre}>
                        {nombre.length > 20 ? nombre.substring(0, 20) + '...' : nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meses.map((mes, idx) => (
                    <tr key={idx}>
                      <td><strong>{formatearMes(mes)}</strong></td>
                      <td><strong>{(evolutivo.totales_por_mes[mes] || 0).toLocaleString()}</strong></td>
                      {series.filter(s => seriesVisibles[s]).map(nombre => (
                        <td key={nombre}>{(evolutivo.series[nombre]?.[idx] || 0).toLocaleString()}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No hay datos de evolución disponibles
          </div>
        )}
      </div>

      {/* Estadísticas por estado y tipología */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
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
          <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tipología</th>
                  <th>Cantidad</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.por_tipologia)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tipologia, cantidad], idx) => (
                    <tr key={tipologia}>
                      <td style={{ fontSize: '13px' }}>{tipologia}</td>
                      <td>{cantidad}</td>
                      <td>{((cantidad / stats.total_registros) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
