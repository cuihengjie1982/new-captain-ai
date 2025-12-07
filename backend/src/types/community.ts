import { User } from './index';

// 社区分类
export interface CommunityCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string; // Lucide icon name
  color: string;
  postCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// 社区帖子
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

  // 关联数据（非数据库字段）
  author?: User;
  category?: CommunityCategory;
  isLiked?: boolean; // 当前用户是否点赞
  replies?: CommunityReply[]; // 帖子的回复（可选，用于详情页）
}

// 社区回复
export interface CommunityReply {
  id: string;
  postId: string;
  parentId: string | null; // 支持嵌套回复
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: 'admin' | 'user';
  content: string;
  likeCount: number;
  isAuthor: boolean; // 是否是楼主的回复
  status: 'published' | 'hidden' | 'deleted';
  createdAt: string;
  updatedAt: string;

  // 关联数据（非数据库字段）
  author?: User;
  post?: CommunityPost;
  parent?: CommunityReply; // 父回复
  replies?: CommunityReply[]; // 子回复
  isLiked?: boolean; // 当前用户是否点赞
}

// 社区点赞记录
export interface CommunityLike {
  id: string;
  userId: string;
  targetId: string; // 帖子或回复的ID
  targetType: 'post' | 'reply';
  createdAt: string;

  // 关联数据（非数据库字段）
  user?: User;
}

// 社区阅读记录
export interface CommunityRead {
  id: string;
  userId: string;
  postId: string;
  readAt: string;

  // 关联数据（非数据库字段）
  user?: User;
  post?: CommunityPost;
}

// 社区统计数据
export interface CommunityStats {
  totalPosts: number;
  totalUsers: number;
  totalReplies: number;
  activeUsers: number;
  topCategories: CommunityCategory[];
}

// API请求/响应类型
export interface CreatePostRequest {
  title: string;
  content: string;
  categoryId: string;
  tags?: string[];
  requiredPlan?: 'free' | 'pro';
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  requiredPlan?: 'free' | 'pro';
  status?: 'published' | 'hidden';
}

export interface CreateReplyRequest {
  content: string;
  parentId?: string; // 如果是回复其他回复
}

export interface UpdateReplyRequest {
  content?: string;
  status?: 'published' | 'hidden';
}

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
  parentId?: string; // 获取特定回复的子回复
}

// 响应包装器
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}