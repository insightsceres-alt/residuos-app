import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRegistro, getTipologias, getTransportistas, getVehiculos, getProvincias, getMunicipios, searchCodigosLER } from '../services/api';

function NuevoRegistro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [catalogos, setCatalogos] = useState({
    tipologias: [],
    transportistas: [],
    vehiculos: [],
    provincias: [],
    municipios: []
  });
  
  const [formData, setFormData] = useState({
    tipologia: '',
    codigo_ler: '',
    peso_kg: '',
    lugar_recogida: '',
    latitud: '',
    longitud: '',
    provincia: '',
    municipio: '',
    transportista_id: '',
    vehiculo_matricula: '',
    conductor_nombre: '',
    origen: '',
    destino: '',
    planta_tratamiento: '',
    observaciones: '',
    usuario_creacion: 'Sistema'
  });

  // Estado para autocompletado de código LER
  const [lerSuggestions, setLerSuggestions] = useState([]);
  const [showLerDropdown, setShowLerDropdown] = useState(false);
  const [searchingLer, setSearchingLer] = useState(false);
  const lerInputRef = useRef(null);
  const lerDropdownRef = useRef(null);

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    if (formData.transportista_id) {
      loadVehiculos(formData.transportista_id);
    }
  }, [formData.transportista_id]);

  // Cargar municipios cuando cambia la provincia
  useEffect(() => {
    if (formData.provincia) {
      loadMunicipios(formData.provincia);
    } else {
      setCatalogos(prev => ({ ...prev, municipios: [] }));
    }
  }, [formData.provincia]);

  // Cerrar dropdown de LER cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lerDropdownRef.current && !lerDropdownRef.current.contains(event.target) &&
          lerInputRef.current && !lerInputRef.current.contains(event.target)) {
        setShowLerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCatalogos = async () => {
    try {
      const [tipologias, transportistas, provincias] = await Promise.all([
        getTipologias(),
        getTransportistas(),
        getProvincias()
      ]);
      setCatalogos({
        ...catalogos,
        tipologias: tipologias.data,
        transportistas: transportistas.data,
        provincias: provincias.data
      });
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  const loadVehiculos = async (transportistaId) => {
    try {
      const response = await getVehiculos(transportistaId);
      setCatalogos({
        ...catalogos,
        vehiculos: response.data
      });
    } catch (err) {
      console.error('Error cargando vehículos:', err);
    }
  };

  const loadMunicipios = async (provincia) => {
    try {
      const response = await getMunicipios(provincia);
      setCatalogos(prev => ({
        ...prev,
        municipios: response.data
      }));
    } catch (err) {
      console.error('Error cargando municipios:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si cambia la provincia, limpiar el municipio
    if (name === 'provincia') {
      setFormData({
        ...formData,
        provincia: value,
        municipio: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Búsqueda de códigos LER con debounce
  const handleTipologiaChange = async (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      tipologia: value,
      codigo_ler: '' // Limpiar código LER cuando cambia la descripción
    });

    if (value.length >= 2) {
      setSearchingLer(true);
      try {
        const response = await searchCodigosLER(value);
        setLerSuggestions(response.data);
        setShowLerDropdown(response.data.length > 0);
      } catch (err) {
        console.error('Error buscando códigos LER:', err);
        setLerSuggestions([]);
      } finally {
        setSearchingLer(false);
      }
    } else {
      setLerSuggestions([]);
      setShowLerDropdown(false);
    }
  };

  // Seleccionar una sugerencia de código LER
  const handleSelectLerSuggestion = (suggestion) => {
    setFormData({
      ...formData,
      tipologia: suggestion.name,
      codigo_ler: suggestion.code
    });
    setShowLerDropdown(false);
    setLerSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.tipologia || !formData.peso_kg || !formData.lugar_recogida) {
      setError('Por favor completa los campos obligatorios');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Convertir valores numéricos
      const data = {
        ...formData,
        peso_kg: parseFloat(formData.peso_kg),
        latitud: formData.latitud ? parseFloat(formData.latitud) : null,
        longitud: formData.longitud ? parseFloat(formData.longitud) : null,
      };

      await createRegistro(data);
      setSuccess(true);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/registros');
      }, 2000);
      
    } catch (err) {
      setError('Error al crear el registro: ' + (err.response?.data?.detail || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card">
        <div className="success">
          ✅ Registro creado exitosamente. Redirigiendo...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Nuevo Registro de Residuo</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 className="card-title">Información del Residuo</h3>
          
          <div className="form-row">
            <div className="form-group" style={{ flex: 2, position: 'relative' }}>
              <label className="form-label">Descripción del Residuo (LER) *</label>
              <input
                ref={lerInputRef}
                type="text"
                name="tipologia"
                className="form-input"
                value={formData.tipologia}
                onChange={handleTipologiaChange}
                onFocus={() => lerSuggestions.length > 0 && setShowLerDropdown(true)}
                required
                placeholder="Escribe para buscar en el catálogo LER..."
                autoComplete="off"
              />
              {searchingLer && (
                <span style={{ position: 'absolute', right: '10px', top: '38px', color: '#666' }}>
                  🔍
                </span>
              )}
              {showLerDropdown && lerSuggestions.length > 0 && (
                <div
                  ref={lerDropdownRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '250px',
                    overflowY: 'auto',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 1000
                  }}
                >
                  {lerSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectLerSuggestion(suggestion)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                    >
                      <strong style={{ color: '#2e7d32' }}>{suggestion.code}</strong>
                      <span style={{ marginLeft: '10px', color: '#333' }}>{suggestion.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Código LER</label>
              <input
                type="text"
                name="codigo_ler"
                className="form-input"
                value={formData.codigo_ler}
                onChange={handleChange}
                placeholder="Se auto-rellena"
                style={{ backgroundColor: '#f9f9f9' }}
                readOnly
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Peso (kg) *</label>
              <input
                type="number"
                name="peso_kg"
                className="form-input"
                value={formData.peso_kg}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                placeholder="125.50"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Ubicación de Recogida</h3>
          
          <div className="form-group">
            <label className="form-label">Lugar de Recogida *</label>
            <input
              type="text"
              name="lugar_recogida"
              className="form-input"
              value={formData.lugar_recogida}
              onChange={handleChange}
              required
              placeholder="Calle Mayor 123, Madrid"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Provincia</label>
              <select
                name="provincia"
                className="form-select"
                value={formData.provincia}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                {catalogos.provincias.map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Municipio</label>
              <select
                name="municipio"
                className="form-select"
                value={formData.municipio}
                onChange={handleChange}
                disabled={!formData.provincia}
              >
                <option value="">{formData.provincia ? 'Seleccionar municipio...' : 'Selecciona primero una provincia'}</option>
                {catalogos.municipios.map(mun => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input
                type="number"
                name="latitud"
                className="form-input"
                value={formData.latitud}
                onChange={handleChange}
                step="0.000001"
                placeholder="40.416775"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input
                type="number"
                name="longitud"
                className="form-input"
                value={formData.longitud}
                onChange={handleChange}
                step="0.000001"
                placeholder="-3.703790"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Información del Transporte</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Transportista</label>
              <select
                name="transportista_id"
                className="form-select"
                value={formData.transportista_id}
                onChange={handleChange}
              >
                <option value="">Seleccionar...</option>
                {catalogos.transportistas.map(trans => (
                  <option key={trans.id} value={trans.id}>
                    {trans.nombre_empresa}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Vehículo</label>
              <select
                name="vehiculo_matricula"
                className="form-select"
                value={formData.vehiculo_matricula}
                onChange={handleChange}
                disabled={!formData.transportista_id}
              >
                <option value="">Seleccionar...</option>
                {catalogos.vehiculos.map(veh => (
                  <option key={veh.matricula} value={veh.matricula}>
                    {veh.matricula} - {veh.marca} {veh.modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Conductor</label>
              <input
                type="text"
                name="conductor_nombre"
                className="form-input"
                value={formData.conductor_nombre}
                onChange={handleChange}
                placeholder="Juan Pérez"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Origen</label>
              <input
                type="text"
                name="origen"
                className="form-input"
                value={formData.origen}
                onChange={handleChange}
                placeholder="Centro de acopio Madrid Norte"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Destino</label>
              <input
                type="text"
                name="destino"
                className="form-input"
                value={formData.destino}
                onChange={handleChange}
                placeholder="Planta de reciclaje"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Planta de Tratamiento</label>
              <input
                type="text"
                name="planta_tratamiento"
                className="form-input"
                value={formData.planta_tratamiento}
                onChange={handleChange}
                placeholder="Planta XYZ"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Observaciones</h3>
          
          <div className="form-group">
            <label className="form-label">Observaciones</label>
            <textarea
              name="observaciones"
              className="form-textarea"
              value={formData.observaciones}
              onChange={handleChange}
              placeholder="Información adicional sobre el registro..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/registros')}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Crear Registro'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NuevoRegistro;
