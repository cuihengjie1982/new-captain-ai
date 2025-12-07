// 用户相关类型
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  plan: 'free' | 'pro';
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UserUpdate {
  name?: string;
  phone?: string;
  avatar?: string;
  plan?: 'free' | 'pro';
}

// 博客相关类型
export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  content: string;
  thumbnail?: string;
  author: string;
  authorId: string;
  requiredPlan?: 'free' | 'pro';
  category?: string;
  tags?: string[];
  viewCount: number;
  likeCount: number;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPostInput {
  title: string;
  summary: string;
  content: string;
  thumbnail?: string;
  requiredPlan?: 'free' | 'pro';
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published';
}

export interface BlogPostUpdate {
  title?: string;
  summary?: string;
  content?: string;
  thumbnail?: string;
  requiredPlan?: 'free' | 'pro';
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

// 评论相关类型
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likeCount: number;
  replyCount: number;
  isTop: boolean;
  status: 'active' | 'hidden' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentReply {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likeCount: number;
  status: 'active' | 'hidden' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentInput {
  content: string;
}

export interface CommentReplyInput {
  content: string;
}

// 用户笔记类型
export interface Note {
  id: string;
  userId: string;
  lessonTitle?: string;
  content: string;
  quote?: string;
  sourceType: 'article' | 'video' | 'manual';
  sourceId?: string;
  timestampDisplay?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteInput {
  lessonTitle?: string;
  content: string;
  quote?: string;
  sourceType?: 'article' | 'video' | 'manual';
  sourceId?: string;
  timestampDisplay?: string;
}

// 用户历史类型
export interface UserHistory {
  id: string;
  userId: string;
  actionType: 'video_watch' | 'article_read' | 'note_create' | 'comment_post';
  itemId: string;
  itemType: 'video' | 'article' | 'note' | 'comment';
  duration?: number; // 视频观看时长（秒）
  progress?: number; // 阅读进度（百分比）
  metadata?: Record<string, any>;
  createdAt: Date;
}

// AI聊天相关类型
export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  model: string;
  context?: string;
  messageCount: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ChatInput {
  message: string;
  sessionId?: string;
  context?: string;
}

// 文件上传类型
export interface UploadedFile {
  id: string;
  userId: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  type: 'avatar' | 'blog' | 'video' | 'document';
  createdAt: Date;
}

// 邮箱验证码类型
export interface EmailVerification {
  id: string;
  email: string;
  code: string;
  type: 'register' | 'login' | 'reset';
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

// JWT载荷类型
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  plan: string;
  iat: number;
  exp: number;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
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

// 分析数据类型
export interface UserAnalytics {
  userId: string;
  totalWatchTime: number;
  totalReadArticles: number;
  totalNotes: number;
  totalComments: number;
  learningStreak: number;
  lastActiveDate: Date;
  favoriteCategories: string[];
  weeklyProgress: {
    week: string;
    watchTime: number;
    articlesRead: number;
    notesCreated: number;
  }[];
}

export interface SystemAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalArticles: number;
  totalVideos: number;
  totalComments: number;
  userGrowth: {
    date: string;
    newUsers: number;
    activeUsers: number;
  }[];
  contentStats: {
    totalViews: number;
    totalLikes: number;
    topArticles: Array<{
      id: string;
      title: string;
      views: number;
      likes: number;
    }>;
  };
}

// 错误类型
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Socket.IO事件类型
export interface SocketEvents {
  'user-connected': (userId: string) => void;
  'user-disconnected': (userId: string) => void;
  'comment-added': (comment: Comment) => void;
  'comment-liked': (commentId: string, likeCount: number) => void;
  'new-message': (message: ChatMessage) => void;
  'typing': (userId: string, sessionId: string) => void;
  'stop-typing': (userId: string, sessionId: string) => void;
}