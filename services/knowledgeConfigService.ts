import {
  KnowledgePageConfig,
  KnowledgeStats,
  KnowledgeActivity,
  KnowledgeSearchConfig,
  KnowledgeExportConfig,
  KnowledgeCategory,
  KnowledgeItem
} from '../types';

const KNOWLEDGE_CONFIG_KEY = 'captain_knowledge_page_config';
const KNOWLEDGE_SEARCH_CONFIG_KEY = 'captain_knowledge_search_config';
const KNOWLEDGE_EXPORT_CONFIG_KEY = 'captain_knowledge_export_config';
const KNOWLEDGE_ACTIVITY_KEY = 'captain_knowledge_activity';

// 默认知识库页面配置
const DEFAULT_KNOWLEDGE_CONFIG: KnowledgePageConfig = {
  title: '知识库资源',
  description: '查找和下载专业的呼叫中心管理资源、AI报告和工具',
  welcomeMessage: '欢迎访问Captain AI知识库！这里有丰富的专业资源和实用工具。',
  searchPlaceholder: '搜索知识库资源...',
  enableAdvancedSearch: true,
  enableTagFiltering: true,
  enableRating: true,
  enableDownloadCount: true,
  enableSorting: true,
  enableFavorites: true,
  enableSharing: true,
  enableComments: true,
  enableVersionHistory: false,
  maxFileSize: 50, // 50MB
  allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'txt', 'md'],
  defaultViewMode: 'grid',
  itemsPerPage: 12,
  enablePreview: true,
  enableBulkDownload: true,
  requireApproval: false,
  autoTagging: true,
  fulltextSearch: true,
  enableAnalytics: true,
  featuredCategories: ['通用知识库附件', '年度改善项目归档', '核心人才留存'],
  customFields: []
};

// 默认搜索配置
const DEFAULT_SEARCH_CONFIG: KnowledgeSearchConfig = {
  enabled: true,
  placeholder: '搜索文档、工具或知识...',
  minQueryLength: 2,
  maxResults: 50,
  highlightResults: true,
  fuzzySearch: true,
  searchInContent: true,
  searchInTags: true,
  searchInDescription: true,
  boostRecent: false,
  boostPopular: true,
  boostHighRated: true
};

// 默认导出配置
const DEFAULT_EXPORT_CONFIG: KnowledgeExportConfig = {
  enabled: true,
  formats: ['pdf', 'excel', 'csv'],
  includeMetadata: true,
  includeFileContent: false,
  maxExportSize: 100, // 100MB
  requireApproval: false,
  allowedRoles: ['admin', 'pro']
};

// 获取知识库页面配置
export const getKnowledgePageConfig = (): KnowledgePageConfig => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_CONFIG_KEY);
    return stored ? { ...DEFAULT_KNOWLEDGE_CONFIG, ...JSON.parse(stored) } : DEFAULT_KNOWLEDGE_CONFIG;
  } catch {
    return DEFAULT_KNOWLEDGE_CONFIG;
  }
};

// 保存知识库页面配置
export const saveKnowledgePageConfig = (config: KnowledgePageConfig): void => {
  localStorage.setItem(KNOWLEDGE_CONFIG_KEY, JSON.stringify(config));
};

// 获取搜索配置
export const getKnowledgeSearchConfig = (): KnowledgeSearchConfig => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_SEARCH_CONFIG_KEY);
    return stored ? { ...DEFAULT_SEARCH_CONFIG, ...JSON.parse(stored) } : DEFAULT_SEARCH_CONFIG;
  } catch {
    return DEFAULT_SEARCH_CONFIG;
  }
};

// 保存搜索配置
export const saveKnowledgeSearchConfig = (config: KnowledgeSearchConfig): void => {
  localStorage.setItem(KNOWLEDGE_SEARCH_CONFIG_KEY, JSON.stringify(config));
};

// 获取导出配置
export const getKnowledgeExportConfig = (): KnowledgeExportConfig => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_EXPORT_CONFIG_KEY);
    return stored ? { ...DEFAULT_EXPORT_CONFIG, ...JSON.parse(stored) } : DEFAULT_EXPORT_CONFIG;
  } catch {
    return DEFAULT_EXPORT_CONFIG;
  }
};

// 保存导出配置
export const saveKnowledgeExportConfig = (config: KnowledgeExportConfig): void => {
  localStorage.setItem(KNOWLEDGE_EXPORT_CONFIG_KEY, JSON.stringify(config));
};

// 记录活动
export const recordKnowledgeActivity = (activity: Omit<KnowledgeActivity, 'id' | 'timestamp'>): void => {
  try {
    const activities = getKnowledgeActivities();
    const newActivity: KnowledgeActivity = {
      ...activity,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    activities.unshift(newActivity); // 添加到开头

    // 只保留最近1000条记录
    if (activities.length > 1000) {
      activities.splice(1000);
    }

    localStorage.setItem(KNOWLEDGE_ACTIVITY_KEY, JSON.stringify(activities));
  } catch (error) {
    console.error('Failed to record knowledge activity:', error);
  }
};

// 获取活动记录
export const getKnowledgeActivities = (limit?: number): KnowledgeActivity[] => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_ACTIVITY_KEY);
    const activities = stored ? JSON.parse(stored) : [];
    return limit ? activities.slice(0, limit) : activities;
  } catch {
    return [];
  }
};

// 获取知识库统计信息
export const getKnowledgeStats = (categories: KnowledgeCategory[]): KnowledgeStats => {
  const totalCategories = categories.length;
  let totalItems = 0;
  let totalDownloads = 0;
  const categoryStats: Record<string, { itemCount: number; downloadCount: number; averageRating: number; }> = {};
  const fileTypeStats: Record<string, number> = {};
  const recentActivities = getKnowledgeActivities(50);

  const downloadCounts: Record<string, number> = {};
  const ratings: Record<string, number[]> = {};

  categories.forEach(category => {
    totalItems += category.items.length;
    let categoryDownloads = 0;

    category.items.forEach(item => {
      // 统计文件类型
      const fileType = item.type || 'unknown';
      fileTypeStats[fileType] = (fileTypeStats[fileType] || 0) + 1;

      // 收集下载统计（模拟数据，实际应从活动记录中获取）
      downloadCounts[item.title] = Math.floor(Math.random() * 100);
      categoryDownloads += downloadCounts[item.title];

      // 收集评分（模拟数据）
      ratings[item.title] = Array.from({ length: Math.floor(Math.random() * 20) + 1 }, () =>
        Math.random() * 4 + 1 // 1-5星评分
      );
    });

    totalDownloads += categoryDownloads;

    categoryStats[category.id] = {
      itemCount: category.items.length,
      downloadCount: categoryDownloads,
      averageRating: calculateAverageRating(Object.values(ratings))
    };
  });

  // 获取最高评分项目
  const allItems = categories.flatMap(cat => cat.items);
  const topRatedItems = allItems
    .map(item => ({
      ...item,
      rating: calculateAverageRating(ratings[item.title] || [])
    }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  // 获取最多下载项目
  const mostDownloadedItems = allItems
    .map(item => ({
      ...item,
      downloadCount: downloadCounts[item.title] || 0
    }))
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, 10);

  return {
    totalCategories,
    totalItems,
    totalDownloads,
    totalViews: recentActivities.filter(a => a.type === 'view').length,
    categoryStats,
    fileTypeStats,
    recentActivity: recentActivities,
    topRatedItems,
    mostDownloadedItems
  };
};

// 计算平均评分
const calculateAverageRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10; // 保留一位小数
};

// 搜索知识库资源
export const searchKnowledgeItems = (
  categories: KnowledgeCategory[],
  query: string,
  config: KnowledgeSearchConfig
): KnowledgeItem[] => {
  if (!config.enabled || query.length < config.minQueryLength) {
    return [];
  }

  const allItems = categories.flatMap(cat =>
    cat.items.map(item => ({
      ...item,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color,
      requiredPlan: cat.requiredPlan || 'free'
    }))
  );

  // 简单的搜索实现
  const results = allItems.filter(item => {
    const searchText = query.toLowerCase();
    const title = item.title.toLowerCase();
    const tags = (item.tags || []).join(' ').toLowerCase();

    if (config.searchInTags && tags.includes(searchText)) return true;
    if (config.fuzzySearch) {
      return title.includes(searchText) || searchText.includes(title);
    }
    return title.includes(searchText);
  });

  // 应用排序逻辑
  if (config.boostPopular) {
    results.sort((a, b) => {
      const aCount = downloadCounts[a.title] || 0;
      const bCount = downloadCounts[b.title] || 0;
      return bCount - aCount;
    });
  }

  return results.slice(0, config.maxResults);
};

// 模拟下载统计数据
const downloadCounts: Record<string, number> = {};

// 导出知识库数据
export const exportKnowledgeData = (
  categories: KnowledgeCategory[],
  format: 'json' | 'csv',
  config: KnowledgeExportConfig
): string => {
  if (!config.formats.includes(format)) {
    throw new Error(`Export format ${format} is not supported`);
  }

  const data = categories.map(category => ({
    id: category.id,
    name: category.name,
    section: category.section,
    color: category.color,
    requiredPlan: category.requiredPlan || 'free',
    itemCount: category.items.length,
    items: category.items.map(item => ({
      title: item.title,
      type: item.type,
      size: item.size,
      tags: item.tags || [],
      url: item.url || ''
    }))
  }));

  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  if (format === 'csv') {
    const headers = ['ID', '分类名称', '区域', '颜色', '权限要求', '文件数量'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.id,
        `"${row.name}"`,
        row.section,
        row.color,
        row.requiredPlan,
        row.itemCount
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  throw new Error(`Export format ${format} is not implemented`);
};

// 重置配置为默认值
export const resetKnowledgeConfig = (): void => {
  localStorage.removeItem(KNOWLEDGE_CONFIG_KEY);
  localStorage.removeItem(KNOWLEDGE_SEARCH_CONFIG_KEY);
  localStorage.removeItem(KNOWLEDGE_EXPORT_CONFIG_KEY);
  localStorage.removeItem(KNOWLEDGE_ACTIVITY_KEY);
};