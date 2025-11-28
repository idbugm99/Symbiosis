import axios from 'axios';
import { authService } from './auth.js';

class ApiClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await authService.getIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error status
          console.error('API Error:', error.response.status, error.response.data);

          if (error.response.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/pages/login.html';
          }
        } else if (error.request) {
          // Request made but no response
          console.error('Network Error:', error.request);
        } else {
          // Error setting up request
          console.error('Request Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get(endpoint, params = {}) {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint, data = {}) {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put(endpoint, data = {}) {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async patch(endpoint, data = {}) {
    const response = await this.client.patch(endpoint, data);
    return response.data;
  }

  async delete(endpoint) {
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  // Domain-specific API methods

  // Chemicals
  async getChemicals(filters = {}) {
    return this.get('/chemicals', filters);
  }

  async getChemicalById(id) {
    return this.get(`/chemicals/${id}`);
  }

  async createChemical(data) {
    return this.post('/chemicals', data);
  }

  async updateChemical(id, data) {
    return this.put(`/chemicals/${id}`, data);
  }

  async deleteChemical(id) {
    return this.delete(`/chemicals/${id}`);
  }

  // Equipment
  async getEquipment(filters = {}) {
    return this.get('/equipment', filters);
  }

  async getEquipmentById(id) {
    return this.get(`/equipment/${id}`);
  }

  async createEquipment(data) {
    return this.post('/equipment', data);
  }

  async updateEquipment(id, data) {
    return this.put(`/equipment/${id}`, data);
  }

  // Experiments
  async getExperiments(filters = {}) {
    return this.get('/experiments', filters);
  }

  async getExperimentById(id) {
    return this.get(`/experiments/${id}`);
  }

  async createExperiment(data) {
    return this.post('/experiments', data);
  }

  async updateExperiment(id, data) {
    return this.put(`/experiments/${id}`, data);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
