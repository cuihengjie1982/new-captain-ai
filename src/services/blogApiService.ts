import apiService from './apiService';
import { BlogPost } from '../types';

// 博客文章参数
interface CreateBlogPostParams {
  title: string;
  summary: string;
  content: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published';
  requiredPlan?: 'free' | 'pro';
}

// 更新博客文章参数
interface UpdateBlogPostParams {
  title?: string;
  summary?: string;
  content?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  requiredPlan?: 'free' | 'pro';
}

// 博客列表查询参数
interface BlogListParams {
  page?: number;
  limit?: number;
  category?: string;
  author?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

// 文章点赞参数
interface LikePostParams {
  postId: string;
}

class BlogApiService {
  // 获取博客文章列表
  async getBlogPosts(params: BlogListParams = {}): Promise<{
    data: BlogPost[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.get('/blog/posts', { params });

    if (response.success && response.data) {
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    throw new Error(response.message || '获取博客文章列表失败');
  }

  // 获取文章详情
  async getBlogPostById(id: string): Promise<BlogPost> {
    const response = await apiService.get(`/blog/posts/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取文章详情失败');
  }

  // 创建博客文章
  async createBlogPost(params: CreateBlogPostParams): Promise<BlogPost> {
    const response = await apiService.post<BlogPost>('/blog/posts', params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '创建文章失败');
  }

  // 更新博客文章
  async updateBlogPost(id: string, params: UpdateBlogPostParams): Promise<BlogPost> {
    const response = await apiService.put<BlogPost>(`/blog/posts/${id}`, params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '更新文章失败');
  }

  // 删除博客文章
  async deleteBlogPost(id: string): Promise<void> {
    const response = await apiService.delete(`/blog/posts/${id}`);

    if (!response.success) {
      throw new Error(response.message || '删除文章失败');
    }
  }

  // 发布/取消发布文章
  async publishBlogPost(id: string, publish: boolean): Promise<BlogPost> {
    const response = await apiService.patch(`/blog/posts/${id}/publish`, { publish });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || publish ? '发布文章失败' : '取消发布失败');
  }

  // 文章点赞/取消点赞
  async togglePostLike(params: LikePostParams): Promise<{
    liked: boolean;
    likeCount: number;
  }> {
    const response = await apiService.post(`/blog/posts/${params.postId}/like`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '点赞操作失败');
  }

  // 获取文章分类列表
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    const response = await apiService.get('/blog/categories');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取分类列表失败');
  }

  // 获取热门文章
  async getTrendingPosts(limit: number = 10, days: number = 7): Promise<BlogPost[]> {
    const response = await apiService.get('/blog/trending', {
      params: { limit, days },
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取热门文章失败');
  }

  // 获取用户文章列表
  async getUserPosts(params: BlogListParams & { status?: string } = {}): Promise<{
    data: BlogPost[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.get('/blog/my-posts', { params });

    if (response.success && response.data) {
      return {
        data: response.data.data || [],
        sort: response.data.sort || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    throw new Error(response.message || '获取用户文章失败');
  }

  // 搜索文章
  async searchPosts(query: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{
    data: BlogPost[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.get('/blog/search', {
      params: {
        q: query,
        ...params,
      },
    });

    if (response.success && response.data) {
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    throw new Error(response.message || '搜索文章失败');
  }

  // 获取文章统计信息
  async getPostStats(postId: string): Promise<{
    totalComments: number;
    totalLikes: number;
    totalViews: number;
    shareCount: number;
  }> {
    const response = await apiService.get(`/blog/posts/${postId}/stats`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取文章统计失败');
  }
}

// 创建单例实例
const blogApiService = new BlogApiService();

export default blogApiService;