

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'user'; 
  plan: 'free' | 'pro'; // Added plan
  email?: string;
  phone?: string;
  password?: string; // Added password for login logic
  isAuthenticated: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  thumbnail: string;
  readTime: string;
  date: string;
  author: string;
  content: string; // HTML content for the article
  originalUrl?: string; // New: Import source URL
  requiredPlan?: 'free' | 'pro'; // NEW: Access Control
}

export interface IntroVideo {
  id: string;
  title: string;
  sourceType: 'link' | 'upload'; // New: Source Type
  url: string;
  thumbnail: string;
  isVisible: boolean;
  duration?: string; // New: Duration display
  lastUpdated?: string; // New: Last update timestamp
  publisher?: string; // New: Publisher name
  publishDate?: string; // New: Publish date
}

// New: Configuration for the Diagnosis Widget Text on Blog Page
export interface DiagnosisWidgetConfig {
  title: string;
  description: string;
  highlightText?: string; // E.g., "Smart Diagnosis Tool"
}

// New Interface for About Us Section
export interface AboutUsInfo {
  title: string;
  description: string;
  teamInfo: string;
  websiteUrl: string;
  contactEmail?: string;
}

// 社区页面配置
export interface CommunityPageConfig {
  title: string;
  description: string;
  welcomeMessage: string;
  postingGuidelines: string;
  featuredCategories: string[];
  allowAnonymousPosts: boolean;
  requireModeration: boolean;
  maxPostLength: number;
  enableAttachments: boolean;
  allowedFileTypes: string[];
}

// 用户中心页面配置
export interface UserCenterConfig {
  myVideos: {
    title: string;
    description: string;
    maxStoragePerUser: number; // MB
    allowedVideoFormats: string[];
    enableTranscription: boolean;
    enableAIAnalysis: boolean;
  };
  myArticles: {
    title: string;
    description: string;
    enableBookmarks: boolean;
    enableNotes: boolean;
    enableSharing: boolean;
    maxNotesPerArticle: number;
  };
  myNotes: {
    title: string;
    description: string;
    enableCategories: boolean;
    enableTags: boolean;
    enableSearch: boolean;
    enableExport: boolean;
    syncAcrossDevices: boolean;
  };
  settings: {
    enableProfileCustomization: boolean;
    enableEmailNotifications: boolean;
    enableDataExport: boolean;
    enableAccountDeletion: boolean;
    privacySettings: {
      showProfile: boolean;
      showActivity: boolean;
      allowDataAnalysis: boolean;
    };
  };
}

