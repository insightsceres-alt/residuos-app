import { useState, useEffect } from 'react';
import { getRegistros, deleteRegistro, updateRegistro, getEstados, getTipologias, getProvincias } from '../services/api';
import { format } from 'date-fns';

function RegistrosList() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    estado: '',
    tipologia: '',
    provincia: '',
    search: '',
    page: 1,
    page_size: 20
  });
  const [pagination, setPagination] = useState({});
  const [catalogos, setCatalogos] = useState({
    estados: [],
    tipologias: [],
    provincias: []
  });
  const [selectedRegistro, setSelectedRegistro] = useState(null);

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadRegistros();
  }, [filters]);

  const loadCatalogos = async () => {
    try {
      const [estados, tipologias, provincias] = await Promise.all([
        getEstados(),
        getTipologias(),
        getProvincias()
      ]);
      setCatalogos({
        estados: estados.data,
        tipologias: tipologias.data,
        provincias: provincias.data
      });
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const loadRegistros = async () => {
    try {
      setLoading(true);
      const response = await getRegistros(filters);
      setRegistros(response.data.items);
      setPagination({
        total: response.data.total,
        page: response.data.page,
        page_size: response.data.page_size,
        total_pages: response.data.total_pages
      });
    } catch (err) {
      setError('Error al cargar registros');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    
    try {
      await deleteRegistro(id);
      loadRegistros();
    } catch (err) {
      alert('Error al eliminar registro');
      console.error(err);
    }
  };

  const handleEstadoChange = async (registro, nuevoEstado) => {
    try {
      await updateRegistro(registro.id, { 
        estado: nuevoEstado,
        usuario_modificacion: 'Sistema'
      });
      loadRegistros();
    } catch (err) {
      alert('Error al actualizar estado');
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (loading && registros.length === 0) {
    return <div className="loading">Cargando registros...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Registros de Residuos</h2>

      {error && <div className="error">{error}</div>}

      <div className="filters">
        <div className="filter-row">
          <div className="form-group">
            <label className="form-label">Buscar</label>
            <input
              type="text"
              className="form-input"
              placeholder="Lugar, número de registro..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filters.estado}
              onChange={(e) => setFilters({ ...filters, estado: e.target.value, page: 1 })}
            >
              <option value="">Todos</option>
              {catalogos.estados.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tipología</label>
            <select
              className="form-select"
              value={filters.tipologia}
              onChange={(e) => setFilters({ ...filters, tipologia: e.target.value, page: 1 })}
            >
              <option value="">Todas</option>
              {catalogos.tipologias.map(tip => (
                <option key={tip.codigo} value={tip.nombre}>{tip.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Provincia</label>
            <select
              className="form-select"
              value={filters.provincia}
              onChange={(e) => setFilters({ ...filters, provincia: e.target.value, page: 1 })}
            >
              <option value="">Todas</option>
              {catalogos.provincias.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <button 
              className="btn btn-secondary"
              onClick={() => setFilters({
                estado: '',
                tipologia: '',
                provincia: '',
                search: '',
                page: 1,
                page_size: 20
              })}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ marginBottom: 0 }}>
            Listado ({pagination.total} registros)
          </h3>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>N° Registro</th>
                <th>Fecha</th>
                <th>Tipología</th>
                <th>Peso (kg)</th>
                <th>Lugar Recogida</th>
                <th>Provincia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(registro => (
                <tr key={registro.id}>
                  <td>{registro.numero_registro}</td>
                  <td>{formatDate(registro.fecha_registro)}</td>
                  <td>{registro.tipologia}</td>
                  <td>{registro.peso_kg.toLocaleString()}</td>
                  <td>{registro.lugar_recogida}</td>
                  <td>{registro.provincia}</td>
                  <td>
                    <select
                      className={`badge badge-${registro.estado.toLowerCase().replace('_', '-')}`}
                      value={registro.estado}
                      onChange={(e) => handleEstadoChange(registro, e.target.value)}
                      style={{ border: 'none', cursor: 'pointer' }}
                    >
                      {catalogos.estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button 
                      className="btn btn-info" 
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                      onClick={() => setSelectedRegistro(registro)}
                    >
                      Ver
                    </button>
                    {' '}
                    <button 
                      className="btn btn-danger" 
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                      onClick={() => handleDelete(registro.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.total_pages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              disabled={filters.page === 1}
            >
              Anterior
            </button>
            <span>
              Página {pagination.page} de {pagination.total_pages}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              disabled={filters.page === pagination.total_pages}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {selectedRegistro && (
        <div className="modal-overlay" onClick={() => setSelectedRegistro(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Detalle del Registro</h2>
              <button className="modal-close" onClick={() => setSelectedRegistro(null)}>&times;</button>
            </div>
            <div>
              <p><strong>Número:</strong> {selectedRegistro.numero_registro}</p>
              <p><strong>Fecha:</strong> {formatDate(selectedRegistro.fecha_registro)}</p>
              <p><strong>Tipología:</strong> {selectedRegistro.tipologia}</p>
              <p><strong>Peso:</strong> {selectedRegistro.peso_kg} kg</p>
              <p><strong>Lugar de Recogida:</strong> {selectedRegistro.lugar_recogida}</p>
              <p><strong>Provincia:</strong> {selectedRegistro.provincia}</p>
              <p><strong>Municipio:</strong> {selectedRegistro.municipio}</p>
              <p><strong>Transportista:</strong> {selectedRegistro.transportista_id || 'N/A'}</p>
              <p><strong>Vehículo:</strong> {selectedRegistro.vehiculo_matricula || 'N/A'}</p>
              <p><strong>Conductor:</strong> {selectedRegistro.conductor_nombre || 'N/A'}</p>
              <p><strong>Estado:</strong> <span className={`badge badge-${selectedRegistro.estado.toLowerCase().replace('_', '-')}`}>{selectedRegistro.estado}</span></p>
              {selectedRegistro.observaciones && (
                <p><strong>Observaciones:</strong> {selectedRegistro.observaciones}</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedRegistro(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistrosList;
