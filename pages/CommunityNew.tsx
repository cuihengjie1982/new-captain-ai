import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  X,
  Plus,
  Tag,
  FileText,
  Eye,
  Save,
  AlertCircle
} from 'lucide-react';
import { User as UserType } from '../types';
import CommunityApiService, { CreatePostRequest } from '../src/services/communityService';
import CommunityRichTextEditor from '../components/CommunityRichTextEditor';

const CommunityNew: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('captainUser');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(storedUser));

    // 加载分类数据
    loadCategories();
  }, [navigate]);

  // 加载分类数据
  const loadCategories = async () => {
    try {
      setIsLoading(true);

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

      // 如果有分类，默认选择第一个
      if (mockCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(mockCategories[0].id);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      setError('加载分类失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim() || !selectedCategory) {
      alert('请填写完整的帖子信息');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 创建新帖子对象
      const newPost = {
        id: Date.now().toString(),
        title: title.trim(),
        content: content.trim(),
        authorId: user?.id || '1',
        authorName: user?.name || '匿名用户',
        authorAvatar: user?.avatar || null,
        authorRole: user?.role || 'user',
        categoryId: selectedCategory,
        categoryName: categories.find(cat => cat.id === selectedCategory)?.name || '未分类',
        tags: tags.length > 0 ? tags : [],
        requiredPlan: 'free' as const,
        viewCount: 0,
        likeCount: 0,
        replyCount: 0,
        isPinned: false,
        isLocked: false,
        status: 'published' as const,
        lastReplyAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 获取现有的帖子或初始化空数组
      const existingPosts = JSON.parse(localStorage.getItem('communityPosts') || '[]');
      existingPosts.unshift(newPost);
      localStorage.setItem('communityPosts', JSON.stringify(existingPosts));

      console.log('帖子创建成功:', newPost);
      alert('帖子发布成功！');
      navigate('/community');

    } catch (error) {
      console.error('发布帖子失败:', error);
      setError('发布失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/community"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            返回社区
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">发布新帖</h1>
            <p className="text-gray-600">分享你的想法和经验</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showPreview
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye size={16} className="inline mr-2" />
            {showPreview ? '编辑' : '预览'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {showPreview ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold mb-4">{title || '帖子标题'}</h2>
              <div className="text-gray-700 whitespace-pre-wrap">
                {content || '帖子内容...'}
              </div>
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  帖子标题 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入一个吸引人的标题..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={100}
                />
                <div className="mt-1 text-xs text-gray-500">
                  {title.length}/100
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择分类 *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        selectedCategory === category.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <FileText size={16} className="text-white" />
                        </div>
                        <span className="font-medium text-sm">{category.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{category.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  帖子内容 *
                </label>
                <CommunityRichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="分享你的想法、经验或问题..."
                  height={400}
                />
                <div className="mt-1 text-xs text-gray-500">
                  支持Markdown格式、文件上传、图片插入等功能，{content.length} 字符
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-800"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleAddTag}
                  placeholder="输入标签后按回车添加..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-4">
                <Link
                  to="/community"
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !content.trim() || !selectedCategory}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      发布中...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      发布帖子
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Author Info */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">发布者信息</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-600">
                  {user.role === 'admin' ? '管理员' : '社区成员'}
                </p>
              </div>
            </div>
          </div>

          {/* Posting Tips */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">发帖指南</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>标题要简洁明了，突出重点</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>内容要详细具体，便于他人理解</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>选择合适的分类和标签</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>保持友好和尊重的交流态度</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityNew;