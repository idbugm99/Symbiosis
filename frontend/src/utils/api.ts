import axios, { type AxiosInstance } from 'axios';
import { authService } from './auth.js';

class ApiClient {
  // Properties
  private baseURL: string;
  private client: AxiosInstance;
  private consecutiveFailures: number;
  private circuitBreakerOpen: boolean;
  private circuitBreakerResetTime: number | null;
  private readonly MAX_FAILURES: number;
  private readonly CIRCUIT_RESET_MS: number;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    
    // Circuit breaker configuration
    this.MAX_FAILURES = 5; // Open circuit after 5 consecutive failures
    this.CIRCUIT_RESET_MS = 30000; // Reset circuit after 30 seconds
    
    // Circuit breaker state
    this.consecutiveFailures = 0;
    this.circuitBreakerOpen = false;
    this.circuitBreakerResetTime = null;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token and check circuit breaker
    this.client.interceptors.request.use(
      async (config) => {
        // Check circuit breaker before making request
        if (this.circuitBreakerOpen) {
          const timeUntilReset = Math.max(0, this.circuitBreakerResetTime - Date.now());
          if (timeUntilReset > 0) {
            console.warn(`API Circuit Breaker: Open. Blocking request. Reset in ${Math.ceil(timeUntilReset / 1000)} seconds.`);
            return Promise.reject(new Error(`Server unavailable. Circuit breaker open. Retry in ${Math.ceil(timeUntilReset / 1000)} seconds.`));
          } else {
            // Reset circuit breaker after timeout
            this.circuitBreakerOpen = false;
            this.consecutiveFailures = 0;
            this.circuitBreakerResetTime = null;
            console.info('API Circuit Breaker: Reset. Allowing request.');
          }
        }

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

    // Response interceptor for error handling with circuit breaker
    this.client.interceptors.response.use(
      (response) => {
        // Reset circuit breaker on success
        if (this.consecutiveFailures > 0) {
          this.consecutiveFailures = 0;
          this.circuitBreakerOpen = false;
          this.circuitBreakerResetTime = null;
        }
        return response;
      },
      (error) => {
        // Only track network/connection errors for circuit breaker
        // Don't track if circuit is already open (we already blocked the request)
        if (!this.circuitBreakerOpen && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || !error.response)) {
          this.consecutiveFailures++;
          
          if (this.consecutiveFailures >= this.MAX_FAILURES) {
            this.circuitBreakerOpen = true;
            this.circuitBreakerResetTime = Date.now() + this.CIRCUIT_RESET_MS;
            console.warn(`API Circuit Breaker: Opened after ${this.MAX_FAILURES} consecutive failures. Will reset in ${this.CIRCUIT_RESET_MS / 1000} seconds.`);
          }
        } else if (error.response) {
          // Reset failures on non-network errors (4xx, 5xx responses)
          // These indicate server is up but request was invalid
          this.consecutiveFailures = 0;
        }

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
