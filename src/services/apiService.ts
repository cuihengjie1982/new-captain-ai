// API 服务客户端
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 请求配置接口
export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipErrorHandler?: boolean;
}

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Vite 项目使用 import.meta.env，构建时通过 vite.config.ts define 注入到 process.env
    this.baseURL = (import.meta as any).env?.VITE_API_URL 
      || (typeof process !== 'undefined' && (process.env as any)?.VITE_API_URL)
      || 'http://localhost:3001/api';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // 设置请求和响应拦截器
  private setupInterceptors() {
    // 请求拦截器 - 添加认证头
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('captain_ai_token');
        if (token && !(config as RequestConfig).skipAuth) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 统一错误处理
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (!(error.config as RequestConfig).skipErrorHandler) {
          this.handleError(error);
        }
        return Promise.reject(error);
      }
    );
  }

  // 统一错误处理
  private handleError(error: any) {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('captain_ai_token');
          localStorage.removeItem('captainUser');
          window.location.href = '/';
          break;
        case 403:
          console.error('权限不足:', data?.message || '没有权限访问此资源');
          break;
        case 404:
          console.error('资源不存在:', data?.message || '请求的资源不存在');
          break;
        case 429:
          console.error('请求过于频繁:', data?.message || '请求过于频繁，请稍后再试');
          break;
        case 500:
          console.error('服务器错误:', data?.message || '服务器内部错误');
          break;
        default:
          console.error('API错误:', data?.message || error.message);
      }
    } else if (error.request) {
      console.error('网络错误:', '无法连接到服务器');
    } else {
      console.error('未知错误:', error.message);
    }
  }

  // GET 请求
  async get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  // POST 请求
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // PUT 请求
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // DELETE 请求
  async delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // PATCH 请求
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // 文件上传
  async upload<T = any>(url: string, formData: FormData, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config?.headers || {}),
      },
    });
    return response.data;
  }

  // 设置认证token
  setAuthToken(token: string) {
    localStorage.setItem('captain_ai_token', token);
  }

  // 清除认证token
  clearAuthToken() {
    localStorage.removeItem('captain_ai_token');
  }

  // 检查是否已认证
  isAuthenticated(): boolean {
    return !!localStorage.getItem('captain_ai_token');
  }

  // 获取当前token
  getToken(): string | null {
    return localStorage.getItem('captain_ai_token');
  }
}

// 创建单例实例
const apiService = new ApiService();

export default apiService;

// 导出类型定义
export type { ApiResponse, RequestConfig };