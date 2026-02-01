import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/residuos/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Redirigir al login si no está autenticado
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper para limpiar parámetros vacíos
const cleanParams = (params) => {
  const cleaned = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

// Registros
export const getRegistros = (params) => api.get('/registros/', { params: cleanParams(params) });
export const getRegistro = (id) => api.get(`/registros/${id}`);
export const createRegistro = (data) => api.post('/registros/', data);
export const updateRegistro = (id, data) => api.put(`/registros/${id}`, data);
export const deleteRegistro = (id) => api.delete(`/registros/${id}`);
export const getEstadisticas = () => api.get('/registros/estadisticas');
export const getEvolutivoMensual = (meses = 12, grupoLer = null) => {
  const params = { meses };
  if (grupoLer) params.grupo_ler = grupoLer;
  return api.get('/registros/estadisticas/evolutivo-mensual', { params });
};
export const getHistorial = (id) => api.get(`/registros/${id}/historial`);
export const marcarEnviadoEsir = (id) => api.post(`/registros/${id}/enviar-esir`);

// Catálogos
export const getTipologias = () => api.get('/catalogos/tipologias');
export const getGruposLER = () => api.get('/catalogos/grupos-ler');
export const getTransportistas = () => api.get('/catalogos/transportistas');
export const getVehiculos = (transportistaId) => 
  api.get('/catalogos/vehiculos', { params: { transportista_id: transportistaId } });
export const getPlantas = () => api.get('/catalogos/plantas');
export const getProvincias = () => api.get('/catalogos/provincias');
export const getMunicipios = (provincia) => api.get('/catalogos/municipios', { params: { provincia } });
export const getEstados = () => api.get('/catalogos/estados');
export const searchCodigosLER = (search) => 
  api.get('/catalogos/codigos-ler', { params: { search, limit: 20 } });

// Función para generar XML E-SIR y descargarlo
export const exportarXMLeSIR = (registro) => {
  const fechaNotificacion = new Date().toISOString();
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NotificacionTraslado xmlns="http://esir.miteco.gob.es/schema/v1">
  <Cabecera>
    <NumeroRegistro>${registro.numero_registro || ''}</NumeroRegistro>
    <FechaNotificacion>${fechaNotificacion}</FechaNotificacion>
    <FechaRegistro>${registro.fecha_registro || ''}</FechaRegistro>
    <TipoOperacion>TRASLADO_RESIDUOS</TipoOperacion>
  </Cabecera>
  <DatosResiduo>
    <CodigoLER>${registro.codigo_ler || ''}</CodigoLER>
    <Tipologia>${registro.tipologia || ''}</Tipologia>
    <PesoKg>${registro.peso_kg || 0}</PesoKg>
    <UnidadMedida>KG</UnidadMedida>
  </DatosResiduo>
  <Origen>
    <LugarRecogida>${registro.lugar_recogida || ''}</LugarRecogida>
    <Provincia>${registro.provincia || ''}</Provincia>
    <Municipio>${registro.municipio || ''}</Municipio>
    <Coordenadas latitud="${registro.latitud || ''}" longitud="${registro.longitud || ''}"/>
    <DireccionOrigen>${registro.origen || ''}</DireccionOrigen>
  </Origen>
  <Destino>
    <PlantaTratamiento>${registro.planta_tratamiento || ''}</PlantaTratamiento>
    <DireccionDestino>${registro.destino || ''}</DireccionDestino>
  </Destino>
  <Transportista>
    <Identificador>${registro.transportista_id || ''}</Identificador>
    <Conductor>${registro.conductor_nombre || ''}</Conductor>
    <VehiculoMatricula>${registro.vehiculo_matricula || ''}</VehiculoMatricula>
  </Transportista>
  <EstadoActual>${registro.estado || 'PENDIENTE'}</EstadoActual>
  <Observaciones>${registro.observaciones || ''}</Observaciones>
</NotificacionTraslado>`;

  // Crear blob y descargar
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ESIR_${registro.numero_registro || 'registro'}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default api;
