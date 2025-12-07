import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Heart,
  MessageCircle,
  Eye,
  Clock,
  Tag,
  AlertCircle,
  Loader2,
  Image,
  Video,
  FileAudio,
  FileText,
  Send,
  Pin,
  Star,
  User,
  Calendar
} from 'lucide-react';
import { AppRoute, User as UserType } from '../types';
import CommunityApiService, {
  CommunityPost as ApiCommunityPost,
  CommunityReply as ApiCommunityReply,
  GetRepliesQuery
} from '../src/services/communityService';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  attachments?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    name: string;
    size?: number;
  }[];
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'user';
  };
  category: string;
  tags: string[];
  createdAt: string;
  views: number;
  likes: number;
  isLiked: boolean;
  isPinned: boolean;
  replyCount: number;
  isFeatured?: boolean;
}

interface CommunityReply {
  id: string;
  postId: string;
  parentId: string | null;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'user';
  };
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: string;
  replies?: CommunityReply[];
}

const CommunityPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // 转换API数据格式
  const convertApiPost = (apiPost: ApiCommunityPost): CommunityPost => ({
    id: apiPost.id,
    title: apiPost.title,
    content: apiPost.content,
    attachments: [], // 后续需要从API获取附件信息
    author: {
      id: apiPost.authorId,
      name: apiPost.authorName,
      avatar: apiPost.authorAvatar || undefined,
      role: apiPost.authorRole
    },
    category: apiPost.categoryName,
    tags: apiPost.tags,
    createdAt: apiPost.createdAt,
    views: apiPost.viewCount,
    likes: apiPost.likeCount,
    isLiked: apiPost.isLiked || false,
    isPinned: apiPost.isPinned,
    replyCount: apiPost.replyCount,
    isFeatured: apiPost.isPinned
  });

  const convertApiReply = (apiReply: ApiCommunityReply): CommunityReply => ({
    id: apiReply.id,
    postId: apiReply.postId,
    parentId: apiReply.parentId,
    author: {
      id: apiReply.authorId,
      name: apiReply.authorName,
      avatar: apiReply.authorAvatar || undefined,
      role: apiReply.authorRole
    },
    content: apiReply.content,
    likes: apiReply.likeCount,
    isLiked: apiReply.isLiked || false,
    createdAt: apiReply.createdAt,
    replies: []
  });

  // 加载帖子详情
  const loadPost = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiPost = await CommunityApiService.getPostById(id);
      const convertedPost = convertApiPost(apiPost);
      setPost(convertedPost);
    } catch (error) {
      console.error('加载帖子详情失败:', error);
      setError('加载帖子失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // 加载回复列表
  const loadReplies = useCallback(async (page = 1) => {
    if (!id) return;

    try {
      const query: GetRepliesQuery = {
        page,
        limit: pagination.limit,
        sortBy: 'latest'
      };

      const response = await CommunityApiService.getReplies(id, query);
      const convertedReplies = response.data.map(convertApiReply);

      setReplies(page === 1 ? convertedReplies : [...replies, ...convertedReplies]);
      setPagination(response.pagination);
    } catch (error) {
      console.error('加载回复失败:', error);
    }
  }, [id, pagination.limit, replies]);

  // 处理点赞帖子
  const handleLikePost = async () => {
    if (!user || !post) return;

    try {
      await CommunityApiService.toggleLike(post.id, 'post');

      // 更新本地状态
      setPost({
        ...post,
        isLiked: !post.isLiked,
        likes: post.isLiked ? post.likes - 1 : post.likes + 1
      });
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  // 处理点赞回复
  const handleLikeReply = async (replyId: string) => {
    if (!user) return;

    try {
      await CommunityApiService.toggleLike(replyId, 'reply');

      // 更新本地状态
      const updateRepliesRecursive = (replies: CommunityReply[]): CommunityReply[] => {
        return replies.map(reply => {
          if (reply.id === replyId) {
            return {
              ...reply,
              isLiked: !reply.isLiked,
              likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
            };
          }
          if (reply.replies) {
            return {
              ...reply,
              replies: updateRepliesRecursive(reply.replies)
            };
          }
          return reply;
        });
      };

      setReplies(updateRepliesRecursive(replies));
    } catch (error) {
      console.error('点赞回复失败:', error);
    }
  };

  // 提交回复
  const handleSubmitReply = async () => {
    if (!user || !replyContent.trim() || !post) {
      alert('请输入回复内容');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const replyData = {
        content: replyContent,
        parentId: replyTo
      };

      await CommunityApiService.createReply(post.id, replyData);

      // 重置表单
      setReplyContent('');
      setReplyTo(null);

      // 重新加载回复
      loadReplies(1);
    } catch (error) {
      console.error('回复失败:', error);
      alert('回复失败，请重试');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 初始化数据
  useEffect(() => {
    const storedUser = localStorage.getItem('captainUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    loadPost();
  }, [loadPost]);

  useEffect(() => {
    if (post) {
      loadReplies();
    }
  }, [post, loadReplies]);

  // 递归渲染回复
  const renderReply = (reply: CommunityReply, depth: number = 0) => (
    <div key={reply.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* 回复头部 */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            {reply.author.avatar ? (
              <img src={reply.author.avatar} alt={reply.author.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-gray-600 text-sm font-medium">
                {reply.author.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 text-sm">{reply.author.name}</h4>
              {reply.author.role === 'admin' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  管理员
                </span>
              )}
              <span className="text-xs text-gray-500">{formatDate(reply.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 回复内容 */}
        <div className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">
          {reply.content}
        </div>

        {/* 互动栏 */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <button
            className={`flex items-center gap-1 ${user ? 'hover:text-red-500' : 'text-gray-400'}`}
            onClick={() => handleLikeReply(reply.id)}
            disabled={!user}
          >
            <Heart size={14} className={reply.isLiked ? 'text-red-500 fill-current' : ''} />
            <span>{reply.likes}</span>
          </button>
          <button
            className={`flex items-center gap-1 ${user ? 'hover:text-blue-500' : 'text-gray-400'}`}
            onClick={() => setReplyTo(reply.id)}
            disabled={!user}
          >
            <MessageCircle size={14} />
            回复
          </button>
        </div>

        {/* 回复输入框 */}
        {replyTo === reply.id && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <textarea
              placeholder={`回复 ${reply.author.name}...`}
              className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setReplyTo(null);
                  setReplyContent('');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmittingReply}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSubmittingReply ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        )}

        {/* 子回复 */}
        {reply.replies && reply.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {reply.replies.map(childReply => renderReply(childReply, depth + 1))}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <div>
              <h3 className="font-medium text-red-900">加载失败</h3>
              <p className="text-red-700">{error || '帖子不存在'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/community')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        返回知识社区
      </button>

      {/* 帖子详情 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {/* 帖子头部 */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              {post.author.avatar ? (
                <img src={post.author.avatar} alt={post.author.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-gray-600 font-medium">
                  {post.author.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{post.author.name}</h2>
                {post.author.role === 'admin' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                    管理员
                  </span>
                )}
                {post.isFeatured && (
                  <Star size={16} className="text-yellow-500 fill-current" />
                )}
                {post.isPinned && (
                  <Pin size={16} className="text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>{formatDate(post.createdAt)}</span>
                <span>•</span>
                <span>{post.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 帖子标题和内容 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

        <div className="text-gray-700 mb-6 whitespace-pre-wrap">
          {post.content}
        </div>

        {/* 附件显示 */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">附件</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {post.attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-gray-500">
                    {attachment.type === 'image' && <Image size={20} />}
                    {attachment.type === 'video' && <Video size={20} />}
                    {attachment.type === 'audio' && <FileAudio size={20} />}
                    {attachment.type === 'document' && <FileText size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                    {attachment.size && (
                      <p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 标签 */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 互动栏 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Eye size={16} />
              <span>{post.views} 浏览</span>
            </div>
            <button
              className={`flex items-center gap-1 ${user ? 'hover:text-red-500' : 'text-gray-400'}`}
              onClick={handleLikePost}
              disabled={!user}
            >
              <Heart size={16} className={post.isLiked ? 'text-red-500 fill-current' : ''} />
              <span>{post.likes} 赞</span>
            </button>
            <div className="flex items-center gap-1">
              <MessageCircle size={16} />
              <span>{post.replyCount} 回复</span>
            </div>
          </div>
        </div>
      </div>

      {/* 回复输入框 */}
      {user && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">发表回复</h3>
          <textarea
            placeholder="分享您的观点..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmitReply}
              disabled={!replyContent.trim() || isSubmittingReply}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmittingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              发布回复
            </button>
          </div>
        </div>
      )}

      {/* 回复列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            全部回复 ({pagination.total})
          </h3>
        </div>

        {replies.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <MessageCircle className="mx-auto text-gray-400 mb-3" size={32} />
            <p className="text-gray-600">
              {user ? '成为第一个回复的人吧！' : '请先登录后再查看回复'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map(reply => renderReply(reply))}
          </div>
        )}

        {/* 加载更多 */}
        {replies.length > 0 && pagination.hasNext && (
          <div className="text-center mt-6">
            <button
              onClick={() => loadReplies(pagination.page + 1)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              加载更多回复
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPost;