import apiService from './apiService';
import { User } from '../types';

// 登录接口参数
interface LoginParams {
  email: string;
  password: string;
}

// 注册接口参数
interface RegisterParams {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// 用户更新参数
interface UpdateUserParams {
  name?: string;
  phone?: string;
  avatar?: string;
}

// 验证码接口参数
interface SendVerificationParams {
  email: string;
  type: 'register' | 'login' | 'reset';
}

// 邮箱验证参数
interface VerifyEmailParams {
  email: string;
  code: string;
}

// 密码重置参数
interface ResetPasswordParams {
  token: string;
  newPassword: string;
}

// 登录响应
interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 用户信息响应
interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  plan: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

class AuthService {
  // 用户登录
  async login(params: LoginParams): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>('/auth/login', params);

    if (response.success && response.data) {
      // 保存token
      apiService.setAuthToken(response.data.accessToken);

      // 保存用户信息到localStorage
      localStorage.setItem('captainUser', JSON.stringify({
        ...response.data.user,
        isAuthenticated: true,
      }));

      return response.data;
    }

    throw new Error(response.message || '登录失败');
  }

  // 用户注册
  async register(params: RegisterParams): Promise<void> {
    const response = await apiService.post('/auth/register', params);

    if (!response.success) {
      throw new Error(response.message || '注册失败');
    }
  }

  // 发送验证码
  async sendVerificationCode(params: SendVerificationParams): Promise<void> {
    const response = await apiService.post('/auth/send-verification', params);

    if (!response.success) {
      throw new Error(response.message || '发送验证码失败');
    }
  }

  // 验证邮箱
  async verifyEmail(params: VerifyEmailParams): Promise<void> {
    const response = await apiService.post('/auth/verify-email', params);

    if (!response.success) {
      throw new Error(response.message || '邮箱验证失败');
    }
  }

  // 刷新token
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await apiService.post('/auth/refresh', { refreshToken });

    if (response.success && response.data) {
      apiService.setAuthToken(response.data.accessToken);
      return response.data;
    }

    throw new Error(response.message || '刷新token失败');
  }

  // 获取用户信息
  async getUserProfile(): Promise<UserProfileResponse> {
    const response = await apiService.get<UserProfileResponse>('/auth/profile');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取用户信息失败');
  }

  // 更新用户信息
  async updateUserProfile(params: UpdateUserParams): Promise<UserProfileResponse> {
    const response = await apiService.put<UserProfileResponse>('/auth/profile', params);

    if (response.success && response.data) {
      // 更新localStorage中的用户信息
      const currentUser = JSON.parse(localStorage.getItem('captainUser') || '{}');
      const updatedUser = { ...currentUser, ...params };
      localStorage.setItem('captainUser', JSON.stringify(updatedUser));

      return response.data;
    }

    throw new Error(response.message || '更新用户信息失败');
  }

  // 修改密码
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiService.put('/auth/password', {
      currentPassword,
      newPassword,
    });

    if (!response.success) {
      throw new Error(response.message || '修改密码失败');
    }
  }

  // 忘记密码
  async forgotPassword(email: string): Promise<void> {
    const response = await apiService.post('/auth/forgot-password', { email });

    if (!response.success) {
      throw new Error(response.message || '发送重置邮件失败');
    }
  }

  // 重置密码
  async resetPassword(params: ResetPasswordParams): Promise<void> {
    const response = await apiService.post('/auth/reset-password', params);

    if (!response.success) {
      throw new Error(response.message || '重置密码失败');
    }
  }

  // 用户登出
  async logout(): Promise<void> {
    const response = await apiService.post('/auth/logout');

    // 清除token和用户信息
    apiService.clearAuthToken();
    localStorage.removeItem('captainUser');

    if (!response.success) {
      console.warn('登出请求失败，但已清除本地数据');
    }
  }

  // 检查用户名是否可用
  async checkUsernameAvailability(username: string): Promise<boolean> {
    const response = await apiService.get(`/auth/check-username?username=${encodeURIComponent(username)}`);

    return response.success ? response.data?.available || false : false;
  }

  // 检查邮箱是否可用
  async checkEmailAvailability(email: string): Promise<boolean> {
    const response = await apiService.get(`/auth/check-email?email=${encodeURIComponent(email)}`);

    return response.success ? response.data?.available || false : false;
  }

  // 获取当前用户信息（从localStorage）
  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem('captainUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // 检查是否已登录
  isLoggedIn(): boolean {
    return this.getCurrentUser()?.isAuthenticated || false;
  }

  // 获取用户权限
  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  // 检查是否为管理员
  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  // 检查用户套餐
  getUserPlan(): string | null {
    const user = this.getCurrentUser();
    return user?.plan || null;
  }

  // 检查是否为Pro用户
  isProUser(): boolean {
    return this.getUserPlan() === 'pro';
  }

  // 更新用户套餐（用于内存中的快速更新）
  updateUserPlan(plan: 'free' | 'pro'): void {
    const user = this.getCurrentUser();
    if (user) {
      const updatedUser = { ...user, plan };
      localStorage.setItem('captainUser', JSON.stringify(updatedUser));
    }
  }
}

// 创建单例实例
const authService = new AuthService();

export default authService;