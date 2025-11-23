

import React, { useState, useEffect } from 'react';
import { 
  Settings, BookOpen, Video, Database, Plus, Trash2, Edit, Save, X, Bot,
  Upload, FileText, FileVideo, Image as ImageIcon, FileType, Loader2, CheckCircle,
  LayoutDashboard, Target, PieChart, BarChart3, Users, ClipboardList, File as FileIcon, Download,
  MonitorPlay, MessageSquare, BrainCircuit, Shield, ToggleLeft, ToggleRight, Sparkles, Quote, Link as LinkIcon, Tags, UserCog, Key, FileCheck, AlertTriangle, Activity, Zap, Import, ArrowUp, ArrowDown, Sigma, Divide, QrCode, Wallet, Building2, Globe, Mail, Clock, Crown, CreditCard, Phone, Smartphone, Lock, Layers, Briefcase, Calendar, Stethoscope, FileSpreadsheet, Presentation, FolderOpen, Check, Star, ArrowUpRight,
  Square, CheckSquare, Filter, FileJson, Eye, List, BarChart2, Send
} from 'lucide-react';
import { BlogPost, Lesson, KnowledgeCategory, KnowledgeItem, DashboardProject, UserUpload, AdminNote, IntroVideo, DiagnosisIssue, PermissionConfig, PermissionDefinition, PermissionKey, TranscriptLine, User, KPIItem, KPIRecord, AboutUsInfo, EmailLog, RiskDetailItem, BusinessContactInfo, BusinessLead, DiagnosisSubmission, DiagnosisWidgetConfig, KnowledgeSectionType, WatchedLesson, ReadArticle, PlansPageConfig, PlanFeature } from '../types';
import { getBlogPosts, saveBlogPost, deleteBlogPost, getIntroVideo, saveIntroVideo, getDiagnosisIssues, saveDiagnosisIssue, deleteDiagnosisIssue, getPaymentQRCode, savePaymentQRCode, getAboutUsInfo, saveAboutUsInfo, getBusinessContactInfo, saveBusinessContactInfo, getDiagnosisWidgetConfig, saveDiagnosisWidgetConfig, getPlansPageConfig, savePlansPageConfig } from '../services/contentService';
import { getLessons, saveLesson, deleteLesson } from '../services/courseService';
import { getKnowledgeCategories, saveKnowledgeCategory, deleteKnowledgeCategory } from '../services/resourceService';
import { getDashboardProjects, saveDashboardProject, deleteDashboardProject } from '../services/dashboardService';
import { getUserUploads, deleteUserUpload, getAdminNotes, updateAdminNote, deleteAdminNote, updateUserUploadStatus, getAllUsers, saveUser, deleteUser, getEmailLogs, getBusinessLeads, deleteBusinessLead, getDiagnosisSubmissions, deleteDiagnosisSubmission, updateBusinessLeadStatus, getWatchedHistory, getReadHistory } from '../services/userDataService';
import { getPermissionConfig, savePermissionConfig, getPermissionDefinitions, savePermissionDefinition, deletePermissionDefinition } from '../services/permissionService';
import { AI_MODELS } from '../services/geminiService';

// Helper Function for File Import
const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>, callback: (content: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
            callback(event.target.result as string);
        }
    };
    reader.readAsText(file);
};

// Helper for Image/Video File to DataURI (for small files)
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

// Helper for "uploading" a file by just getting its name (simulation)
const handleFileNameUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (name: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    callback(file.name);
};

// Helper to determine file type icon and string
const getFileTypeInfo = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { type: 'pdf', icon: <FileText size={16} className="text-red-500" /> };
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return { type: 'xlsx', icon: <FileSpreadsheet size={16} className="text-green-600" /> };
    if (['ppt', 'pptx'].includes(ext || '')) return { type: 'ppt', icon: <Presentation size={16} className="text-orange-500" /> };
    if (['doc', 'docx'].includes(ext || '')) return { type: 'doc', icon: <FileText size={16} className="text-blue-500" /> };
    return { type: 'doc', icon: <FileIcon size={16} className="text-slate-400" /> };
};

// Helper to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
};

// Helper Icon
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

