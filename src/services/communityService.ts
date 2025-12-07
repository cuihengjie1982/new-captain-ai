import axios, { AxiosResponse } from 'axios';

// API基础URL - 根据环境配置
// Vite 项目使用 import.meta.env
const getApiBaseUrl = () => {
  const env = (import.meta as any).env || {};
  // 优先使用环境变量配置
  if (env.VITE_API_URL) {
    return env.VITE_API_URL;
  }
  // 兼容构建时注入的 process.env
  if (typeof process !== 'undefined' && (process.env as any)?.VITE_API_URL) {
    return (process.env as any).VITE_API_URL;
  }
  // 根据环境模式决定
  const isDev = env.MODE === 'development';
  return isDev ? 'http://localhost:3001/api' : '/api';
};

const API_BASE_URL = getApiBaseUrl();

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

  // 请求拦截器 - 添加认证token
  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('captain_ai_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并重定向到登录页
      localStorage.removeItem('captain_ai_token');
      localStorage.removeItem('captainUser');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// 类型定义
export interface CommunityCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  postCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: 'admin' | 'user';
  categoryId: string;
  categoryName: string;
  tags: string[];
  requiredPlan: 'free' | 'pro';
  viewCount: number;
  likeCount: number;
  replyCount: number;
  isPinned: boolean;
  isLocked: boolean;
  status: 'published' | 'hidden' | 'deleted';
  lastReplyAt: string | null;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

export interface CommunityReply {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: 'admin' | 'user';
  content: string;
  likeCount: number;
  isAuthor: boolean;
  status: 'published' | 'hidden' | 'deleted';
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  replies?: CommunityReply[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CommunityStats {
  totalPosts: number;
  totalUsers: number;
  totalReplies: number;
  activeUsers: number;
  topCategories: CommunityCategory[];
}

export interface DetailedCommunityStats {
  totalPosts: number;
  totalUsers: number;
  totalReplies: number;
  activeUsers: number;
  topCategories: CommunityCategory[];
  dailyStats: {
    date: string;
    posts: number;
    replies: number;
    newUsers: number;
  }[];
  monthlyStats: {
    month: string;
    posts: number;
    replies: number;
    newUsers: number;
  }[];
  popularCategories: {
    category: CommunityCategory;
    postCount: number;
    growthRate: number;
  }[];
  userEngagement: {
    avgPostsPerUser: number;
    avgRepliesPerPost: number;
    userRetentionRate: number;
    mostActiveUsers: {
      id: string;
      name: string;
      postCount: number;
      replyCount: number;
    }[];
  };
  contentMetrics: {
    avgPostLength: number;
    postsWithAttachments: number;
    mostEngagedPosts: {
      id: string;
      title: string;
      likes: number;
      replies: number;
      views: number;
    }[];
  };
}

// API响应包装器
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 请求参数接口
export interface GetPostsQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  tags?: string[];
  sortBy?: 'latest' | 'popular' | 'mostReplies' | 'mostViews';
  authorId?: string;
  isPinned?: boolean;
}

export interface GetRepliesQuery {
  page?: number;
  limit?: number;
  sortBy?: 'latest' | 'oldest' | 'popular';
  parentId?: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  categoryId: string;
  tags?: string[];
  requiredPlan?: 'free' | 'pro';
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface CreateReplyRequest {
  content: string;
  parentId?: string;
}

export interface LikeRequest {
  targetType: 'post' | 'reply';
}

// 社区API服务类
export class CommunityApiService {
  // ==================== 分类相关 ====================

  /**
   * 获取社区分类列表
   */
  static async getCategories(): Promise<CommunityCategory[]> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityCategory[]>> = await apiClient.get('/community/categories');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取分类列表失败');
    } catch (error) {
      console.error('获取社区分类失败:', error);
      throw error;
    }
  }

  /**
   * 创建新分类
   */
  static async createCategory(categoryData: CreateCategoryRequest): Promise<CommunityCategory> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityCategory>> = await apiClient.post('/community/categories', categoryData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '创建分类失败');
    } catch (error) {
      console.error('创建分类失败:', error);
      throw error;
    }
  }

  /**
   * 更新分类
   */
  static async updateCategory(id: string, updateData: Partial<CreateCategoryRequest>): Promise<CommunityCategory> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityCategory>> = await apiClient.put(`/community/categories/${id}`, updateData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '更新分类失败');
    } catch (error) {
      console.error('更新分类失败:', error);
      throw error;
    }
  }

  /**
   * 删除分类
   */
  static async deleteCategory(id: string): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse> = await apiClient.delete(`/community/categories/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.error || '删除分类失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      throw error;
    }
  }

  // ==================== 帖子相关 ====================

  /**
   * 获取帖子列表
   */
  static async getPosts(query: GetPostsQuery = {}): Promise<PaginatedResponse<CommunityPost>> {
    try {
      const params = new URLSearchParams();

      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.category) params.append('category', query.category);
      if (query.search) params.append('search', query.search);
      if (query.tags && query.tags.length > 0) params.append('tags', query.tags.join(','));
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.authorId) params.append('authorId', query.authorId);
      if (query.isPinned !== undefined) params.append('isPinned', query.isPinned.toString());

      const url = `/community/posts${params.toString() ? `?${params.toString()}` : ''}`;
      const response: AxiosResponse<ApiResponse<PaginatedResponse<CommunityPost>>> = await apiClient.get(url);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取帖子列表失败');
    } catch (error) {
      console.error('获取社区帖子失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个帖子详情
   */
  static async getPostById(id: string): Promise<CommunityPost> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityPost>> = await apiClient.get(`/community/posts/${id}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取帖子详情失败');
    } catch (error) {
      console.error('获取帖子详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建新帖子
   */
  static async createPost(postData: CreatePostRequest): Promise<CommunityPost> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityPost>> = await apiClient.post('/community/posts', postData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '创建帖子失败');
    } catch (error) {
      console.error('创建帖子失败:', error);
      throw error;
    }
  }

  /**
   * 更新帖子
   */
  static async updatePost(id: string, updateData: Partial<CreatePostRequest>): Promise<CommunityPost> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityPost>> = await apiClient.put(`/community/posts/${id}`, updateData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '更新帖子失败');
    } catch (error) {
      console.error('更新帖子失败:', error);
      throw error;
    }
  }

  /**
   * 删除帖子
   */
  static async deletePost(id: string): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse> = await apiClient.delete(`/community/posts/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.error || '删除帖子失败');
      }
    } catch (error) {
      console.error('删除帖子失败:', error);
      throw error;
    }
  }

  // ==================== 回复相关 ====================

  /**
   * 获取帖子的回复列表
   */
  static async getReplies(postId: string, query: GetRepliesQuery = {}): Promise<PaginatedResponse<CommunityReply>> {
    try {
      const params = new URLSearchParams();

      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.parentId) params.append('parentId', query.parentId);

      const url = `/community/posts/${postId}/replies${params.toString() ? `?${params.toString()}` : ''}`;
      const response: AxiosResponse<ApiResponse<PaginatedResponse<CommunityReply>>> = await apiClient.get(url);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取回复列表失败');
    } catch (error) {
      console.error('获取回复列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建新回复
   */
  static async createReply(postId: string, replyData: CreateReplyRequest): Promise<CommunityReply> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityReply>> = await apiClient.post(`/community/posts/${postId}/replies`, replyData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '创建回复失败');
    } catch (error) {
      console.error('创建回复失败:', error);
      throw error;
    }
  }

  /**
   * 更新回复
   */
  static async updateReply(id: string, updateData: Partial<CreateReplyRequest>): Promise<CommunityReply> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityReply>> = await apiClient.put(`/community/replies/${id}`, updateData);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '更新回复失败');
    } catch (error) {
      console.error('更新回复失败:', error);
      throw error;
    }
  }

  /**
   * 删除回复
   */
  static async deleteReply(id: string): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse> = await apiClient.delete(`/community/replies/${id}`);
      if (!response.data.success) {
        throw new Error(response.data.error || '删除回复失败');
      }
    } catch (error) {
      console.error('删除回复失败:', error);
      throw error;
    }
  }

  // ==================== 点赞相关 ====================

  /**
   * 切换点赞状态
   */
  static async toggleLike(targetId: string, targetType: 'post' | 'reply'): Promise<{ isLiked: boolean; likeCount: number }> {
    try {
      const response: AxiosResponse<ApiResponse<{ isLiked: boolean; likeCount: number }>> =
        await apiClient.post(`/community/likes/${targetId}`, { targetType });

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '点赞操作失败');
    } catch (error) {
      console.error('点赞操作失败:', error);
      throw error;
    }
  }

  // ==================== 统计相关 ====================

  /**
   * 获取社区统计信息
   */
  static async getStats(): Promise<CommunityStats> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityStats>> = await apiClient.get('/community/stats');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取统计信息失败');
    } catch (error) {
      console.error('获取社区统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取详细社区统计信息（管理员专用）
   */
  static async getDetailedStats(): Promise<DetailedCommunityStats> {
    try {
      const response: AxiosResponse<ApiResponse<DetailedCommunityStats>> = await apiClient.get('/community/admin/stats');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取详细统计信息失败');
    } catch (error) {
      console.error('获取详细社区统计失败:', error);
      throw error;
    }
  }

  // ==================== 管理员功能 ====================

  /**
   * 获取所有帖子（包括已删除和隐藏的）
   */
  static async getAllPosts(query: GetPostsQuery = {}): Promise<PaginatedResponse<CommunityPost>> {
    try {
      const params = new URLSearchParams();

      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.category) params.append('category', query.category);
      if (query.search) params.append('search', query.search);
      if (query.tags && query.tags.length > 0) params.append('tags', query.tags.join(','));
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.authorId) params.append('authorId', query.authorId);

      const url = `/community/admin/posts${params.toString() ? `?${params.toString()}` : ''}`;
      const response: AxiosResponse<ApiResponse<PaginatedResponse<CommunityPost>>> = await apiClient.get(url);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取帖子列表失败');
    } catch (error) {
      console.error('获取所有帖子失败:', error);
      throw error;
    }
  }

  /**
   * 审核帖子（改变状态）
   */
  static async moderatePost(id: string, status: 'published' | 'hidden' | 'deleted', reason?: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await apiClient.put(`/community/admin/posts/${id}`, {
        status,
        moderationReason: reason
      });

      if (!response.data.success) {
        throw new Error(response.data.error || '审核帖子失败');
      }

      return response.data;
    } catch (error) {
      console.error('审核帖子失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门帖子
   */
  static async getTrendingPosts(limit: number = 10): Promise<CommunityPost[]> {
    try {
      const response: AxiosResponse<ApiResponse<CommunityPost[]>> = await apiClient.get(`/community/admin/posts/trending?limit=${limit}`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || '获取热门帖子失败');
    } catch (error) {
      console.error('获取热门帖子失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作帖子
   */
  static async batchUpdatePosts(ids: string[], action: 'publish' | 'hide' | 'delete', reason?: string): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await apiClient.post('/community/admin/posts/batch', {
        ids,
        action,
        reason
      });

      if (!response.data.success) {
        throw new Error(response.data.error || '批量操作失败');
      }

      return response.data;
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  }
}

// 导出默认实例
export default CommunityApiService;