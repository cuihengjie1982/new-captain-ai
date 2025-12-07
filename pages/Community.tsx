import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  TrendingUp,
  Plus,
  Search,
  Pin,
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
  X,
  Mic,
  Camera,
  Calendar,
  Star,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { AppRoute, User as UserType } from '../types';
import CommunityApiService, {
  CommunityPost as ApiCommunityPost,
  CommunityCategory,
  CommunityStats,
  GetPostsQuery
} from '../src/services/communityService';

// 转换API数据到组件使用的数据格式
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

const Community: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [postFilter, setPostFilter] = useState<'latest' | 'featured' | 'all'>('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostAttachments, setNewPostAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // 转换API数据到组件格式
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
    isFeatured: apiPost.isPinned // 简化处理，将置顶帖子作为精华
  });

  // 加载帖子列表
  const loadPosts = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      // 从localStorage获取帖子
      const storedPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');

      // 应用筛选条件
      let filteredPosts = storedPosts;

      if (searchQuery) {
        filteredPosts = filteredPosts.filter((post: any) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (selectedCategory !== 'all') {
        filteredPosts = filteredPosts.filter((post: any) => post.categoryId === selectedCategory);
      }

      if (postFilter === 'featured') {
        // 按点赞数排序
        filteredPosts.sort((a: any, b: any) => b.likeCount - a.likeCount);
      } else {
        // 按创建时间排序
        filteredPosts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const convertedPosts = filteredPosts.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: {
          id: post.authorId,
          name: post.authorName,
          avatar: post.authorAvatar || null,
          role: post.authorRole
        },
        category: {
          id: post.categoryId,
          name: post.categoryName
        },
        tags: post.tags || [],
        stats: {
          views: post.viewCount,
          likes: post.likeCount,
          replies: post.replyCount
        },
        isPinned: post.isPinned,
        isLocked: post.isLocked,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }));

      const startIndex = (page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedPosts = convertedPosts.slice(startIndex, endIndex);

      setPosts(page === 1 ? paginatedPosts : [...posts, ...paginatedPosts]);
      setPagination({
        page,
        limit: pagination.limit,
        total: convertedPosts.length,
        totalPages: Math.ceil(convertedPosts.length / pagination.limit),
        hasNext: endIndex < convertedPosts.length,
        hasPrev: page > 1
      });
    } catch (error) {
      console.error('加载帖子失败:', error);
      setError('加载帖子失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, postFilter, pagination.limit, posts]);

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    try {
      // 使用模拟分类数据
      const mockCategories = [
        {
          id: 'tech',
          name: '技术讨论',
          description: '技术相关话题和讨论',
          icon: '💻',
          color: '#3B82F6',
          postCount: 0,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'experience',
          name: '经验分享',
          description: '用户经验和最佳实践分享',
          icon: '💡',
          color: '#10B981',
          postCount: 0,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'question',
          name: '问题求助',
          description: '技术问题和疑问求助',
          icon: '❓',
          color: '#F59E0B',
          postCount: 0,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'general',
          name: '综合讨论',
          description: '其他综合话题讨论',
          icon: '💬',
          color: '#8B5CF6',
          postCount: 0,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      setCategories(mockCategories);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }, []);

  // 加载统计信息
  const loadStats = useCallback(async () => {
    try {
      const statsData = await CommunityApiService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    const storedUser = localStorage.getItem('captainUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    loadCategories();
    loadStats();
    loadPosts();
  }, []);

  // 搜索和分类变化时重新加载
  useEffect(() => {
    loadPosts(1);
  }, [searchQuery, selectedCategory, postFilter]);

  // 处理点赞
  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      await CommunityApiService.toggleLike(postId, 'post');

      // 更新本地状态
      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p
      ));
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewPostAttachments([...newPostAttachments, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除附件
  const removeAttachment = (index: number) => {
    setNewPostAttachments(newPostAttachments.filter((_, i) => i !== index));
  };

  // 获取文件图标
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image size={16} />;
    if (file.type.startsWith('video/')) return <Video size={16} />;
    if (file.type.startsWith('audio/')) return <FileAudio size={16} />;
    return <FileText size={16} />;
  };

  // 提交新帖子
  const handleSubmitPost = async () => {
    if (!user || !newPostContent.trim()) {
      alert('请输入帖子内容');
      return;
    }

    setIsSubmitting(true);
    try {
      // 这里需要实现文件上传逻辑
      const postData = {
        title: newPostContent.split('\n')[0].substring(0, 50) || '新帖子',
        content: newPostContent,
        categoryId: categories[0]?.id || '1',
        tags: []
      };

      await CommunityApiService.createPost(postData);

      // 重置表单
      setNewPostContent('');
      setNewPostAttachments([]);
      setShowNewPostModal(false);

      // 重新加载帖子
      loadPosts(1);
    } catch (error) {
      console.error('发布帖子失败:', error);
      alert('发布失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 更新搜索（防抖）
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 格式化时间
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return '刚刚';
    if (diffInHours < 24) return `${diffInHours}小时前`;
    if (diffInHours < 48) return '昨天';
    return `${Math.floor(diffInHours / 24)}天前`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部统计区域 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">知识社区</h1>
            <p className="text-gray-600">与行业专家交流经验，分享最佳实践</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {viewMode === 'list' ? <Grid size={20} /> : <List size={20} />}
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">总帖子</p>
                <p className="text-xl font-semibold">{stats?.totalPosts || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">用户数</p>
                <p className="text-xl font-semibold">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageCircle className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">总回复</p>
                <p className="text-xl font-semibold">{stats?.totalReplies || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">活跃用户</p>
                <p className="text-xl font-semibold">{stats?.activeUsers || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 发布帖子区域 */}
      {user && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <textarea
                placeholder="分享您的想法..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />

              {/* 附件预览 */}
              {newPostAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {newPostAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                      {getFileIcon(file)}
                      <span className="text-sm text-gray-700 truncate max-w-32">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Image size={16} />
                    图片
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Video size={16} />
                    视频
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileAudio size={16} />
                    音频
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileText size={16} />
                    文档
                  </button>
                </div>
                <button
                  onClick={handleSubmitPost}
                  disabled={!newPostContent.trim() || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  发布
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 筛选和搜索区域 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 筛选标签 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPostFilter('latest')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                postFilter === 'latest'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setPostFilter('featured')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                postFilter === 'featured'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Star size={14} className="inline mr-1" />
              精华
            </button>
            <button
              onClick={() => setPostFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                postFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
          </div>

          {/* 分类筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              全部分类
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索帖子..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 错误状态 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <div>
              <h3 className="font-medium text-red-900">加载失败</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 帖子列表 */}
      {isLoading && posts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
          {posts.map(post => (
            <div
              key={post.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = `/community/post/${post.id}`}
            >
              <div className="p-6">
                {/* 帖子头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-gray-600 font-medium">
                          {post.author.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{post.author.name}</h4>
                        {post.author.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                            管理员
                          </span>
                        )}
                        {post.isFeatured && (
                          <Star size={14} className="text-yellow-500 fill-current" />
                        )}
                        {post.isPinned && (
                          <Pin size={14} className="text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatTimeAgo(post.createdAt)}</span>
                        <span>•</span>
                        <span>{post.category}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 帖子内容 */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-700 line-clamp-3">
                    {post.content}
                  </p>

                  {/* 附件显示 */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.attachments.slice(0, 3).map((attachment, index) => (
                        <div key={index} className="flex items-center gap-1 text-sm text-gray-500">
                          {attachment.type === 'image' && <Image size={14} />}
                          {attachment.type === 'video' && <Video size={14} />}
                          {attachment.type === 'audio' && <FileAudio size={14} />}
                          {attachment.type === 'document' && <FileText size={14} />}
                          <span className="truncate max-w-24">{attachment.name}</span>
                        </div>
                      ))}
                      {post.attachments.length > 3 && (
                        <span className="text-sm text-gray-500">+{post.attachments.length - 3} 更多</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 标签 */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* 互动栏 */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      <span>{post.views}</span>
                    </div>
                    <button
                      className={`flex items-center gap-1 ${user ? 'hover:text-red-500' : 'text-gray-400'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (user) handleLike(post.id);
                      }}
                      disabled={!user}
                    >
                      <Heart size={14} className={post.isLiked ? 'text-red-500 fill-current' : ''} />
                      <span>{post.likes}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={14} />
                      <span>{post.replyCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && posts.length === 0 && !error && (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无帖子</h3>
          <p className="text-gray-600">
            {searchQuery || selectedCategory !== 'all' || postFilter !== 'latest'
              ? '没有找到匹配的帖子，试试其他搜索条件'
              : user
              ? '成为第一个发布帖子的人吧！'
              : '请先登录后再查看内容'
            }
          </p>
        </div>
      )}

      {/* 加载更多 */}
      {!isLoading && posts.length > 0 && pagination.hasNext && (
        <div className="text-center mt-8">
          <button
            onClick={() => loadPosts(pagination.page + 1)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Community;