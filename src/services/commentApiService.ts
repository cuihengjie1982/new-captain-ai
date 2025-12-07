import apiService from './apiService';

// 评论接口
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
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 回复接口
export interface CommentReply {
  id: string;
  commentId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likeCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 评论与回复的合并类型
export interface CommentWithReplies extends Comment {
  replies: CommentReply[];
}

// 创建评论参数
interface CreateCommentParams {
  content: string;
}

// 创建回复参数
interface CreateReplyParams {
  content: string;
}

// 评论查询参数
interface CommentsParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'popular';
}

// 点赞参数
interface LikeParams {
  likeType: 'comment' | 'reply';
  id: string;
}

// 更新评论状态参数
interface UpdateCommentStatusParams {
  status: 'active' | 'hidden' | 'deleted';
}

// 置顶评论参数
interface ToggleTopParams {
  isTop: boolean;
}

class CommentApiService {
  // 获取文章评论列表（包含回复）
  async getComments(postId: string, params: CommentsParams = {}): Promise<{
    comments: CommentWithReplies[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.get(`/comments/${postId}`, { params });

    if (response.success && response.data) {
      return {
        comments: response.data.comments || [],
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

    throw new Error(response.message || '获取评论列表失败');
  }

  // 创建评论
  async createComment(postId: string, params: CreateCommentParams): Promise<Comment> {
    const response = await apiService.post(`/comments/${postId}`, params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '发表评论失败');
  }

  // 创建回复
  async createReply(postId: string, commentId: string, params: CreateReplyParams): Promise<CommentReply> {
    const response = await apiService.post(`/comments/${postId}/${commentId}`, params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '回复评论失败');
  }

  // 点赞/取消点赞评论或回复
  async toggleLike(params: LikeParams): Promise<{
    liked: boolean;
    likeCount: number;
  }> {
    const response = await apiService.post(`/comments/${params.likeType}/${params.id}/like`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '点赞操作失败');
  }

  // 删除评论
  async deleteComment(commentId: string): Promise<void> {
    const response = await apiService.delete(`/comments/${commentId}`);

    if (!response.success) {
      throw new Error(response.message || '删除评论失败');
    }
  }

  // 删除回复
  async deleteReply(replyId: string): Promise<void> {
    const response = await apiService.delete(`/comments/replies/${replyId}`);

    if (!response.success) {
      throw new Error(response.message || '删除回复失败');
    }
  }

  // 设置/取消置顶评论（管理员功能）
  async updateCommentTop(commentId: string, params: ToggleTopParams): Promise<Comment> {
    const response = await apiService.patch(`/comments/${commentId}/top`, params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '置顶操作失败');
  }

  // 隐藏/显示评论（管理员功能）
  async updateCommentStatus(commentId: string, params: UpdateCommentStatusParams): Promise<Comment> {
    const response = await apiService.patch(`/comments/${commentId}/status`, params);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '更新评论状态失败');
  }

  // 获取用户评论列表
  async getUserComments(userId: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{
    comments: Comment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.get(`/comments/user/${userId}`, { params });

    if (response.success && response.data) {
      return {
        comments: response.data.comments || [],
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

    throw new Error(response.message || '获取用户评论失败');
  }

  // 获取评论统计信息
  async getCommentStats(postId: string): Promise<{
    totalComments: number;
    totalReplies: number;
    activeComments: number;
    hiddenComments: number;
    deletedComments: number;
  }> {
    const response = await apiService.get(`/comments/stats/${postId}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || '获取评论统计失败');
  }

  // 搜索评论
  async searchComments(postId: string, query: string, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<{
    comments: CommentWithReplies[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await apiService.get(`/comments/search/${postId}`, {
      params: {
        q: query,
        ...params,
      },
    });

    if (response.success && response.data) {
      return {
        comments: response.data.comments || [],
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

    throw new Error(response.message || '搜索评论失败');
  }
}

// 创建单例实例
const commentApiService = new CommentApiService();

export default commentApiService;
export type { Comment, CommentReply, CommentWithReplies };