// 仪表盘配置
export interface DashboardConfig {
  title: string;
  welcomeMessage: string;
  defaultKPIs: string[];
  refreshInterval: number; // seconds
  enableRealTimeUpdates: boolean;
  showQuickActions: boolean;
  customWidgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'list';
  title: string;
  dataSource: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

export interface Note {
  id: string;
  timestamp: number; // Seconds
  content: string;
  quote?: string; // Selected text from source
  createdAt?: string; // Added for display
  userName?: string; // Added for display
  userId?: string; // Added for linking to user
}

export interface KPIRecord {
  month: string; // Format: YYYY-MM
  value: number;
}

// NEW: KPI Item Definition
export interface KPIItem {
  id: string;
  label: string;
  value: number; // Current Value
  unit: string;
  target: number; // Target Value
  trend: number; // Static Trend (Optional, for quick view)
  timeWindow: 'Month' | 'Quarter' | 'HalfYear' | 'Year'; // Default view
  aggregation: 'sum' | 'avg'; // How to aggregate data: Sum or Average
  direction: 'up' | 'down'; // 'up' = Higher is better, 'down' = Lower is better
  chartData: KPIRecord[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

// Moved from Solution.tsx
export interface TranscriptLine {
  time: number; // seconds
  text: string;
}

export interface Highlight {
  label: string;
  time: number;
  color: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string; // display string e.g. "10:24"
  durationSec: number;
  thumbnail: string;
  videoUrl?: string; // Added video URL for real playback
  highlights: Highlight[];
  transcript: TranscriptLine[];
  category?: string; // Added category for filtering
  tags?: string[]; // New: Multi-tags
  requiredPlan?: 'free' | 'pro'; // NEW: Access Control
}

// Moved from Diagnosis.tsx
export interface KnowledgeItem {
  id?: string; // Make optional for backward compatibility or generate on fly
  title: string; 
  type: 'xlsx' | 'pdf' | 'ppt' | 'doc'; 
  size: string;
  tags?: string[]; // New: Tags for the file
  url?: string; // New: File URL
}

export type KnowledgeSectionType = 'ai_reply' | 'diagnosis_tools' | 'project_reports';

export interface KnowledgeCategory {
  id: string;
  name: string; // This serves as the "Level 2" directory name
  color: string;
  items: KnowledgeItem[];
  section: KnowledgeSectionType; // New: Level 1 Directory classification
  isAiRepository?: boolean; // Deprecated, use section='ai_reply'
  isProjectReports?: boolean; // Deprecated, use section='project_reports'
  requiredPlan?: 'free' | 'pro'; // NEW: Access Control
}

export interface RiskDetailItem {
  id: string;
  name: string;     // e.g., Employee Name / Call ID / User ID
  desc: string;     // e.g., Risk Factor / Comment / Reason
  metric: string;   // e.g., Risk Score / Duration / Rating
  status: 'critical' | 'warning' | 'info';
}

// MODIFIED: DashboardProject
export interface DashboardProject {
  id: string;
  name: string;
  category: string;
  content: string; // HTML content
  updatedAt: string;
  requiredPlan?: 'free' | 'pro'; // NEW: Access Control
  
  // Changed from single object to array
  kpis: KPIItem[];
  
  // Risk configuration moved to top level object
  risk: {
      label: string;
      value: string;
      icon: 'Users' | 'Smile' | 'Clock' | 'Activity' | 'Zap';
      color: string;
      details?: RiskDetailItem[];
  };

  actionPlanFile?: string; 
  meetingRecordFile?: string;
}

// New Interfaces for User Data Management
export interface UserUpload {
  id: string;
  fileName: string;
  fileType: string;
  size: string;
  uploadDate: string;
  status: 'pending' | 'analyzing' | 'completed';
  userName: string;
  userEmail?: string;
  userId?: string; // Added for linking to user
}

export interface AdminNote {
  id: string;
  content: string;
  quote?: string; // Selected text from source
  lessonTitle: string; // Used as Source Title
  timestampDisplay: string; // Used for timestamp OR context (e.g. "Section 1")
  createdAt: string;
  userName: string;
  userId?: string; // Added for linking to user
  sourceType?: 'video' | 'article'; // New field to distinguish source
  sourceId?: string; // ID of the video or article
  reply?: string; // Admin reply content
  replyAt?: string; // Admin reply timestamp
}

// User History Interface
export interface WatchedLesson {
  userId?: string; // Added for linking to user
  lessonId: string;
  watchedAt: string;
  progress: number; // 0-100
}

export interface ReadArticle {
  userId?: string; // Added for linking to user
  articleId: string;
  readAt: string;
}

// New Interface for Diagnosis Issues Management
export interface DiagnosisIssue {
  id: string;
  title: string;       // Dropdown Label
  userText: string;    // Simulated User Message
  aiResponse: string;  // Initial AI Response
}

// New Interface for User Submitted Diagnosis
export interface DiagnosisSubmission {
  id: string;
  selectedIssues: string[]; // List of titles
  customIssue?: string;     // Text for "Other"
  submittedAt: string;
  user?: string; // Name or "Guest"
  userId?: string; // Added for linking
  
  // Expert Workflow Fields
  status: 'new' | 'preliminary_provided' | 'report_submitted' | 'final_provided';
  
  // Step 1
  problemDescription?: string;
  initialFiles?: string[]; 
  
  // Step 2
  expertPreliminaryReply?: string; 
  templateFile?: string; 
  
  // Step 3
  userReportFile?: string; 
  userReportDescription?: string; // New: User entered report text
  
  // Step 4
  expertFinalReply?: string;
  expertFinalFile?: string; 
}

// Plan Features
export interface PlanFeature {
  text: string;
  icon: string; // Lucide icon name
}

export interface PlanConfig {
  title: string;
  subtitle: string;
  buttonText: string;
  features: PlanFeature[];
}

export interface PlansPageConfig {
  free: PlanConfig;
  pro: PlanConfig;
}

// Permissions
export type PermissionKey = 'download_resources' | 'expert_diagnosis' | 'export_transcript' | 'advanced_analytics';

export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
}

export interface PermissionConfig {
  free: Record<string, boolean>;
  pro: Record<string, boolean>;
}

export interface EmailLog {
  id: string;
  recipient: string;
  code: string;
  subject: string;
  sentAt: string;
  status: 'sent' | 'verified' | 'expired';
}

export interface BusinessContactInfo {
    contactPerson: string;
    contactMethod: string;
    email: string;
}

export interface BusinessLead {
    id: string;
    name: string;
    position: string;
    company: string;
    phone: string;
    email: string;
    submittedAt: string;
    status: 'new' | 'contacted';
}

// Comments
export interface CommentReply {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  date: string;
  likes: number;
  isLiked: boolean;
}

export interface BlogPostComment {
  id: string;
  postId: string;
  userName: string;
  userAvatar: string;
  content: string;
  date: string;
  likes: number;
  isLiked: boolean;
  replies: CommentReply[];
  isTop?: boolean;
}

// Knowledge Community Module Types
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'user';
  };
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  views: number;
  likes: number;
  isLiked: boolean;
  isPinned: boolean;
  replies: CommunityReply[];
  replyCount: number;
  requiredPlan?: 'free' | 'pro';
}

