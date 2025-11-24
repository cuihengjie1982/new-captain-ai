

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
}

// New Interface for Blog Comments
export interface CommentReply {
  id: string;
  userName: string;
  userAvatar?: string;
  content: string;
  date: string;
  likes: number;
  isLiked: boolean;
  replyToName?: string; 
}

export interface BlogPostComment {
  id: string;
  postId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  date: string;
  likes: number;
  isLiked: boolean;
  replies: CommentReply[];
  isTop?: boolean; // For "Featured/Pinned" comments
}

// Permission System Types
export type PermissionKey = string;

export interface PermissionDefinition {
  key: string;
  label: string;
  module?: string; // Added module for grouping permissions
}

export interface PermissionConfig {
  free: Record<PermissionKey, boolean>;
  pro: Record<PermissionKey, boolean>;
}

// NEW: Email Log Interface
export interface EmailLog {
  id: string;
  recipient: string;
  code: string;
  subject: string;
  sentAt: string;
  status: 'sent' | 'verified';
}

// NEW: Business Contact Info Interface
export interface BusinessContactInfo {
  contactPerson: string;
  contactMethod: string; // Phone or WeChat ID
  email: string;
}

// NEW: Business Lead Interface (Submitted Form Data)
export interface BusinessLead {
  id: string;
  name: string;
  position: string; // New: Job Position
  company: string;
  phone: string;
  email: string;
  submittedAt: string;
  status: 'new' | 'contacted';
}

// NEW: Plans Page Configuration
export interface PlanFeature {
  text: string;
  icon: 'Video' | 'Zap' | 'Check' | 'ArrowUpRight' | 'FileText' | 'Star';
}

export interface PlanDetail {
  title: string;
  subtitle: string;
  buttonText: string;
  features: PlanFeature[];
}

export interface PlansPageConfig {
  free: PlanDetail;
  pro: PlanDetail;
}

export enum AppRoute {
  LOGIN = '/login',
  BLOG = '/',
  BLOG_DETAIL = '/blog/:id',
  DIAGNOSIS = '/diagnosis',
  SOLUTION = '/solution',
  SOLUTION_DETAIL = '/solution/:id',
  DASHBOARD = '/dashboard',
  ADMIN = '/admin',
  // New User Center Routes
  MY_VIDEOS = '/my-videos',
  MY_ARTICLES = '/my-articles',
  MY_NOTES = '/my-notes',
  SETTINGS = '/settings',
  PLANS = '/plans'
}