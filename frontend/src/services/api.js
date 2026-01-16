import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/residuos/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Registros
export const getRegistros = (params) => api.get('/registros', { params });
export const getRegistro = (id) => api.get(`/registros/${id}`);
export const createRegistro = (data) => api.post('/registros', data);
export const updateRegistro = (id, data) => api.put(`/registros/${id}`, data);
export const deleteRegistro = (id) => api.delete(`/registros/${id}`);
export const getEstadisticas = () => api.get('/registros/estadisticas');
export const getHistorial = (id) => api.get(`/registros/${id}/historial`);

// Catálogos
export const getTipologias = () => api.get('/catalogos/tipologias');
export const getTransportistas = () => api.get('/catalogos/transportistas');
export const getVehiculos = (transportistaId) => 
  api.get('/catalogos/vehiculos', { params: { transportista_id: transportistaId } });
export const getPlantas = () => api.get('/catalogos/plantas');
export const getProvincias = () => api.get('/catalogos/provincias');
export const getEstados = () => api.get('/catalogos/estados');

export default api;