export interface CommunityReply {
  id: string;
  postId: string;
  parentId?: string; // For nested replies
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: 'admin' | 'user';
  };
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked: boolean;
  replies: CommunityReply[]; // Nested replies
  isAuthor?: boolean; // If the reply author is also the post author
}

export interface CommunityCategory {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
  postCount: number;
}

export interface CommunityStats {
  totalPosts: number;
  totalUsers: number;
  totalReplies: number;
  activeUsers: number;
  topCategories: CommunityCategory[];
}

export enum AppRoute {
  LOGIN = '/',
  BLOG = '/blog',
  BLOG_DETAIL = '/blog/:id',
  DIAGNOSIS = '/diagnosis',
  SOLUTION = '/solution',
  SOLUTION_DETAIL = '/solution/:id',
  DASHBOARD = '/dashboard',
  COMMUNITY = '/community',
  COMMUNITY_POST = '/community/post/:id',
  COMMUNITY_NEW = '/community/new',
  MY_VIDEOS = '/my/videos',
  MY_ARTICLES = '/my/articles',
  MY_NOTES = '/my/notes',
  SETTINGS = '/settings',
  PLANS = '/plans',
  ADMIN = '/admin',
}

// 知识库页面配置
export interface KnowledgePageConfig {
  title: string;
  description: string;
  welcomeMessage: string;
  searchPlaceholder: string;
  enableAdvancedSearch: boolean;
  enableTagFiltering: boolean;
  enableRating: boolean;
  enableDownloadCount: boolean;
  enableSorting: boolean;
  enableFavorites: boolean;
  enableSharing: boolean;
  enableComments: boolean;
  enableVersionHistory: boolean;
  maxFileSize: number; // MB
  allowedFileTypes: string[];
  defaultViewMode: 'list' | 'grid' | 'table';
  itemsPerPage: number;
  enablePreview: boolean;
  enableBulkDownload: boolean;
  requireApproval: boolean;
  autoTagging: boolean;
  fulltextSearch: boolean;
  enableAnalytics: boolean;
  featuredCategories: string[];
  customFields?: KnowledgeCustomField[];
}

export interface KnowledgeCustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  options?: string[]; // For select/multiselect types
  defaultValue?: any;
}

// 知识库统计信息
export interface KnowledgeStats {
  totalCategories: number;
  totalItems: number;
  totalDownloads: number;
  totalViews: number;
  categoryStats: Record<string, {
    itemCount: number;
    downloadCount: number;
    averageRating: number;
  }>;
  fileTypeStats: Record<string, number>;
  recentActivity: KnowledgeActivity[];
  topRatedItems: KnowledgeItem[];
  mostDownloadedItems: KnowledgeItem[];
}

export interface KnowledgeActivity {
  id: string;
  type: 'download' | 'view' | 'rating' | 'comment' | 'upload';
  itemId?: string;
  categoryId?: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// 知识库搜索配置
export interface KnowledgeSearchConfig {
  enabled: boolean;
  placeholder: string;
  minQueryLength: number;
  maxResults: number;
  highlightResults: boolean;
  fuzzySearch: boolean;
  searchInContent: boolean;
  searchInTags: boolean;
  searchInDescription: boolean;
  boostRecent: boolean;
  boostPopular: boolean;
  boostHighRated: boolean;
}

// 知识库导出配置
export interface KnowledgeExportConfig {
  enabled: boolean;
  formats: ('pdf' | 'excel' | 'csv' | 'json')[];
  includeMetadata: boolean;
  includeFileContent: boolean;
  maxExportSize: number; // MB
  requireApproval: boolean;
  allowedRoles: string[];
}