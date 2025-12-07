
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, BookOpen, Video, Database, Plus, Trash2, Edit, Save, X, Bot,
  Upload, FileText, FileVideo, Image as ImageIcon, FileType, Loader2, CheckCircle,
  LayoutDashboard, Target, PieChart, BarChart3, Users, ClipboardList, File as FileIcon, Download,
  MonitorPlay, MessageSquare, BrainCircuit, Shield, ToggleLeft, ToggleRight, Sparkles, Quote, Link as LinkIcon, Tags, UserCog, Key, FileCheck, AlertTriangle, Activity, Zap, Import, ArrowUp, ArrowDown, Sigma, Divide, QrCode, Wallet, Building2, Globe, Mail, Clock, Crown, CreditCard, Phone, Smartphone, Lock, Layers, Briefcase, Calendar, Stethoscope, FileSpreadsheet, Presentation, FolderOpen, Check, Star, ArrowUpRight,
  Square, CheckSquare, Filter, FileJson, Eye, List, BarChart2, Send, User as UserIcon, Search, MoreHorizontal, TrendingUp, PenTool, History, Paperclip, ChevronRight
} from 'lucide-react';
import { BlogPost, Lesson, KnowledgeCategory, KnowledgeItem, DashboardProject, UserUpload, AdminNote, IntroVideo, DiagnosisIssue, PermissionConfig, PermissionDefinition, PermissionKey, TranscriptLine, User, KPIItem, KPIRecord, AboutUsInfo, EmailLog, RiskDetailItem, BusinessContactInfo, BusinessLead, DiagnosisSubmission, DiagnosisWidgetConfig, KnowledgeSectionType, WatchedLesson, ReadArticle, PlansPageConfig, PlanFeature } from '../types';
import { getBlogPosts, saveBlogPost, deleteBlogPost, getIntroVideo, saveIntroVideo, getDiagnosisIssues, saveDiagnosisIssue, deleteDiagnosisIssue, getPaymentQRCode, savePaymentQRCode, getAboutUsInfo, saveAboutUsInfo, getBusinessContactInfo, saveBusinessContactInfo, getDiagnosisWidgetConfig, saveDiagnosisWidgetConfig, getPlansPageConfig, savePlansPageConfig } from '../services/contentService';
import { getLessons, saveLesson, deleteLesson } from '../services/courseService';
import { getKnowledgeCategories, saveKnowledgeCategory, deleteKnowledgeCategory } from '../services/resourceService';
import { getDashboardProjects, saveDashboardProject, deleteDashboardProject } from '../services/dashboardService';
import { getUserUploads, deleteUserUpload, getAdminNotes, updateAdminNote, deleteAdminNote, updateUserUploadStatus, getAllUsers, saveUser, deleteUser, getEmailLogs, getBusinessLeads, deleteBusinessLead, getDiagnosisSubmissions, saveDiagnosisSubmission, deleteDiagnosisSubmission, updateBusinessLeadStatus, getWatchedHistory, getReadHistory } from '../services/userDataService';
import { getPermissionConfig, savePermissionConfig, getPermissionDefinitions, savePermissionDefinition, deletePermissionDefinition } from '../services/permissionService';
import { createChatSession, sendMessageToAI } from '../services/geminiService';

// Specific AI Models for Video Transcript Generation
const VIDEO_AI_MODELS = [
  { id: 'deepseek-r1', name: 'DeepSeek R1' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
];

// Helper Function for File Import
const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, callback: (content: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const binaryExts = ['pdf', 'ppt', 'pptx', 'xls', 'xlsx', 'doc', 'docx', 'zip', 'rar'];
    
    if (binaryExts.includes(ext || '')) {
         callback(`<p><strong>[系统提示]</strong> 文件 <em>${file.name}</em> 已导入。</p><p>（由于文件为二进制格式，无法直接预览文本内容。请在附件区域上传该文件供用户下载。）</p>`);
    } else {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const text = event.target.result as string;
                const formatted = ext === 'html' || ext === 'htm' ? text : text.replace(/\n/g, '<br/>');
                callback(formatted);
            }
        };
        reader.readAsText(file);
    }
    e.target.value = '';
};

const handleTranscriptImport = (e: React.ChangeEvent<HTMLInputElement>, callback: (text: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
            callback(event.target.result as string);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
};

const handleLinkImport = (callback: (content: string) => void) => {
    const url = window.prompt("请输入导入链接 (URL):");
    if (url) {
        callback(`<p><strong>[链接导入]</strong> 内容来源: <a href="${url}" target="_blank" class="text-blue-600 underline">${url}</a></p><p>（在此处补充链接内容的详细描述...）</p>`);
    }
};

const handleMediaImport = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
      if (event.target?.result) {
          callback(event.target.result as string);
      }
  };
  reader.readAsDataURL(file);
};

const handleFileNameUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (name: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    callback(file.name);
};

const getFileTypeInfo = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { type: 'pdf', icon: <FileText size={16} className="text-red-500" /> };
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return { type: 'xlsx', icon: <FileSpreadsheet size={16} className="text-green-600" /> };
    if (['ppt', 'pptx'].includes(ext || '')) return { type: 'ppt', icon: <Presentation size={16} className="text-orange-500" /> };
    if (['doc', 'docx'].includes(ext || '')) return { type: 'doc', icon: <FileText size={16} className="text-blue-500" /> };
    return { type: 'doc', icon: <FileIcon size={16} className="text-slate-400" /> };
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
};

// --- Helper Components ---
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

const KPIEditor: React.FC<{ kpis: KPIItem[], onChange: (kpis: KPIItem[]) => void }> = ({ kpis, onChange }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0); 
  const [entryYear, setEntryYear] = useState(new Date().getFullYear());
  const [entryPeriod, setEntryPeriod] = useState('01');
  const [entryValue, setEntryValue] = useState<string>('');

  const handleUpdateKPI = (idx: number, field: keyof KPIItem, val: any) => {
    const newKPIs = [...kpis];
    newKPIs[idx] = { ...newKPIs[idx], [field]: val };
    onChange(newKPIs);
  };

  const handleAddDataPoint = (idx: number) => {
    const kpi = kpis[idx];
    let periodKey = '';
    if (kpi.timeWindow === 'Month') periodKey = `${entryYear}-${entryPeriod.padStart(2, '0')}`;
    else if (kpi.timeWindow === 'Quarter') periodKey = `${entryYear}-${entryPeriod}`;
    else if (kpi.timeWindow === 'HalfYear') periodKey = `${entryYear}-${entryPeriod}`;
    else if (kpi.timeWindow === 'Year') periodKey = `${entryYear}`;

    const newVal = parseFloat(entryValue);
    if (isNaN(newVal)) return;

    const newRecord: KPIRecord = { month: periodKey, value: newVal };
    const newChartData = [...(kpi.chartData || []), newRecord].sort((a, b) => a.month.localeCompare(b.month));
    
    const newKPIs = [...kpis];
    newKPIs[idx] = { ...newKPIs[idx], chartData: newChartData, value: newVal };
    onChange(newKPIs);
    setEntryValue('');
  };

  const handleRemoveDataPoint = (kpiIdx: number, dataIdx: number) => {
      const newKPIs = [...kpis];
      const newData = [...newKPIs[kpiIdx].chartData];
      newData.splice(dataIdx, 1);
      newKPIs[kpiIdx].chartData = newData;
      onChange(newKPIs);
  };

  const handleAddKPI = () => {
      const newKPI: KPIItem = { id: Date.now().toString(), label: '新指标', value: 0, unit: '', target: 0, trend: 0, timeWindow: 'Month', aggregation: 'avg', direction: 'up', chartData: [] };
      onChange([...kpis, newKPI]);
      setActiveIndex(kpis.length);
  };

  const handleRemoveKPI = (idx: number) => {
      if(window.confirm('确定删除此指标?')) {
        const newKPIs = [...kpis];
        newKPIs.splice(idx, 1);
        onChange(newKPIs);
        setActiveIndex(null);
      }
  };

  const renderPeriodOptions = (window: string) => {
      if (window === 'Month') return Array.from({length: 12}, (_, i) => <option key={i} value={(i+1).toString()}>{i+1}月</option>);
      if (window === 'Quarter') return ['Q1','Q2','Q3','Q4'].map(q => <option key={q} value={q}>{q}</option>);
      if (window === 'HalfYear') return ['H1','H2'].map(h => <option key={h} value={h}>{h==='H1'?'上半年':'下半年'}</option>);
      return null; 
  };

  return (
      <div className="h-full flex flex-col bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white">
              <h4 className="font-bold text-slate-800">核心指标配置 (KPIs)</h4>
              <button onClick={handleAddKPI} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 flex items-center gap-1 transition-colors"><Plus size={14} /> 添加指标</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {kpis.map((kpi, idx) => (
                  <div key={kpi.id} className={`bg-white rounded-lg border transition-all duration-200 ${activeIndex === idx ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : 'border-slate-200 hover:border-blue-200'}`}>
                      <div className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50" onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}>
                          <div className="flex items-center gap-3 min-w-0">
                              <div className="font-bold text-slate-800 text-sm truncate w-32">{kpi.label || '未命名指标'}</div>
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{kpi.timeWindow === 'Month' ? '月度 (M)' : kpi.timeWindow}</span>
                              <span className="text-xs text-slate-500">当前: {kpi.value} {kpi.unit}</span>
                          </div>
                          <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${activeIndex === idx ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {activeIndex === idx && (
                          <div className="p-4 border-t border-slate-100 space-y-4 bg-slate-50/30 animate-in slide-in-from-top-1">
                              {/* Basic Info */}
                              <div className="space-y-3">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">指标名称</label>
                                      <input className="w-full border border-slate-300 p-2 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200" value={kpi.label} onChange={(e) => handleUpdateKPI(idx, 'label', e.target.value)} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 mb-1">单位</label>
                                          <input className="w-full border border-slate-300 p-2 rounded text-sm bg-white outline-none" value={kpi.unit} onChange={(e) => handleUpdateKPI(idx, 'unit', e.target.value)} />
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 mb-1">目标值 (Target)</label>
                                          <input type="number" className="w-full border border-green-200 p-2 rounded text-sm bg-green-50/50 outline-none" value={kpi.target} onChange={(e) => handleUpdateKPI(idx, 'target', parseFloat(e.target.value))} />
                                      </div>
                                  </div>
                              </div>

                              {/* Config */}
                              <div className="grid grid-cols-3 gap-3 bg-slate-100 p-3 rounded-lg border border-slate-200">
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">时间维度</label>
                                      <select className="w-full border border-slate-300 p-1.5 rounded text-xs bg-white" value={kpi.timeWindow} onChange={(e) => handleUpdateKPI(idx, 'timeWindow', e.target.value)}>
                                          <option value="Month">月度 (M)</option>
                                          <option value="Quarter">季度 (Q)</option>
                                          <option value="HalfYear">半年度 (H)</option>
                                          <option value="Year">年度 (Y)</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">趋势方向</label>
                                      <select className="w-full border border-slate-300 p-1.5 rounded text-xs bg-white" value={kpi.direction} onChange={(e) => handleUpdateKPI(idx, 'direction', e.target.value)}>
                                          <option value="up">越高越好</option>
                                          <option value="down">越低越好</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">聚合方式</label>
                                      <select className="w-full border border-slate-300 p-1.5 rounded text-xs bg-white" value={kpi.aggregation} onChange={(e) => handleUpdateKPI(idx, 'aggregation', e.target.value)}>
                                          <option value="avg">平均值</option>
                                          <option value="sum">累加值</option>
                                      </select>
                                  </div>
                                  <div className="col-span-3 text-right">
                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveKPI(idx); }} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 justify-end w-full"><Trash2 size={10} /> 删除指标</button>
                                  </div>
                              </div>

                              {/* Data Entry */}
                              <div className="border-t border-slate-200 pt-3">
                                  <div className="flex justify-between items-center mb-2">
                                      <h5 className="text-xs font-bold text-slate-700">历史数据录入 ({kpi.chartData?.length || 0} 条)</h5>
                                      <span className="text-[10px] text-slate-400">用于同比/环比分析</span>
                                  </div>
                                  <div className="flex gap-2 mb-3">
                                      <select className="w-20 border p-2 rounded text-sm bg-white" value={entryYear} onChange={(e) => setEntryYear(parseInt(e.target.value))}>
                                          {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                                      </select>
                                      {kpi.timeWindow !== 'Year' && (
                                          <select className="w-24 border p-2 rounded text-sm bg-white" value={entryPeriod} onChange={(e) => setEntryPeriod(e.target.value)}>
                                              {renderPeriodOptions(kpi.timeWindow)}
                                          </select>
                                      )}
                                      <input type="number" className="flex-1 border p-2 rounded text-sm" value={entryValue} onChange={(e) => setEntryValue(e.target.value)} placeholder="输入数值" />
                                      <button onClick={() => handleAddDataPoint(idx)} className="px-4 bg-blue-500 text-white rounded text-sm font-bold hover:bg-blue-600">添加</button>
                                  </div>
                                  
                                  {/* Data Table */}
                                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded bg-white">
                                      <table className="w-full text-xs text-left">
                                          <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                              <tr>
                                                  <th className="p-2 font-medium">时间</th>
                                                  <th className="p-2 font-medium">数值</th>
                                                  <th className="p-2 text-right">操作</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                              {[...(kpi.chartData || [])].reverse().map((d, dIdx) => (
                                                  <tr key={dIdx} className="hover:bg-slate-50">
                                                      <td className="p-2 text-slate-600 font-mono">{d.month}</td>
                                                      <td className="p-2 font-bold text-slate-800">{d.value}</td>
                                                      <td className="p-2 text-right">
                                                          <button onClick={() => handleRemoveDataPoint(idx, (kpi.chartData || []).length - 1 - dIdx)} className="text-red-400 hover:text-red-600 px-1">×</button>
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>
  );
};

// --- Main Admin Component ---
const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'blog' | 'diagnosis' | 'solution' | 'dashboard' | 'users' | 'resource' | 'behavior'>('blog');
  
  // Blog Data
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [introVideo, setIntroVideo] = useState<IntroVideo | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost>>({});
  const [aboutUs, setAboutUs] = useState<AboutUsInfo | null>(null);
  const [businessContact, setBusinessContact] = useState<BusinessContactInfo | null>(null);
  const [paymentQR, setPaymentQR] = useState('');
  
  // Diagnosis Data
  const [diagnosisIssues, setDiagnosisIssues] = useState<DiagnosisIssue[]>([]);
  const [diagnosisWidgetConfig, setDiagnosisWidgetConfig] = useState<DiagnosisWidgetConfig>({title: '', description: ''});
  const [editingIssue, setEditingIssue] = useState<Partial<DiagnosisIssue>>({});
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [diagnosisSubmissions, setDiagnosisSubmissions] = useState<DiagnosisSubmission[]>([]);
  const [editingSubmission, setEditingSubmission] = useState<DiagnosisSubmission | null>(null);

  // Solution Data
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson>>({});
  const [lessonVideoSourceType, setLessonVideoSourceType] = useState<'link' | 'upload'>('link');
  const [lessonCoverSourceType, setLessonCoverSourceType] = useState<'link' | 'upload'>('link');
  const [transcriptText, setTranscriptText] = useState('');
  const [selectedAIModel, setSelectedAIModel] = useState(VIDEO_AI_MODELS[0].id);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');

  // Dashboard Data
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<DashboardProject>>({});

  // Resource Data
  const [knowledgeCategories, setKnowledgeCategories] = useState<KnowledgeCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<KnowledgeCategory>>({});
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [activeResourceSection, setActiveResourceSection] = useState<KnowledgeSectionType>('ai_reply');

  // User & Permission Data
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [businessLeads, setBusinessLeads] = useState<BusinessLead[]>([]);
  const [userSubTab, setUserSubTab] = useState<'list' | 'plans' | 'permissions' | 'business'>('list');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<string | null>(null);
  const [plansConfig, setPlansConfig] = useState<PlansPageConfig | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  
  // Permission Data
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [permConfig, setPermConfig] = useState<PermissionConfig>({ free: {}, pro: {} });
  const [newPermission, setNewPermission] = useState({ key: '', label: '', module: '' });

  // Behavior Module State
  const [behaviorTab, setBehaviorTab] = useState<'overview' | 'activity' | 'notes'>('overview');
  const [behaviorFilterUser, setBehaviorFilterUser] = useState<string>('all');
  const [behaviorFilterType, setBehaviorFilterType] = useState<string>('all');
  const [behaviorSelectedIds, setBehaviorSelectedIds] = useState<Set<string>>(new Set());
  const [activities, setActivities] = useState<any[]>([]); // Consolidated Activity Log
  const [stats, setStats] = useState({ totalInteractions: 0, notesCount: 0, videoCount: 0, activeUsers: 0 });
  const [popularContent, setPopularContent] = useState<any[]>([]);

  useEffect(() => {
    setBlogPosts(getBlogPosts());
    setIntroVideo(getIntroVideo());
    setDiagnosisIssues(getDiagnosisIssues());
    setDiagnosisWidgetConfig(getDiagnosisWidgetConfig());
    setDiagnosisSubmissions(getDiagnosisSubmissions());
    setLessons(getLessons());
    setProjects(getDashboardProjects());
    setKnowledgeCategories(getKnowledgeCategories());
    setUsers(getAllUsers());
    setPermissions(getPermissionDefinitions());
    setPermConfig(getPermissionConfig());
    setAboutUs(getAboutUsInfo());
    setPaymentQR(getPaymentQRCode());
    setBusinessContact(getBusinessContactInfo());
    setBusinessLeads(getBusinessLeads());
    setPlansConfig(getPlansPageConfig());
  }, []);

  // --- Consolidated Data Loading for Behavior Tab ---
  useEffect(() => {
    const allUsers = getAllUsers();
    const watched = getWatchedHistory();
    const read = getReadHistory();
    const notes = getAdminNotes();
    const uploads = getUserUploads();
    const diagnosis = getDiagnosisSubmissions();
    const lessonData = getLessons();
    const postData = getBlogPosts();

    let combined: any[] = [];

    // Map Videos
    watched.forEach(w => {
        const lesson = lessonData.find(l => l.id === w.lessonId);
        const user = allUsers.find(u => u.id === w.userId);
        combined.push({
            id: `w-${w.userId}-${w.lessonId}-${new Date(w.watchedAt).getTime()}`,
            type: 'video',
            userId: w.userId,
            userName: user?.name || 'Guest',
            userAvatar: user?.name?.[0] || 'U',
            action: '观看视频',
            target: lesson?.title || 'Unknown Video',
            detail: `进度 ${w.progress}%`,
            date: w.watchedAt,
            timestamp: new Date(w.watchedAt).getTime()
        });
    });

    // Map Articles
    read.forEach(r => {
        const post = postData.find(p => p.id === r.articleId);
        const user = allUsers.find(u => u.id === r.userId);
        combined.push({
            id: `r-${r.userId}-${r.articleId}-${new Date(r.readAt).getTime()}`,
            type: 'article',
            userId: r.userId,
            userName: user?.name || 'Guest',
            userAvatar: user?.name?.[0] || 'U',
            action: '阅读文章',
            target: post?.title || 'Unknown Article',
            detail: '已完成阅读',
            date: r.readAt,
            timestamp: new Date(r.readAt).getTime()
        });
    });

    // Map Notes
    notes.forEach(n => {
        combined.push({
            id: `n-${n.id}`,
            type: 'note',
            userId: n.userId,
            userName: n.userName,
            userAvatar: n.userName?.[0] || 'U',
            action: '发布笔记',
            target: n.lessonTitle || '通用笔记',
            detail: n.content,
            date: n.createdAt,
            timestamp: new Date(n.createdAt).getTime()
        });
    });

    // Map Uploads
    uploads.forEach(u => {
        combined.push({
            id: `u-${u.id}`,
            type: 'upload',
            userId: u.userId,
            userName: u.userName,
            userAvatar: u.userName?.[0] || 'U',
            action: '上传文件',
            target: u.fileName,
            detail: u.size,
            date: u.uploadDate,
            timestamp: new Date(u.uploadDate).getTime()
        });
    });

    // Map Diagnosis
    diagnosis.forEach(d => {
        combined.push({
            id: `d-${d.id}`,
            type: 'diagnosis',
            userId: d.userId,
            userName: d.user || 'Guest',
            userAvatar: d.user?.[0] || 'U',
            action: '提交诊断',
            target: '诊断罗盘',
            detail: d.selectedIssues.join(', '),
            date: d.submittedAt,
            timestamp: new Date(d.submittedAt).getTime()
        });
    });

    // Sort and Set
    combined.sort((a, b) => b.timestamp - a.timestamp);
    setActivities(combined);

    // Calculate Stats
    const uniqueUsers = new Set(combined.map(a => a.userId)).size;
    setStats({
        totalInteractions: combined.length,
        notesCount: notes.length,
        videoCount: watched.length,
        activeUsers: uniqueUsers
    });

    // Calculate Popular Content
    const contentCounts: Record<string, {title: string, type: string, count: number}> = {};
    combined.forEach(a => {
        if (a.type === 'video' || a.type === 'article') {
            const key = `${a.type}-${a.target}`;
            if (!contentCounts[key]) {
                contentCounts[key] = { title: a.target, type: a.type, count: 0 };
            }
            contentCounts[key].count++;
        }
    });
    setPopularContent(Object.values(contentCounts).sort((a, b) => b.count - a.count).slice(0, 5));

  }, [behaviorTab]); // Refresh when entering tab

  const handleDeleteKnowledgeCategory = (id: string) => { if (window.confirm('确定要删除此分类及其所有内容吗？')) { deleteKnowledgeCategory(id); setKnowledgeCategories(getKnowledgeCategories()); } };
  const handleSaveCategory = () => { if (!editingCategory.name) return alert('分类名称不能为空'); const newCategory = { ...editingCategory, id: editingCategory.id || Date.now().toString(), items: editingCategory.items || [], section: activeResourceSection } as KnowledgeCategory; saveKnowledgeCategory(newCategory); setKnowledgeCategories(getKnowledgeCategories()); setIsEditingCategory(false); setEditingCategory({}); };
  const handleResourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) { const newItems: KnowledgeItem[] = Array.from(e.target.files).map((file: File) => { const typeInfo = getFileTypeInfo(file.name); return { title: file.name, type: typeInfo.type as any, size: formatFileSize(file.size), tags: [] }; }); setEditingCategory(prev => ({ ...prev, items: [...(prev.items || []), ...newItems] })); } };
  const removeResourceItem = (index: number) => { const items = [...(editingCategory.items || [])]; items.splice(index, 1); setEditingCategory({...editingCategory, items}); };
  const updateResourceItem = (index: number, field: keyof KnowledgeItem, value: any) => { const items = [...(editingCategory.items || [])]; items[index] = { ...items[index], [field]: value }; setEditingCategory({...editingCategory, items}); };
  
  const handleDeletePost = (id: string) => { if (window.confirm('确定删除?')) { deleteBlogPost(id); setBlogPosts(getBlogPosts()); } };
  const handleSavePost = () => { if (!editingPost.title) return alert('标题不能为空'); saveBlogPost({...editingPost, id: editingPost.id || Date.now().toString(), date: editingPost.date || new Date().toLocaleDateString('zh-CN')} as BlogPost); setBlogPosts(getBlogPosts()); setIsEditingPost(false); setEditingPost({}); };
  const handleDeleteLesson = (id: string) => { if (window.confirm('确定删除?')) { deleteLesson(id); setLessons(getLessons()); } };
  
  const handleSaveLesson = () => { 
      if (!editingLesson.title) return alert('标题不能为空'); 
      const parsedTranscript = transcriptText.split('\n').map(line => { 
          const parts = line.split('|'); 
          if(parts.length >= 2) { 
              const timeStr = parts[0].trim();
              const time = parseInt(timeStr); 
              const text = parts.slice(1).join('|').trim(); 
              if(!isNaN(time) && text) return { time, text }; 
          } 
          return null; 
      }).filter(t => t !== null) as TranscriptLine[]; 
      
      saveLesson({
          ...editingLesson, 
          id: editingLesson.id || Date.now().toString(), 
          highlights: editingLesson.highlights || [], 
          transcript: parsedTranscript, 
          durationSec: editingLesson.durationSec || 0,
          category: editingLesson.category || '未分类'
      } as Lesson); 
      
      setLessons(getLessons()); 
      setIsEditingLesson(false); 
      setEditingLesson({}); 
      setTranscriptText('');
  };

  // UPDATED: Use Real AI for Transcript
  const handleGenerateTranscript = async () => { 
      if (!editingLesson.title) {
          alert('请先输入课程标题以便AI生成内容');
          return;
      }
      setIsGeneratingTranscript(true); 
      try {
          const chat = createChatSession(`Role: Professional Video Transcriber. 
          Task: Generate a structured transcript for a Call Center Training Video.
          Title: "${editingLesson.title}"
          Category: "${editingLesson.category || 'General'}"
          
          Output Format strictly:
          [Seconds] | [Content]
          
          Requirements:
          1. Generate 5-8 lines representing key moments.
          2. Time should increase.
          3. Content should be educational and related to the title.
          4. Language: Simplified Chinese.`);

          if (chat) {
              const result = await sendMessageToAI(chat, "Generate transcript now.");
              // Clean up result if it contains markdown code blocks
              const cleaned = result.replace(/```/g, '').replace(/markdown/g, '').trim();
              setTranscriptText(cleaned);
          } else {
              setTranscriptText("Error: AI Service Unavailable. Check API Key.");
          }
      } catch (e) {
          console.error(e);
          setTranscriptText("Error generating transcript.");
      } finally {
          setIsGeneratingTranscript(false);
      }
  };

  const handleEditLesson = (lesson: Lesson) => {
      setEditingLesson(lesson);
      setLessonVideoSourceType(lesson.videoUrl?.startsWith('blob') ? 'upload' : 'link');
      setLessonCoverSourceType(lesson.thumbnail?.startsWith('blob') || lesson.thumbnail?.startsWith('data') ? 'upload' : 'link');
      const text = lesson.transcript?.map(t => `${t.time} | ${t.text}`).join('\n') || '';
      setTranscriptText(text);
      setIsEditingLesson(true);
  };

  const handleDeleteDiagnosisIssue = (id: string) => { if (window.confirm('确定删除?')) { deleteDiagnosisIssue(id); setDiagnosisIssues(getDiagnosisIssues()); } };
  const handleSaveDiagnosisIssue = () => { if (!editingIssue.title) return alert('标题不能为空'); saveDiagnosisIssue({...editingIssue, id: editingIssue.id || Date.now().toString()} as DiagnosisIssue); setDiagnosisIssues(getDiagnosisIssues()); setIsEditingIssue(false); setEditingIssue({}); };
  const handleSaveDiagnosisWidget = () => { saveDiagnosisWidgetConfig(diagnosisWidgetConfig); alert('已保存'); };
  const handleDeleteProject = (id: string) => { if (window.confirm('确定删除?')) { deleteDashboardProject(id); setProjects(getDashboardProjects()); } };
  const handleSaveProject = () => { if (!editingProject.name) return alert('名称不能为空'); saveDashboardProject({...editingProject, id: editingProject.id || `p${Date.now()}`, kpis: editingProject.kpis || [], risk: editingProject.risk || { label: '风险概览', value: '0', icon: 'Activity', color: 'text-gray-500 bg-gray-50', details: [] }} as DashboardProject); setProjects(getDashboardProjects()); setIsEditingProject(false); setEditingProject({}); };
  const handleSaveIntroVideo = () => { if(introVideo) { saveIntroVideo({...introVideo, lastUpdated: new Date().toLocaleString('zh-CN')}); alert('已保存'); } };
  const handleSaveAboutUs = () => { if(aboutUs) { saveAboutUsInfo(aboutUs); alert('已保存'); } };
  const handleDeleteUser = (id: string) => { if(window.confirm('确定删除?')) { deleteUser(id); setUsers(getAllUsers()); } };
  const handleSaveUser = () => { if(!editingUser.name || !editingUser.email) return alert('信息不全'); saveUser({...editingUser, id: editingUser.id || Date.now().toString(), role: editingUser.role || 'user', plan: editingUser.plan || 'free', isAuthenticated: true} as User); setUsers(getAllUsers()); setIsEditingUser(false); setEditingUser({}); };
  const handleSavePlanConfig = () => { if(plansConfig) { savePlansPageConfig(plansConfig); alert('订阅配置已保存'); } };
  const handleAddPermission = () => { if(!newPermission.key || !newPermission.label) return alert('Key and Label required'); savePermissionDefinition({ ...newPermission }); setPermissions(getPermissionDefinitions()); setNewPermission({ key: '', label: '', module: '' }); };
  const handleDeletePermission = (key: string) => { if(window.confirm('确定删除?')) { deletePermissionDefinition(key); setPermissions(getPermissionDefinitions()); } };
  const togglePermission = (plan: 'free' | 'pro', key: string) => { const newConfig = { ...permConfig }; if(!newConfig[plan]) newConfig[plan] = {}; newConfig[plan][key] = !newConfig[plan][key]; setPermConfig(newConfig); savePermissionConfig(newConfig); };
  const handleSaveBusinessConfig = () => { if(businessContact) { saveBusinessContactInfo(businessContact); alert('商务配置已保存'); } };
  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if(e.target.files?.[0]) { const reader = new FileReader(); reader.onload = (ev) => { if(ev.target?.result) { savePaymentQRCode(ev.target.result as string); setPaymentQR(ev.target.result as string); } }; reader.readAsDataURL(e.target.files[0]); } };
  const handleDeleteLead = (id: string) => { if(window.confirm('Delete?')) { deleteBusinessLead(id); setBusinessLeads(getBusinessLeads()); } };
  const handleBehaviorExport = () => {
    const selectedData = activities.filter(a => behaviorSelectedIds.has(a.id));
    if (selectedData.length === 0) return alert('请先选择要导出的记录');
    
    const headers = ['Date', 'User', 'Action', 'Target', 'Detail'];
    const rows = selectedData.map(a => [
        a.date,
        a.userName,
        a.action,
        `"${a.target}"`,
        `"${a.detail.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const toggleSelectAll = (checked: boolean) => {
      const filtered = activities.filter(a => 
          (behaviorFilterUser === 'all' || a.userId === behaviorFilterUser) &&
          (behaviorFilterType === 'all' || a.type === behaviorFilterType)
      );
      if (checked) {
          setBehaviorSelectedIds(new Set(filtered.map(a => a.id)));
      } else {
          setBehaviorSelectedIds(new Set());
      }
  };
  const toggleSelect = (id: string) => {
      const newSet = new Set(behaviorSelectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setBehaviorSelectedIds(newSet);
  };

  // Helper to save submission updates
  const handleUpdateSubmissionField = (field: keyof DiagnosisSubmission, value: any) => {
      if (!editingSubmission) return;
      setEditingSubmission({ ...editingSubmission, [field]: value });
  };

  const handleSaveExpertResponse = (newStatus: DiagnosisSubmission['status']) => {
      if (!editingSubmission) return;
      const updated = { ...editingSubmission, status: newStatus };
      saveDiagnosisSubmission(updated);
      setDiagnosisSubmissions(getDiagnosisSubmissions()); // Refresh list
      setEditingSubmission(updated); // Update local view
      alert('提交成功');
  };

  const renderDashboardTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">指挥中心管理</h2>
          <button 
            onClick={() => { setEditingProject({ kpis: [], risk: { label: '风险', value: '0', icon: 'Activity', color: 'bg-slate-100', details: [] }, requiredPlan: 'free' }); setIsEditingProject(true); }} 
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={18} /> 新增项目
          </button>
        </div>
        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md border border-blue-100">{project.category || '未分类'}</span>
                    {project.requiredPlan === 'pro' && (<span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-md border border-yellow-100 flex items-center gap-1"><Crown size={10} className="fill-current" /> PRO</span>)}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{project.name}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500">
                    <div className="bg-slate-50 p-2 rounded"><span className="block font-bold text-slate-700 mb-0.5">ID</span>{project.id}</div>
                    <div className="bg-slate-50 p-2 rounded"><span className="block font-bold text-slate-700 mb-0.5">Last Updated</span>{project.updatedAt}</div>
                    <div className="bg-slate-50 p-2 rounded"><span className="block font-bold text-slate-700 mb-0.5">KPI Count</span>{project.kpis.length}</div>
                    <div className="bg-slate-50 p-2 rounded"><span className="block font-bold text-slate-700 mb-0.5">Action Plan</span>{project.actionPlanFile ? '已上传' : '未上传'}</div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <button onClick={() => { setEditingProject(project); setIsEditingProject(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-colors"><Edit size={18} /></button>
                  <button onClick={() => handleDeleteProject(project.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && (<div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400"><LayoutDashboard size={48} className="mx-auto mb-3 opacity-20" />暂无项目，请点击上方按钮添加。</div>)}
        </div>
        
        {isEditingProject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="text-xl font-bold text-slate-900">{editingProject.id ? '编辑项目' : '新增项目'}</h3>
                <button onClick={() => setIsEditingProject(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
              </div>
              <div className="flex-1 flex overflow-hidden">
                <div className="w-1/2 p-6 overflow-y-auto border-r border-slate-200 bg-white">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">项目名称</label>
                      <input className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" value={editingProject.name || ''} onChange={e => setEditingProject({...editingProject, name: e.target.value})} placeholder="例如：核心骨干留存计划" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">项目分类</label>
                        <input className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editingProject.category || ''} onChange={e => setEditingProject({...editingProject, category: e.target.value})} placeholder="例如：人力运营" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">适用用户</label>
                        <select className="w-full border border-slate-300 p-3 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={editingProject.requiredPlan || 'free'} onChange={e => setEditingProject({...editingProject, requiredPlan: e.target.value as 'free'|'pro'})}>
                          <option value="free">所有用户 (Free)</option>
                          <option value="pro">PRO 会员 (Pro)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-900">项目报告 (HTML)</label>
                        <div className="flex gap-2">
                          <button onClick={() => handleLinkImport((c) => setEditingProject({...editingProject, content: c}))} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"><LinkIcon size={12} /> 导入链接</button>
                          <label className="text-xs text-green-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"><Import size={12} /> 导入报告<input type="file" className="hidden" accept=".html,.txt,.md,.doc,.docx,.pdf,.ppt,.pptx" onChange={(e) => handleFileImport(e, (content) => setEditingProject({...editingProject, content}))} /></label>
                        </div>
                      </div>
                      <textarea className="w-full border border-slate-300 p-4 rounded-lg h-64 font-mono text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed" value={editingProject.content || ''} onChange={e => setEditingProject({...editingProject, content: e.target.value})} placeholder="<p>在此输入项目背景与分析报告...</p>" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">详细行动计划</label>
                        <div className="flex gap-2">
                          <input className="flex-1 border border-slate-300 p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editingProject.actionPlanFile || ''} onChange={e => setEditingProject({...editingProject, actionPlanFile: e.target.value})} placeholder="文件名.pdf" />
                          <label className="p-2 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 cursor-pointer text-slate-600 transition-colors"><Upload size={16} /><input type="file" className="hidden" onChange={(e) => handleFileNameUpload(e, (name) => setEditingProject({...editingProject, actionPlanFile: name}))} /></label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">历史会议记录</label>
                        <div className="flex gap-2">
                          <input className="flex-1 border border-slate-300 p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editingProject.meetingRecordFile || ''} onChange={e => setEditingProject({...editingProject, meetingRecordFile: e.target.value})} placeholder="文件名.doc" />
                          <label className="p-2 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200 cursor-pointer text-slate-600 transition-colors"><Upload size={16} /><input type="file" className="hidden" onChange={(e) => handleFileNameUpload(e, (name) => setEditingProject({...editingProject, meetingRecordFile: name}))} /></label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-1/2 bg-slate-50 p-6 overflow-hidden flex flex-col">
                  <KPIEditor kpis={editingProject.kpis || []} onChange={(newKPIs) => setEditingProject({...editingProject, kpis: newKPIs})} />
                </div>
              </div>
              <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                <button onClick={() => setIsEditingProject(false)} className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors">取消</button>
                <button onClick={handleSaveProject} className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95">保存项目</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBlogTab = () => (
    <div className="space-y-8 animate-in fade-in">
      {/* Intro Video Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Video size={20} /> 首页视频配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">视频标题</label>
                  <input className="w-full border p-2 rounded text-sm" value={introVideo?.title || ''} onChange={e => setIntroVideo(prev => prev ? {...prev, title: e.target.value} : null)} />
              </div>
              
              {/* Modified Section Start */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">视频来源</label>
                  <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="introSourceType" 
                            checked={introVideo?.sourceType === 'link' || !introVideo?.sourceType} 
                            onChange={() => setIntroVideo(prev => prev ? {...prev, sourceType: 'link'} : null)} 
                            className="text-blue-600" 
                          />
                          <span className="text-sm text-slate-700">外部链接</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="introSourceType" 
                            checked={introVideo?.sourceType === 'upload'} 
                            onChange={() => setIntroVideo(prev => prev ? {...prev, sourceType: 'upload'} : null)} 
                            className="text-blue-600" 
                          />
                          <span className="text-sm text-slate-700">本地上传</span>
                      </label>
                  </div>
                  
                  {introVideo?.sourceType === 'upload' ? (
                      <div className="flex gap-2">
                          <input 
                            className="w-full border p-2 rounded text-sm bg-slate-50 text-slate-500" 
                            value={introVideo?.url && introVideo.url.startsWith('data:') ? '已选择本地视频文件' : introVideo.url || ''} 
                            readOnly 
                            placeholder="请上传视频文件" 
                          />
                          <label className="px-3 py-2 border border-slate-200 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer flex items-center gap-1 transition-colors">
                              <Upload size={16} className="text-slate-600" />
                              <span className="text-xs font-bold text-slate-600">上传</span>
                              <input type="file" className="hidden" accept="video/*" onChange={(e) => handleMediaImport(e, (url) => setIntroVideo(prev => prev ? {...prev, url: url} : null))} />
                          </label>
                      </div>
                  ) : (
                      <input 
                        className="w-full border p-2 rounded text-sm" 
                        value={introVideo?.url || ''} 
                        onChange={e => setIntroVideo(prev => prev ? {...prev, url: e.target.value} : null)} 
                        placeholder="输入视频 URL (如 https://example.com/video.mp4)" 
                      />
                  )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">时长</label>
                      <input className="w-full border p-2 rounded text-sm" value={introVideo?.duration || ''} onChange={e => setIntroVideo(prev => prev ? {...prev, duration: e.target.value} : null)} placeholder="例如 05:30" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">发布人</label>
                      <input className="w-full border p-2 rounded text-sm" value={introVideo?.publisher || ''} onChange={e => setIntroVideo(prev => prev ? {...prev, publisher: e.target.value} : null)} placeholder="发布者姓名" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">发布日期</label>
                      <input type="date" className="w-full border p-2 rounded text-sm" value={introVideo?.publishDate || ''} onChange={e => setIntroVideo(prev => prev ? {...prev, publishDate: e.target.value} : null)} />
                  </div>
              </div>
              {/* Modified Section End */}

              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">封面图 URL</label>
                  <div className="flex gap-2">
                      <input className="w-full border p-2 rounded text-sm" value={introVideo?.thumbnail || ''} onChange={e => setIntroVideo(prev => prev ? {...prev, thumbnail: e.target.value} : null)} />
                      <label className="p-2 border rounded bg-slate-50 cursor-pointer hover:bg-slate-100"><ImageIcon size={16} /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleMediaImport(e, (url) => setIntroVideo(prev => prev ? {...prev, thumbnail: url} : null))} /></label>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <input type="checkbox" checked={introVideo?.isVisible} onChange={e => setIntroVideo(prev => prev ? {...prev, isVisible: e.target.checked} : null)} />
                  <label className="text-sm text-slate-700">在首页显示视频</label>
              </div>
              <button onClick={handleSaveIntroVideo} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">保存视频配置</button>
           </div>
           <div className="bg-slate-100 rounded-lg flex flex-col items-center justify-center overflow-hidden aspect-video relative border border-slate-200">
               {introVideo?.url ? (
                   <video 
                     src={introVideo.url} 
                     poster={introVideo.thumbnail}
                     controls
                     className="w-full h-full object-contain bg-black"
                   />
               ) : (
                   <div className="text-slate-400 flex flex-col items-center">
                        <Video size={48} className="mb-2 opacity-20" />
                        <span className="text-xs font-medium">视频预览区域</span>
                        <span className="text-xs font-medium">配置 URL 或上传视频后在此预览</span>
                   </div>
               )}
           </div>
        </div>
      </div>

      {/* Blog Posts List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><BookOpen size={20} /> 文章列表</h3>
            <button onClick={() => { setEditingPost({}); setIsEditingPost(true); }} className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-black"><Plus size={14} /> 新增文章</button>
        </div>
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
                <tr>
                    <th className="p-4">标题</th>
                    <th className="p-4">作者</th>
                    <th className="p-4">发布日期</th>
                    <th className="p-4 text-right">操作</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {blogPosts.map(post => (
                    <tr key={post.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800">{post.title}</td>
                        <td className="p-4 text-slate-600">{post.author}</td>
                        <td className="p-4 text-slate-500 font-mono">{post.date}</td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => { setEditingPost(post); setIsEditingPost(true); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit size={16} /></button>
                            <button onClick={() => handleDeletePost(post.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                        </td>
                    </tr>
                ))}
                {blogPosts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">暂无文章</td></tr>}
            </tbody>
        </table>
      </div>

      {/* About Us Config */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={20} /> 关于我们 / 页脚配置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">标题</label><input className="w-full border p-2 rounded text-sm" value={aboutUs?.title || ''} onChange={e => setAboutUs(prev => prev ? {...prev, title: e.target.value} : null)} /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">官网链接</label><input className="w-full border p-2 rounded text-sm" value={aboutUs?.websiteUrl || ''} onChange={e => setAboutUs(prev => prev ? {...prev, websiteUrl: e.target.value} : null)} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">公司简介</label><textarea className="w-full border p-2 rounded text-sm h-20" value={aboutUs?.description || ''} onChange={e => setAboutUs(prev => prev ? {...prev, description: e.target.value} : null)} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">团队介绍</label><textarea className="w-full border p-2 rounded text-sm h-20" value={aboutUs?.teamInfo || ''} onChange={e => setAboutUs(prev => prev ? {...prev, teamInfo: e.target.value} : null)} /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">联系邮箱</label><input className="w-full border p-2 rounded text-sm" value={aboutUs?.contactEmail || ''} onChange={e => setAboutUs(prev => prev ? {...prev, contactEmail: e.target.value} : null)} /></div>
          </div>
          <div className="mt-4 flex justify-end">
              <button onClick={handleSaveAboutUs} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">保存页脚配置</button>
          </div>
      </div>

      {/* Blog Edit Modal */}
      {isEditingPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                  <div className="p-4 border-b flex justify-between items-center">
                      <h3 className="font-bold text-lg">{editingPost.id ? '编辑文章' : '新增文章'}</h3>
                      <button onClick={() => setIsEditingPost(false)}><X size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">标题</label><input className="w-full border p-2 rounded text-sm" value={editingPost.title || ''} onChange={e => setEditingPost({...editingPost, title: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">作者</label><input className="w-full border p-2 rounded text-sm" value={editingPost.author || ''} onChange={e => setEditingPost({...editingPost, author: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">阅读时间</label><input className="w-full border p-2 rounded text-sm" value={editingPost.readTime || ''} onChange={e => setEditingPost({...editingPost, readTime: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 mb-1">封面图</label>
                              <div className="flex gap-2">
                                  <input className="w-full border p-2 rounded text-sm" value={editingPost.thumbnail || ''} onChange={e => setEditingPost({...editingPost, thumbnail: e.target.value})} />
                                  <label className="p-2 border rounded bg-slate-50 cursor-pointer"><ImageIcon size={16} /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleMediaImport(e, (url) => setEditingPost({...editingPost, thumbnail: url}))} /></label>
                              </div>
                          </div>
                      </div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1">摘要</label><textarea className="w-full border p-2 rounded text-sm h-20" value={editingPost.summary || ''} onChange={e => setEditingPost({...editingPost, summary: e.target.value})} /></div>
                      
                      <div className="border-t border-slate-200 pt-4">
                          <div className="flex justify-between items-center mb-2">
                              <label className="block text-xs font-bold text-slate-500">正文内容 (支持 HTML)</label>
                              <div className="flex gap-2">
                                  <button onClick={() => handleLinkImport((c) => setEditingPost({...editingPost, content: c}))} className="text-xs text-blue-600 font-bold flex items-center gap-1"><LinkIcon size={12} /> 导入链接</button>
                                  <label className="text-xs text-green-600 font-bold flex items-center gap-1 cursor-pointer"><Import size={12} /> 导入文档 <input type="file" className="hidden" onChange={(e) => handleFileImport(e, (c) => setEditingPost({...editingPost, content: c}))} /></label>
                              </div>
                          </div>
                          <textarea className="w-full border p-4 rounded text-sm h-64 font-mono" value={editingPost.content || ''} onChange={e => setEditingPost({...editingPost, content: e.target.value})} placeholder="输入 HTML 内容..." />
                      </div>
                  </div>
                  <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setIsEditingPost(false)} className="px-4 py-2 border rounded text-slate-600 text-sm font-bold">取消</button>
                      <button onClick={handleSavePost} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">保存</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );

  const renderDiagnosisTab = () => (
    <div className="space-y-8 animate-in fade-in">
        {/* Expert Diagnosis Management Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardList size={20} /> 专家人工诊断管理</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                            <th className="p-4">提交时间</th>
                            <th className="p-4">用户</th>
                            <th className="p-4">状态</th>
                            <th className="p-4">当前阶段</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {diagnosisSubmissions.map(sub => (
                            <tr key={sub.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-500 font-mono text-xs">{sub.submittedAt}</td>
                                <td className="p-4 font-bold text-slate-800">{sub.user}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                        sub.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        sub.status === 'preliminary_provided' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                        sub.status === 'report_submitted' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        'bg-green-50 text-green-700 border-green-100'
                                    }`}>
                                        {sub.status === 'new' ? '待专家回复' :
                                         sub.status === 'preliminary_provided' ? '待用户反馈' :
                                         sub.status === 'report_submitted' ? '用户已反馈' : '诊断完成'}
                                    </span>
                                </td>
                                <td className="p-4 text-xs text-slate-500">
                                    {sub.status === 'new' ? '步骤 1: 初步分析' :
                                     sub.status === 'preliminary_provided' ? '步骤 2: 等待补充' :
                                     sub.status === 'report_submitted' ? '步骤 3: 最终方案' : '步骤 4: 结案'}
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button 
                                        onClick={() => setEditingSubmission(sub)}
                                        className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold hover:bg-black transition-colors"
                                    >
                                        处理工单
                                    </button>
                                    <button onClick={() => { if(window.confirm('删除此记录?')) { deleteDiagnosisSubmission(sub.id); setDiagnosisSubmissions(getDiagnosisSubmissions()); } }} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {diagnosisSubmissions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">暂无提交记录</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Widget Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings size={20} /> 博客页诊断组件配置</h3>
            <div className="space-y-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">组件标题</label><input className="w-full border p-2 rounded text-sm" value={diagnosisWidgetConfig.title} onChange={e => setDiagnosisWidgetConfig({...diagnosisWidgetConfig, title: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">组件描述</label><textarea className="w-full border p-2 rounded text-sm h-20" value={diagnosisWidgetConfig.description} onChange={e => setDiagnosisWidgetConfig({...diagnosisWidgetConfig, description: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">高亮标签文字</label><input className="w-full border p-2 rounded text-sm" value={diagnosisWidgetConfig.highlightText || ''} onChange={e => setDiagnosisWidgetConfig({...diagnosisWidgetConfig, highlightText: e.target.value})} /></div>
                <button onClick={handleSaveDiagnosisWidget} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">保存组件配置</button>
            </div>
        </div>

        {/* Issues Management */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Stethoscope size={20} /> 诊断问题预设</h3>
                <button onClick={() => { setEditingIssue({}); setIsEditingIssue(true); }} className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-black"><Plus size={14} /> 新增问题</button>
            </div>
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                    <tr>
                        <th className="p-4">问题标题</th>
                        <th className="p-4">用户预设文本</th>
                        <th className="p-4">AI 初始回复</th>
                        <th className="p-4 text-right">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {diagnosisIssues.map(issue => (
                        <tr key={issue.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold text-slate-800 w-1/4">{issue.title}</td>
                            <td className="p-4 text-slate-600 w-1/4 truncate max-w-xs" title={issue.userText}>{issue.userText}</td>
                            <td className="p-4 text-slate-600 w-1/3 truncate max-w-xs" title={issue.aiResponse}>{issue.aiResponse}</td>
                            <td className="p-4 text-right">
                                <button onClick={() => { setEditingIssue(issue); setIsEditingIssue(true); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded mr-2"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteDiagnosisIssue(issue.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Edit Diagnosis Issue Modal */}
        {isEditingIssue && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl w-full max-w-lg p-6 animate-in zoom-in-95 relative">
                    <button onClick={() => setIsEditingIssue(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                    <h3 className="text-lg font-bold mb-4">{editingIssue.id ? '编辑诊断问题' : '新增诊断问题'}</h3>
                    <div className="space-y-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">问题标题 (显示在下拉框)</label><input className="w-full border p-2 rounded text-sm" value={editingIssue.title || ''} onChange={e => setEditingIssue({...editingIssue, title: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">用户预设文本 (点击开始后自动发送)</label><textarea className="w-full border p-2 rounded text-sm h-20" value={editingIssue.userText || ''} onChange={e => setEditingIssue({...editingIssue, userText: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">AI 初始回复 (第一条回复)</label><textarea className="w-full border p-2 rounded text-sm h-24" value={editingIssue.aiResponse || ''} onChange={e => setEditingIssue({...editingIssue, aiResponse: e.target.value})} /></div>
                        <div className="pt-2 flex justify-end">
                            <button onClick={handleSaveDiagnosisIssue} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">保存</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Expert Diagnosis Management Modal */}
        {editingSubmission && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
                <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Stethoscope size={22} className="text-blue-600" /> 专家诊断工单
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <span>工单 ID: {editingSubmission.id}</span>
                                <span>•</span>
                                <span>用户: {editingSubmission.user}</span>
                                <span>•</span>
                                <span className={`font-bold ${editingSubmission.status === 'new' ? 'text-blue-600' : 'text-green-600'}`}>
                                    {editingSubmission.status === 'new' ? '待回复' : editingSubmission.status}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setEditingSubmission(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
                    </div>

                    {/* Content - Vertical Timeline */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                        <div className="max-w-3xl mx-auto space-y-8 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-200"></div>

                            {/* Step 1: User Request */}
                            <div className="relative pl-12">
                                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center shadow-sm z-10">
                                    <UserIcon size={16} className="text-slate-600" />
                                </div>
                                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-bold text-slate-800">用户提交问题</h4>
                                        <span className="text-xs text-slate-400">{editingSubmission.submittedAt}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                        {editingSubmission.problemDescription}
                                    </p>
                                    {editingSubmission.initialFiles && editingSubmission.initialFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {editingSubmission.initialFiles.map((f, i) => (
                                                <div key={i} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                                    <Paperclip size={12} /> {f}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Expert Preliminary Reply */}
                            <div className="relative pl-12">
                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10 ${editingSubmission.status === 'new' ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                                    <Bot size={16} />
                                </div>
                                <div className={`rounded-xl border p-5 shadow-sm transition-all ${editingSubmission.status === 'new' ? 'bg-white border-blue-300 ring-4 ring-blue-50' : 'bg-slate-50 border-slate-200'}`}>
                                    <h4 className="font-bold text-slate-800 mb-3">专家初步回复与模板提供</h4>
                                    
                                    {editingSubmission.status === 'new' ? (
                                        <div className="space-y-4">
                                            <textarea 
                                                className="w-full border border-slate-300 rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="请输入初步诊断建议，并指导用户填写模板..."
                                                value={editingSubmission.expertPreliminaryReply || ''}
                                                onChange={(e) => handleUpdateSubmissionField('expertPreliminaryReply', e.target.value)}
                                            />
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
                                                    <Paperclip size={14} /> 上传诊断模版
                                                    <input type="file" className="hidden" onChange={(e) => handleFileNameUpload(e, (name) => handleUpdateSubmissionField('templateFile', name))} />
                                                </label>
                                                <span className="text-xs text-slate-500">{editingSubmission.templateFile || '未选择文件'}</span>
                                            </div>
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={() => handleSaveExpertResponse('preliminary_provided')}
                                                    disabled={!editingSubmission.expertPreliminaryReply}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    <Send size={14} /> 发送初步建议
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-slate-700 leading-relaxed mb-3">{editingSubmission.expertPreliminaryReply}</p>
                                            {editingSubmission.templateFile && (
                                                <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 w-fit">
                                                    <FileIcon size={12} /> 已发送模版: {editingSubmission.templateFile}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 3: User Report Upload */}
                            <div className="relative pl-12">
                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10 ${editingSubmission.status === 'preliminary_provided' ? 'bg-orange-100 text-orange-600' : editingSubmission.status === 'new' ? 'bg-slate-100 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                    <UserIcon size={16} />
                                </div>
                                <div className={`rounded-xl border p-5 shadow-sm ${editingSubmission.status === 'preliminary_provided' ? 'bg-orange-50/50 border-orange-200' : 'bg-white border-slate-200'}`}>
                                    <h4 className="font-bold text-slate-800 mb-3">用户反馈与报告上传</h4>
                                    
                                    {['new', 'preliminary_provided'].includes(editingSubmission.status) ? (
                                        <div className="text-center py-6 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg">
                                            {editingSubmission.status === 'new' ? '等待专家初步回复...' : '等待用户提交报告...'}
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                                                {editingSubmission.userReportDescription}
                                            </p>
                                            {editingSubmission.userReportFile && (
                                                <div className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100 w-fit">
                                                    <FileSpreadsheet size={12} /> 用户报告: {editingSubmission.userReportFile}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 4: Final Solution */}
                            <div className="relative pl-12">
                                <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10 ${editingSubmission.status === 'report_submitted' ? 'bg-green-600 text-white animate-pulse' : 'bg-green-100 text-green-600'}`}>
                                    <CheckCircle size={16} />
                                </div>
                                <div className={`rounded-xl border p-5 shadow-sm transition-all ${editingSubmission.status === 'report_submitted' ? 'bg-white border-green-300 ring-4 ring-green-50' : 'bg-slate-50 border-slate-200'}`}>
                                    <h4 className="font-bold text-slate-800 mb-3">专家最终诊断方案</h4>
                                    
                                    {editingSubmission.status === 'report_submitted' ? (
                                        <div className="space-y-4">
                                            <textarea 
                                                className="w-full border border-slate-300 rounded-lg p-3 text-sm h-40 focus:ring-2 focus:ring-green-500 outline-none"
                                                placeholder="请输入最终诊断结论和建议..."
                                                value={editingSubmission.expertFinalReply || ''}
                                                onChange={(e) => handleUpdateSubmissionField('expertFinalReply', e.target.value)}
                                            />
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
                                                    <Paperclip size={14} /> 上传最终方案报告
                                                    <input type="file" className="hidden" onChange={(e) => handleFileNameUpload(e, (name) => handleUpdateSubmissionField('expertFinalFile', name))} />
                                                </label>
                                                <span className="text-xs text-slate-500">{editingSubmission.expertFinalFile || '未选择文件'}</span>
                                            </div>
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={() => handleSaveExpertResponse('final_provided')}
                                                    disabled={!editingSubmission.expertFinalReply}
                                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    <CheckCircle size={14} /> 完成诊断并发送
                                                </button>
                                            </div>
                                        </div>
                                    ) : editingSubmission.status === 'final_provided' ? (
                                        <div>
                                            <p className="text-sm text-slate-700 leading-relaxed mb-3">{editingSubmission.expertFinalReply}</p>
                                            {editingSubmission.expertFinalFile && (
                                                <div className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 w-fit">
                                                    <FileText size={12} /> 最终方案: {editingSubmission.expertFinalFile}
                                                </div>
                                            )}
                                            <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
                                                <Check size={12} /> 工单已归档
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-sm italic">等待前序步骤完成...</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  const renderResourceTab = () => (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800">知识库资源管理</h2>
            <button onClick={() => { setEditingCategory({}); setIsEditingCategory(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Plus size={16} /> 新增分类</button>
        </div>

        <div className="flex gap-4 border-b border-slate-200 mb-6">
            <button onClick={() => setActiveResourceSection('ai_reply')} className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors ${activeResourceSection === 'ai_reply' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>AI 知识库 (RAG)</button>
            <button onClick={() => setActiveResourceSection('diagnosis_tools')} className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors ${activeResourceSection === 'diagnosis_tools' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>诊断工具箱</button>
            <button onClick={() => setActiveResourceSection('project_reports')} className={`pb-2 px-4 font-bold text-sm border-b-2 transition-colors ${activeResourceSection === 'project_reports' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>项目报告归档</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {knowledgeCategories.filter(c => c.section === activeResourceSection).map(category => (
                <div key={category.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative group">
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingCategory(category); setIsEditingCategory(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteKnowledgeCategory(category.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-3 h-3 rounded-full bg-${category.color}-500`}></div>
                        <h3 className="font-bold text-lg text-slate-800">{category.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${category.requiredPlan === 'pro' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{category.requiredPlan === 'pro' ? 'PRO' : 'Free'}</span>
                    </div>
                    
                    <div className="space-y-2">
                        {category.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded border border-slate-100">
                                <div className="flex items-center gap-2">
                                    {getFileTypeInfo(item.title).icon}
                                    <span className="truncate max-w-[180px]">{item.title}</span>
                                </div>
                                <span className="text-slate-400 text-xs">{item.size}</span>
                            </div>
                        ))}
                        {category.items.length === 0 && <div className="text-center text-slate-400 text-xs py-2">暂无文件</div>}
                    </div>
                </div>
            ))}
            {knowledgeCategories.filter(c => c.section === activeResourceSection).length === 0 && (
                <div className="col-span-2 text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">暂无分类，请点击右上角添加</div>
            )}
        </div>

        {isEditingCategory && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[90vh]">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-lg">{editingCategory.id ? '编辑分类' : '新增分类'}</h3>
                        <button onClick={() => setIsEditingCategory(false)}><X size={20} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">分类名称</label><input className="w-full border p-2 rounded text-sm" value={editingCategory.name || ''} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">颜色标记</label>
                                <select className="w-full border p-2 rounded text-sm bg-white" value={editingCategory.color || 'blue'} onChange={e => setEditingCategory({...editingCategory, color: e.target.value})}>
                                    {['blue', 'red', 'green', 'yellow', 'purple', 'indigo', 'pink', 'orange', 'teal', 'cyan'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">所需权限</label>
                                <select className="w-full border p-2 rounded text-sm bg-white" value={editingCategory.requiredPlan || 'free'} onChange={e => setEditingCategory({...editingCategory, requiredPlan: e.target.value as any})}>
                                    <option value="free">免费 (Free)</option>
                                    <option value="pro">专业版 (Pro)</option>
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-slate-500">包含文件</label>
                                <label className="text-xs font-bold text-blue-600 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                    + 上传文件 <input type="file" multiple className="hidden" onChange={handleResourceUpload} />
                                </label>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-200">
                                {editingCategory.items?.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-100 shadow-sm">
                                        {getFileTypeInfo(item.title).icon}
                                        <div className="flex-1 min-w-0">
                                            <input className="w-full text-sm border-none p-0 focus:ring-0" value={item.title} onChange={(e) => updateResourceItem(idx, 'title', e.target.value)} />
                                        </div>
                                        <span className="text-xs text-slate-400 w-16 text-right">{item.size}</span>
                                        <button onClick={() => removeResourceItem(idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                                {(!editingCategory.items || editingCategory.items.length === 0) && <div className="text-center text-slate-400 text-xs py-4">暂无文件</div>}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                        <button onClick={() => setIsEditingCategory(false)} className="px-4 py-2 border rounded text-slate-600 text-sm font-bold">取消</button>
                        <button onClick={handleSaveCategory} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">保存分类</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  const renderSolutionTab = () => {
      const filteredLessons = lessons.filter(l => l.title.toLowerCase().includes(lessonSearchQuery.toLowerCase()) || l.category?.toLowerCase().includes(lessonSearchQuery.toLowerCase()));

      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <MonitorPlay size={24} className="text-blue-600" />
                      视频课程库管理
                  </h2>
                  <button 
                      onClick={() => { 
                          setEditingLesson({}); 
                          setLessonVideoSourceType('link'); 
                          setLessonCoverSourceType('link');
                          setTranscriptText('');
                          setIsEditingLesson(true); 
                      }} 
                      className="bg-blue-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap"
                  >
                      <Plus size={18} /> 新增课程
                  </button>
              </div>

              {/* ... (Search Bar) ... */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                          type="text" 
                          placeholder="搜索课程标题或分类..." 
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          value={lessonSearchQuery}
                          onChange={(e) => setLessonSearchQuery(e.target.value)}
                      />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="font-bold">{filteredLessons.length}</span> 个课程
                  </div>
              </div>

              {/* ... (Table) ... */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                              <th className="p-4 pl-6 font-bold w-20">封面</th>
                              <th className="p-4 font-bold">课程信息</th>
                              <th className="p-4 font-bold">分类</th>
                              <th className="p-4 font-bold">时长</th>
                              <th className="p-4 font-bold">适用用户</th>
                              <th className="p-4 font-bold text-right pr-6">操作</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredLessons.map(lesson => (
                              <tr key={lesson.id} className="hover:bg-blue-50/30 transition-colors group">
                                  <td className="p-4 pl-6">
                                      <div className="w-16 h-10 rounded-md overflow-hidden bg-slate-200 relative">
                                          <img src={lesson.thumbnail} alt="" className="w-full h-full object-cover" />
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="font-bold text-slate-800 line-clamp-1">{lesson.title}</div>
                                      <div className="text-xs text-slate-400 mt-0.5">ID: {lesson.id}</div>
                                  </td>
                                  <td className="p-4">
                                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{lesson.category || '通用'}</span>
                                  </td>
                                  <td className="p-4 font-mono text-slate-600 text-xs">{lesson.duration}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 text-xs rounded font-bold border ${lesson.requiredPlan === 'pro' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                          {lesson.requiredPlan === 'pro' ? 'PRO 会员' : '免费用户'}
                                      </span>
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleEditLesson(lesson)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                                              <Edit size={16} />
                                          </button>
                                          <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredLessons.length === 0 && (
                              <tr><td colSpan={6} className="p-8 text-center text-slate-400">未找到课程</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>

              {isEditingLesson && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
                      <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                  {editingLesson.id ? <Edit size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
                                  {editingLesson.id ? '编辑视频课程' : '新增视频课程'}
                              </h3>
                              <button onClick={() => setIsEditingLesson(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                  <X size={24} />
                              </button>
                          </div>

                          <div className="flex-1 flex overflow-hidden bg-slate-50">
                              <div className="w-5/12 p-6 overflow-y-auto border-r border-slate-200 bg-white">
                                  {/* ... (Left Side Fields remain the same) ... */}
                                  <div className="space-y-6">
                                      
                                      <div>
                                          <label className="block text-sm font-bold text-slate-900 mb-2">课程标题</label>
                                          <input 
                                              className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                              value={editingLesson.title || ''}
                                              onChange={(e) => setEditingLesson({...editingLesson, title: e.target.value})}
                                              placeholder="请输入课程名称"
                                          />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <label className="block text-sm font-bold text-slate-900 mb-2">课程分类</label>
                                              <input 
                                                  list="categories"
                                                  className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                  value={editingLesson.category || ''}
                                                  onChange={(e) => setEditingLesson({...editingLesson, category: e.target.value})}
                                                  placeholder="选择或输入分类"
                                              />
                                              <datalist id="categories">
                                                  <option value="人员管理" />
                                                  <option value="WFM管理" />
                                                  <option value="质量与体验" />
                                                  <option value="运营效率" />
                                              </datalist>
                                          </div>
                                          <div>
                                              <label className="block text-sm font-bold text-slate-900 mb-2">适用用户</label>
                                              <select 
                                                  className="w-full border border-slate-300 p-3 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                  value={editingLesson.requiredPlan || 'free'}
                                                  onChange={(e) => setEditingLesson({...editingLesson, requiredPlan: e.target.value as 'free'|'pro'})}
                                              >
                                                  <option value="free">免费用户 (Free)</option>
                                                  <option value="pro">专业版 (Pro Only)</option>
                                              </select>
                                          </div>
                                      </div>

                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                          <label className="block text-sm font-bold text-slate-900 mb-3">视频源 (二选一)</label>
                                          <div className="flex gap-6 mb-4">
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                  <input type="radio" name="videoSourceType" checked={lessonVideoSourceType === 'link'} onChange={() => setLessonVideoSourceType('link')} className="text-blue-600" />
                                                  <span className="text-sm font-medium">方式A: 外部链接</span>
                                              </label>
                                              <label className="flex items-center gap-2 cursor-pointer">
                                                  <input type="radio" name="videoSourceType" checked={lessonVideoSourceType === 'upload'} onChange={() => setLessonVideoSourceType('upload')} className="text-blue-600" />
                                                  <span className="text-sm font-medium">方式B: 本地上传</span>
                                              </label>
                                          </div>
                                          
                                          {lessonVideoSourceType === 'link' ? (
                                              <input 
                                                  className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                  value={editingLesson.videoUrl || ''}
                                                  onChange={(e) => setEditingLesson({...editingLesson, videoUrl: e.target.value})}
                                                  placeholder="输入 https://..."
                                              />
                                          ) : (
                                              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                                                  <div className="flex flex-col items-center pt-2 pb-3">
                                                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                                                      <p className="text-xs text-slate-500">点击上传视频文件 (MP4/WebM)</p>
                                                  </div>
                                                  <input type="file" className="hidden" accept="video/*" onChange={(e) => { if(e.target.files?.[0]) setEditingLesson({...editingLesson, videoUrl: URL.createObjectURL(e.target.files[0])}) }} />
                                              </label>
                                          )}
                                          {editingLesson.videoUrl && <div className="mt-2 text-[10px] text-slate-400 truncate">当前源: {editingLesson.videoUrl}</div>}
                                      </div>

                                      <div>
                                          <label className="block text-sm font-bold text-slate-900 mb-2">封面 (Cover)</label>
                                          <div className="flex gap-4">
                                              <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                  {editingLesson.thumbnail ? <img src={editingLesson.thumbnail} alt="Cover" className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" />}
                                              </div>
                                              <div className="flex-1 space-y-3">
                                                  <input 
                                                      className="w-full border border-slate-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                      value={editingLesson.thumbnail || ''}
                                                      onChange={(e) => setEditingLesson({...editingLesson, thumbnail: e.target.value})}
                                                      placeholder="封面图片 URL"
                                                  />
                                                  <label className="w-full py-2 border border-slate-300 rounded-lg bg-white text-sm font-bold text-slate-600 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                                                      <Upload size={14} /> 上传
                                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaImport(e, (url) => setEditingLesson({...editingLesson, thumbnail: url}))} />
                                                  </label>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <label className="block text-sm font-bold text-slate-900 mb-2">时长</label>
                                              <input 
                                                  className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                  value={editingLesson.duration || ''}
                                                  onChange={(e) => setEditingLesson({...editingLesson, duration: e.target.value})}
                                                  placeholder="例如: 08:45"
                                              />
                                          </div>
                                      </div>

                                  </div>
                              </div>

                              <div className="w-7/12 p-6 flex flex-col h-full bg-slate-50">
                                  <div className="flex justify-between items-end mb-2">
                                      <label className="text-sm font-bold text-slate-900">逐字稿 (支持时间戳)</label>
                                      <div className="flex gap-2">
                                          <div className="flex items-center bg-white border border-blue-200 rounded-lg p-1 pl-2 shadow-sm">
                                              <select 
                                                  className="text-xs font-medium text-slate-700 bg-transparent outline-none mr-2 w-24"
                                                  value={selectedAIModel}
                                                  onChange={(e) => setSelectedAIModel(e.target.value)}
                                              >
                                                  {VIDEO_AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                              </select>
                                              <button 
                                                  onClick={handleGenerateTranscript}
                                                  disabled={isGeneratingTranscript || !editingLesson.title}
                                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                  {isGeneratingTranscript ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                  AI解析生成
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex-1 relative rounded-xl border border-slate-300 bg-white overflow-hidden shadow-inner flex flex-col">
                                      <textarea 
                                          className="flex-1 w-full h-full p-4 text-sm font-mono text-slate-600 bg-transparent outline-none resize-none leading-relaxed"
                                          value={transcriptText}
                                          onChange={(e) => setTranscriptText(e.target.value)}
                                          placeholder={`0 | 大家好，欢迎来到本课程...\n5 | 今天我们要讲的是...\n(格式: 秒数 | 内容)`}
                                      />
                                      <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                          <span className="text-[10px] text-slate-400">提示：每行一条，使用 "秒数 | 内容" 格式。AI 生成后可手动微调。</span>
                                          <label className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                                              <Import size={12} /> 导入文本
                                              <input type="file" className="hidden" accept=".txt,.srt,.vtt" onChange={(e) => handleTranscriptImport(e, (text) => setTranscriptText(text))} />
                                          </label>
                                      </div>
                                  </div>
                              </div>

                          </div>

                          <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                              <button onClick={() => setIsEditingLesson(false)} className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                                  取消
                              </button>
                              <button onClick={handleSaveLesson} className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                                  保存项目
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderUsersTab = () => {
    const handleEditPlansConfig = (plan: 'free' | 'pro', field: 'title' | 'subtitle' | 'buttonText', val: string) => {
       if(!plansConfig) return;
       const newConfig = { ...plansConfig };
       newConfig[plan][field] = val;
       setPlansConfig(newConfig);
    };

    const handleAddPlanFeature = (plan: 'free' | 'pro') => {
        if(!plansConfig) return;
        const newConfig = { ...plansConfig };
        newConfig[plan].features.push({ text: '新功能特性', icon: 'Check' });
        setPlansConfig(newConfig);
    };

    const handleRemovePlanFeature = (plan: 'free' | 'pro', idx: number) => {
        if(!plansConfig) return;
        const newConfig = { ...plansConfig };
        newConfig[plan].features.splice(idx, 1);
        setPlansConfig(newConfig);
    };

    const handleEditPlanFeature = (plan: 'free' | 'pro', idx: number, field: keyof PlanFeature, val: any) => {
        if(!plansConfig) return;
        const newConfig = { ...plansConfig };
        newConfig[plan].features[idx] = { ...newConfig[plan].features[idx], [field]: val };
        setPlansConfig(newConfig);
    };

    const renderDetailModal = () => {
        if (!selectedUserForDetail) return null;
        const targetUser = users.find(u => u.id === selectedUserForDetail);
        if (!targetUser) return null;

        const userWatched = getWatchedHistory().filter(h => h.userId === targetUser.id);
        const userRead = getReadHistory().filter(h => h.userId === targetUser.id);
        const userNotes = getAdminNotes().filter(n => n.userId === targetUser.id);
        const userUploads = getUserUploads().filter(u => u.userId === targetUser.id);
        const userDiagnoses = getDiagnosisSubmissions().filter(d => d.userId === targetUser.id);

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in">
               <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden shadow-2xl animate-in zoom-in-95">
                  <div className="w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                              {targetUser.name.charAt(0)}
                          </div>
                          <div>
                              <h2 className="font-bold text-xl text-slate-900">{targetUser.name}</h2>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${targetUser.plan === 'pro' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                  {targetUser.plan === 'pro' ? 'PRO Member' : 'Free Plan'}
                              </span>
                          </div>
                      </div>
                      
                      <div className="space-y-4 flex-1">
                          <div><label className="text-xs font-bold text-slate-400 uppercase">邮箱</label><div className="text-sm font-medium">{targetUser.email}</div></div>
                          <div><label className="text-xs font-bold text-slate-400 uppercase">手机</label><div className="text-sm font-medium">{targetUser.phone || '-'}</div></div>
                          <div><label className="text-xs font-bold text-slate-400 uppercase">角色</label><div className="text-sm font-medium capitalize">{targetUser.role}</div></div>
                      </div>

                      <div className="mt-auto pt-6 border-t border-slate-200">
                          <button onClick={() => setSelectedUserForDetail(null)} className="w-full py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100">关闭</button>
                      </div>
                  </div>

                  <div className="flex-1 flex flex-col bg-white overflow-hidden">
                      <div className="overflow-y-auto p-8 space-y-8">
                          <div>
                              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Video size={18} /> 视频观看历史 ({userWatched.length})</h3>
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                  {userWatched.length === 0 ? <div className="p-6 text-center text-slate-400 text-sm">暂无记录</div> : 
                                    userWatched.map((w, i) => {
                                        const lesson = lessons.find(l => l.id === w.lessonId);
                                        return (
                                            <div key={i} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 flex items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-slate-800">{lesson?.title || 'Unknown Video'}</div>
                                                    <div className="text-xs text-slate-500 mt-1">观看时间: {w.watchedAt}</div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">进度: {w.progress}%</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                  }
                              </div>
                          </div>

                          <div>
                              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><BookOpen size={18} /> 文章阅读历史 ({userRead.length})</h3>
                              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                  {userRead.length === 0 ? <div className="p-6 text-center text-slate-400 text-sm">暂无记录</div> : 
                                    userRead.map((r, i) => {
                                        const post = blogPosts.find(p => p.id === r.articleId);
                                        return (
                                            <div key={i} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 flex justify-between items-center">
                                                <div className="font-bold text-sm text-slate-800">{post?.title || 'Unknown Article'}</div>
                                                <div className="text-xs text-slate-500">{r.readAt}</div>
                                            </div>
                                        );
                                    })
                                  }
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                              <div>
                                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><PenTool size={18} /> 学习笔记 ({userNotes.length})</h3>
                                  <div className="bg-slate-50 rounded-xl p-4 h-48 overflow-y-auto border border-slate-200 space-y-2">
                                      {userNotes.map((n, i) => (
                                          <div key={i} className="bg-white p-3 rounded border border-slate-100 text-xs">
                                              <div className="font-bold text-slate-700 mb-1">{n.lessonTitle}</div>
                                              <div className="text-slate-500">{n.content}</div>
                                          </div>
                                      ))}
                                      {userNotes.length === 0 && <div className="text-center text-slate-400 text-xs mt-10">暂无笔记</div>}
                                  </div>
                              </div>
                              <div>
                                  <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Upload size={18} /> 上传与诊断</h3>
                                  <div className="bg-slate-50 rounded-xl p-4 h-48 overflow-y-auto border border-slate-200 space-y-2">
                                      {userUploads.map((u, i) => (
                                          <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                                              <span>📄 {u.fileName}</span>
                                              <span className="text-slate-400">{u.uploadDate}</span>
                                          </div>
                                      ))}
                                      {userDiagnoses.map((d, i) => (
                                          <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                                              <span className="text-purple-600 font-bold">🩺 诊断提交</span>
                                              <span className="text-slate-400">{d.submittedAt}</span>
                                          </div>
                                      ))}
                                      {userUploads.length === 0 && userDiagnoses.length === 0 && <div className="text-center text-slate-400 text-xs mt-10">暂无记录</div>}
                                  </div>
                              </div>
                          </div>

                      </div>
                  </div>
               </div>
            </div>
        );
    };

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex gap-6 mb-6 border-b border-slate-200">
          <button onClick={() => setUserSubTab('list')} className={`px-2 py-3 border-b-2 text-sm font-bold transition-colors flex items-center gap-2 ${userSubTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
             <UserIcon size={16} /> 用户列表
          </button>
          <button onClick={() => setUserSubTab('plans')} className={`px-2 py-3 border-b-2 text-sm font-bold transition-colors flex items-center gap-2 ${userSubTab === 'plans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
             <CreditCard size={16} /> 订阅配置
          </button>
          <button onClick={() => setUserSubTab('permissions')} className={`px-2 py-3 border-b-2 text-sm font-bold transition-colors flex items-center gap-2 ${userSubTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
             <Lock size={16} /> 权限配置
          </button>
          <button onClick={() => setUserSubTab('business')} className={`px-2 py-3 border-b-2 text-sm font-bold transition-colors flex items-center gap-2 ${userSubTab === 'business' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
             <Briefcase size={16} /> 商务对接
          </button>
        </div>

        {userSubTab === 'list' && (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users size={20} /> 用户列表</h3>
                    <button onClick={() => { setEditingUser({}); setIsEditingUser(true); }} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-black transition-colors"><Plus size={14} /> 新增用户</button>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" className="rounded" /></th>
                            <th className="p-4 font-bold w-1/4">姓名</th>
                            <th className="p-4 font-bold w-1/3">邮箱</th>
                            <th className="p-4 font-bold">角色</th>
                            <th className="p-4 font-bold">订阅计划</th>
                            <th className="p-4 font-bold text-right pr-6">操作</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-4"><input type="checkbox" className="rounded" /></td>
                                <td className="p-4 font-bold text-slate-800">{u.name}</td>
                                <td className="p-4 text-slate-500">{u.email}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{u.plan}</span></td>
                                <td className="p-4 pr-6 text-right flex justify-end gap-3 items-center">
                                    <button onClick={() => setSelectedUserForDetail(u.id)} className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 transition-colors">查看数据</button>
                                    <button onClick={() => { setEditingUser(u); setIsEditingUser(true); }} className="text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {userSubTab === 'plans' && plansConfig && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CreditCard size={20} /> 订阅计划配置</h3>
                    <button onClick={handleSavePlanConfig} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> 保存配置</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-slate-500 font-bold uppercase text-xs tracking-wider"><div className="w-2 h-2 rounded-full bg-slate-400"></div> 免费版 (Free)</div>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-500">计划标题</label><input className="w-full border p-2 rounded text-sm mt-1" value={plansConfig.free.title} onChange={(e) => handleEditPlansConfig('free', 'title', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-slate-500">副标题</label><input className="w-full border p-2 rounded text-sm mt-1" value={plansConfig.free.subtitle} onChange={(e) => handleEditPlansConfig('free', 'subtitle', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-slate-500">按钮文本</label><input className="w-full border p-2 rounded text-sm mt-1" value={plansConfig.free.buttonText} onChange={(e) => handleEditPlansConfig('free', 'buttonText', e.target.value)} /></div>
                            
                            <div className="pt-4 border-t border-slate-100">
                                <label className="text-xs font-bold text-slate-500 mb-2 block">功能列表</label>
                                <div className="space-y-2">
                                    {plansConfig.free.features.map((feat, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select className="border p-1.5 rounded text-xs w-24" value={feat.icon} onChange={(e) => handleEditPlanFeature('free', idx, 'icon', e.target.value)}>
                                                {['Video', 'Zap', 'Check', 'ArrowUpRight', 'FileText', 'Star'].map(i => <option key={i} value={i}>{i}</option>)}
                                            </select>
                                            <input className="flex-1 border p-1.5 rounded text-xs" value={feat.text} onChange={(e) => handleEditPlanFeature('free', idx, 'text', e.target.value)} />
                                            <button onClick={() => handleRemovePlanFeature('free', idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => handleAddPlanFeature('free')} className="text-xs text-blue-600 font-bold mt-2 flex items-center gap-1 hover:underline">+ 添加功能项</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold uppercase text-xs tracking-wider"><div className="w-2 h-2 rounded-full bg-blue-600"></div> 专业版 (PRO)</div>
                        <div className="space-y-4 relative z-10">
                            <div><label className="text-xs font-bold text-blue-400">计划标题</label><input className="w-full border border-blue-200 p-2 rounded text-sm mt-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={plansConfig.pro.title} onChange={(e) => handleEditPlansConfig('pro', 'title', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-blue-400">副标题</label><input className="w-full border border-blue-200 p-2 rounded text-sm mt-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={plansConfig.pro.subtitle} onChange={(e) => handleEditPlansConfig('pro', 'subtitle', e.target.value)} /></div>
                            <div><label className="text-xs font-bold text-blue-400">按钮文本</label><input className="w-full border border-blue-200 p-2 rounded text-sm mt-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={plansConfig.pro.buttonText} onChange={(e) => handleEditPlansConfig('pro', 'buttonText', e.target.value)} /></div>
                            
                            <div className="pt-4 border-t border-blue-200">
                                <label className="text-xs font-bold text-blue-400 mb-2 block">功能列表</label>
                                <div className="space-y-2">
                                    {plansConfig.pro.features.map((feat, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select className="border border-blue-200 p-1.5 rounded text-xs w-24 bg-white" value={feat.icon} onChange={(e) => handleEditPlanFeature('pro', idx, 'icon', e.target.value)}>
                                                {['Video', 'Zap', 'Check', 'ArrowUpRight', 'FileText', 'Star'].map(i => <option key={i} value={i}>{i}</option>)}
                                            </select>
                                            <input className="flex-1 border border-blue-200 p-1.5 rounded text-xs bg-white" value={feat.text} onChange={(e) => handleEditPlanFeature('pro', idx, 'text', e.target.value)} />
                                            <button onClick={() => handleRemovePlanFeature('pro', idx)} className="text-blue-300 hover:text-red-500"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => handleAddPlanFeature('pro')} className="text-xs text-blue-600 font-bold mt-2 flex items-center gap-1 hover:underline">+ 添加功能项</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {userSubTab === 'permissions' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Lock size={20} /> 权限模块配置</h3>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">新增权限定义</label>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1"><input className="w-full border p-2 rounded text-sm" placeholder="Key (e.g. export_data)" value={newPermission.key} onChange={e => setNewPermission({...newPermission, key: e.target.value})} /></div>
                            <div className="flex-1"><input className="w-full border p-2 rounded text-sm" placeholder="Label (e.g. 导出数据)" value={newPermission.label} onChange={e => setNewPermission({...newPermission, label: e.target.value})} /></div>
                            <div className="flex-1"><input className="w-full border p-2 rounded text-sm" placeholder="Module (e.g. 报表)" value={newPermission.module} onChange={e => setNewPermission({...newPermission, module: e.target.value})} /></div>
                            <button onClick={handleAddPermission} className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-700">添加</button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold">
                                <tr>
                                    <th className="p-4">模块</th>
                                    <th className="p-4">权限名称</th>
                                    <th className="p-4 text-slate-400 font-mono text-xs">Key</th>
                                    <th className="p-4 text-center w-32">免费版 (Free)</th>
                                    <th className="p-4 text-center w-32">专业版 (Pro)</th>
                                    <th className="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {permissions.map((p) => (
                                    <tr key={p.key} className="hover:bg-slate-50">
                                        <td className="p-4 text-slate-500">{p.module || '通用'}</td>
                                        <td className="p-4 font-bold text-slate-800">{p.label}</td>
                                        <td className="p-4 text-slate-400 font-mono text-xs">{p.key}</td>
                                        <td className="p-4 text-center">
                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={permConfig.free[p.key] || false} onChange={() => togglePermission('free', p.key)} />
                                        </td>
                                        <td className="p-4 text-center">
                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={permConfig.pro[p.key] || false} onChange={() => togglePermission('pro', p.key)} />
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeletePermission(p.key)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {userSubTab === 'business' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Smartphone size={20} /> 商务联系人配置</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">联系人姓名</label>
                                <input className="w-full border p-3 rounded-lg text-sm" value={businessContact?.contactPerson || ''} onChange={(e) => setBusinessContact(prev => prev ? {...prev, contactPerson: e.target.value} : null)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">微信号 / 电话</label>
                                <input className="w-full border p-3 rounded-lg text-sm" value={businessContact?.contactMethod || ''} onChange={(e) => setBusinessContact(prev => prev ? {...prev, contactMethod: e.target.value} : null)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">联系邮箱</label>
                                <input className="w-full border p-3 rounded-lg text-sm" value={businessContact?.email || ''} onChange={(e) => setBusinessContact(prev => prev ? {...prev, email: e.target.value} : null)} />
                            </div>
                            <button onClick={handleSaveBusinessConfig} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 mt-2">保存配置</button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><QrCode size={20} /> 支付/商务二维码</h3>
                        <div className="flex gap-6 items-start">
                            <div className="w-32 h-32 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                                {paymentQR ? <img src={paymentQR} className="w-full h-full object-contain" /> : <QrCode size={32} className="text-slate-300" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed">此二维码将显示在“升级计划”页面，供用户扫码联系商务或支付。</p>
                                <label className="inline-block px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
                                    上传图片 <input type="file" className="hidden" accept="image/*" onChange={handleQRUpload} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase size={20} /> 销售线索 (Leads)</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                <tr>
                                    <th className="p-4">提交时间</th>
                                    <th className="p-4">姓名/职位</th>
                                    <th className="p-4">联系方式</th>
                                    <th className="p-4">状态</th>
                                    <th className="p-4 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {businessLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50">
                                        <td className="p-4 text-xs text-slate-500 font-mono">{lead.submittedAt}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{lead.name}</div>
                                            <div className="text-xs text-slate-500">{lead.position} @ {lead.company}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs">{lead.phone}</div>
                                            <div className="text-xs text-slate-400">{lead.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <select 
                                                className={`text-xs font-bold px-2 py-1 rounded border outline-none ${lead.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                                                value={lead.status}
                                                onChange={(e) => { updateBusinessLeadStatus(lead.id, e.target.value as any); setBusinessLeads(getBusinessLeads()); }}
                                            >
                                                <option value="new">新线索</option>
                                                <option value="contacted">已跟进</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDeleteLead(lead.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {businessLeads.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">暂无销售线索</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {isEditingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6 animate-in zoom-in-95 relative">
              <button onClick={() => setIsEditingUser(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              <h3 className="text-lg font-bold mb-4">{editingUser.id ? '编辑用户' : '添加用户'}</h3>
              <div className="space-y-4">
                <div><label className="block text-sm font-bold text-slate-700 mb-1">姓名</label><input className="w-full border p-2 rounded-lg text-sm" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">邮箱</label><input className="w-full border p-2 rounded-lg text-sm" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">角色</label><select className="w-full border p-2 rounded-lg text-sm bg-white" value={editingUser.role || 'user'} onChange={e => setEditingUser({...editingUser, role: e.target.value as 'admin'|'user'})}><option value="user">用户</option><option value="admin">管理员</option></select></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-1">计划</label><select className="w-full border p-2 rounded-lg text-sm bg-white" value={editingUser.plan || 'free'} onChange={e => setEditingUser({...editingUser, plan: e.target.value as 'free'|'pro'})}><option value="free">免费版</option><option value="pro">专业版</option></select></div>
                </div>
                <div className="pt-4 flex justify-end"><button onClick={handleSaveUser} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">保存用户</button></div>
              </div>
            </div>
          </div>
        )}

        {renderDetailModal()}
      </div>
    );
  };

  const renderBehaviorTab = () => {
    const filteredActivities = activities.filter(a => 
      (behaviorFilterUser === 'all' || a.userId === behaviorFilterUser) &&
      (behaviorFilterType === 'all' || a.type === behaviorFilterType)
    );

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex gap-6 mb-6 border-b border-slate-200">
          <button onClick={() => setBehaviorTab('overview')} className={`px-2 py-3 border-b-2 text-sm font-bold transition-colors flex items-center gap-2 ${behaviorTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
             <Activity size={16} /> 概览与统计
          </button>
          <button onClick={() => setBehaviorTab('activity')} className={`px-2 py-3 border-b-2 text-sm font-bold transition-colors flex items-center gap-2 ${behaviorTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
             <List size={16} /> 行动日志
          </button>
          <button onClick={() => setBehaviorTab('notes')} className={`px-2 py-3 border-b-2 text-sm font-bold transition-colors flex items-center gap-2 ${behaviorTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
             <MessageSquare size={16} /> 笔记与留言管理
          </button>
        </div>
        
        {behaviorTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                 <div className="text-xs font-bold text-slate-500 uppercase">总互动次数</div>
                 <div className="text-4xl font-bold text-slate-900">{stats.totalInteractions}</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                 <div className="text-xs font-bold text-slate-500 uppercase">笔记与提问</div>
                 <div className="text-4xl font-bold text-blue-600">{stats.notesCount}</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                 <div className="text-xs font-bold text-slate-500 uppercase">学习视频数</div>
                 <div className="text-4xl font-bold text-purple-600">{stats.videoCount}</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between h-32">
                 <div className="text-xs font-bold text-slate-500 uppercase">活跃用户</div>
                 <div className="text-4xl font-bold text-green-600">{stats.activeUsers}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} /> 热门内容排名</h3>
                    <div className="space-y-4">
                        {popularContent.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-slate-800 truncate font-medium">{item.title}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        {item.type === 'video' ? <Video size={10} /> : <BookOpen size={10} />}
                                        {item.count} 次学习
                                    </div>
                                </div>
                            </div>
                        ))}
                        {popularContent.length === 0 && <div className="text-sm text-slate-400 text-center py-4">暂无数据</div>}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 size={18} /> 最近活跃动态</h3>
                    <div className="space-y-6">
                        {activities.slice(0, 6).map(activity => (
                            <div key={activity.id} className="flex items-start gap-4 relative pl-4">
                                <div className="absolute left-0 top-2 bottom-[-24px] w-px bg-slate-100 last:hidden"></div>
                                
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 z-10 ${
                                    activity.type === 'video' ? 'bg-purple-500' :
                                    activity.type === 'note' ? 'bg-blue-500' :
                                    activity.type === 'upload' ? 'bg-slate-500' :
                                    activity.type === 'diagnosis' ? 'bg-green-500' : 'bg-orange-500'
                                }`}>
                                    {activity.type === 'video' && <Video size={18} />}
                                    {activity.type === 'note' && <MessageSquare size={18} />}
                                    {activity.type === 'upload' && <Upload size={18} />}
                                    {activity.type === 'diagnosis' && <Stethoscope size={18} />}
                                    {activity.type === 'article' && <BookOpen size={18} />}
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-slate-800 text-sm">{activity.userName}</span>
                                        <span className="text-xs text-slate-400 font-mono">{activity.date}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">{activity.action}</div>
                                    <div className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                                        {activity.target}
                                        {activity.detail && <div className="text-xs text-slate-400 mt-1">{activity.detail}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}
        
        {behaviorTab === 'activity' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">筛选:</span>
                </div>
                
                <select className="text-sm border border-slate-300 p-2 rounded-lg bg-white outline-none min-w-[120px]" value={behaviorFilterUser} onChange={(e) => setBehaviorFilterUser(e.target.value)}>
                    <option value="all">所有用户</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>

                <select className="text-sm border border-slate-300 p-2 rounded-lg bg-white outline-none min-w-[120px]" value={behaviorFilterType} onChange={(e) => setBehaviorFilterType(e.target.value)}>
                    <option value="all">所有类型</option>
                    <option value="video">观看视频</option>
                    <option value="article">阅读文章</option>
                    <option value="note">笔记/留言</option>
                    <option value="upload">文件上传</option>
                    <option value="diagnosis">诊断提交</option>
                </select>

                <div className="ml-auto">
                    <button onClick={handleBehaviorExport} className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                        <Download size={16} /> 导出选中
                    </button>
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th className="p-4 w-10">
                                <input type="checkbox" className="rounded border-slate-300" onChange={(e) => toggleSelectAll(e.target.checked)} checked={filteredActivities.length > 0 && behaviorSelectedIds.size === filteredActivities.length} />
                            </th>
                            <th className="p-4 font-bold w-40">时间</th>
                            <th className="p-4 font-bold w-32">用户</th>
                            <th className="p-4 font-bold w-32">行动类型</th>
                            <th className="p-4 font-bold">对象/标题</th>
                            <th className="p-4 font-bold">详细信息</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredActivities.map(activity => (
                            <tr key={activity.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="p-4">
                                    <input type="checkbox" className="rounded border-slate-300" checked={behaviorSelectedIds.has(activity.id)} onChange={() => toggleSelect(activity.id)} />
                                </td>
                                <td className="p-4 text-slate-500 font-mono text-xs">{activity.date}</td>
                                <td className="p-4 font-bold text-slate-800">{activity.userName}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs border ${
                                        activity.type === 'video' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        activity.type === 'note' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        activity.type === 'upload' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                        activity.type === 'diagnosis' ? 'bg-green-50 text-green-700 border-green-100' : 
                                        'bg-orange-50 text-orange-700 border-orange-100'
                                    }`}>
                                        {activity.type === 'upload' ? 'Upload' : 
                                         activity.type === 'diagnosis' ? 'Diagnosis' : 
                                         activity.type === 'note' ? 'Note' : 
                                         activity.type === 'video' ? 'Watched' : 'Read'}
                                    </span>
                                </td>
                                <td className="p-4 text-slate-700 font-medium truncate max-w-xs" title={activity.target}>
                                    {activity.target}
                                </td>
                                <td className="p-4 text-slate-500 text-xs truncate max-w-xs" title={activity.detail}>
                                    {activity.detail}
                                </td>
                            </tr>
                        ))}
                        {filteredActivities.length === 0 && (
                            <tr><td colSpan={6} className="p-12 text-center text-slate-400">暂无数据</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
          </div>
        )}

        {behaviorTab === 'notes' && (
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">用户留言与笔记</h3>
                  <span className="text-xs text-slate-500">共 {getAdminNotes().length} 条</span>
              </div>
              <div className="divide-y divide-slate-100">
                 {getAdminNotes().map(note => (
                    <div key={note.id} className="p-6 hover:bg-slate-50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                    {note.userName?.[0] || 'U'}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-900">{note.userName}</div>
                                    <div className="text-xs text-slate-400">{note.createdAt}</div>
                                </div>
                            </div>
                            <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 border border-slate-200">
                                {note.lessonTitle}
                            </div>
                        </div>
                        
                        <div className="ml-11">
                            {note.quote && (
                                <div className="mb-2 pl-2 border-l-2 border-blue-200 text-xs text-slate-500 italic">
                                    "{note.quote}"
                                </div>
                            )}
                            <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                            
                            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-xs text-blue-600 hover:underline font-bold">回复留言</button>
                                <button onClick={() => { if(window.confirm('删除此笔记?')) deleteAdminNote(note.id); }} className="text-xs text-red-500 hover:underline">删除</button>
                            </div>
                        </div>
                    </div>
                 ))}
                 {getAdminNotes().length === 0 && <div className="p-12 text-center text-slate-400">暂无笔记</div>}
              </div>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      <header className="mb-8 flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><div className="p-2 bg-slate-900 rounded-lg text-white"><Settings size={24} /></div>后台管理系统</h1><p className="text-slate-500 mt-2">管理内容、用户、权限与系统配置</p></div>
      </header>
      <div className="flex flex-col gap-6">
        <div className="border-b border-slate-200 overflow-x-auto">
            <nav className="flex gap-2">
                 <button onClick={() => setActiveTab('blog')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'blog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><BookOpen size={18} /> 博客与洞察</button>
                 <button onClick={() => setActiveTab('diagnosis')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'diagnosis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Stethoscope size={18} /> 诊断罗盘</button>
                 <button onClick={() => setActiveTab('solution')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'solution' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><MonitorPlay size={18} /> 解决方案库</button>
                 <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><LayoutDashboard size={18} /> 指挥中心</button>
                 <button onClick={() => setActiveTab('resource')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'resource' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Database size={18} /> 知识库资源</button>
                 <button onClick={() => setActiveTab('behavior')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'behavior' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Activity size={18} /> 用户行为洞察</button>
                 <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Users size={18} /> 用户与权限</button>
            </nav>
        </div>
        <div className="min-h-[500px]">
           {activeTab === 'blog' && renderBlogTab()}
           {activeTab === 'diagnosis' && renderDiagnosisTab()}
           {activeTab === 'solution' && renderSolutionTab()}
           {activeTab === 'dashboard' && renderDashboardTab()}
           {activeTab === 'resource' && renderResourceTab()}
           {activeTab === 'users' && renderUsersTab()}
           {activeTab === 'behavior' && renderBehaviorTab()}
        </div>
      </div>
    </div>
  );
};

export default Admin;