const KPIEditor: React.FC<{ kpis: KPIItem[], onChange: (kpis: KPIItem[]) => void }> = ({ kpis, onChange }) => {
  // ... (Keep existing KPIEditor code logic - simplified for brevity in update)
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
      <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800">核心指标配置 (KPIs)</h4>
              <button onClick={handleAddKPI} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-bold hover:bg-blue-200 flex items-center gap-1 transition-colors"><Plus size={14} /> 添加指标</button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {kpis.map((kpi, idx) => (
                  <div key={kpi.id} className={`bg-white rounded-lg border transition-all duration-200 ${activeIndex === idx ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : 'border-slate-200 hover:border-blue-200'}`}>
                      <div className="p-4 flex items-center justify-between cursor-pointer select-none" onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}>
                          <div className="flex items-center gap-3 min-w-0">
                              <div className="font-bold text-slate-800 text-sm truncate">{kpi.label || '未命名指标'}</div>
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex-shrink-0">{kpi.timeWindow === 'Month' ? '月度' : kpi.timeWindow === 'Quarter' ? '季度' : kpi.timeWindow === 'HalfYear' ? '半年度' : '年度'}</span>
                              <span className="text-xs text-slate-500 flex-shrink-0">当前: {kpi.value} {kpi.unit}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${activeIndex === idx ? 'rotate-180' : ''}`} />
                          </div>
                      </div>
                      {activeIndex === idx && (
                          <div className="p-4 border-t border-slate-100 space-y-4 bg-slate-50/30 animate-in slide-in-from-top-1 duration-200">
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">指标名称</label>
                                      <input className="w-full border border-slate-300 p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none" value={kpi.label} onChange={(e) => handleUpdateKPI(idx, 'label', e.target.value)} placeholder="如: 核心留存率" />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">单位</label>
                                      <input className="w-full border border-slate-300 p-2 rounded text-sm bg-white outline-none" value={kpi.unit} onChange={(e) => handleUpdateKPI(idx, 'unit', e.target.value)} placeholder="%" />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">目标值 (Target)</label>
                                      <input type="number" className="w-full border border-green-200 p-2 rounded text-sm bg-green-50/50 outline-none" value={kpi.target} onChange={(e) => handleUpdateKPI(idx, 'target', parseFloat(e.target.value))} placeholder="0" />
                                  </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 bg-slate-100/50 p-3 rounded-lg border border-slate-200">
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">时间维度</label>
                                      <select className="w-full border border-slate-300 p-1.5 rounded text-xs bg-white outline-none" value={kpi.timeWindow} onChange={(e) => handleUpdateKPI(idx, 'timeWindow', e.target.value)}>
                                          <option value="Month">月度 (M)</option>
                                          <option value="Quarter">季度 (Q)</option>
                                          <option value="HalfYear">半年度 (H)</option>
                                          <option value="Year">年度 (Y)</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">趋势方向</label>
                                      <select className="w-full border border-slate-300 p-1.5 rounded text-xs bg-white outline-none" value={kpi.direction} onChange={(e) => handleUpdateKPI(idx, 'direction', e.target.value)}>
                                          <option value="up">越高越好</option>
                                          <option value="down">越低越好</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">聚合方式</label>
                                      <select className="w-full border border-slate-300 p-1.5 rounded text-xs bg-white outline-none" value={kpi.aggregation} onChange={(e) => handleUpdateKPI(idx, 'aggregation', e.target.value)}>
                                          <option value="avg">平均值</option>
                                          <option value="sum">累加值</option>
                                      </select>
                                  </div>
                                  <div className="col-span-3 flex justify-end mt-1">
                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveKPI(idx); }} className="text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"><Trash2 size={10} /> 删除指标</button>
                                  </div>
                              </div>
                              <div className="border-t border-slate-200 pt-3">
                                  <div className="flex justify-between items-center mb-2">
                                      <h5 className="text-xs font-bold text-slate-700">历史数据录入 ({kpi.chartData?.length || 0} 条)</h5>
                                      <span className="text-[10px] text-slate-400">用于同比/环比分析</span>
                                  </div>
                                  <div className="flex gap-2 mb-3 items-end bg-white p-2 rounded border border-slate-100 shadow-sm">
                                      <div>
                                          <label className="block text-[10px] text-slate-400 mb-0.5">年份</label>
                                          <select className="w-20 border p-1.5 rounded text-sm bg-white outline-none" value={entryYear} onChange={(e) => setEntryYear(parseInt(e.target.value))}>
                                              {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                                          </select>
                                      </div>
                                      {kpi.timeWindow !== 'Year' && (
                                          <div className="flex-1">
                                              <label className="block text-[10px] text-slate-400 mb-0.5">周期</label>
                                              <select className="w-full border p-1.5 rounded text-sm bg-white outline-none" value={entryPeriod} onChange={(e) => setEntryPeriod(e.target.value)}>
                                                  {renderPeriodOptions(kpi.timeWindow)}
                                              </select>
                                          </div>
                                      )}
                                      <div className="flex-1">
                                          <label className="block text-[10px] text-slate-400 mb-0.5">数值</label>
                                          <input type="number" className="w-full border p-1.5 rounded text-sm outline-none focus:border-blue-400" value={entryValue} onChange={(e) => setEntryValue(e.target.value)} placeholder="输入数值" />
                                      </div>
                                      <button onClick={() => handleAddDataPoint(idx)} className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm font-bold hover:bg-blue-600 transition-colors h-[34px]">添加</button>
                                  </div>
                                  {kpi.chartData?.length > 0 && (
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
                                                  {[...kpi.chartData].reverse().map((d, dIdx) => (
                                                      <tr key={dIdx} className="hover:bg-slate-50">
                                                          <td className="p-2 text-slate-600 font-mono">{d.month}</td>
                                                          <td className="p-2 font-bold text-slate-800">{d.value}</td>
                                                          <td className="p-2 text-right">
                                                              <button onClick={() => handleRemoveDataPoint(idx, kpi.chartData.length - 1 - dIdx)} className="text-red-400 hover:text-red-600 px-1">×</button>
                                                          </td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>
  );
};

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
  
  // Lesson Editor State
  const [lessonVideoSourceType, setLessonVideoSourceType] = useState<'link' | 'upload'>('link');
  const [transcriptText, setTranscriptText] = useState('');
  const [selectedAIModel, setSelectedAIModel] = useState(AI_MODELS[0].id);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);

  // Dashboard Data
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<DashboardProject>>({});

  // Resource Data
  const [knowledgeCategories, setKnowledgeCategories] = useState<KnowledgeCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<KnowledgeCategory>>({});
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [activeResourceSection, setActiveResourceSection] = useState<KnowledgeSectionType>('ai_reply');

  // User Data
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userSubTab, setUserSubTab] = useState<'list' | 'permission' | 'business' | 'plans'>('list');
  const [businessLeads, setBusinessLeads] = useState<BusinessLead[]>([]);
  
  // User Detail View State
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [userDetailHistory, setUserDetailHistory] = useState<{watched: WatchedLesson[], read: ReadArticle[]}>({watched: [], read: []});
  const [userDetailNotes, setUserDetailNotes] = useState<AdminNote[]>([]);
  const [userDetailUploads, setUserDetailUploads] = useState<UserUpload[]>([]);
  const [userDetailTab, setUserDetailTab] = useState<'history' | 'notes' | 'uploads' | 'profile'>('history');
  
  // Profile Detail State (for editing inside detail view)
  const [userDetailProfile, setUserDetailProfile] = useState<Partial<User>>({});

  // User Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [noteFilter, setNoteFilter] = useState<'all' | 'video' | 'article'>('all');

  // Behavior Module State
  const [behaviorTab, setBehaviorTab] = useState<'overview' | 'activity' | 'notes'>('overview');
  const [behaviorFilterUser, setBehaviorFilterUser] = useState<string>('all');
  const [behaviorFilterType, setBehaviorFilterType] = useState<string>('all');
  const [behaviorSelectedIds, setBehaviorSelectedIds] = useState<Set<string>>(new Set());
  const [noteReplyModal, setNoteReplyModal] = useState<{note: AdminNote, text: string} | null>(null);

  // Permission Data
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [permConfig, setPermConfig] = useState<PermissionConfig>({ free: {}, pro: {} });
  const [newPermission, setNewPermission] = useState<Partial<PermissionDefinition>>({});

  // Plan Config Data
  const [plansConfig, setPlansConfig] = useState<PlansPageConfig | null>(null);

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

  // --- User Detail Handlers ---
  const openUserDetail = (user: User) => {
      setSelectedUserForDetail(user);
      setUserDetailProfile({...user}); // Init profile edit state
      
      // Load user specific data
      const allWatched = getWatchedHistory();
      const allRead = getReadHistory();
      const allNotes = getAdminNotes();
      const allUploads = getUserUploads();

      // Filter by User ID (preferred) or Name/Email for backward compatibility
      const userWatched = allWatched.filter(w => w.userId === user.id);
      const userRead = allRead.filter(r => r.userId === user.id);
      
      const userNotes = allNotes.filter(n => n.userId === user.id || n.userName === user.name);
      const userUploads = allUploads.filter(u => u.userId === user.id || u.userEmail === user.email);

      setUserDetailHistory({ watched: userWatched, read: userRead });
      setUserDetailNotes(userNotes);
      setUserDetailUploads(userUploads);
      
      setUserDetailTab('history');
      setNoteFilter('all');
  };

  const closeUserDetail = () => {
      setSelectedUserForDetail(null);
  };

  const handleSaveUserDetailProfile = () => {
      if (!userDetailProfile.id || !userDetailProfile.name || !userDetailProfile.email) return;
      
      // Update in main user list
      saveUser(userDetailProfile as User);
      setUsers(getAllUsers());
      
      // Update current selected user
      setSelectedUserForDetail(userDetailProfile as User);
      alert('用户信息已更新');
  };

  // --- User Selection & Export Handlers ---
  const handleSelectUser = (id: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUserIds(newSet);
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.size === users.length) {
        setSelectedUserIds(new Set());
    } else {
        setSelectedUserIds(new Set(users.map(u => u.id)));
    }
  };

  const handleBatchExport = () => {
      if (selectedUserIds.size === 0) return;
      alert("批量导出模拟：文件已下载");
  };

  const handleSingleUserExport = () => {
      if (!selectedUserForDetail) return;
      alert(`导出 ${selectedUserForDetail.name} 的数据`);
  };

  // --- Behavior Module Handlers ---
  const handleSelectActivity = (id: string) => {
      const newSet = new Set(behaviorSelectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setBehaviorSelectedIds(newSet);
  };

  const handleSelectAllActivity = (ids: string[]) => {
      if (behaviorSelectedIds.size === ids.length && ids.length > 0) {
          setBehaviorSelectedIds(new Set());
      } else {
          setBehaviorSelectedIds(new Set(ids));
      }
  };

  const handleBehaviorExport = (data: any[]) => {
      if (behaviorSelectedIds.size === 0) {
          alert("请先选择要导出的记录");
          return;
      }
      const selectedData = data.filter(d => behaviorSelectedIds.has(d.id));
      // Simulate export
      console.log("Exporting:", selectedData);
      const jsonString = JSON.stringify(selectedData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "user_activity_export.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleNoteReply = () => {
      if (!noteReplyModal || !noteReplyModal.text.trim()) return;
      const updatedNote = {
          ...noteReplyModal.note,
          reply: noteReplyModal.text,
          replyAt: new Date().toLocaleString('zh-CN')
      };
      updateAdminNote(updatedNote);
      setNoteReplyModal(null);
      // Refresh UI (though React state might not catch local storage update immediately without refetch, 
      // but assuming tab re-render or local effect will pick it up in next cycle)
  };

  // ... (Other Handlers for Blog, Lesson, Dashboard, etc. kept same)
  
  // --- Resource Handlers ---
  const handleDeleteKnowledgeCategory = (id: string) => {
      if (window.confirm('确定要删除此分类及其所有内容吗？')) {
          deleteKnowledgeCategory(id);
          setKnowledgeCategories(getKnowledgeCategories());
      }
  };

  const handleSaveCategory = () => {
      if (!editingCategory.name) return alert('分类名称不能为空');
      const newCategory = {
          ...editingCategory,
          id: editingCategory.id || Date.now().toString(),
          items: editingCategory.items || [],
          section: activeResourceSection 
      } as KnowledgeCategory;
      saveKnowledgeCategory(newCategory);
      setKnowledgeCategories(getKnowledgeCategories());
      setIsEditingCategory(false);
      setEditingCategory({});
  };

  const handleResourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newItems: KnowledgeItem[] = Array.from(e.target.files).map((file: File) => {
            const typeInfo = getFileTypeInfo(file.name);
            return {
                title: file.name,
                type: typeInfo.type as any,
                size: formatFileSize(file.size),
                tags: [] 
            };
        });
        setEditingCategory(prev => ({ ...prev, items: [...(prev.items || []), ...newItems] }));
    }
  };

  const removeResourceItem = (index: number) => {
    const items = [...(editingCategory.items || [])];
    items.splice(index, 1);
    setEditingCategory({...editingCategory, items});
  };

  const updateResourceItem = (index: number, field: keyof KnowledgeItem, value: any) => {
     const items = [...(editingCategory.items || [])];
     items[index] = { ...items[index], [field]: value };
     setEditingCategory({...editingCategory, items});
  };

  // --- Plan Config Handlers ---
  const handleSavePlansConfig = () => {
      if (plansConfig) {
          savePlansPageConfig(plansConfig);
          alert('订阅计划配置已保存');
      }
  };

  const updatePlanFeature = (plan: 'free' | 'pro', idx: number, field: keyof PlanFeature, value: string) => {
      if (!plansConfig) return;
      const newConfig = { ...plansConfig };
      newConfig[plan].features[idx] = { ...newConfig[plan].features[idx], [field]: value };
      setPlansConfig(newConfig);
  };

  const addPlanFeature = (plan: 'free' | 'pro') => {
      if (!plansConfig) return;
      const newConfig = { ...plansConfig };
      newConfig[plan].features.push({ text: '新特性', icon: 'Check' });
      setPlansConfig(newConfig);
  };

  const removePlanFeature = (plan: 'free' | 'pro', idx: number) => {
      if (!plansConfig) return;
      const newConfig = { ...plansConfig };
      newConfig[plan].features.splice(idx, 1);
      setPlansConfig(newConfig);
  };

  // ... (Keep other handlers like handleSavePost, handleSaveLesson, etc.)
  const handleDeletePost = (id: string) => { if (window.confirm('确定删除?')) { deleteBlogPost(id); setBlogPosts(getBlogPosts()); } };
  const handleSavePost = () => { if (!editingPost.title) return alert('标题不能为空'); saveBlogPost({...editingPost, id: editingPost.id || Date.now().toString(), date: editingPost.date || new Date().toLocaleDateString('zh-CN')} as BlogPost); setBlogPosts(getBlogPosts()); setIsEditingPost(false); setEditingPost({}); };
  const handleDeleteLesson = (id: string) => { if (window.confirm('确定删除?')) { deleteLesson(id); setLessons(getLessons()); } };
  const handleSaveLesson = () => { if (!editingLesson.title) return alert('标题不能为空'); const parsedTranscript = transcriptText.split('\n').map(line => { const parts = line.split('|'); if(parts.length >= 2) { const time = parseInt(parts[0].trim()); const text = parts.slice(1).join('|').trim(); if(!isNaN(time) && text) return { time, text }; } return null; }).filter(t => t !== null) as TranscriptLine[]; saveLesson({...editingLesson, id: editingLesson.id || Date.now().toString(), highlights: editingLesson.highlights || [], transcript: parsedTranscript, durationSec: editingLesson.durationSec || 0} as Lesson); setLessons(getLessons()); setIsEditingLesson(false); setEditingLesson({}); };
  const handleGenerateTranscript = () => { setIsGeneratingTranscript(true); setTimeout(() => { setIsGeneratingTranscript(false); setTranscriptText(`0 | 欢迎学习 ${editingLesson.title || '本课程'}\n10 | 重点内容如下...`); }, 1000); };
  const handleDeleteDiagnosisIssue = (id: string) => { if (window.confirm('确定删除?')) { deleteDiagnosisIssue(id); setDiagnosisIssues(getDiagnosisIssues()); } };
  const handleSaveDiagnosisIssue = () => { if (!editingIssue.title) return alert('标题不能为空'); saveDiagnosisIssue({...editingIssue, id: editingIssue.id || Date.now().toString()} as DiagnosisIssue); setDiagnosisIssues(getDiagnosisIssues()); setIsEditingIssue(false); setEditingIssue({}); };
  const handleSaveDiagnosisWidget = () => { saveDiagnosisWidgetConfig(diagnosisWidgetConfig); alert('已保存'); };
  const handleDeleteProject = (id: string) => { if (window.confirm('确定删除?')) { deleteDashboardProject(id); setProjects(getDashboardProjects()); } };
  const handleSaveProject = () => { if (!editingProject.name) return alert('名称不能为空'); saveDashboardProject({...editingProject, id: editingProject.id || `p${Date.now()}`, kpis: editingProject.kpis || [], risk: editingProject.risk || { label: '风险概览', value: '无', icon: 'Activity', color: 'text-gray-500 bg-gray-50', details: [] }} as DashboardProject); setProjects(getDashboardProjects()); setIsEditingProject(false); setEditingProject({}); };
  const handleSaveIntroVideo = () => { if(introVideo) { saveIntroVideo({...introVideo, lastUpdated: new Date().toLocaleString('zh-CN')}); alert('已保存'); } };
  const handleSaveAboutUs = () => { if(aboutUs) { saveAboutUsInfo(aboutUs); alert('已保存'); } };
  const handleDeleteUser = (id: string) => { if(window.confirm('确定删除?')) { deleteUser(id); setUsers(getAllUsers()); } };
  const handleSaveUser = () => { if(!editingUser.name || !editingUser.email) return alert('信息不全'); saveUser({...editingUser, id: editingUser.id || Date.now().toString(), role: editingUser.role || 'user', plan: editingUser.plan || 'free', isAuthenticated: true} as User); setUsers(getAllUsers()); setIsEditingUser(false); setEditingUser({}); };
  const handleDeletePermission = (key: string) => { if(window.confirm('确定删除?')) { deletePermissionDefinition(key); setPermissions(getPermissionDefinitions()); } };
  const handleSavePermission = () => { if(!newPermission.key) return; savePermissionDefinition({key: newPermission.key, label: newPermission.label || '', module: newPermission.module || '通用'}); setPermissions(getPermissionDefinitions()); setNewPermission({}); };
  const handleUpdatePermConfig = (plan: 'free'|'pro', key: string, val: boolean) => { const nc = {...permConfig}; if(!nc[plan]) nc[plan] = {}; nc[plan][key] = val; setPermConfig(nc); savePermissionConfig(nc); };
  const handleSaveBusinessContact = () => { if(businessContact) { saveBusinessContactInfo(businessContact); alert('已保存'); } };
  const handleSaveQR = (url: string) => { setPaymentQR(url); savePaymentQRCode(url); };
  const handleDeleteLead = (id: string) => { if(window.confirm('确定删除?')) { deleteBusinessLead(id); setBusinessLeads(getBusinessLeads()); } };
  const handleToggleLeadStatus = (id: string, s: 'new'|'contacted') => { updateBusinessLeadStatus(id, s === 'new' ? 'contacted' : 'new'); setBusinessLeads(getBusinessLeads()); };

  // --- Render Functions ---

  const renderResourceTab = () => {
      const displayedCategories = knowledgeCategories.filter(c => c.section === activeResourceSection);
      return (
      <div className="flex gap-6 h-[calc(100vh-200px)]">
          <div className="w-64 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <Database size={18} className="text-blue-600" /> 知识库目录
                  </h3>
              </div>
              <div className="flex-1 p-2 space-y-1">
                  <button 
                      onClick={() => setActiveResourceSection('ai_reply')}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeResourceSection === 'ai_reply' ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                      <Bot size={18} />
                      AI智能回复附件库
                  </button>
                  <button 
                      onClick={() => setActiveResourceSection('diagnosis_tools')}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeResourceSection === 'diagnosis_tools' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                      <Stethoscope size={18} />
                      诊断工具模块
                  </button>
                  <button 
                      onClick={() => setActiveResourceSection('project_reports')}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors ${activeResourceSection === 'project_reports' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                      <FileCheck size={18} />
                      项目改善报告
                  </button>
              </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h2 className="text-xl font-bold text-slate-800">
                          {activeResourceSection === 'ai_reply' && 'AI智能回复附件库'}
                          {activeResourceSection === 'diagnosis_tools' && '诊断工具模块'}
                          {activeResourceSection === 'project_reports' && '项目改善报告'}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                          {activeResourceSection === 'ai_reply' && '此处文件将被AI助手作为知识库调用，用于回答用户提问。'}
                          {activeResourceSection === 'diagnosis_tools' && '用户在诊断罗盘页面可下载此处的专业工具模版。'}
                          {activeResourceSection === 'project_reports' && '存放各类项目改善的报告和指导文件，用于展示或下载。'}
                      </p>
                  </div>
                  <button 
                      onClick={() => { setEditingCategory({ items: [], section: activeResourceSection }); setIsEditingCategory(true); }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold shadow-sm"
                  >
                      <Plus size={18} /> 新增分类
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 pb-4">
                  {displayedCategories.length === 0 ? (
                      <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                          <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                          <p>此目录下暂无分类</p>
                          <button onClick={() => { setEditingCategory({ items: [], section: activeResourceSection }); setIsEditingCategory(true); }} className="mt-4 text-blue-600 font-bold hover:underline">立即创建</button>
                      </div>
                  ) : (
                      displayedCategories.map(cat => (
                          <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                              <div className={`h-2 bg-${cat.color}-500`}></div>
                              <div className="p-4 flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-3">
                                      <h3 className="font-bold text-slate-900">{cat.name}</h3>
                                      <div className="flex gap-1">
                                          <button onClick={() => { setEditingCategory(cat); setIsEditingCategory(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit size={14} /></button>
                                          <button onClick={() => handleDeleteKnowledgeCategory(cat.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                      </div>
                                  </div>
                                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 p-2 rounded-lg">
                                      {cat.items.map((item, i) => (
                                          <div key={i} className="text-xs flex items-center gap-2 text-slate-600 bg-white p-2 rounded border border-slate-100 hover:border-blue-200 transition-colors">
                                              {getFileTypeInfo(item.title).icon}
                                              <span className="truncate flex-1">{item.title}</span>
                                              <span className="text-[10px] text-slate-400">{item.size}</span>
                                          </div>
                                      ))}
                                      {cat.items.length === 0 && <div className="text-xs text-slate-300 italic p-2 text-center">暂无文件</div>}
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${cat.requiredPlan === 'pro' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                          {cat.requiredPlan === 'pro' ? 'PRO ONLY' : 'FREE'}
                                      </span>
                                      <span className="text-xs text-slate-400">{cat.items.length} 文件</span>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
          {isEditingCategory && (/* ... Editing Category Modal ... */ <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl w-full max-w-2xl p-6 relative animate-in zoom-in-95"><button onClick={() => setIsEditingCategory(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button><h3 className="text-xl font-bold mb-6">{editingCategory.id ? '编辑分类' : '新增分类'}</h3><div className="space-y-6"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">分类名称</label><input className="w-full border p-2 rounded-lg text-sm" value={editingCategory.name || ''} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="例如: 核心人才留存" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">适用用户</label><select className="w-full border p-2 rounded-lg text-sm" value={editingCategory.requiredPlan || 'free'} onChange={e => setEditingCategory({...editingCategory, requiredPlan: e.target.value as 'free'|'pro'})}><option value="free">免费用户 (Free)</option><option value="pro">专业用户 (PRO 会员)</option></select></div></div><div><label className="block text-sm font-bold text-slate-700 mb-1">所属一级目录</label><div className="p-2 bg-slate-100 rounded-lg text-sm text-slate-600 font-medium">{activeResourceSection === 'ai_reply' && 'AI智能回复附件库'}{activeResourceSection === 'diagnosis_tools' && '诊断工具模块'}{activeResourceSection === 'project_reports' && '项目改善报告'}</div></div><div><label className="block text-sm font-bold text-slate-700 mb-1">分类颜色标签</label><div className="flex gap-2">{['blue', 'green', 'orange', 'purple', 'pink', 'rose', 'indigo', 'cyan', 'teal', 'violet'].map(color => (<button key={color} onClick={() => setEditingCategory({...editingCategory, color})} className={`w-8 h-8 rounded-full border-2 transition-all ${editingCategory.color === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: `var(--color-${color}-500, ${color})` }} title={color}><div className={`w-full h-full rounded-full bg-${color}-500`}></div></button>))}</div></div><div className="border border-slate-200 rounded-xl overflow-hidden"><div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center"><h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><FileIcon size={16} /> 文件列表 ({editingCategory.items?.length || 0})</h4><label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-all"><Import size={14} className="text-blue-600" /> 批量上传文件<input type="file" multiple className="hidden" onChange={handleResourceUpload} /></label></div><div className="max-h-64 overflow-y-auto bg-slate-50/50 p-2 space-y-2">{editingCategory.items?.length === 0 && (<div className="text-center py-8 text-slate-400 text-sm">点击上方按钮上传文件，或拖拽文件至此</div>)}{editingCategory.items?.map((item, index) => (<div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2"><div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded border border-slate-100 flex-shrink-0">{getFileTypeInfo(item.title).icon}</div><div className="flex-1 min-w-0 grid grid-cols-2 gap-2"><input className="w-full text-xs border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 bg-transparent" value={item.title} onChange={(e) => updateResourceItem(index, 'title', e.target.value)} placeholder="文件名" /><input className="w-full text-xs border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 bg-transparent text-slate-500" value={item.tags?.join(',')} onChange={(e) => updateResourceItem(index, 'tags', e.target.value.split(','))} placeholder="标签 (逗号分隔)" /></div><div className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">{item.size}</div><button onClick={() => removeResourceItem(index)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><X size={14} /></button></div>))}</div></div><div className="flex justify-end pt-2"><button onClick={handleSaveCategory} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">保存分类</button></div></div></div></div>)}
      </div>
      );
  };

  const renderBehaviorTab = () => {
      // Fetch and Aggregating Data
      const allWatched = getWatchedHistory();
      const allRead = getReadHistory();
      const allNotes = getAdminNotes();
      const allUploads = getUserUploads();
      const allDiagnoses = getDiagnosisSubmissions();

      // Consolidate into one Activity Stream
      const activities = [
          ...allWatched.map(w => ({ id: `w-${w.lessonId}-${w.watchedAt}`, type: 'watched', user: users.find(u => u.id === w.userId)?.name || 'Unknown', userId: w.userId, title: lessons.find(l => l.id === w.lessonId)?.title || 'Video', time: w.watchedAt, details: `Progress: ${w.progress}%` })),
          ...allRead.map(r => ({ id: `r-${r.articleId}-${r.readAt}`, type: 'read', user: users.find(u => u.id === r.userId)?.name || 'Unknown', userId: r.userId, title: blogPosts.find(b => b.id === r.articleId)?.title || 'Article', time: r.readAt, details: 'Completed' })),
          ...allNotes.map(n => ({ id: n.id, type: 'note', user: n.userName, userId: n.userId, title: n.lessonTitle, time: n.createdAt, details: n.content, raw: n })),
          ...allUploads.map(u => ({ id: u.id, type: 'upload', user: u.userName, userId: u.userId, title: u.fileName, time: u.uploadDate, details: u.status })),
          ...allDiagnoses.map(d => ({ id: d.id, type: 'diagnosis', user: d.user, userId: d.userId, title: 'Expert Diagnosis', time: d.submittedAt, details: d.selectedIssues.join(', ') }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      const filteredActivities = activities.filter(a => 
          (behaviorFilterUser === 'all' || a.userId === behaviorFilterUser || a.user === behaviorFilterUser) &&
          (behaviorFilterType === 'all' || a.type === behaviorFilterType)
      );

      const allNotesFiltered = allNotes.filter(n => behaviorFilterUser === 'all' || n.userId === behaviorFilterUser || n.userName === behaviorFilterUser);

      return (
          <div className="space-y-6 animate-in fade-in">
              {/* Behavior Sub-Nav */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-slate-100">
                  <button onClick={() => setBehaviorTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap flex items-center gap-2 ${behaviorTab === 'overview' ? 'bg-slate-900 text-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                      <Activity size={16} /> 概览与统计
                  </button>
                  <button onClick={() => setBehaviorTab('activity')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap flex items-center gap-2 ${behaviorTab === 'activity' ? 'bg-slate-900 text-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                      <List size={16} /> 行动日志
                  </button>
                  <button onClick={() => setBehaviorTab('notes')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap flex items-center gap-2 ${behaviorTab === 'notes' ? 'bg-slate-900 text-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                      <MessageSquare size={16} /> 笔记与留言管理
                  </button>
              </div>

              {/* Filter Bar (Common) */}
              {behaviorTab !== 'overview' && (
                  <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 items-center">
                      <div className="flex items-center gap-2">
                          <Filter size={16} className="text-slate-400" />
                          <span className="text-sm font-bold text-slate-700">筛选:</span>
                      </div>
                      <select className="text-sm border p-2 rounded-lg bg-white outline-none" value={behaviorFilterUser} onChange={(e) => setBehaviorFilterUser(e.target.value)}>
                          <option value="all">所有用户</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                      {behaviorTab === 'activity' && (
                          <select className="text-sm border p-2 rounded-lg bg-white outline-none" value={behaviorFilterType} onChange={(e) => setBehaviorFilterType(e.target.value)}>
                              <option value="all">所有类型</option>
                              <option value="watched">观看视频</option>
                              <option value="read">阅读文章</option>
                              <option value="note">笔记/留言</option>
                              <option value="upload">文件上传</option>
                              <option value="diagnosis">诊断提交</option>
                          </select>
                      )}
                      <div className="ml-auto">
                          <button onClick={() => handleBehaviorExport(behaviorTab === 'activity' ? filteredActivities : allNotesFiltered)} className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                              <Download size={14} /> 导出选中
                          </button>
                      </div>
                  </div>
              )}

              {/* Overview Tab */}
              {behaviorTab === 'overview' && (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <div className="text-slate-500 text-xs font-bold uppercase mb-2">总互动次数</div>
                              <div className="text-3xl font-bold text-slate-900">{activities.length}</div>
                          </div>
                          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <div className="text-slate-500 text-xs font-bold uppercase mb-2">笔记与提问</div>
                              <div className="text-3xl font-bold text-blue-600">{allNotes.length}</div>
                          </div>
                          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <div className="text-slate-500 text-xs font-bold uppercase mb-2">学习视频数</div>
                              <div className="text-3xl font-bold text-purple-600">{allWatched.length}</div>
                          </div>
                          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <div className="text-slate-500 text-xs font-bold uppercase mb-2">活跃用户</div>
                              <div className="text-3xl font-bold text-green-600">{new Set(activities.map(a => a.userId)).size}</div>
                          </div>
                      </div>
                      
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 size={20} /> 最近活跃动态</h3>
                          <div className="space-y-4">
                              {activities.slice(0, 5).map((act, idx) => (
                                  <div key={idx} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                                          act.type === 'watched' ? 'bg-purple-500' :
                                          act.type === 'read' ? 'bg-blue-500' :
                                          act.type === 'note' ? 'bg-yellow-500' :
                                          'bg-slate-500'
                                      }`}>
                                          {act.type === 'watched' ? <Video size={16} /> : act.type === 'read' ? <BookOpen size={16} /> : act.type === 'note' ? <Edit size={16} /> : <Activity size={16} />}
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex justify-between">
                                              <span className="font-bold text-slate-800 text-sm">{act.user}</span>
                                              <span className="text-xs text-slate-400">{act.time}</span>
                                          </div>
                                          <div className="text-xs text-slate-600 mt-1">
                                              {act.type === 'watched' && `观看了 "${act.title}"`}
                                              {act.type === 'read' && `阅读了 "${act.title}"`}
                                              {act.type === 'note' && `发布笔记: "${act.details.substring(0, 30)}..."`}
                                              {act.type === 'upload' && `上传文件: ${act.title}`}
                                              {act.type === 'diagnosis' && `提交诊断: ${act.details}`}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* Activity Log Tab */}
              {behaviorTab === 'activity' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                              <tr>
                                  <th className="p-4 w-10 text-center"><div className="cursor-pointer" onClick={() => handleSelectAllActivity(filteredActivities.map(a => a.id))}>{behaviorSelectedIds.size === filteredActivities.length && filteredActivities.length > 0 ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}</div></th>
                                  <th className="p-4 font-bold">时间</th>
                                  <th className="p-4 font-bold">用户</th>
                                  <th className="p-4 font-bold">行动类型</th>
                                  <th className="p-4 font-bold">对象/标题</th>
                                  <th className="p-4 font-bold">详细信息</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredActivities.map(act => (
                                  <tr key={act.id} className="hover:bg-slate-50">
                                      <td className="p-4 text-center"><div className="cursor-pointer" onClick={() => handleSelectActivity(act.id)}>{behaviorSelectedIds.has(act.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}</div></td>
                                      <td className="p-4 text-xs text-slate-500 whitespace-nowrap">{act.time}</td>
                                      <td className="p-4 font-medium text-slate-900">{act.user}</td>
                                      <td className="p-4">
                                          <span className={`text-xs px-2 py-0.5 rounded border capitalize ${
                                              act.type === 'watched' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                              act.type === 'read' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                              act.type === 'note' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                              'bg-slate-50 text-slate-600 border-slate-200'
                                          }`}>{act.type}</span>
                                      </td>
                                      <td className="p-4 text-slate-700 max-w-xs truncate" title={act.title}>{act.title}</td>
                                      <td className="p-4 text-xs text-slate-500 max-w-xs truncate" title={act.details}>{act.details}</td>
                                  </tr>
                              ))}
                              {filteredActivities.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">无符合条件的记录</td></tr>}
                          </tbody>
                      </table>
                  </div>
              )}

              {/* Notes & Q&A Tab */}
              {behaviorTab === 'notes' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                              <tr>
                                  <th className="p-4 w-10 text-center"><div className="cursor-pointer" onClick={() => handleSelectAllActivity(allNotesFiltered.map(n => n.id))}>{behaviorSelectedIds.size === allNotesFiltered.length && allNotesFiltered.length > 0 ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}</div></th>
                                  <th className="p-4 font-bold">用户</th>
                                  <th className="p-4 font-bold">来源上下文</th>
                                  <th className="p-4 font-bold w-1/3">笔记内容</th>
                                  <th className="p-4 font-bold">回复状态</th>
                                  <th className="p-4 font-bold text-right">操作</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {allNotesFiltered.map(note => (
                                  <tr key={note.id} className="hover:bg-slate-50">
                                      <td className="p-4 text-center"><div className="cursor-pointer" onClick={() => handleSelectActivity(note.id)}>{behaviorSelectedIds.has(note.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}</div></td>
                                      <td className="p-4">
                                          <div className="font-bold text-slate-900">{note.userName}</div>
                                          <div className="text-xs text-slate-400">{note.createdAt}</div>
                                      </td>
                                      <td className="p-4">
                                          <div className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1">
                                              {note.sourceType === 'article' ? <BookOpen size={12} /> : <Video size={12} />}
                                              {note.sourceType === 'article' ? '文章' : '视频'}
                                          </div>
                                          <div className="text-sm text-slate-700 line-clamp-1" title={note.lessonTitle}>{note.lessonTitle}</div>
                                      </td>
                                      <td className="p-4">
                                          {note.quote && <div className="text-xs text-slate-400 italic mb-1 border-l-2 border-slate-200 pl-2 line-clamp-1">“{note.quote}”</div>}
                                          <div className="text-sm text-slate-800">{note.content}</div>
                                      </td>
                                      <td className="p-4">
                                          {note.reply ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                                  <CheckCircle size={12} /> 已回复
                                              </span>
                                          ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs border border-slate-200">
                                                  未回复
                                              </span>
                                          )}
                                      </td>
                                      <td className="p-4 text-right">
                                          <button 
                                              onClick={() => setNoteReplyModal({ note, text: note.reply || '' })}
                                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                          >
                                              {note.reply ? '修改回复' : '回复留言'}
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {allNotesFiltered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">无符合条件的笔记</td></tr>}
                          </tbody>
                      </table>
                  </div>
              )}

              {/* Note Reply Modal */}
              {noteReplyModal && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
                      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in zoom-in-95">
                          <button onClick={() => setNoteReplyModal(null)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><MessageSquare size={20} /> 回复用户笔记</h3>
                          
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                              <div className="flex justify-between mb-2 text-xs text-slate-500">
                                  <span>用户: {noteReplyModal.note.userName}</span>
                                  <span>{noteReplyModal.note.createdAt}</span>
                              </div>
                              {noteReplyModal.note.quote && <div className="text-xs text-slate-400 italic mb-2 border-l-2 border-slate-300 pl-2">“{noteReplyModal.note.quote}”</div>}
                              <p className="text-sm text-slate-800">{noteReplyModal.note.content}</p>
                          </div>

                          <div className="mb-4">
                              <label className="block text-sm font-bold text-slate-700 mb-2">管理员回复内容</label>
                              <textarea 
                                  className="w-full border p-3 rounded-xl h-32 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                  placeholder="输入回复内容..."
                                  value={noteReplyModal.text}
                                  onChange={(e) => setNoteReplyModal({...noteReplyModal, text: e.target.value})}
                                  autoFocus
                              />
                          </div>

                          <div className="flex justify-end gap-3">
                              <button onClick={() => setNoteReplyModal(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-50">取消</button>
                              <button onClick={handleNoteReply} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                                  <Send size={14} /> 发送回复
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderBlogTab = () => (<div className="space-y-8">{/* ... */} {/* Simplified for brevity in this output, existing content assumed */} <div className="bg-white p-6 rounded-xl border border-slate-200 mb-8"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Video size={20} /> 首页视频配置</h3>{introVideo && (<div className="space-y-4"><div className="flex gap-4 items-center mb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="videoSource" checked={introVideo.sourceType === 'link' || !introVideo.sourceType} onChange={() => setIntroVideo({...introVideo, sourceType: 'link'})} className="text-blue-600"/><span className="text-sm font-medium">外部链接 (URL)</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="videoSource" checked={introVideo.sourceType === 'upload'} onChange={() => setIntroVideo({...introVideo, sourceType: 'upload'})} className="text-blue-600"/><span className="text-sm font-medium">本地上传 (Import)</span></label></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-bold text-slate-700 mb-1">{introVideo.sourceType === 'upload' ? '导入视频文件' : '视频源 URL'}</label>{introVideo.sourceType === 'upload' ? (<div className="relative"><label className="flex items-center justify-center w-full h-10 px-4 transition bg-white border-2 border-slate-200 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-400 focus:outline-none"><span className="flex items-center space-x-2"><Upload size={16} className="text-slate-400" /><span className="text-sm text-slate-600 font-medium">选择文件</span></span><input type="file" accept="video/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) { setIntroVideo({...introVideo, url: URL.createObjectURL(e.target.files[0])}) } }}/></label><p className="text-xs text-slate-400 mt-1 truncate">当前文件: {introVideo.url.startsWith('blob') ? '已选择本地文件' : introVideo.url}</p></div>) : (<input value={introVideo.url} onChange={(e) => setIntroVideo({...introVideo, url: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="https://..." />)}</div><div><label className="block text-sm font-bold text-slate-700 mb-1">封面图 URL</label><div className="flex gap-2"><input value={introVideo.thumbnail} onChange={(e) => setIntroVideo({...introVideo, thumbnail: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="https://..." /><label className="px-3 py-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 flex items-center gap-1 text-xs font-bold whitespace-nowrap"><Upload size={14} /> 上传<input type="file" className="hidden" accept="image/*" onChange={(e) => handleMediaImport(e, (url) => setIntroVideo({...introVideo, thumbnail: url}))} /></label></div></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1">视频标题</label><input value={introVideo.title} onChange={(e) => setIntroVideo({...introVideo, title: e.target.value})} className="w-full border p-2 rounded-lg text-sm" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">视频时长 (显示用)</label><input value={introVideo.duration || ''} onChange={(e) => setIntroVideo({...introVideo, duration: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="02:30"/></div></div><div className="flex items-end justify-between pt-2 border-t border-slate-100 mt-2"><div className="flex items-center gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={introVideo.isVisible} onChange={(e) => setIntroVideo({...introVideo, isVisible: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm font-bold text-slate-700">在前台显示此板块</span></label>{introVideo.lastUpdated && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12} /> 最后更新: {introVideo.lastUpdated}</span>}</div><button onClick={handleSaveIntroVideo} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> 保存视频配置</button></div></div>)}</div><div className="bg-white p-6 rounded-xl border border-slate-200 mb-8"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 size={20} /> 关于我们管理</h3>{aboutUs && (<div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">模块标题</label><input value={aboutUs.title} onChange={(e) => setAboutUs({...aboutUs, title: e.target.value})} className="w-full border p-2 rounded-lg text-sm"/></div><div><label className="block text-sm font-bold text-slate-700 mb-1">联系邮箱</label><input value={aboutUs.contactEmail || ''} onChange={(e) => setAboutUs({...aboutUs, contactEmail: e.target.value})} className="w-full border p-2 rounded-lg text-sm"/></div></div><div><label className="block text-sm font-bold text-slate-700 mb-1">公司描述</label><textarea value={aboutUs.description} onChange={(e) => setAboutUs({...aboutUs, description: e.target.value})} className="w-full border p-2 rounded-lg text-sm h-20"/></div><div><label className="block text-sm font-bold text-slate-700 mb-1">团队介绍</label><textarea value={aboutUs.teamInfo} onChange={(e) => setAboutUs({...aboutUs, teamInfo: e.target.value})} className="w-full border p-2 rounded-lg text-sm h-20"/></div><div><label className="block text-sm font-bold text-slate-700 mb-1">官网链接</label><input value={aboutUs.websiteUrl} onChange={(e) => setAboutUs({...aboutUs, websiteUrl: e.target.value})} className="w-full border p-2 rounded-lg text-sm"/></div><div className="flex justify-end border-t border-slate-100 pt-3"><button onClick={handleSaveAboutUs} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> 保存关于我们</button></div></div>)}</div><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">博客文章列表</h2><button onClick={() => { setEditingPost({}); setIsEditingPost(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold"><Plus size={18} /> 新增文章</button></div><div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4 font-bold text-slate-600">标题</th><th className="p-4 font-bold text-slate-600">作者</th><th className="p-4 font-bold text-slate-600">发布日期</th><th className="p-4 font-bold text-slate-600 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{blogPosts.map(post => (<tr key={post.id} className="hover:bg-slate-50"><td className="p-4 font-medium text-slate-900">{post.title}</td><td className="p-4 text-slate-500">{post.author}</td><td className="p-4 text-slate-500">{post.date}</td><td className="p-4 text-right flex justify-end gap-2"><button onClick={() => { setEditingPost(post); setIsEditingPost(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16} /></button><button onClick={() => handleDeletePost(post.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>{isEditingPost && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-2xl w-full max-w-2xl p-6 relative my-8"><button onClick={() => setIsEditingPost(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button><h3 className="text-xl font-bold mb-6">{editingPost.id ? '编辑文章' : '新增文章'}</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">文章标题</label><input className="w-full border p-2 rounded-lg" value={editingPost.title || ''} onChange={e => setEditingPost({...editingPost, title: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">摘要 (Summary)</label><textarea className="w-full border p-2 rounded-lg h-20" value={editingPost.summary || ''} onChange={e => setEditingPost({...editingPost, summary: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">作者</label><input className="w-full border p-2 rounded-lg" value={editingPost.author || ''} onChange={e => setEditingPost({...editingPost, author: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">阅读时间</label><input className="w-full border p-2 rounded-lg" value={editingPost.readTime || ''} onChange={e => setEditingPost({...editingPost, readTime: e.target.value})} /></div></div><div><label className="block text-sm font-bold text-slate-700 mb-1">缩略图</label><div className="flex gap-2"><input className="flex-1 border p-2 rounded-lg" value={editingPost.thumbnail || ''} onChange={e => setEditingPost({...editingPost, thumbnail: e.target.value})} placeholder="Image URL" /><label className="px-4 py-2 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 flex items-center gap-2 text-sm font-medium"><Upload size={16} /><input type="file" className="hidden" accept="image/*" onChange={(e) => handleMediaImport(e, (url) => setEditingPost({...editingPost, thumbnail: url}))} />上传</label></div></div><div><label className="block text-sm font-bold text-slate-700 mb-1">权限要求</label><select className="w-full border p-2 rounded-lg" value={editingPost.requiredPlan || 'free'} onChange={e => setEditingPost({...editingPost, requiredPlan: e.target.value as 'free'|'pro'})}><option value="free">免费 (Free)</option><option value="pro">专业版 (Pro)</option></select></div><div><div className="flex justify-between items-center mb-1"><label className="block text-sm font-bold text-slate-700">文章内容 (HTML)</label><label className="text-xs text-blue-600 cursor-pointer flex items-center gap-1 hover:underline"><Import size={12} /><input type="file" className="hidden" accept=".html,.txt,.md" onChange={(e) => handleFileImport(e, (content) => setEditingPost({...editingPost, content}))} />导入文件</label></div><textarea className="w-full border p-2 rounded-lg h-64 font-mono text-xs" value={editingPost.content || ''} onChange={e => setEditingPost({...editingPost, content: e.target.value})} /></div><div className="flex justify-end gap-3 pt-4 border-t border-slate-100"><button onClick={() => setIsEditingPost(false)} className="px-4 py-2 text-slate-600 font-bold">取消</button><button onClick={handleSavePost} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">保存文章</button></div></div></div></div>)}</div>);
  const renderDiagnosisTab = () => (
      <div className="space-y-8">
          {/* ... */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 mb-8"><h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit size={20} /> 智能诊断工具文案配置</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">小部件标题</label><input value={diagnosisWidgetConfig.title} onChange={(e) => setDiagnosisWidgetConfig({...diagnosisWidgetConfig, title: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="例如：您在苦恼些什么？"/></div><div><label className="block text-sm font-bold text-slate-700 mb-1">顶部高亮标签</label><input value={diagnosisWidgetConfig.highlightText} onChange={(e) => setDiagnosisWidgetConfig({...diagnosisWidgetConfig, highlightText: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="例如：智能诊断工具"/></div><div><label className="block text-sm font-bold text-slate-700 mb-1">描述文本</label><textarea value={diagnosisWidgetConfig.description} onChange={(e) => setDiagnosisWidgetConfig({...diagnosisWidgetConfig, description: e.target.value})} className="w-full border p-2 rounded-lg text-sm h-20" placeholder="描述文字..."/></div><div className="flex justify-end border-t border-slate-100 pt-3"><button onClick={handleSaveDiagnosisWidget} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> 保存文案配置</button></div></div></div><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">诊断预设问题管理 (多选)</h2><button onClick={() => { setEditingIssue({}); setIsEditingIssue(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold"><Plus size={18} /> 新增问题</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{diagnosisIssues.map(issue => (<div key={issue.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group hover:border-blue-300 transition-colors"><div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingIssue(issue); setIsEditingIssue(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit size={14} /></button><button onClick={() => handleDeleteDiagnosisIssue(issue.id)} className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100"><Trash2 size={14} /></button></div><h4 className="font-bold text-slate-900 mb-2 pr-12">{issue.title}</h4><div className="space-y-3"><div className="bg-slate-50 p-2 rounded text-xs text-slate-600 border border-slate-100"><span className="font-bold text-slate-400 block mb-1 uppercase text-[10px]">User Input</span>{issue.userText}</div><div className="bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100"><span className="font-bold text-blue-400 block mb-1 uppercase text-[10px]">AI Response</span>{issue.aiResponse}</div></div></div>))}</div><div className="mt-12 pt-8 border-t border-slate-200"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">用户诊断提交记录</h2><div className="text-sm text-slate-400">共 {diagnosisSubmissions.length} 条记录</div></div><div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4 font-bold text-slate-600">提交时间</th><th className="p-4 font-bold text-slate-600">用户</th><th className="p-4 font-bold text-slate-600">选择问题</th><th className="p-4 font-bold text-slate-600">自定义描述 (Other)</th><th className="p-4 font-bold text-slate-600 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{diagnosisSubmissions.map(sub => (<tr key={sub.id} className="hover:bg-slate-50"><td className="p-4 text-slate-500">{sub.submittedAt}</td><td className="p-4 font-medium text-slate-900">{sub.user || 'Guest'}</td><td className="p-4 text-slate-700"><div className="flex flex-wrap gap-1">{sub.selectedIssues.map((s, i) => (<span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-xs border border-slate-200">{s === 'other' ? '其他' : s}</span>))}</div></td><td className="p-4 text-slate-600 text-xs max-w-xs break-all">{sub.customIssue || '-'}</td><td className="p-4 text-right"><button onClick={() => { if(window.confirm('删除此提交记录?')) { deleteDiagnosisSubmission(sub.id); setDiagnosisSubmissions(getDiagnosisSubmissions()); } }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button></td></tr>))}{diagnosisSubmissions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">暂无提交记录</td></tr>}</tbody></table></div></div>{isEditingIssue && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl w-full max-w-lg p-6 relative"><button onClick={() => setIsEditingIssue(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button><h3 className="text-xl font-bold mb-6">{editingIssue.id ? '编辑问题' : '新增问题'}</h3><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">问题标题 (显示在下拉框)</label><input className="w-full border p-2 rounded-lg" value={editingIssue.title || ''} onChange={e => setEditingIssue({...editingIssue, title: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">模拟用户输入 (User Text)</label><textarea className="w-full border p-2 rounded-lg h-24" value={editingIssue.userText || ''} onChange={e => setEditingIssue({...editingIssue, userText: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">AI 初始回应 (First Response)</label><textarea className="w-full border p-2 rounded-lg h-24" value={editingIssue.aiResponse || ''} onChange={e => setEditingIssue({...editingIssue, aiResponse: e.target.value})} /></div><div className="flex justify-end gap-3 pt-4"><button onClick={handleSaveDiagnosisIssue} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">保存配置</button></div></div></div></div>)}
      </div>
  );
  
  const renderSolutionTab = () => (<div className="space-y-6">{/* ... Content omitted for brevity ... */} <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">视频课程库</h2><button onClick={() => { setEditingLesson({}); setIsEditingLesson(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold"><Plus size={18} /> 新增课程</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{lessons.map(lesson => (<div key={lesson.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"><div className="h-32 bg-slate-100 relative"><img src={lesson.thumbnail} className="w-full h-full object-cover" alt="" /><div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1"><button onClick={() => { setEditingLesson(lesson); setIsEditingLesson(true); }} className="text-white hover:text-blue-200 p-1"><Edit size={14} /></button><button onClick={() => handleDeleteLesson(lesson.id)} className="text-white hover:text-red-200 p-1"><Trash2 size={14} /></button></div><span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">{lesson.duration}</span></div><div className="p-4"><h4 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 h-10">{lesson.title}</h4><div className="flex items-center justify-between text-xs text-slate-400"><span className="bg-slate-100 px-2 py-0.5 rounded">{lesson.category || '未分类'}</span><span>{lesson.requiredPlan === 'pro' ? 'Pro' : 'Free'}</span></div></div></div>))}</div>{isEditingLesson && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-2xl w-full max-w-3xl p-6 relative my-8"><button onClick={() => setIsEditingLesson(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button><h3 className="text-xl font-bold mb-6">{editingLesson.id ? '编辑课程' : '新增课程'}</h3><div className="space-y-6"><div><label className="block text-sm font-bold text-slate-700 mb-1">课程标题</label><input className="w-full border p-2.5 rounded-lg text-sm" value={editingLesson.title || ''} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} placeholder="输入课程标题..." /></div><div className="grid grid-cols-2 gap-6"><div><label className="block text-sm font-bold text-slate-700 mb-1">课程分类</label><input className="w-full border p-2.5 rounded-lg text-sm" value={editingLesson.category || ''} onChange={e => setEditingLesson({...editingLesson, category: e.target.value})} placeholder="例如：人员管理" /></div><div><label className="block text-sm font-bold text-slate-700 mb-1">适用用户</label><select className="w-full border p-2.5 rounded-lg text-sm" value={editingLesson.requiredPlan || 'free'} onChange={e => setEditingLesson({...editingLesson, requiredPlan: e.target.value as 'free'|'pro'})}><option value="free">免费用户 (Free)</option><option value="pro">专业用户 (Pro)</option></select></div></div><div className="border border-slate-200 rounded-xl p-5 bg-slate-50"><label className="block text-sm font-bold text-slate-800 mb-3">视频源 (二选一)</label><div className="flex gap-6 mb-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={lessonVideoSourceType === 'link'} onChange={() => setLessonVideoSourceType('link')} className="text-blue-600"/><span className="text-sm text-slate-700">方式A: 外部链接</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={lessonVideoSourceType === 'upload'} onChange={() => setLessonVideoSourceType('upload')} className="text-blue-600"/><span className="text-sm text-slate-700">方式B: 本地上传</span></label></div>{lessonVideoSourceType === 'link' ? (<input className="w-full border p-2.5 rounded-lg text-sm bg-white" value={editingLesson.videoUrl || ''} onChange={e => setEditingLesson({...editingLesson, videoUrl: e.target.value})} placeholder="输入 https://..." />) : (<div className="relative"><label className="flex items-center justify-center w-full h-12 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-400 focus:outline-none"><span className="flex items-center space-x-2 text-blue-600"><Upload size={18} /><span className="text-sm font-medium">选择视频文件</span></span><input type="file" accept="video/*" className="hidden" onChange={(e) => { if(e.target.files?.[0]) { setEditingLesson({...editingLesson, videoUrl: URL.createObjectURL(e.target.files[0])}) } }}/></label>{editingLesson.videoUrl && !editingLesson.videoUrl.startsWith('http') && (<p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle size={12} /> 文件已选择 (本地模拟路径)</p>)}</div>)}</div><div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"><div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-2">封面 (Cover)</label><div className="flex gap-4 items-start"><div className="w-40 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">{editingLesson.thumbnail ? (<img src={editingLesson.thumbnail} className="w-full h-full object-cover" alt="Preview" />) : (<div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>)}</div><div className="flex-1 space-y-2"><input className="w-full border p-2 rounded-lg text-xs" value={editingLesson.thumbnail || ''} onChange={e => setEditingLesson({...editingLesson, thumbnail: e.target.value})} placeholder="封面图片 URL"/><label className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors w-full"><Upload size={14} className="mr-2" /> 上传<input type="file" className="hidden" accept="image/*" onChange={(e) => handleMediaImport(e, (url) => setEditingLesson({...editingLesson, thumbnail: url}))} /></label></div></div></div><div><label className="block text-sm font-bold text-slate-700 mb-2">时长</label><input className="w-full border p-2.5 rounded-lg text-sm" value={editingLesson.duration || ''} onChange={e => setEditingLesson({...editingLesson, duration: e.target.value})} placeholder="例如: 08:45"/></div></div><div className="border-t border-slate-200 pt-6"><div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2"><label className="block text-sm font-bold text-slate-700">逐字稿</label><div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200"><select className="text-xs bg-white border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-500 min-w-[120px]" value={selectedAIModel} onChange={(e) => setSelectedAIModel(e.target.value)}>{AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><button onClick={handleGenerateTranscript} disabled={isGeneratingTranscript} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">{isGeneratingTranscript ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}AI解析生成</button></div></div><textarea className="w-full border p-3 rounded-xl h-48 font-mono text-xs leading-relaxed bg-slate-50 focus:bg-white transition-colors" value={transcriptText} onChange={e => setTranscriptText(e.target.value)} placeholder={`0 | 大家好，欢迎来到本课程...\n5 | 今天我们要讲的是...\n(格式: 秒数 | 内容)`}/><p className="text-xs text-slate-400 mt-2">提示：每行一条，使用 "秒数 | 内容" 格式。AI 生成后可手动微调。</p></div><div className="flex justify-end gap-3 pt-6 border-t border-slate-100"><button onClick={() => setIsEditingLesson(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50">取消</button><button onClick={handleSaveLesson} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20">保存课程</button></div></div></div></div>)}</div>);
  const renderDashboardTab = () => (<div className="space-y-6"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-800">指挥中心管理</h2><button onClick={() => { setEditingProject({ kpis: [], risk: { label: '风险', value: '0', icon: 'Activity', color: 'bg-slate-100', details: [] }, requiredPlan: 'free' }); setIsEditingProject(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 text-sm font-bold"><Plus size={18} /> 新增项目</button></div><div className="space-y-4">{projects.map(project => (<div key={project.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all"><div className="flex justify-between items-start mb-4"><div><div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{project.category}</span>{project.requiredPlan === 'pro' && <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-100 flex items-center gap-1"><Crown size={10} /> PRO</span>}</div><h3 className="text-lg font-bold text-slate-900">{project.name}</h3></div><div className="flex gap-2"><button onClick={() => { setEditingProject(project); setIsEditingProject(true); }} className="p-2 bg-slate-50 text-slate-600 rounded hover:bg-slate-100"><Edit size={16} /></button><button onClick={() => handleDeleteProject(project.id)} className="p-2 bg-red-50 text-red-500 rounded hover:bg-red-100"><Trash2 size={16} /></button></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg"><div><span className="text-slate-400 text-xs block">ID</span>{project.id}</div><div><span className="text-slate-400 text-xs block">Last Updated</span>{project.updatedAt}</div><div><span className="text-slate-400 text-xs block">KPI Count</span>{project.kpis.length}</div><div><span className="text-slate-400 text-xs block">Action Plan</span>{project.actionPlanFile ? '已上传' : '未上传'}</div></div></div>))}</div>{isEditingProject && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col relative shadow-2xl animate-in zoom-in-95"><div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-900">{editingProject.id ? '编辑项目' : '新增项目'}</h3><button onClick={() => setIsEditingProject(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button></div><div className="flex-1 overflow-hidden flex flex-col lg:flex-row"><div className="flex-1 p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100"><div className="space-y-6"><div><label className="block text-sm font-bold text-slate-900 mb-2">项目名称</label><input className="w-full border border-slate-300 p-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={editingProject.name || ''} onChange={e => setEditingProject({...editingProject, name: e.target.value})} placeholder="输入项目名称"/></div><div><label className="block text-sm font-bold text-slate-900 mb-2">适用用户</label><select className="w-full border border-slate-300 p-3 rounded-lg text-sm bg-white outline-none" value={editingProject.requiredPlan || 'free'} onChange={e => setEditingProject({...editingProject, requiredPlan: e.target.value as 'free'|'pro'})}><option value="free">所有用户 (Free)</option><option value="pro">PRO 会员 (Pro)</option></select></div><div><div className="flex justify-between items-center mb-2"><label className="block text-sm font-bold text-slate-900">项目报告 (HTML)</label><label className="text-xs text-blue-600 cursor-pointer flex items-center gap-1 hover:underline font-medium"><Import size={14} />导入报告<input type="file" className="hidden" accept=".html,.txt,.md" onChange={(e) => handleFileImport(e, (content) => setEditingProject({...editingProject, content}))} /></label></div><textarea className="w-full border border-slate-300 p-3 rounded-lg h-48 font-mono text-xs bg-slate-50 focus:bg-white transition-colors outline-none resize-none" value={editingProject.content || ''} onChange={e => setEditingProject({...editingProject, content: e.target.value})} placeholder="<p>项目背景...</p>"/></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">详细行动计划</label><div className="flex gap-2"><input className="flex-1 border border-slate-300 p-2 rounded-xs bg-slate-50" value={editingProject.actionPlanFile || ''} onChange={e => setEditingProject({...editingProject, actionPlanFile: e.target.value})} placeholder="文件名.pdf"/><label className="p-2 bg-white border border-slate-300 rounded cursor-pointer hover:bg-slate-50 flex-shrink-0"><Upload size={14} className="text-slate-500" /><input type="file" className="hidden" onChange={(e) => handleFileNameUpload(e, (name) => setEditingProject({...editingProject, actionPlanFile: name}))} /></label></div></div><div><label className="block text-xs font-bold text-slate-500 mb-1">历史会议记录</label><div className="flex gap-2"><input className="flex-1 border border-slate-300 p-2 rounded-xs bg-slate-50" value={editingProject.meetingRecordFile || ''} onChange={e => setEditingProject({...editingProject, meetingRecordFile: e.target.value})} placeholder="文件名.doc"/><label className="p-2 bg-white border border-slate-300 rounded cursor-pointer hover:bg-slate-50 flex-shrink-0"><Upload size={14} className="text-slate-500" /><input type="file" className="hidden" onChange={(e) => handleFileNameUpload(e, (name) => setEditingProject({...editingProject, meetingRecordFile: name}))} /></label></div></div></div></div></div><div className="flex-1 p-6 bg-slate-50/30 overflow-hidden flex flex-col"><KPIEditor kpis={editingProject.kpis || []} onChange={(newKPIs) => setEditingProject({...editingProject, kpis: newKPIs})} /></div></div><div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl"><button onClick={() => setIsEditingProject(false)} className="px-6 py-2.5 border border-slate-300 bg-white rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors">取消</button><button onClick={handleSaveProject} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors">保存项目</button></div></div></div>)}</div>);

  const renderBusinessDocking = () => (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in"><div className="space-y-6"><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Smartphone size={20} /> 商务联系人配置</h3>{businessContact && (<div className="space-y-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">联系人姓名</label><input value={businessContact.contactPerson} onChange={e => setBusinessContact({...businessContact, contactPerson: e.target.value})} className="w-full border p-2 rounded-lg text-sm"/></div><div><label className="block text-sm font-bold text-slate-700 mb-1">微信号 / 电话</label><input value={businessContact.contactMethod} onChange={e => setBusinessContact({...businessContact, contactMethod: e.target.value})} className="w-full border p-2 rounded-lg text-sm"/></div><div><label className="block text-sm font-bold text-slate-700 mb-1">联系邮箱</label><input value={businessContact.email} onChange={e => setBusinessContact({...businessContact, email: e.target.value})} className="w-full border p-2 rounded-lg text-sm"/></div><button onClick={handleSaveBusinessContact} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">保存配置</button></div>)}</div><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><QrCode size={20} /> 支付/商务二维码</h3><div className="flex gap-6 items-start"><div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden flex-shrink-0">{paymentQR ? (<img src={paymentQR} className="w-full h-full object-cover" alt="QR" />) : (<span className="text-xs text-slate-400">未上传</span>)}</div><div className="flex-1 space-y-3"><p className="text-xs text-slate-500">此二维码将显示在“升级计划”页面，供用户扫码联系商务或支付。</p><label className="inline-block px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"><input type="file" className="hidden" accept="image/*" onChange={(e) => handleMediaImport(e, handleSaveQR)} />上传图片</label></div></div></div></div><div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col"><h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Briefcase size={20} /> 销售线索 (Leads)</h3><div className="flex-1 overflow-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="p-3">提交时间</th><th className="p-3">姓名/职位</th><th className="p-3">联系方式</th><th className="p-3">状态</th><th className="p-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{businessLeads.map(lead => (<tr key={lead.id} className="hover:bg-slate-50 group"><td className="p-3 text-slate-500 text-xs">{lead.submittedAt.split(' ')[0]}</td><td className="p-3"><div className="font-bold text-slate-800">{lead.name}</div><div className="text-xs text-slate-500">{lead.position} @ {lead.company}</div></td><td className="p-3 text-xs"><div className="text-slate-700">{lead.phone}</div><div className="text-slate-400">{lead.email}</div></td><td className="p-3"><button onClick={() => handleToggleLeadStatus(lead.id, lead.status)} className={`px-2 py-0.5 rounded text-xs font-bold border ${lead.status === 'new' ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}>{lead.status === 'new' ? '待跟进' : '已跟进'}</button></td><td className="p-3 text-right"><button onClick={() => handleDeleteLead(lead.id)} className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button></td></tr>))}{businessLeads.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-slate-400">暂无销售线索</td></tr>)}</tbody></table></div></div></div>);

  const renderPlansConfig = () => {
      if (!plansConfig) return <div>Loading...</div>;
      return (
          <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Crown size={20} /> 订阅计划配置</h2>
                  <button onClick={handleSavePlansConfig} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> 保存配置</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Free Plan Editor */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 text-slate-500 font-bold uppercase text-xs tracking-wider"><div className="w-2 h-2 rounded-full bg-slate-400"></div>免费版 (Free)</div>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">计划标题</label>
                              <input className="w-full border p-2 rounded text-sm font-bold" value={plansConfig.free.title} onChange={e => setPlansConfig({...plansConfig, free: {...plansConfig.free, title: e.target.value}})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">副标题</label>
                              <input className="w-full border p-2 rounded text-sm text-slate-600" value={plansConfig.free.subtitle} onChange={e => setPlansConfig({...plansConfig, free: {...plansConfig.free, subtitle: e.target.value}})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">按钮文本</label>
                              <input className="w-full border p-2 rounded text-sm bg-slate-50" value={plansConfig.free.buttonText} onChange={e => setPlansConfig({...plansConfig, free: {...plansConfig.free, buttonText: e.target.value}})} />
                          </div>
                          <div className="pt-4 border-t border-slate-100">
                              <label className="block text-xs font-bold text-slate-500 mb-2">功能列表</label>
                              <div className="space-y-2">
                                  {plansConfig.free.features.map((f, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                          <select className="w-24 text-xs border p-1.5 rounded" value={f.icon} onChange={e => updatePlanFeature('free', idx, 'icon', e.target.value)}>
                                              <option value="Video">Video</option><option value="Zap">Zap</option><option value="Check">Check</option><option value="FileText">File</option><option value="Star">Star</option>
                                          </select>
                                          <input className="flex-1 border p-1.5 rounded text-sm" value={f.text} onChange={e => updatePlanFeature('free', idx, 'text', e.target.value)} />
                                          <button onClick={() => removePlanFeature('free', idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                      </div>
                                  ))}
                                  <button onClick={() => addPlanFeature('free')} className="text-xs text-blue-600 font-bold mt-2 hover:underline">+ 添加功能项</button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Pro Plan Editor */}
                  <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold uppercase text-xs tracking-wider"><div className="w-2 h-2 rounded-full bg-blue-500"></div>专业版 (Pro)</div>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-blue-400 mb-1">计划标题</label>
                              <input className="w-full border border-blue-200 p-2 rounded text-sm font-bold bg-white" value={plansConfig.pro.title} onChange={e => setPlansConfig({...plansConfig, pro: {...plansConfig.pro, title: e.target.value}})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-blue-400 mb-1">副标题</label>
                              <input className="w-full border border-blue-200 p-2 rounded text-sm text-slate-600 bg-white" value={plansConfig.pro.subtitle} onChange={e => setPlansConfig({...plansConfig, pro: {...plansConfig.pro, subtitle: e.target.value}})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-blue-400 mb-1">按钮文本</label>
                              <input className="w-full border border-blue-200 p-2 rounded text-sm bg-white" value={plansConfig.pro.buttonText} onChange={e => setPlansConfig({...plansConfig, pro: {...plansConfig.pro, buttonText: e.target.value}})} />
                          </div>
                          <div className="pt-4 border-t border-blue-200">
                              <label className="block text-xs font-bold text-blue-400 mb-2">功能列表</label>
                              <div className="space-y-2">
                                  {plansConfig.pro.features.map((f, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                          <select className="w-24 text-xs border border-blue-200 p-1.5 rounded bg-white" value={f.icon} onChange={e => updatePlanFeature('pro', idx, 'icon', e.target.value)}>
                                              <option value="Video">Video</option><option value="Zap">Zap</option><option value="Check">Check</option><option value="ArrowUpRight">Arrow</option><option value="FileText">File</option><option value="Star">Star</option>
                                          </select>
                                          <input className="flex-1 border border-blue-200 p-1.5 rounded text-sm bg-white" value={f.text} onChange={e => updatePlanFeature('pro', idx, 'text', e.target.value)} />
                                          <button onClick={() => removePlanFeature('pro', idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                                      </div>
                                  ))}
                                  <button onClick={() => addPlanFeature('pro')} className="text-xs text-blue-600 font-bold mt-2 hover:underline">+ 添加功能项</button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderUsersTab = () => (
      <div className="space-y-6"><div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={()=>setUserSubTab('list')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap ${userSubTab==='list' ? 'bg-white border-slate-200 text-blue-600 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>用户列表</button>
          <button onClick={()=>setUserSubTab('plans')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap ${userSubTab==='plans' ? 'bg-white border-slate-200 text-blue-600 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>订阅配置</button>
          <button onClick={()=>setUserSubTab('permission')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap ${userSubTab==='permission' ? 'bg-white border-slate-200 text-blue-600 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>权限配置</button>
          <button onClick={()=>setUserSubTab('business')} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap ${userSubTab==='business' ? 'bg-blue-50 border-blue-100 text-blue-600 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>商务对接</button>
          </div>
          {userSubTab === 'permission' && (<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in"><h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Lock size={20} /> 权限模块配置</h2><div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100"><h4 className="font-bold text-sm text-slate-700 mb-3">新增权限定义</h4><div className="flex gap-3"><input className="flex-1 border p-2 rounded text-sm" placeholder="Key (e.g. export_data)" value={newPermission.key || ''} onChange={e => setNewPermission({...newPermission, key: e.target.value})} /><input className="flex-1 border p-2 rounded text-sm" placeholder="Label (e.g. 导出数据)" value={newPermission.label || ''} onChange={e => setNewPermission({...newPermission, label: e.target.value})} /><input className="flex-1 border p-2 rounded text-sm" placeholder="Module (e.g. 报表)" value={newPermission.module || ''} onChange={e => setNewPermission({...newPermission, module: e.target.value})} /><button onClick={handleSavePermission} className="bg-blue-600 text-white px-4 rounded font-bold text-sm hover:bg-blue-700">添加</button></div></div><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="p-3">模块</th><th className="p-3">权限名称</th><th className="p-3">Key</th><th className="p-3 text-center">免费版 (Free)</th><th className="p-3 text-center">专业版 (Pro)</th><th className="p-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-slate-100">{permissions.map(perm => (<tr key={perm.key} className="hover:bg-slate-50"><td className="p-3 text-slate-500">{perm.module || '-'}</td><td className="p-3 font-medium text-slate-800">{perm.label}</td><td className="p-3 font-mono text-xs text-slate-400">{perm.key}</td><td className="p-3 text-center"><input type="checkbox" checked={permConfig.free[perm.key] || false} onChange={e => handleUpdatePermConfig('free', perm.key, e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500"/></td><td className="p-3 text-center"><input type="checkbox" checked={permConfig.pro[perm.key] || false} onChange={e => handleUpdatePermConfig('pro', perm.key, e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500"/></td><td className="p-3 text-right"><button onClick={() => handleDeletePermission(perm.key)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div></div>)}
          {userSubTab === 'plans' && renderPlansConfig()}
          {userSubTab === 'list' && (<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users size={20} /> 用户列表</h2>
                      {selectedUserIds.size > 0 && (
                          <button 
                              onClick={handleBatchExport}
                              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-bold flex items-center gap-1 animate-in fade-in zoom-in"
                          >
                              <Download size={12} /> 批量导出 ({selectedUserIds.size})
                          </button>
                      )}
                  </div>
                  <button onClick={() => { setEditingUser({}); setIsEditingUser(true); }} className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 font-bold">+ 新增用户</button>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                          <tr>
                              <th className="p-3 w-10 text-center">
                                  <div className="flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600" onClick={handleSelectAllUsers}>
                                      {selectedUserIds.size === users.length && users.length > 0 ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                  </div>
                              </th>
                              <th className="p-3">姓名</th>
                              <th className="p-3">邮箱</th>
                              <th className="p-3">角色</th>
                              <th className="p-3">订阅计划</th>
                              <th className="p-3 text-right">操作</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {users.map(u => (
                              <tr key={u.id} className={`hover:bg-slate-50 ${selectedUserIds.has(u.id) ? 'bg-blue-50/30' : ''}`}>
                                  <td className="p-3 text-center">
                                      <div className="flex items-center justify-center cursor-pointer text-slate-400 hover:text-blue-500" onClick={() => handleSelectUser(u.id)}>
                                          {selectedUserIds.has(u.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                      </div>
                                  </td>
                                  <td className="p-3 font-medium text-slate-900">{u.name}</td>
                                  <td className="p-3 text-slate-500">{u.email}</td>
                                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${u.plan === 'pro' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-500'}`}>{u.plan}</span></td>
                                  <td className="p-3 text-right flex justify-end gap-2">
                                      <button onClick={() => openUserDetail(u)} className="text-purple-500 hover:text-purple-700 p-1 bg-purple-50 hover:bg-purple-100 rounded text-xs px-2 py-1 font-bold">查看数据</button>
                                      <button onClick={() => { setEditingUser(u); setIsEditingUser(true); }} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={16} /></button>
                                      {u.id !== 'admin' && (<button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>)}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>)}
          {userSubTab === 'business' && renderBusinessDocking()}
          {isEditingUser && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl w-full max-w-md p-6 relative"><button onClick={() => setIsEditingUser(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button><h3 className="text-xl font-bold mb-6">{editingUser.id ? '编辑用户' : '新增用户'}</h3><div className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">姓名</label><input className="w-full border p-2 rounded" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">邮箱</label><input className="w-full border p-2 rounded" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">手机</label><input className="w-full border p-2 rounded" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">角色</label><select className="w-full border p-2 rounded" value={editingUser.role || 'user'} onChange={e => setEditingUser({...editingUser, role: e.target.value as 'user'|'admin'})}><option value="user">User</option><option value="admin">Admin</option></select></div><div><label className="block text-xs font-bold text-slate-500 mb-1">计划</label><select className="w-full border p-2 rounded" value={editingUser.plan || 'free'} onChange={e => setEditingUser({...editingUser, plan: e.target.value as 'free'|'pro'})}><option value="free">Free</option><option value="pro">Pro</option></select></div></div><div><label className="block text-xs font-bold text-slate-500 mb-1">密码</label><input className="w-full border p-2 rounded" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} placeholder="******" /></div><div className="flex justify-end pt-4"><button onClick={handleSaveUser} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">保存</button></div></div></div></div>)}
          
          {/* User Details Modal */}
          {selectedUserForDetail && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col relative animate-in zoom-in-95 shadow-2xl overflow-hidden">
                      <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                  {selectedUserForDetail.name.charAt(0)}
                              </div>
                              <div>
                                  <h3 className="text-xl font-bold text-slate-900">{selectedUserForDetail.name}</h3>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <span>{selectedUserForDetail.email}</span>
                                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedUserForDetail.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{selectedUserForDetail.plan === 'pro' ? 'PRO Member' : 'Free User'}</span>
                                  </div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <button onClick={handleSingleUserExport} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                  <Download size={16} /> 导出数据
                              </button>
                              <button onClick={closeUserDetail} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                  <X size={24} />
                              </button>
                          </div>
                      </div>
                      
                      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
                          <button 
                            onClick={() => setUserDetailTab('history')}
                            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${userDetailTab === 'history' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                          >
                            <Clock size={16} /> 学习记录
                          </button>
                          <button 
                            onClick={() => setUserDetailTab('notes')}
                            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${userDetailTab === 'notes' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                          >
                            <Edit size={16} /> 学习笔记
                          </button>
                          <button 
                            onClick={() => setUserDetailTab('uploads')}
                            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${userDetailTab === 'uploads' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                          >
                            <Upload size={16} /> 诊断报告上传
                          </button>
                          <button 
                            onClick={() => setUserDetailTab('profile')}
                            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${userDetailTab === 'profile' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                          >
                            <UserCog size={16} /> 账户设置
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                          {userDetailTab === 'history' && (
                              <div className="space-y-6">
                                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                      <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
                                          <Video size={16} /> 视频观看历史 ({userDetailHistory.watched.length})
                                      </div>
                                      <div className="divide-y divide-slate-50">
                                          {userDetailHistory.watched.length === 0 ? (
                                              <div className="p-8 text-center text-slate-400 text-sm">暂无观看记录</div>
                                          ) : (
                                              userDetailHistory.watched.map((record, i) => {
                                                  // Find lesson title
                                                  const lesson = lessons.find(l => l.id === record.lessonId);
                                                  return (
                                                      <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                                          <div>
                                                              <div className="font-bold text-slate-800 text-sm">{lesson?.title || `Lesson ID: ${record.lessonId}`}</div>
                                                              <div className="text-xs text-slate-500 mt-1">观看时间: {record.watchedAt}</div>
                                                          </div>
                                                          <div className="text-right">
                                                              <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">进度: {record.progress}%</div>
                                                          </div>
                                                      </div>
                                                  );
                                              })
                                          )}
                                      </div>
                                  </div>

                                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                      <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
                                          <BookOpen size={16} /> 文章阅读历史 ({userDetailHistory.read.length})
                                      </div>
                                      <div className="divide-y divide-slate-50">
                                          {userDetailHistory.read.length === 0 ? (
                                              <div className="p-8 text-center text-slate-400 text-sm">暂无阅读记录</div>
                                          ) : (
                                              userDetailHistory.read.map((record, i) => {
                                                  const post = blogPosts.find(p => p.id === record.articleId);
                                                  return (
                                                      <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                                          <div>
                                                              <div className="font-bold text-slate-800 text-sm">{post?.title || `Article ID: ${record.articleId}`}</div>
                                                          </div>
                                                          <div className="text-xs text-slate-500">{record.readAt}</div>
                                                      </div>
                                                  );
                                              })
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )}

                          {userDetailTab === 'notes' && (
                              <div>
                                  <div className="flex gap-2 mb-4">
                                      <button onClick={() => setNoteFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${noteFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>全部 ({userDetailNotes.length})</button>
                                      <button onClick={() => setNoteFilter('video')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1 ${noteFilter === 'video' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><Video size={12}/> 视频笔记</button>
                                      <button onClick={() => setNoteFilter('article')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1 ${noteFilter === 'article' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><BookOpen size={12}/> 文章笔记</button>
                                  </div>
                                  <div className="space-y-4">
                                      {userDetailNotes.filter(n => noteFilter === 'all' ? true : noteFilter === 'video' ? (n.sourceType === 'video' || !n.sourceType) : n.sourceType === 'article').length === 0 ? (
                                          <div className="text-center py-12 text-slate-400">
                                              <Edit size={48} className="mx-auto mb-2 opacity-20" />
                                              <p>该用户暂无{noteFilter === 'all' ? '' : noteFilter === 'video' ? '视频' : '文章'}笔记</p>
                                          </div>
                                      ) : (
                                          userDetailNotes.filter(n => noteFilter === 'all' ? true : noteFilter === 'video' ? (n.sourceType === 'video' || !n.sourceType) : n.sourceType === 'article').map(note => (
                                              <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div className="flex items-center gap-2">
                                                          <span className={`p-1.5 rounded-md ${note.sourceType === 'article' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                              {note.sourceType === 'article' ? <BookOpen size={14} /> : <Video size={14} />}
                                                          </span>
                                                          <span className="font-bold text-slate-700 text-sm">{note.lessonTitle || '未知来源'}</span>
                                                      </div>
                                                      <span className="text-xs text-slate-400">{note.createdAt}</span>
                                                  </div>
                                                  {note.quote && (
                                                      <div className="bg-slate-50 p-2 rounded border-l-2 border-slate-300 mb-2 text-xs text-slate-500 italic">
                                                          “{note.quote}”
                                                      </div>
                                                  )}
                                                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                                              </div>
                                          ))
                                      )}
                                  </div>
                              </div>
                          )}

                          {userDetailTab === 'uploads' && (
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                  <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                                          <tr>
                                              <th className="p-4 font-bold">文件名</th>
                                              <th className="p-4 font-bold">大小</th>
                                              <th className="p-4 font-bold">上传时间</th>
                                              <th className="p-4 font-bold">状态</th>
                                              <th className="p-4 font-bold text-right">操作</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {userDetailUploads.length === 0 ? (
                                              <tr><td colSpan={5} className="p-8 text-center text-slate-400">该用户暂无上传文件</td></tr>
                                          ) : (
                                              userDetailUploads.map(upload => (
                                                  <tr key={upload.id} className="hover:bg-slate-50">
                                                      <td className="p-4">
                                                          <div className="flex items-center gap-2">
                                                              {getFileTypeInfo(upload.fileName).icon}
                                                              <span className="font-bold text-slate-700">{upload.fileName}</span>
                                                          </div>
                                                      </td>
                                                      <td className="p-4 text-slate-500">{upload.size}</td>
                                                      <td className="p-4 text-slate-500">{upload.uploadDate}</td>
                                                      <td className="p-4">
                                                          <span className={`text-xs px-2 py-0.5 rounded border ${
                                                              upload.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                              upload.status === 'analyzing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                          }`}>
                                                              {upload.status === 'completed' ? '诊断完成' : upload.status === 'analyzing' ? '专家分析中' : '待处理'}
                                                          </span>
                                                      </td>
                                                      <td className="p-4 text-right">
                                                          <button 
                                                              onClick={() => alert(`开始下载: ${upload.fileName} (模拟)`)} 
                                                              className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center justify-end gap-1 ml-auto"
                                                          >
                                                              <Download size={14} /> 下载
                                                          </button>
                                                      </td>
                                                  </tr>
                                              ))
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          )}

                          {userDetailTab === 'profile' && (
                              <div className="p-6 max-w-2xl mx-auto">
                                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                                      <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2"><Settings size={20} /> 用户档案设置</h3>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 mb-1">用户姓名</label>
                                              <input className="w-full border p-2 rounded-lg text-sm" value={userDetailProfile.name || ''} onChange={e => setUserDetailProfile({...userDetailProfile, name: e.target.value})} />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 mb-1">手机号码</label>
                                              <input className="w-full border p-2 rounded-lg text-sm" value={userDetailProfile.phone || ''} onChange={e => setUserDetailProfile({...userDetailProfile, phone: e.target.value})} />
                                          </div>
                                      </div>

                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 mb-1">电子邮箱 (登录账号)</label>
                                          <input className="w-full border p-2 rounded-lg text-sm bg-slate-50" value={userDetailProfile.email || ''} onChange={e => setUserDetailProfile({...userDetailProfile, email: e.target.value})} />
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 mb-1">当前订阅计划</label>
                                              <select className="w-full border p-2 rounded-lg text-sm" value={userDetailProfile.plan || 'free'} onChange={e => setUserDetailProfile({...userDetailProfile, plan: e.target.value as 'free'|'pro'})}>
                                                  <option value="free">Free (免费版)</option>
                                                  <option value="pro">Pro (专业版)</option>
                                              </select>
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 mb-1">系统角色</label>
                                              <select className="w-full border p-2 rounded-lg text-sm" value={userDetailProfile.role || 'user'} onChange={e => setUserDetailProfile({...userDetailProfile, role: e.target.value as 'user'|'admin'})}>
                                                  <option value="user">User (普通用户)</option>
                                                  <option value="admin">Admin (管理员)</option>
                                              </select>
                                          </div>
                                      </div>

                                      <div className="pt-4 border-t border-slate-100">
                                          <label className="block text-xs font-bold text-slate-500 mb-1">重置密码</label>
                                          <input className="w-full border p-2 rounded-lg text-sm" type="text" value={userDetailProfile.password || ''} onChange={e => setUserDetailProfile({...userDetailProfile, password: e.target.value})} placeholder="输入新密码" />
                                          <p className="text-[10px] text-slate-400 mt-1">留空则不修改密码。当前显示为明文仅供演示。</p>
                                      </div>

                                      <div className="flex justify-end pt-4">
                                          <button onClick={handleSaveUserDetailProfile} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">保存更改</button>
                                      </div>
                                  </div>
                              </div>
                          )}
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
        <div className="border-b border-slate-200 overflow-x-auto"><nav className="flex gap-2">
                 <button onClick={() => setActiveTab('blog')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'blog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><BookOpen size={18} /> 博客与洞察</button>
                 <button onClick={() => setActiveTab('diagnosis')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'diagnosis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Stethoscope size={18} /> 诊断罗盘</button>
                 <button onClick={() => setActiveTab('solution')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'solution' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><MonitorPlay size={18} /> 解决方案库</button>
                 <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><LayoutDashboard size={18} /> 指挥中心</button>
                 <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Users size={18} /> 用户管理</button>
                 <button onClick={() => setActiveTab('resource')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'resource' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Database size={18} /> 知识库管理</button>
                 <button onClick={() => setActiveTab('behavior')} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'behavior' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}><Activity size={18} /> 用户行动管理</button>
            </nav></div>
        <div className="min-w-0">
           {activeTab === 'blog' && renderBlogTab()}
           {activeTab === 'diagnosis' && renderDiagnosisTab()}
           {activeTab === 'solution' && renderSolutionTab()}
           {activeTab === 'dashboard' && renderDashboardTab()}
           {activeTab === 'users' && renderUsersTab()}
           {activeTab === 'resource' && renderResourceTab()}
           {activeTab === 'behavior' && renderBehaviorTab()}
        </div>
      </div>
    </div>
  );
};

export default Admin;