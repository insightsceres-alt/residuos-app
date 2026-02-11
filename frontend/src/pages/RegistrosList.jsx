import { useState, useEffect } from 'react';
import { getRegistros, deleteRegistro, updateRegistro, getEstados, getGruposLER, getProvincias, exportarXMLeSIR, marcarEnviadoEsir } from '../services/api';
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
    gruposLER: [],
    gruposLERMap: {}, // Mapa código -> nombre para búsqueda rápida
    provincias: []
  });
  const [selectedRegistro, setSelectedRegistro] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadRegistros();
  }, [filters]);

  const loadCatalogos = async () => {
    try {
      const [estados, gruposLER, provincias] = await Promise.all([
        getEstados(),
        getGruposLER(),
        getProvincias()
      ]);
      
      // Crear mapa de código -> nombre para búsqueda rápida
      const gruposLERMap = {};
      (gruposLER.data || []).forEach(g => {
        gruposLERMap[g.code] = g.name;
      });
      
      setCatalogos({
        estados: estados.data,
        gruposLER: gruposLER.data || [],
        gruposLERMap,
        provincias: provincias.data
      });
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  // Obtener nombre de categoría LER a partir del código
  const getCategoria = (codigoLer) => {
    if (!codigoLer) return '-';
    const prefijo = codigoLer.substring(0, 2);
    const nombre = catalogos.gruposLERMap[prefijo];
    if (nombre) {
      return nombre.length > 35 ? nombre.substring(0, 35) + '...' : nombre;
    }
    return prefijo;
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

  const handleExportEsir = async (registro) => {
    try {
      // Generar y descargar el XML
      exportarXMLeSIR(registro);
      
      // Si no estaba marcado como enviado, marcarlo
      if (!registro.enviado_esir) {
        await marcarEnviadoEsir(registro.id);
        loadRegistros(); // Recargar para mostrar el check
      }
    } catch (err) {
      console.error('Error al marcar como enviado:', err);
      // El XML ya se descargó, solo falló el marcado
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  // Funciones para selección múltiple
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectPage = () => {
    const pageIds = registros.map(r => r.id);
    const allPageSelected = pageIds.every(id => selectedIds.has(id));
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (allPageSelected) {
        // Deseleccionar los de esta página
        pageIds.forEach(id => newSet.delete(id));
      } else {
        // Seleccionar los de esta página
        pageIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const selectAllRecords = async () => {
    try {
      // Cargar TODOS los registros con los filtros actuales (sin paginación)
      const response = await getRegistros({ ...filters, page: 1, page_size: 10000 });
      const allIds = response.data.items.map(r => r.id);
      setSelectedIds(new Set(allIds));
    } catch (err) {
      console.error('Error al seleccionar todos:', err);
      alert('Error al seleccionar todos los registros');
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Exportar a CSV
  const exportarCSV = async () => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos un registro para exportar');
      return;
    }

    try {
      // Si hay más seleccionados que en la página actual, cargar todos los datos
      let registrosParaExportar = registros.filter(r => selectedIds.has(r.id));
      
      if (selectedIds.size > registrosParaExportar.length) {
        // Cargar todos los registros para obtener los datos completos
        const response = await getRegistros({ ...filters, page: 1, page_size: 10000 });
        registrosParaExportar = response.data.items.filter(r => selectedIds.has(r.id));
      }

      // Definir columnas
      const columnas = [
        'Número Registro',
        'Fecha',
        'Código LER',
        'Tipología',
        'Peso (kg)',
        'Lugar Recogida',
        'Provincia',
        'Municipio',
        'Transportista',
        'Vehículo',
        'Conductor',
        'Estado',
        'Enviado E-SIR',
        'Observaciones'
      ];

      // Crear filas
      const filas = registrosParaExportar.map(r => [
        r.numero_registro,
        formatDate(r.fecha_registro),
        r.codigo_ler || '',
        r.tipologia,
        r.peso_kg,
        r.lugar_recogida,
        r.provincia,
        r.municipio || '',
        r.transportista_id || '',
        r.vehiculo_matricula || '',
        r.conductor_nombre || '',
        r.estado,
        r.enviado_esir ? 'Sí' : 'No',
        r.observaciones || ''
      ]);

      // Escapar valores para CSV
      const escaparCSV = (valor) => {
        if (valor === null || valor === undefined) return '';
        const str = String(valor);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Generar contenido CSV
      const contenido = [
        columnas.map(escaparCSV).join(','),
        ...filas.map(fila => fila.map(escaparCSV).join(','))
      ].join('\n');

      // Crear y descargar archivo
      const blob = new Blob(['\ufeff' + contenido], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `registros_residuos_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      alert('Error al exportar los registros');
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
            <label className="form-label">Categoría LER</label>
            <select
              className="form-select"
              value={filters.tipologia}
              onChange={(e) => setFilters({ ...filters, tipologia: e.target.value, page: 1 })}
              style={{ maxWidth: '300px' }}
            >
              <option value="">Todas las categorías</option>
              {catalogos.gruposLER.map(grupo => (
                <option key={grupo.code} value={grupo.code}>
                  {grupo.code} - {grupo.name.length > 40 ? grupo.name.substring(0, 40) + '...' : grupo.name}
                </option>
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
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h3 className="card-title" style={{ marginBottom: 0, fontSize: '14px' }}>
              Listado ({pagination.total} registros)
            </h3>
            {selectedIds.size > 0 && (
              <span style={{ 
                color: '#1976d2', 
                fontSize: '13px',
                backgroundColor: '#e3f2fd',
                padding: '4px 10px',
                borderRadius: '12px'
              }}>
                ✓ {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
                <button 
                  onClick={clearSelection}
                  style={{ 
                    marginLeft: '8px', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '12px'
                  }}
                  title="Limpiar selección"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {pagination.total > 0 && selectedIds.size < pagination.total && (
              <button
                className="btn btn-secondary"
                onClick={selectAllRecords}
                style={{ fontSize: '11px', padding: '5px 10px' }}
                title={`Seleccionar los ${pagination.total} registros`}
              >
                ☑ Seleccionar todos ({pagination.total})
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={exportarCSV}
              disabled={selectedIds.size === 0}
              style={{ fontSize: '11px', padding: '5px 10px' }}
            >
              📥 Exportar CSV {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={registros.length > 0 && registros.every(r => selectedIds.has(r.id))}
                    onChange={toggleSelectPage}
                    title="Seleccionar página actual"
                  />
                </th>
                <th>N° Registro</th>
                <th>Fecha</th>
                <th>Código LER</th>
                <th>Categoría LER</th>
                <th>Descripción</th>
                <th>Peso (kg)</th>
                <th>Lugar Recogida</th>
                <th>Provincia</th>
                <th>E-SIR</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(registro => (
                <tr key={registro.id} style={{ backgroundColor: selectedIds.has(registro.id) ? '#e3f2fd' : 'inherit' }}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(registro.id)}
                      onChange={() => toggleSelect(registro.id)}
                    />
                  </td>
                  <td style={{ fontSize: '11px' }}>{registro.numero_registro}</td>
                  <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{formatDate(registro.fecha_registro)}</td>
                  <td>
                    <span style={{ 
                      backgroundColor: '#e8f5e9', 
                      padding: '2px 4px', 
                      borderRadius: '4px',
                      fontWeight: '600',
                      color: '#2e7d32',
                      fontSize: '11px'
                    }}>
                      {registro.codigo_ler || '-'}
                    </span>
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }} title={catalogos.gruposLERMap[registro.codigo_ler?.substring(0,2)] || ''}>
                    {getCategoria(registro.codigo_ler)}
                  </td>
                  <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }} title={registro.tipologia}>
                    {registro.tipologia}
                  </td>
                  <td style={{ fontSize: '11px', textAlign: 'right' }}>{registro.peso_kg.toLocaleString()}</td>
                  <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }} title={registro.lugar_recogida}>{registro.lugar_recogida}</td>
                  <td style={{ fontSize: '11px' }}>{registro.provincia}</td>
                  <td style={{ textAlign: 'center' }}>
                    {registro.enviado_esir ? (
                      <span title={`Enviado: ${registro.fecha_envio_esir ? formatDate(registro.fecha_envio_esir) : ''}`} style={{ color: '#2e7d32', fontSize: '14px' }}>
                        ✅
                      </span>
                    ) : (
                      <span style={{ color: '#999', fontSize: '14px' }}>⬜</span>
                    )}
                  </td>
                  <td>
                    <select
                      className={`badge badge-${registro.estado.toLowerCase().replace('_', '-')}`}
                      value={registro.estado}
                      onChange={(e) => handleEstadoChange(registro, e.target.value)}
                      style={{ border: 'none', cursor: 'pointer', fontSize: '10px', padding: '2px 4px' }}
                    >
                      {catalogos.estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button 
                      className="btn btn-info" 
                      style={{ fontSize: '10px', padding: '3px 6px' }}
                      onClick={() => setSelectedRegistro(registro)}
                    >
                      Ver
                    </button>
                    {' '}
                    <button 
                      className={registro.enviado_esir ? "btn btn-secondary" : "btn btn-success"}
                      style={{ fontSize: '10px', padding: '3px 6px' }}
                      onClick={() => handleExportEsir(registro)}
                      title={registro.enviado_esir ? "Ya enviado - Descargar XML nuevamente" : "Exportar XML para E-SIR"}
                    >
                      {registro.enviado_esir ? '✅' : '📤'}
                    </button>
                    {' '}
                    <button 
                      className="btn btn-danger" 
                      style={{ fontSize: '10px', padding: '3px 6px' }}
                      onClick={() => handleDelete(registro.id)}
                    >
                      ✕
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
              <p><strong>Código LER:</strong> <span style={{ backgroundColor: '#e8f5e9', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', color: '#2e7d32' }}>{selectedRegistro.codigo_ler || 'N/A'}</span></p>
              <p><strong>Tipología:</strong> {selectedRegistro.tipologia}</p>
              <p><strong>Peso:</strong> {selectedRegistro.peso_kg} kg</p>
              <p><strong>Lugar de Recogida:</strong> {selectedRegistro.lugar_recogida}</p>
              <p><strong>Provincia:</strong> {selectedRegistro.provincia}</p>
              <p><strong>Municipio:</strong> {selectedRegistro.municipio}</p>
              <p><strong>Transportista:</strong> {selectedRegistro.transportista_id || 'N/A'}</p>
              <p><strong>Vehículo:</strong> {selectedRegistro.vehiculo_matricula || 'N/A'}</p>
              <p><strong>Conductor:</strong> {selectedRegistro.conductor_nombre || 'N/A'}</p>
              <p><strong>Estado:</strong> <span className={`badge badge-${selectedRegistro.estado.toLowerCase().replace('_', '-')}`}>{selectedRegistro.estado}</span></p>
              <p>
                <strong>Enviado a E-SIR:</strong>{' '}
                {selectedRegistro.enviado_esir ? (
                  <span style={{ color: '#2e7d32' }}>
                    ✅ Sí {selectedRegistro.fecha_envio_esir && `(${formatDate(selectedRegistro.fecha_envio_esir)})`}
                  </span>
                ) : (
                  <span style={{ color: '#999' }}>❌ No</span>
                )}
              </p>
              {selectedRegistro.observaciones && (
                <p><strong>Observaciones:</strong> {selectedRegistro.observaciones}</p>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className={selectedRegistro.enviado_esir ? "btn btn-secondary" : "btn btn-success"}
                onClick={() => handleExportEsir(selectedRegistro)}
              >
                {selectedRegistro.enviado_esir ? '✅ Descargar XML nuevamente' : '📤 Exportar XML E-SIR'}
              </button>
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
