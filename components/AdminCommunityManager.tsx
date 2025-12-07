import React, { useState, useEffect } from 'react';
import {
  MessageSquare, TrendingUp, Users, Eye, Heart, MessageCircle, Clock,
  Search, Filter, Edit, Trash2, EyeOff, CheckCircle, AlertTriangle,
  BarChart2, PieChart, Activity, Star, ArrowUp, ArrowDown, Plus,
  Save, X, Folder, Tag, Palette, BookOpen
} from 'lucide-react';

interface AdminCommunityManagerProps {
  // 可以传递props来与父组件通信
}

const AdminCommunityManager: React.FC<AdminCommunityManagerProps> = () => {
  const [activeSection, setActiveSection] = useState<'posts' | 'categories' | 'stats'>('posts');
  const [isLoading, setIsLoading] = useState(false);

  // 分类管理相关状态
  const [categories, setCategories] = useState([
    { id: '1', name: '技术讨论', description: '技术相关讨论', postCount: 45 },
    { id: '2', name: '经验分享', description: '用户经验分享', postCount: 32 }
  ]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '💻',
    color: '#3B82F6'
  });

  // 帖子管理相关状态
  const [posts, setPosts] = useState([
    {
      id: '1',
      title: '如何提高工作效率',
      authorName: '张三',
      categoryName: '经验分享',
      viewCount: 120,
      likeCount: 15,
      replyCount: 8,
      status: 'published',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      title: 'React最佳实践',
      authorName: '李四',
      categoryName: '技术讨论',
      viewCount: 89,
      likeCount: 12,
      replyCount: 5,
      status: 'published',
      createdAt: '2024-01-14'
    }
  ]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    categoryName: '',
    status: 'published'
  });

  // 模拟数据
  const mockStats = {
    totalPosts: 156,
    totalUsers: 89,
    totalReplies: 342,
    activeUsers: 23
  };

  // 分类管理事件处理函数
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      icon: '💻',
      color: '#3B82F6'
    });
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description,
      icon: category.icon || '💻',
      color: category.color || '#3B82F6'
    });
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('确定要删除这个分类吗？该分类下的所有帖子将被移动到未分类。')) {
      setCategories(categories.filter(cat => cat.id !== categoryId));
      alert('分类删除成功！');
    }
  };

  const handleCategoryFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryForm.name.trim()) {
      alert('请输入分类名称');
      return;
    }

    if (editingCategory) {
      // 编辑现有分类
      setCategories(categories.map(cat =>
        cat.id === editingCategory.id
          ? { ...cat, ...categoryForm }
          : cat
      ));
      alert('分类更新成功！');
    } else {
      // 添加新分类
      const newCategory = {
        id: Date.now().toString(),
        name: categoryForm.name,
        description: categoryForm.description,
        icon: categoryForm.icon,
        color: categoryForm.color,
        postCount: 0
      };
      setCategories([...categories, newCategory]);
      alert('分类添加成功！');
    }

    setShowCategoryForm(false);
    setCategoryForm({
      name: '',
      description: '',
      icon: '💻',
      color: '#3B82F6'
    });
  };

  const handleCategoryFormCancel = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      icon: '💻',
      color: '#3B82F6'
    });
  };

  // 图标选择
  const iconOptions = ['💻', '💡', '❓', '💬', '📚', '🎯', '🚀', '📱', '🔧', '🎨', '📊', '🔒'];

  // 颜色选择
  const colorOptions = [
    { name: '蓝色', value: '#3B82F6' },
    { name: '绿色', value: '#10B981' },
    { name: '黄色', value: '#F59E0B' },
    { name: '紫色', value: '#8B5CF6' },
    { name: '红色', value: '#EF4444' },
    { name: '粉色', value: '#EC4899' },
    { name: '青色', value: '#06B6D4' },
    { name: '灰色', value: '#6B7280' }
  ];

  // 帖子管理事件处理函数
  const handleEditPost = (post: any) => {
    setEditingPost(post);
    setPostForm({
      title: post.title,
      content: post.content || '',
      categoryName: post.categoryName,
      status: post.status
    });
    setShowPostForm(true);
  };

  const handleDeletePost = (postId: string) => {
    if (window.confirm('确定要删除这个帖子吗？此操作不可撤销。')) {
      setPosts(posts.filter(post => post.id !== postId));
      alert('帖子删除成功！');
    }
  };

  const handlePostFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!postForm.title.trim()) {
      alert('请输入帖子标题');
      return;
    }

    if (editingPost) {
      // 编辑现有帖子
      setPosts(posts.map(post =>
        post.id === editingPost.id
          ? { ...post, ...postForm, updatedAt: new Date().toISOString() }
          : post
      ));
      alert('帖子更新成功！');
    }

    setShowPostForm(false);
    setEditingPost(null);
    setPostForm({
      title: '',
      content: '',
      categoryName: '',
      status: 'published'
    });
  };

  const handlePostFormCancel = () => {
    setShowPostForm(false);
    setEditingPost(null);
    setPostForm({
      title: '',
      content: '',
      categoryName: '',
      status: 'published'
    });
  };

  const handleChangePostStatus = (postId: string, newStatus: string) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, status: newStatus, updatedAt: new Date().toISOString() }
        : post
    ));

    const statusText = newStatus === 'published' ? '发布' :
                      newStatus === 'hidden' ? '隐藏' : '删除';
    alert(`帖子${statusText}成功！`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">知识社区管理</h2>
          <p className="text-gray-600 mt-1">管理社区帖子、分类和统计数据</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity size={16} />
          <span>系统正常运行</span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveSection('posts')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'posts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              帖子管理
            </div>
          </button>
          <button
            onClick={() => setActiveSection('categories')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'categories'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder size={16} />
              分类管理
            </div>
          </button>
          <button
            onClick={() => setActiveSection('stats')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart2 size={16} />
              数据统计
            </div>
          </button>
        </nav>
      </div>

      {/* Posts Section */}
      {activeSection === 'posts' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总帖子数</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalPosts}</p>
                </div>
                <MessageSquare className="text-blue-600" size={20} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总用户数</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalUsers}</p>
                </div>
                <Users className="text-green-600" size={20} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总回复数</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalReplies}</p>
                </div>
                <MessageCircle className="text-purple-600" size={20} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">活跃用户</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.activeUsers}</p>
                </div>
                <Activity className="text-orange-600" size={20} />
              </div>
            </div>
          </div>

          {/* Posts Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">帖子列表</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      统计
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{post.title}</div>
                        <div className="text-xs text-gray-500">{post.createdAt}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {post.authorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {post.categoryName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            {post.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={14} />
                            {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={14} />
                            {post.replyCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={post.status}
                          onChange={(e) => handleChangePostStatus(post.id, e.target.value)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-2 ${
                            post.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : post.status === 'hidden'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <option value="published">已发布</option>
                          <option value="hidden">已隐藏</option>
                          <option value="deleted">已删除</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditPost(post)}
                            className="text-blue-600 hover:text-blue-900"
                            title="编辑帖子"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 hover:text-red-900"
                            title="删除帖子"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 帖子编辑弹窗 */}
          {showPostForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    编辑帖子
                  </h3>
                  <button
                    onClick={handlePostFormCancel}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handlePostFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      帖子标题 *
                    </label>
                    <input
                      type="text"
                      value={postForm.title}
                      onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入帖子标题"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      帖子内容
                    </label>
                    <textarea
                      value={postForm.content}
                      onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入帖子内容"
                      rows={8}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      分类
                    </label>
                    <select
                      value={postForm.categoryName}
                      onChange={(e) => setPostForm({ ...postForm, categoryName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择分类</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      状态
                    </label>
                    <select
                      value={postForm.status}
                      onChange={(e) => setPostForm({ ...postForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="published">已发布</option>
                      <option value="hidden">已隐藏</option>
                      <option value="deleted">已删除</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handlePostFormCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      更新帖子
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Categories Section */}
      {activeSection === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">分类管理</h3>
              <button
                onClick={handleAddCategory}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" />
                添加分类
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xl"
                          style={{ color: category.color }}
                        >
                          {category.icon || '💻'}
                        </span>
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                      </div>
                      <p className="text-sm text-gray-500">{category.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{category.postCount} 个帖子</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-blue-600 hover:text-blue-900"
                        title="编辑分类"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除分类"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 分类表单弹窗 */}
          {showCategoryForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingCategory ? '编辑分类' : '添加分类'}
                  </h3>
                  <button
                    onClick={handleCategoryFormCancel}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCategoryFormSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      分类名称 *
                    </label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入分类名称"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      分类描述
                    </label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入分类描述"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择图标
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {iconOptions.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, icon })}
                          className={`p-3 border rounded-md text-xl hover:bg-gray-50 ${
                            categoryForm.icon === icon
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择颜色
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, color: color.value })}
                          className={`flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 ${
                            categoryForm.color === color.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          ></span>
                          <span className="text-sm">{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCategoryFormCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingCategory ? '更新' : '添加'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Section */}
      {activeSection === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">社区增长趋势</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <BarChart2 size={48} />
                <span className="ml-2">图表功能开发中...</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">用户活跃度</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <PieChart size={48} />
                <span className="ml-2">图表功能开发中...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCommunityManager;