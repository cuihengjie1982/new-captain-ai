
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, BookOpen, Video, Database, Plus, Trash2, Edit, Save, X, Bot,
  Upload, FileText, FileVideo, Image as ImageIcon, FileType, Loader2, CheckCircle,
  LayoutDashboard, Target, PieChart, BarChart3, Users, ClipboardList, File as FileIcon, Download,
  MonitorPlay, MessageSquare, BrainCircuit, Shield, ToggleLeft, ToggleRight, Sparkles, Quote, Link as LinkIcon, Tags, UserCog, Key, FileCheck, AlertTriangle, Activity, Zap, Import, ArrowUp, ArrowDown, Sigma, Divide, QrCode, Wallet, Building2, Globe, Mail, Clock, Crown, CreditCard, Phone, Smartphone, Lock, Layers, Briefcase, Calendar, Stethoscope, FileSpreadsheet, Presentation, FolderOpen, Check, Star, ArrowUpRight,
  Square, CheckSquare, Filter, FileJson, Eye, List, BarChart2, Send, User as UserIcon, Search, MoreHorizontal, TrendingUp, PenTool, History
} from 'lucide-react';
import { BlogPost, Lesson, KnowledgeCategory, KnowledgeItem, DashboardProject, UserUpload, AdminNote, IntroVideo, DiagnosisIssue, PermissionConfig, PermissionDefinition, PermissionKey, TranscriptLine, User, KPIItem, KPIRecord, AboutUsInfo, EmailLog, RiskDetailItem, BusinessContactInfo, BusinessLead, DiagnosisSubmission, DiagnosisWidgetConfig, KnowledgeSectionType, WatchedLesson, ReadArticle, PlansPageConfig, PlanFeature } from '../types';
import { getBlogPosts, saveBlogPost, deleteBlogPost, getIntroVideo, saveIntroVideo, getDiagnosisIssues, saveDiagnosisIssue, deleteDiagnosisIssue, getPaymentQRCode, savePaymentQRCode, getAboutUsInfo, saveAboutUsInfo, getBusinessContactInfo, saveBusinessContactInfo, getDiagnosisWidgetConfig, saveDiagnosisWidgetConfig, getPlansPageConfig, savePlansPageConfig } from '../services/contentService';
import { getLessons, saveLesson, deleteLesson } from '../services/courseService';
import { getKnowledgeCategories, saveKnowledgeCategory, deleteKnowledgeCategory } from '../services/resourceService';
import { getDashboardProjects, saveDashboardProject, deleteDashboardProject } from '../services/dashboardService';
import { getUserUploads, deleteUserUpload, getAdminNotes, updateAdminNote, deleteAdminNote, updateUserUploadStatus, getAllUsers, saveUser, deleteUser, getEmailLogs, getBusinessLeads, deleteBusinessLead, getDiagnosisSubmissions, deleteDiagnosisSubmission, updateBusinessLeadStatus, getWatchedHistory, getReadHistory } from '../services/userDataService';
import { getPermissionConfig, savePermissionConfig, getPermissionDefinitions, savePermissionDefinition, deletePermissionDefinition } from '../services/permissionService';

// Specific AI Models for Video Transcript Generation
const VIDEO_AI_MODELS = [
  { id: 'deepseek-r1', name: 'DeepSeek R1' },
  { id: 'glm-4-6', name: 'GLM 4.6' },
  { id: 'kimi-2', name: 'KIMI 2' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-3.0-pro', name: 'Gemini 3.0 Pro' },
  { id: 'claude-4-5-sonnet', name: 'Claude 4.5 Sonnet' },
  { id: 'grok-4', name: 'Grok 4' },
  { id: 'chatgpt-5', name: 'ChatGPT 5' }
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

  const handleGenerateTranscript = () => { 
      setIsGeneratingTranscript(true); 
      setTimeout(() => { 
          setIsGeneratingTranscript(false); 
          const sampleText = `0 | 大家好，欢迎来到本课程\n5 | 今天我们要讲的是核心人才留存\n12 | (讲师A): 首先我们要看这组数据...\n25 | (讲师B): 没错，数据的背后是职业发展的瓶颈\n45 | (讲师A): 那么我们如何通过管理手段来解决呢？\n60 | 接下来我们看一个案例...`; 
          setTranscriptText(sampleText); 
      }, 1500); 
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
  
  // Plans & Permission Logic
  const handleSavePlanConfig = () => { if(plansConfig) { savePlansPageConfig(plansConfig); alert('订阅配置已保存'); } };
  const handleAddPermission = () => { if(!newPermission.key || !newPermission.label) return alert('Key and Label required'); savePermissionDefinition({ ...newPermission }); setPermissions(getPermissionDefinitions()); setNewPermission({ key: '', label: '', module: '' }); };
  const handleDeletePermission = (key: string) => { if(window.confirm('确定删除?')) { deletePermissionDefinition(key); setPermissions(getPermissionDefinitions()); } };
  const togglePermission = (plan: 'free' | 'pro', key: PermissionKey) => { const newConfig = { ...permConfig }; if(!newConfig[plan]) newConfig[plan] = {}; newConfig[plan][key] = !newConfig[plan][key]; setPermConfig(newConfig); savePermissionConfig(newConfig); };
  
  // Business Logic
  const handleSaveBusinessConfig = () => { if(businessContact) { saveBusinessContactInfo(businessContact); alert('商务配置已保存'); } };
  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if(e.target.files?.[0]) { const reader = new FileReader(); reader.onload = (ev) => { if(ev.target?.result) { savePaymentQRCode(ev.target.result as string); setPaymentQR(ev.target.result as string); } }; reader.readAsDataURL(e.target.files[0]); } };
  const handleDeleteLead = (id: string) => { if(window.confirm('Delete?')) { deleteBusinessLead(id); setBusinessLeads(getBusinessLeads()); } };

  // Export Logic
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

  // Bulk Selection Logic
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
                        <span className="text-[10px] mt-1">配置 URL 或上传视频后在此预览</span>
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

        {/* Submissions Log */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardList size={20} /> 用户提交记录</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                            <th className="p-4">提交时间</th>
                            <th className="p-4">用户</th>
                            <th className="p-4">选择问题</th>
                            <th className="p-4">自定义补充</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {diagnosisSubmissions.map(sub => (
                            <tr key={sub.id} className="hover:bg-slate-50">
                                <td className="p-4 text-slate-500 font-mono text-xs">{sub.submittedAt}</td>
                                <td className="p-4 font-bold text-slate-800">{sub.user}</td>
                                <td className="p-4 text-slate-600">{sub.selectedIssues.join(', ')}</td>
                                <td className="p-4 text-slate-600 italic">{sub.customIssue || '-'}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => { if(window.confirm('删除此记录?')) { deleteDiagnosisSubmission(sub.id); setDiagnosisSubmissions(getDiagnosisSubmissions()); } }} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {diagnosisSubmissions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">暂无提交记录</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Edit Modal */}
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
    </div>
  );

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
