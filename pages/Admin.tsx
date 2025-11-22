
import React, { useState, useEffect } from 'react';
import { 
  Settings, BookOpen, Video, Database, Plus, Trash2, Edit, Save, X, Bot,
  Upload, FileText, FileVideo, Image as ImageIcon, FileType, Loader2, CheckCircle,
  LayoutDashboard, Target, PieChart, BarChart3, Users, ClipboardList, File as FileIcon, Download,
  MonitorPlay, MessageSquare, BrainCircuit, Shield, ToggleLeft, ToggleRight, Sparkles, Quote, Link as LinkIcon, Tags, UserCog, Key, FileCheck, AlertTriangle, Activity, Zap, Import, ArrowUp, ArrowDown, Sigma, Divide, QrCode, Wallet, Building2, Globe, Mail, Clock, Crown, CreditCard, Phone, Smartphone, Lock, Layers, Briefcase, Calendar
} from 'lucide-react';
import { BlogPost, Lesson, KnowledgeCategory, KnowledgeItem, DashboardProject, UserUpload, AdminNote, IntroVideo, DiagnosisIssue, PermissionConfig, PermissionDefinition, PermissionKey, TranscriptLine, User, KPIItem, KPIRecord, AboutUsInfo, EmailLog, RiskDetailItem, BusinessContactInfo, BusinessLead } from '../types';
import { getBlogPosts, saveBlogPost, deleteBlogPost, getIntroVideo, saveIntroVideo, getDiagnosisIssues, saveDiagnosisIssue, deleteDiagnosisIssue, getPaymentQRCode, savePaymentQRCode, getAboutUsInfo, saveAboutUsInfo, getBusinessContactInfo, saveBusinessContactInfo } from '../services/contentService';
import { getLessons, saveLesson, deleteLesson } from '../services/courseService';
import { getKnowledgeCategories, saveKnowledgeCategory, deleteKnowledgeCategory } from '../services/resourceService';
import { getDashboardProjects, saveDashboardProject, deleteDashboardProject } from '../services/dashboardService';
import { getUserUploads, deleteUserUpload, getAdminNotes, deleteAdminNote, updateUserUploadStatus, getAllUsers, saveUser, deleteUser, getEmailLogs, getBusinessLeads } from '../services/userDataService';
import { getPermissionConfig, savePermissionConfig, getPermissionDefinitions, savePermissionDefinition, deletePermissionDefinition } from '../services/permissionService';
import { createChatSession, sendMessageToAI } from '../services/geminiService';

// Helper to format date for input type="datetime-local"
const formatDateTimeForInput = (dateStr?: string) => {
  if (!dateStr) return new Date().toISOString().slice(0, 16);
  const d = new Date(dateStr.replace('年', '-').replace('月', '-').replace('日', ''));
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
  const offset = d.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
  return localISOTime;
};

const formatDisplayDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const MODULE_OPTIONS = [
    { id: '博客与洞察', label: '博客与洞察' },
    { id: '视频课程', label: '视频课程' },
    { id: '知识库', label: '知识库' },
    { id: '诊断罗盘', label: '诊断罗盘' },
    { id: '指挥中心', label: '指挥中心' },
    { id: '解决方案', label: '解决方案' },
    { id: '通用', label: '通用/系统' }
];

// --- Helper Functions ---
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

// --- Helper Components for KPI Editor ---

const KPIEditor: React.FC<{ kpis: KPIItem[], onChange: (kpis: KPIItem[]) => void }> = ({ kpis, onChange }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Data Entry State
  const [entryYear, setEntryYear] = useState(new Date().getFullYear());
  const [entryPeriod, setEntryPeriod] = useState('01'); // Month: 01-12, Q: Q1-Q4, H: H1-H2
  const [entryValue, setEntryValue] = useState<string>('');

  const handleUpdateKPI = (idx: number, field: keyof KPIItem, val: any) => {
    const newKPIs = [...kpis];
    newKPIs[idx] = { ...newKPIs[idx], [field]: val };
    onChange(newKPIs);
  };

  const handleAddDataPoint = (idx: number) => {
    const kpi = kpis[idx];
    let periodKey = '';

    // Construct key based on granularity
    if (kpi.timeWindow === 'Month') {
       periodKey = `${entryYear}-${entryPeriod.padStart(2, '0')}`;
    } else if (kpi.timeWindow === 'Quarter') {
       periodKey = `${entryYear}-${entryPeriod}`; // e.g., 2024-Q1
    } else if (kpi.timeWindow === 'HalfYear') {
       periodKey = `${entryYear}-${entryPeriod}`; // e.g., 2024-H1
    } else if (kpi.timeWindow === 'Year') {
       periodKey = `${entryYear}`;
    }

    const newVal = parseFloat(entryValue);
    if (isNaN(newVal)) return;

    const newRecord: KPIRecord = { month: periodKey, value: newVal };
    
    // Add and Sort
    const newChartData = [...(kpi.chartData || []), newRecord].sort((a, b) => a.month.localeCompare(b.month));
    
    // Update KPI
    handleUpdateKPI(idx, 'chartData', newChartData);
    // Update Current Value to latest
    handleUpdateKPI(idx, 'value', newVal);
    
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
      const newKPI: KPIItem = { 
          id: Date.now().toString(), label: '新指标', value: 0, unit: '', target: 0, trend: 0, timeWindow: 'Month', aggregation: 'avg', direction: 'up', chartData: [] 
      };
      onChange([...kpis, newKPI]);
      setActiveIndex(kpis.length); // Open the new one
  };

  const handleRemoveKPI = (idx: number) => {
      const newKPIs = [...kpis];
      newKPIs.splice(idx, 1);
      onChange(newKPIs);
      setActiveIndex(null);
  };

  // Render Period Options based on TimeWindow
  const renderPeriodOptions = (window: string) => {
      if (window === 'Month') return Array.from({length: 12}, (_, i) => <option key={i} value={(i+1).toString().padStart(2,'0')}>{i+1}月</option>);
      if (window === 'Quarter') return ['Q1','Q2','Q3','Q4'].map(q => <option key={q} value={q}>{q}</option>);
      if (window === 'HalfYear') return ['H1','H2'].map(h => <option key={h} value={h}>{h==='H1'?'上半年':'下半年'}</option>);
      return null; // Year doesn't need sub-period
  };

  return (
      <div className="space-y-4">
          <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-700">核心指标配置 (KPIs)</h4>
              <button onClick={handleAddKPI} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded font-bold hover:bg-blue-200 flex items-center gap-1">
                  <Plus size={14} /> 添加指标
              </button>
          </div>
          
          <div className="space-y-3">
              {kpis.map((kpi, idx) => (
                  <div key={kpi.id} className={`bg-white rounded-lg border transition-all ${activeIndex === idx ? 'border-blue-400 shadow-md' : 'border-slate-200'}`}>
                      {/* Header / Summary Row */}
                      <div className="p-3 flex items-center justify-between bg-slate-50 rounded-t-lg cursor-pointer" onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}>
                          <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 text-sm">{kpi.label || '未命名指标'}</span>
                              <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border">{kpi.timeWindow === 'Month' ? '月度' : kpi.timeWindow === 'Quarter' ? '季度' : kpi.timeWindow === 'HalfYear' ? '半年度' : '年度'}</span>
                              <span className="text-xs text-slate-500">当前: {kpi.value} {kpi.unit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${activeIndex === idx ? 'rotate-180' : ''}`} />
                          </div>
                      </div>

                      {/* Detailed Editor */}
                      {activeIndex === idx && (
                          <div className="p-4 border-t border-slate-100 space-y-4">
                              {/* Row 1: Basic Info */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">指标名称</label>
                                      <input className="w-full border p-2 rounded text-sm" value={kpi.label} onChange={(e) => handleUpdateKPI(idx, 'label', e.target.value)} placeholder="如: 核心留存率" />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">单位</label>
                                      <input className="w-full border p-2 rounded text-sm" value={kpi.unit} onChange={(e) => handleUpdateKPI(idx, 'unit', e.target.value)} placeholder="%" />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">目标值 (Target)</label>
                                      <input type="number" className="w-full border p-2 rounded text-sm bg-green-50 border-green-100" value={kpi.target} onChange={(e) => handleUpdateKPI(idx, 'target', parseFloat(e.target.value))} placeholder="0" />
                                  </div>
                              </div>

                              {/* Row 2: Configuration */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">时间维度</label>
                                      <select className="w-full border p-2 rounded text-sm bg-white" value={kpi.timeWindow} onChange={(e) => handleUpdateKPI(idx, 'timeWindow', e.target.value)}>
                                          <option value="Month">月度 (Month)</option>
                                          <option value="Quarter">季度 (Quarter)</option>
                                          <option value="HalfYear">半年度 (Half Year)</option>
                                          <option value="Year">年度 (Year)</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">趋势方向</label>
                                      <select className="w-full border p-2 rounded text-sm bg-white" value={kpi.direction} onChange={(e) => handleUpdateKPI(idx, 'direction', e.target.value)}>
                                          <option value="up">越高越好 (↑)</option>
                                          <option value="down">越低越好 (↓)</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">聚合方式</label>
                                      <select className="w-full border p-2 rounded text-sm bg-white" value={kpi.aggregation} onChange={(e) => handleUpdateKPI(idx, 'aggregation', e.target.value)}>
                                          <option value="avg">平均值 (Avg)</option>
                                          <option value="sum">求和 (Sum)</option>
                                      </select>
                                  </div>
                                  <div className="flex items-end justify-end">
                                      <button onClick={() => handleRemoveKPI(idx)} className="text-xs text-red-600 hover:bg-red-50 px-3 py-2 rounded flex items-center gap-1">
                                          <Trash2 size={14}/> 删除指标
                                      </button>
                                  </div>
                              </div>

                              {/* Row 3: Data Management */}
                              <div className="border rounded-lg overflow-hidden">
                                  <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 flex justify-between items-center">
                                      <span>历史数据录入 ({kpi.chartData.length} 条)</span>
                                      <span className="text-slate-400 font-normal">用于同比/环比分析</span>
                                  </div>
                                  
                                  {/* Input Area */}
                                  <div className="p-3 bg-white border-b flex gap-2 items-end">
                                      <div className="w-24">
                                          <label className="text-[10px] text-slate-400 block mb-1">年份</label>
                                          <select className="w-full border p-1.5 rounded text-sm" value={entryYear} onChange={e => setEntryYear(parseInt(e.target.value))}>
                                              {Array.from({length: 6}, (_, i) => new Date().getFullYear() - 4 + i).map(y => <option key={y} value={y}>{y}</option>)}
                                          </select>
                                      </div>
                                      
                                      {kpi.timeWindow !== 'Year' && (
                                          <div className="w-24">
                                              <label className="text-[10px] text-slate-400 block mb-1">周期</label>
                                              <select className="w-full border p-1.5 rounded text-sm" value={entryPeriod} onChange={e => setEntryPeriod(e.target.value)}>
                                                  {renderPeriodOptions(kpi.timeWindow)}
                                              </select>
                                          </div>
                                      )}

                                      <div className="flex-1">
                                          <label className="text-[10px] text-slate-400 block mb-1">数值</label>
                                          <input 
                                              type="number" 
                                              className="w-full border p-1.5 rounded text-sm" 
                                              placeholder="输入数值"
                                              value={entryValue}
                                              onChange={e => setEntryValue(e.target.value)}
                                          />
                                      </div>
                                      <button 
                                          onClick={() => handleAddDataPoint(idx)}
                                          disabled={!entryValue}
                                          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                                      >
                                          添加
                                      </button>
                                  </div>

                                  {/* Data Table */}
                                  <div className="max-h-40 overflow-y-auto bg-slate-50 p-2 grid grid-cols-3 gap-2">
                                      {kpi.chartData.slice().reverse().map((data, dIdx) => {
                                          // Find actual index in original array to delete correctly
                                          const realIdx = kpi.chartData.indexOf(data);
                                          return (
                                              <div key={dIdx} className="flex justify-between items-center bg-white border px-3 py-1.5 rounded text-xs">
                                                  <span className="font-mono font-bold text-slate-600">{data.month}</span>
                                                  <div className="flex items-center gap-2">
                                                      <span className="font-bold text-blue-600">{data.value}</span>
                                                      <button onClick={() => handleRemoveDataPoint(idx, realIdx)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                                                  </div>
                                              </div>
                                          );
                                      })}
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

// Helper Icon
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'blog' | 'course' | 'knowledge' | 'dashboard' | 'userdata' | 'users' | 'emails'>('blog');
  
  // Data States
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [introVideo, setIntroVideo] = useState<IntroVideo | null>(null);
  const [diagnosisIssues, setDiagnosisIssues] = useState<DiagnosisIssue[]>([]);
  const [userUploads, setUserUploads] = useState<UserUpload[]>([]);
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([]);
  const [permissions, setPermissions] = useState<PermissionConfig | null>(null);
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentQR, setPaymentQR] = useState('');
  const [aboutUsData, setAboutUsData] = useState<AboutUsInfo | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessContactInfo | null>(null);
  const [businessLeads, setBusinessLeads] = useState<BusinessLead[]>([]);

  // Sub-tabs
  const [userDataTab, setUserDataTab] = useState<'uploads' | 'notes'>('uploads');
  const [blogTab, setBlogTab] = useState<'posts' | 'insights' | 'about'>('posts');
  const [userMgmtTab, setUserMgmtTab] = useState<'list' | 'roles' | 'business'>('list');

  // Editors State
  const [editingBlog, setEditingBlog] = useState<Partial<BlogPost> | null>(null);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [transcriptText, setTranscriptText] = useState(''); // Helper for bulk transcript editing
  const [editingCategory, setEditingCategory] = useState<Partial<KnowledgeCategory> | null>(null);
  const [editingProject, setEditingProject] = useState<Partial<DashboardProject> | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPermission, setEditingPermission] = useState<PermissionDefinition | null>(null);

  // Helper States for Knowledge Item Editing
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading' | 'processing' | 'success'>('idle');
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);

  const refreshData = () => {
    try {
      setBlogs(getBlogPosts());
      setLessons(getLessons());
      setCategories(getKnowledgeCategories());
      setProjects(getDashboardProjects());
      setUserUploads(getUserUploads());
      setAdminNotes(getAdminNotes());
      setIntroVideo(getIntroVideo());
      setDiagnosisIssues(getDiagnosisIssues());
      setPermissions(getPermissionConfig());
      setPermissionDefinitions(getPermissionDefinitions());
      setUsers(getAllUsers());
      setPaymentQR(getPaymentQRCode());
      setAboutUsData(getAboutUsInfo());
      setEmailLogs(getEmailLogs());
      setBusinessInfo(getBusinessContactInfo());
      setBusinessLeads(getBusinessLeads());
    } catch (e) {
      console.error("Error refreshing admin data", e);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- Handlers ---

  // Blog
  const handleEditBlog = (post: BlogPost | null) => { 
      if (post) {
          setEditingBlog({ ...post }); 
      } else {
          setEditingBlog({ 
              id: Date.now().toString(), 
              title: '', 
              summary: '', 
              author: 'Captain AI', 
              requiredPlan: 'free', 
              date: formatDisplayDate(new Date().toISOString()), 
              thumbnail: 'https://picsum.photos/600/400', 
              content: '<p>请输入文章内容...</p>', 
              readTime: '5 分钟阅读', 
              tags: [], 
              originalUrl: '' 
          }); 
      }
      setImportStatus('idle'); 
  };
  const handleSaveBlog = () => { 
      if (editingBlog && editingBlog.title) { 
          saveBlogPost(editingBlog as BlogPost); 
          setEditingBlog(null); 
          refreshData(); 
      } 
  };
  const handleDeleteBlog = (id: string) => { deleteBlogPost(id); refreshData(); };
  const handleBlogCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if(file && editingBlog) { setEditingBlog({...editingBlog, thumbnail: URL.createObjectURL(file)}); } 
  };

  // Intro Video
  const handleSaveIntroVideo = () => { 
      if (introVideo) { 
          saveIntroVideo(introVideo); 
          alert('配置已保存'); 
          refreshData(); 
      } 
  };
  const handleIntroVideoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'cover') => {
      const file = e.target.files?.[0];
      if(!file || !introVideo) return;
      const url = URL.createObjectURL(file);
      if(type === 'video') setIntroVideo({...introVideo, url});
      else setIntroVideo({...introVideo, thumbnail: url});
  };

  // About Us
  const handleSaveAboutUs = () => { if(aboutUsData) { saveAboutUsInfo(aboutUsData); alert('保存成功'); refreshData(); } };

  // Course / Lesson
  const handleEditLesson = (lesson: Lesson | null) => { 
      setImportStatus('idle'); 
      setIsGeneratingTranscript(false); 
      if (lesson) {
          setEditingLesson({ ...lesson }); 
          const txt = lesson.transcript.map(t => `${t.time}|${t.text}`).join('\n');
          setTranscriptText(txt);
      } else {
          setEditingLesson({ 
              id: Date.now().toString(), 
              title: '', 
              duration: '10:00', 
              durationSec: 600, 
              requiredPlan: 'free', 
              thumbnail: 'https://picsum.photos/800/450', 
              highlights: [], 
              transcript: [], 
              tags: [], 
              category: '' 
          }); 
          setTranscriptText('');
      }
  };
  const handleSaveLesson = () => { 
      if (editingLesson && editingLesson.title) { 
          const lines: TranscriptLine[] = [];
          transcriptText.split('\n').forEach(line => {
              const [t, txt] = line.split('|');
              if(t && txt) lines.push({ time: parseInt(t), text: txt });
          });
          
          const lessonToSave = { ...editingLesson, transcript: lines };
          saveLesson(lessonToSave as Lesson); 
          setEditingLesson(null); 
          refreshData(); 
      } 
  };
  const handleDeleteLesson = (id: string) => { deleteLesson(id); refreshData(); };
  const handleLessonFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image') => { 
      const file = e.target.files?.[0]; 
      if (!file || !editingLesson) return; 
      const fakeUrl = URL.createObjectURL(file); 
      if (type === 'video') setEditingLesson({ ...editingLesson, videoUrl: fakeUrl }); 
      else setEditingLesson({ ...editingLesson, thumbnail: fakeUrl }); 
  };
  const generateMockTranscript = () => {
      setIsGeneratingTranscript(true);
      // Simulate AI processing
      setTimeout(() => {
          const mock = "0|大家好，欢迎来到本节课程。\n15|今天我们要讲的是关于核心指标的拆解。\n45|首先，让我们看一下数据模型。\n120|非常有意思的是，这个趋势展示了季节性变化。\n200|总结一下，关键在于持续监控和及时干预。";
          setTranscriptText(mock);
          setIsGeneratingTranscript(false);
      }, 1500);
  };
  
  // Knowledge Category
  const handleEditCategory = (cat: KnowledgeCategory | null) => { 
      if (cat) setEditingCategory({ ...cat }); 
      else setEditingCategory({ id: Date.now().toString(), name: '', color: 'blue', requiredPlan: 'free', items: [] }); 
  };
  const handleCategoryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && editingCategory) {
          const newItems: KnowledgeItem[] = Array.from(files).map((f: File) => ({
              id: Date.now() + Math.random().toString(),
              title: f.name,
              type: f.name.split('.').pop() as any || 'doc',
              size: (f.size / 1024 / 1024).toFixed(1) + ' MB',
              tags: [],
              url: '#'
          }));
          setEditingCategory({
              ...editingCategory,
              items: [...(editingCategory.items || []), ...newItems]
          });
      }
  };
  const handleRemoveItemFromCategory = (idx: number) => { 
      if (editingCategory?.items) { 
          const n = [...editingCategory.items]; 
          n.splice(idx, 1); 
          setEditingCategory({...editingCategory, items: n}); 
      } 
  };
  const handleSaveCategory = () => { if (editingCategory?.name) { saveKnowledgeCategory(editingCategory as KnowledgeCategory); setEditingCategory(null); refreshData(); } };
  const handleDeleteCategory = (id: string) => { deleteKnowledgeCategory(id); refreshData(); };

  // Dashboard Project
  const handleEditProject = (project: DashboardProject | null) => {
      if (project) {
        setEditingProject({ ...project });
      } else {
        setEditingProject({
          id: Date.now().toString(),
          name: '',
          category: '人力运营',
          requiredPlan: 'free',
          content: '<h3 class="text-lg font-bold text-slate-900 mb-2">项目背景</h3><p>请输入项目描述...</p>',
          updatedAt: formatDisplayDate(new Date().toISOString()),
          kpis: [],
          risk: { label: '风险预警', value: '无', icon: 'Activity', color: 'text-blue-600 bg-blue-50', details: [] },
          actionPlanFile: '',
          meetingRecordFile: ''
        });
      }
  };
  const handleSaveProject = () => { if(editingProject?.name) { saveDashboardProject(editingProject as DashboardProject); setEditingProject(null); refreshData(); }};
  const handleDeleteProject = (id: string) => { deleteDashboardProject(id); refreshData(); };

  // User & Permission Management
  const handleEditUser = (user: User | null) => { 
    if (user) setEditingUser({...user, password: ''}); 
    else setEditingUser({id: '', name: '', email: '', role: 'user', plan: 'free', phone: '', password: '', isAuthenticated: true}); 
  };
  const handleSaveUser = () => { 
    if (editingUser && editingUser.name && editingUser.email) { 
      const u = {...editingUser}; 
      if(!u.id) u.id=Date.now().toString();
      
      if (editingUser.id && !editingUser.password) {
         const original = users.find(us => us.id === editingUser.id);
         if (original) u.password = original.password;
      }
      
      saveUser(u); 
      setEditingUser(null); 
      refreshData(); 
    } 
  };
  const handleDeleteUser = (id: string) => { if(confirm("确认删除该用户吗？")) { deleteUser(id); refreshData(); } };
  
  const handleEditPermission = (p: PermissionDefinition | null) => { if(p) setEditingPermission({...p}); else setEditingPermission({key:'', label:'', module: '通用'}); };
  const handleSavePermission = () => { if(editingPermission?.key && editingPermission.label) { savePermissionDefinition(editingPermission); setEditingPermission(null); refreshData(); } };
  const handleDeletePermission = (k: string) => { if(confirm("确认删除该权限模块吗？")) { deletePermissionDefinition(k); refreshData(); } };
  const handlePaymentQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onload=()=>{ setPaymentQR(r.result as string); savePaymentQRCode(r.result as string); }; r.readAsDataURL(f); } };
  
  // Business Info Handler
  const handleSaveBusinessInfo = () => {
      if (businessInfo) {
          saveBusinessContactInfo(businessInfo);
          alert('商务信息已保存');
          refreshData();
      }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Settings className="text-slate-400" /> 后台管理系统
          </h1>
          <p className="text-slate-500 mt-2">管理网站内容、课程、资源库与用户权限</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 mb-8 overflow-x-auto">
        {[
          { id: 'blog', label: '博客文章管理', icon: BookOpen },
          { id: 'course', label: '视频课程管理', icon: Video },
          { id: 'knowledge', label: '知识库管理', icon: Database },
          { id: 'dashboard', label: '指挥中心管理', icon: LayoutDashboard },
          { id: 'userdata', label: '用户数据管理', icon: ClipboardList },
          { id: 'users', label: '用户与权限', icon: Users },
          { id: 'emails', label: '邮件日志', icon: Mail },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- BLOG MANAGEMENT --- */}
      {activeTab === 'blog' && (
        <div className="space-y-6">
           {/* ... (Blog code unchanged) ... */}
           <div className="flex gap-4 mb-6">
               <button onClick={() => setBlogTab('posts')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${blogTab==='posts'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}>文章列表</button>
               <button onClick={() => setBlogTab('insights')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${blogTab==='insights'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}>首页视频配置</button>
               <button onClick={() => setBlogTab('about')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${blogTab==='about'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}><Building2 size={16}/> 关于我们配置</button>
           </div>

           {blogTab === 'posts' && (
             <>
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen size={20} /> 博客文章列表</h3>
                  <button onClick={() => handleEditBlog(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus size={18}/> 新增文章</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {blogs.map(post => (
                    <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group relative">
                       <div className="h-32 bg-slate-100 rounded-lg mb-3 overflow-hidden relative">
                          <img src={post.thumbnail} className="w-full h-full object-cover" alt="" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 px-2">
                             {post.date}
                          </div>
                       </div>
                       <h4 className="font-bold text-slate-900 line-clamp-1 mb-1">{post.title}</h4>
                       <div className="flex justify-between items-center mb-1">
                          <div className="text-xs text-slate-500">
                              {post.author}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${post.requiredPlan === 'pro' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              {post.requiredPlan === 'pro' ? 'PRO' : '免费'}
                          </span>
                       </div>
                       <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded shadow backdrop-blur">
                          <button onClick={() => handleEditBlog(post)} className="p-1 hover:text-blue-600"><Edit size={16}/></button>
                          <button onClick={() => handleDeleteBlog(post.id)} className="p-1 hover:text-red-600"><Trash2 size={16}/></button>
                       </div>
                    </div>
                 ))}
               </div>
             </>
           )}
           
           {/* ... (Insights & About tabs unchanged) ... */}
           {blogTab === 'insights' && introVideo && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl">
                 <h3 className="font-bold text-lg mb-6">首页介绍视频配置</h3>
                 <div className="space-y-6">
                    <div><label className="block text-sm font-bold text-slate-700 mb-2">视频标题</label><input className="w-full border p-2 rounded" value={introVideo.title} onChange={e=>setIntroVideo({...introVideo, title: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="border p-4 rounded-lg bg-slate-50">
                           <label className="block text-sm font-bold text-slate-700 mb-3">视频源 (二选一)</label>
                           <div className="space-y-3">
                               <div>
                                   <div className="text-xs text-slate-500 mb-1">方式A: 外部链接</div>
                                   <input className="w-full border p-2 rounded text-sm" value={introVideo.url.startsWith('blob') ? '' : introVideo.url} onChange={e=>setIntroVideo({...introVideo, url: e.target.value})} placeholder="输入 https://..."/>
                               </div>
                               <div className="text-center text-xs text-slate-400">- 或 -</div>
                               <div>
                                   <div className="text-xs text-slate-500 mb-1">方式B: 本地上传</div>
                                   <label className="block w-full p-2 border border-dashed bg-white text-center text-sm text-blue-600 cursor-pointer hover:bg-blue-50 rounded">
                                       选择视频文件
                                       <input type="file" className="hidden" accept="video/*" onChange={(e) => handleIntroVideoUpload(e, 'video')} />
                                   </label>
                                   {introVideo.url.startsWith('blob') && <div className="text-[10px] text-green-600 mt-1">已选择本地文件</div>}
                               </div>
                           </div>
                        </div>
                        <div className="border p-4 rounded-lg bg-slate-50">
                           <label className="block text-sm font-bold text-slate-700 mb-3">封面图片</label>
                           <div className="mb-3 aspect-video bg-slate-200 rounded overflow-hidden">
                               <img src={introVideo.thumbnail} className="w-full h-full object-cover" />
                           </div>
                           <label className="block w-full p-2 border border-dashed bg-white text-center text-sm text-blue-600 cursor-pointer hover:bg-blue-50 rounded">
                               上传新封面
                               <input type="file" className="hidden" accept="image/*" onChange={(e) => handleIntroVideoUpload(e, 'cover')} />
                           </label>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                       <div className="flex items-center gap-2">
                          <input type="checkbox" checked={introVideo.isVisible} onChange={e=>setIntroVideo({...introVideo, isVisible: e.target.checked})} className="w-4 h-4 accent-blue-600"/>
                          <label className="text-sm font-bold text-slate-700">在首页显示此视频</label>
                       </div>
                       <button onClick={handleSaveIntroVideo} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">保存配置</button>
                    </div>
                 </div>
              </div>
           )}
           
           {blogTab === 'about' && aboutUsData && (
             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl">
               <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Building2 size={20}/> 关于我们配置</h3>
               <div className="space-y-6">
                 <div><label className="block text-sm font-bold text-slate-700 mb-2">公司名称 / 标题</label><input className="w-full p-3 border border-slate-200 rounded-lg" value={aboutUsData.title} onChange={e => setAboutUsData({...aboutUsData, title: e.target.value})}/></div>
                 <div><label className="block text-sm font-bold text-slate-700 mb-2">公司简介</label><textarea className="w-full p-3 border border-slate-200 rounded-lg h-24" value={aboutUsData.description} onChange={e => setAboutUsData({...aboutUsData, description: e.target.value})}/></div>
                 <div><label className="block text-sm font-bold text-slate-700 mb-2">专家团队介绍</label><textarea className="w-full p-3 border border-slate-200 rounded-lg h-24" value={aboutUsData.teamInfo} onChange={e => setAboutUsData({...aboutUsData, teamInfo: e.target.value})}/></div>
                 <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">官网链接</label><input className="w-full p-3 border border-slate-200 rounded-lg" value={aboutUsData.websiteUrl} onChange={e => setAboutUsData({...aboutUsData, websiteUrl: e.target.value})}/></div>
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">联系邮箱</label><input className="w-full p-3 border border-slate-200 rounded-lg" value={aboutUsData.contactEmail} onChange={e => setAboutUsData({...aboutUsData, contactEmail: e.target.value})}/></div>
                 </div>
                 <button onClick={handleSaveAboutUs} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg">保存信息</button>
               </div>
             </div>
           )}

           {/* Blog Editor Modal */}
           {editingBlog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                       <h3 className="font-bold flex items-center gap-2"><Edit size={16}/> 编辑文章</h3>
                       <button onClick={() => setEditingBlog(null)}><X size={20} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                       {/* ... (Blog editor content) ... */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                               <div><label className="text-xs font-bold text-slate-500">文章标题</label><input className="w-full border p-2 rounded" value={editingBlog.title} onChange={e=>setEditingBlog({...editingBlog, title: e.target.value})}/></div>
                               <div className="grid grid-cols-2 gap-3">
                                   <div><label className="text-xs font-bold text-slate-500">发布时间</label><input type="datetime-local" className="w-full border p-2 rounded text-sm" value={formatDateTimeForInput(editingBlog.date)} onChange={e => setEditingBlog({...editingBlog, date: formatDisplayDate(e.target.value)})}/></div>
                                   <div><label className="text-xs font-bold text-slate-500">适用用户</label><select className="w-full border p-2 rounded bg-white" value={editingBlog.requiredPlan || 'free'} onChange={e => setEditingBlog({...editingBlog, requiredPlan: e.target.value as 'free' | 'pro'})}><option value="free">免费用户</option><option value="pro">PRO 会员</option></select></div>
                               </div>
                               <div><label className="text-xs font-bold text-slate-500">原文链接</label><input className="w-full border p-2 rounded" value={editingBlog.originalUrl || ''} onChange={e=>setEditingBlog({...editingBlog, originalUrl: e.target.value})} placeholder="https://..."/></div>
                               <div><label className="text-xs font-bold text-slate-500">标签</label><input className="w-full border p-2 rounded" value={editingBlog.tags?.join(', ') || ''} onChange={e=>setEditingBlog({...editingBlog, tags: e.target.value.split(',').map(s=>s.trim())})}/></div>
                           </div>
                           <div className="border rounded-lg p-4 bg-slate-50">
                               <label className="text-xs font-bold text-slate-500 mb-2 block">封面图片</label>
                               <div className="h-32 bg-slate-200 rounded mb-2 overflow-hidden flex items-center justify-center">{editingBlog.thumbnail ? <img src={editingBlog.thumbnail} className="w-full h-full object-cover"/> : <ImageIcon className="text-slate-400"/>}</div>
                               <label className="block w-full text-center p-2 border border-dashed bg-white text-xs text-blue-600 cursor-pointer rounded">上传封面<input type="file" className="hidden" accept="image/*" onChange={handleBlogCoverUpload}/></label>
                           </div>
                       </div>
                       <div className="flex flex-col h-full">
                          <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-bold text-slate-500">文章正文</label>
                              <label className="text-xs text-blue-600 cursor-pointer hover:underline flex items-center gap-1">
                                  <Import size={12} /> 导入文件
                                  <input type="file" className="hidden" accept=".md,.txt,.html,.doc,.docx" onChange={(e) => handleFileImport(e, (txt) => setEditingBlog({...editingBlog, content: txt}))}/>
                              </label>
                          </div>
                          <textarea className="w-full border p-4 rounded-lg h-64 font-mono text-sm leading-relaxed" value={editingBlog.content} onChange={e=>setEditingBlog({...editingBlog, content: e.target.value})}/>
                       </div>
                    </div>
                    <div className="p-4 border-t flex justify-end gap-2 bg-white">
                       <button onClick={() => setEditingBlog(null)} className="px-4 py-2 border rounded">取消</button>
                       <button onClick={handleSaveBlog} className="px-6 py-2 bg-blue-600 text-white rounded font-bold">保存发布</button>
                    </div>
                 </div>
              </div>
           )}
        </div>
      )}

      {/* --- COURSE MANAGEMENT --- */}
      {activeTab === 'course' && (
         <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Video size={20} /> 视频课程库</h3>
                 <button onClick={() => handleEditLesson(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus size={18}/> 新增课程</button>
             </div>
             {/* ... (Course table) ... */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">封面</th><th className="p-4">课程标题</th><th className="p-4">分类</th><th className="p-4">权限</th><th className="p-4">时长</th><th className="p-4 text-right">操作</th></tr></thead>
                   <tbody className="divide-y divide-slate-100">
                      {lessons.map(lesson => (
                         <tr key={lesson.id} className="hover:bg-slate-50">
                            <td className="p-4"><div className="w-20 h-12 bg-slate-100 rounded overflow-hidden"><img src={lesson.thumbnail} className="w-full h-full object-cover" alt=""/></div></td>
                            <td className="p-4 font-bold text-slate-800">{lesson.title}</td>
                            <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{lesson.category || '未分类'}</span></td>
                            <td className="p-4"><span className={`text-xs px-2 py-1 rounded border ${lesson.requiredPlan === 'pro' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{lesson.requiredPlan === 'pro' ? 'PRO' : 'Free'}</span></td>
                            <td className="p-4 text-slate-500 font-mono">{lesson.duration}</td>
                            <td className="p-4 flex justify-end gap-2">
                               <button onClick={() => handleEditLesson(lesson)} className="text-blue-600 p-2 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                               <button onClick={() => handleDeleteLesson(lesson.id)} className="text-red-600 p-2 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
             
             {/* Lesson Editor Modal */}
             {editingLesson && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                   <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                      {/* ... (Lesson editor content) ... */}
                      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                         <h3 className="font-bold">编辑课程</h3>
                         <button onClick={() => setEditingLesson(null)}><X size={20} /></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 bg-white">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-5">
                               <div><label className="text-xs font-bold text-slate-500 mb-1 block">课程标题</label><input className="w-full border p-2 rounded" value={editingLesson.title} onChange={e=>setEditingLesson({...editingLesson, title: e.target.value})}/></div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div><label className="text-xs font-bold text-slate-500 mb-1 block">课程分类</label><input className="w-full border p-2 rounded" value={editingLesson.category} onChange={e=>setEditingLesson({...editingLesson, category: e.target.value})}/></div>
                                   <div><label className="text-xs font-bold text-slate-500 mb-1 block">适用用户</label><select className="w-full border p-2 rounded bg-white" value={editingLesson.requiredPlan || 'free'} onChange={e => setEditingLesson({...editingLesson, requiredPlan: e.target.value as 'free' | 'pro'})}><option value="free">免费用户</option><option value="pro">PRO 会员</option></select></div>
                               </div>
                               <div className="border p-4 rounded-lg bg-slate-50">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">视频源 (二选一)</label>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">方式A: 外部链接</div>
                                            <input className="w-full border p-2 rounded text-sm" value={editingLesson.videoUrl?.startsWith('blob:') ? '' : editingLesson.videoUrl} onChange={e=>setEditingLesson({...editingLesson, videoUrl: e.target.value})} placeholder="输入 https://..."/>
                                        </div>
                                        <div className="text-center text-xs text-slate-400">- 或 -</div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">方式B: 本地上传</div>
                                            <label className="block w-full p-2 border border-dashed bg-white text-center text-sm text-blue-600 cursor-pointer hover:bg-blue-50 rounded">
                                                选择视频文件
                                                <input type="file" className="hidden" accept="video/*" onChange={(e) => handleLessonFileUpload(e, 'video')} />
                                            </label>
                                            {editingLesson.videoUrl?.startsWith('blob:') && <div className="text-[10px] text-green-600 mt-1">已选择本地文件</div>}
                                        </div>
                                    </div>
                               </div>
                               <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-slate-500 block">逐字稿</label>
                                        <button onClick={generateMockTranscript} disabled={isGeneratingTranscript} className="text-xs text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded">
                                            {isGeneratingTranscript ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} 
                                            AI解析生成
                                        </button>
                                    </div>
                                    <textarea className="w-full border p-3 rounded h-40 font-mono text-sm bg-slate-50" value={transcriptText} onChange={e => setTranscriptText(e.target.value)}/>
                               </div>
                            </div>
                            <div className="space-y-5">
                                <div className="border p-4 rounded-lg bg-slate-50"><label className="text-xs font-bold text-slate-500 mb-2 block">封面</label><div className="aspect-video bg-slate-200 rounded mb-2 overflow-hidden"><img src={editingLesson.thumbnail} className="w-full h-full object-cover"/></div><label className="block w-full text-center p-2 border border-dashed bg-white text-xs text-blue-600 cursor-pointer rounded">上传<input type="file" className="hidden" accept="image/*" onChange={(e) => handleLessonFileUpload(e, 'image')}/></label></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">时长</label><input className="w-full border p-2 rounded" value={editingLesson.duration} onChange={e=>setEditingLesson({...editingLesson, duration: e.target.value})}/></div>
                            </div>
                         </div>
                      </div>
                      <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
                         <button onClick={() => setEditingLesson(null)} className="px-4 py-2 border rounded text-slate-600">取消</button>
                         <button onClick={handleSaveLesson} className="px-6 py-2 bg-blue-600 text-white rounded font-bold">保存</button>
                      </div>
                   </div>
                </div>
             )}
         </div>
      )}
      
      {/* --- KNOWLEDGE & DASHBOARD --- */}
      {activeTab === 'knowledge' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Database size={20} /> 知识库管理</h3>
                 <button onClick={() => handleEditCategory(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus size={16}/> 新增分类</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {categories.map(cat => (
                     <div key={cat.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col ${cat.isAiRepository ? 'border-purple-200' : 'border-slate-200'}`}>
                         <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                             <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></div><h4 className="font-bold text-slate-800">{cat.name}</h4></div>
                             <div className="flex gap-1"><button onClick={() => handleEditCategory(cat)} className="p-1 hover:bg-white rounded"><Edit size={14}/></button><button onClick={() => handleDeleteCategory(cat.id)} className="p-1 hover:bg-white rounded"><Trash2 size={14}/></button></div>
                         </div>
                         <div className="p-4 bg-white flex-1 text-xs text-slate-500">{cat.items.length} items • {cat.requiredPlan === 'pro' ? 'Pro Only' : 'Free'}</div>
                     </div>
                 ))}
             </div>
             {/* Category Editor */}
             {editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                   <div className="bg-white rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                      {/* ... (Category editor content) ... */}
                      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                         <h3 className="font-bold">编辑分类</h3>
                         <button onClick={() => setEditingCategory(null)}><X size={20} /></button>
                      </div>
                      <div className="p-6 border-b bg-white space-y-6 flex-1 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold text-slate-500">分类名称</label><input className="w-full border p-2 rounded" value={editingCategory.name} onChange={e=>setEditingCategory({...editingCategory, name: e.target.value})}/></div>
                             <div><label className="text-xs font-bold text-slate-500">适用用户</label><select className="w-full border p-2 rounded bg-white" value={editingCategory.requiredPlan || 'free'} onChange={e => setEditingCategory({...editingCategory, requiredPlan: e.target.value as 'free' | 'pro'})}><option value="free">免费用户</option><option value="pro">PRO 会员</option></select></div>
                          </div>
                          <div className="border rounded-lg p-4 bg-slate-50">
                              <label className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2"><Upload size={14}/> 批量上传文件</label>
                              <input type="file" multiple className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={handleCategoryFileUpload} />
                          </div>
                          <div className="bg-slate-50 rounded border p-2 max-h-40 overflow-y-auto">
                              {editingCategory.items?.map((item, idx) => (
                                  <div key={idx} className="p-2 flex justify-between items-center text-sm bg-white mb-1 border-b last:border-0 border-slate-100">
                                      <span>{item.title}</span>
                                      <button onClick={() => handleRemoveItemFromCategory(idx)} className="text-red-400"><X size={14}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="p-4 border-t bg-white flex justify-end gap-2">
                         <button onClick={() => setEditingCategory(null)} className="px-4 py-2 border rounded">取消</button>
                         <button onClick={handleSaveCategory} className="px-6 py-2 bg-blue-600 text-white rounded font-bold">保存</button>
                      </div>
                   </div>
                </div>
             )}
          </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LayoutDashboard size={20} /> 诊断项目管理</h3>
              <button onClick={() => handleEditProject(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm"><Plus size={18}/> 新增项目</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm group relative">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${project.requiredPlan === 'pro' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{project.requiredPlan === 'pro' ? 'PRO' : 'Free'}</span>
                            <div className="flex gap-1"><button onClick={() => handleEditProject(project)} className="p-1 hover:bg-slate-100 rounded"><Edit size={16} /></button><button onClick={() => handleDeleteProject(project.id)} className="p-1 hover:bg-slate-100 rounded"><Trash2 size={16} /></button></div>
                        </div>
                        <h4 className="font-bold text-slate-800 mb-1">{project.name}</h4>
                    </div>
                ))}
            </div>
            {/* Project Editor Modal */}
            {editingProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                   <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                      <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                          <h3 className="font-bold">编辑项目</h3>
                          <button onClick={()=>setEditingProject(null)}><X size={20}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 bg-white">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-5">
                                 <div><label className="block text-xs font-bold text-slate-500 mb-1">项目名称</label><input className="w-full border p-2 rounded" value={editingProject.name} onChange={e=>setEditingProject({...editingProject, name: e.target.value})}/></div>
                                 <div><label className="block text-xs font-bold text-slate-500 mb-1">适用用户</label><select className="w-full border p-2 rounded bg-white" value={editingProject.requiredPlan || 'free'} onChange={e => setEditingProject({...editingProject, requiredPlan: e.target.value as 'free' | 'pro'})}><option value="free">免费用户</option><option value="pro">PRO 会员</option></select></div>
                                 <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-slate-500">项目报告 (HTML)</label>
                                        <label className="text-xs text-blue-600 cursor-pointer hover:underline flex items-center gap-1">
                                            <Import size={12} /> 导入报告
                                            <input type="file" className="hidden" accept=".md,.txt,.html" onChange={(e) => handleFileImport(e, (txt) => setEditingProject({...editingProject, content: txt}))}/>
                                        </label>
                                    </div>
                                    <textarea className="w-full border p-3 rounded h-40 font-mono text-sm" value={editingProject.content} onChange={e=>setEditingProject({...editingProject, content: e.target.value})}/>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">详细行动计划</label>
                                        <div className="flex gap-2">
                                            <input className="w-full border p-2 rounded text-sm bg-slate-50" value={editingProject.actionPlanFile || ''} readOnly placeholder="未上传"/>
                                            <label className="bg-slate-100 px-3 py-2 rounded cursor-pointer hover:bg-slate-200 border border-slate-200 flex items-center justify-center">
                                                <Upload size={16} className="text-slate-600"/>
                                                <input type="file" className="hidden" onChange={(e) => setEditingProject({...editingProject, actionPlanFile: e.target.files?.[0]?.name || ''})}/>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 mb-1 block">历史会议记录</label>
                                        <div className="flex gap-2">
                                            <input className="w-full border p-2 rounded text-sm bg-slate-50" value={editingProject.meetingRecordFile || ''} readOnly placeholder="未上传"/>
                                            <label className="bg-slate-100 px-3 py-2 rounded cursor-pointer hover:bg-slate-200 border border-slate-200 flex items-center justify-center">
                                                <Upload size={16} className="text-slate-600"/>
                                                <input type="file" className="hidden" onChange={(e) => setEditingProject({...editingProject, meetingRecordFile: e.target.files?.[0]?.name || ''})}/>
                                            </label>
                                        </div>
                                    </div>
                                 </div>
                             </div>
                             <div className="space-y-6">
                                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                     <KPIEditor 
                                        kpis={editingProject.kpis || []} 
                                        onChange={(newKpis) => setEditingProject({...editingProject, kpis: newKpis})} 
                                     />
                                 </div>
                             </div>
                         </div>
                      </div>
                      <div className="mt-auto p-4 border-t bg-slate-50 flex justify-end gap-2"><button onClick={()=>setEditingProject(null)} className="px-4 py-2 border rounded">取消</button><button onClick={handleSaveProject} className="px-6 py-2 bg-blue-600 text-white font-bold rounded">保存项目</button></div>
                   </div>
                </div>
            )}
        </div>
      )}

      {/* --- USER DATA --- */}
      {activeTab === 'userdata' && (
        <div className="space-y-6">
           {/* ... (User data code unchanged) ... */}
           <div className="flex gap-4 mb-6">
              <button onClick={() => setUserDataTab('uploads')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${userDataTab==='uploads'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}>用户上传文件</button>
              <button onClick={() => setUserDataTab('notes')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${userDataTab==='notes'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}>用户笔记</button>
           </div>
           {userDataTab === 'uploads' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">文件名</th><th className="p-4">用户</th><th className="p-4">状态</th><th className="p-4 text-right">操作</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                       {userUploads.map(upload => (
                           <tr key={upload.id}>
                               <td className="p-4 font-bold">{upload.fileName}</td>
                               <td className="p-4">{upload.userName}</td>
                               <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{upload.status}</span></td>
                               <td className="p-4 text-right"><button onClick={() => deleteUserUpload(upload.id)} className="text-red-500"><Trash2 size={16}/></button></td>
                           </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           )}
           {userDataTab === 'notes' && (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">笔记内容</th><th className="p-4">来源</th><th className="p-4">用户</th><th className="p-4 text-right">操作</th></tr></thead>
                       <tbody className="divide-y divide-slate-100">
                           {adminNotes.map(note => (
                               <tr key={note.id}>
                                   <td className="p-4 max-w-xs truncate">{note.content}</td>
                                   <td className="p-4 text-slate-500">{note.lessonTitle}</td>
                                   <td className="p-4">{note.userName}</td>
                                   <td className="p-4 text-right"><button onClick={() => deleteAdminNote(note.id)} className="text-red-500"><Trash2 size={16}/></button></td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           )}
        </div>
      )}
      
      {/* --- USERS MANAGEMENT --- */}
      {activeTab === 'users' && (
          <div className="space-y-6">
              {/* ... (User management code unchanged) ... */}
              <div className="flex gap-4 mb-6">
                  <button onClick={() => setUserMgmtTab('list')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${userMgmtTab==='list'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}>用户列表</button>
                  <button onClick={() => setUserMgmtTab('roles')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${userMgmtTab==='roles'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}>权限配置</button>
                  <button onClick={() => setUserMgmtTab('business')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${userMgmtTab==='business'?'bg-blue-100 text-blue-700':'bg-white text-slate-600 border border-slate-200'}`}><Briefcase size={16}/> 商务对接</button>
              </div>

              {userMgmtTab === 'list' && (
                  <>
                    <div className="flex justify-end mb-4">
                       <button onClick={() => handleEditUser(null)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-blue-700"><Plus size={18}/> 新增用户</button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                       <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">姓名</th><th className="p-4">邮箱</th><th className="p-4">身份</th><th className="p-4">订阅计划</th><th className="p-4 text-right">操作</th></tr></thead>
                          <tbody className="divide-y divide-slate-100">
                             {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                   <td className="p-4 font-bold text-slate-800">{u.name}</td>
                                   <td className="p-4 text-slate-500">{u.email}</td>
                                   <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${u.role==='admin'?'bg-purple-100 text-purple-700':'bg-slate-100 text-slate-600'}`}>{u.role==='admin'?'管理员':'普通用户'}</span></td>
                                   <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${u.plan==='pro'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700'}`}>{u.plan==='pro'?'专业版':'免费版'}</span></td>
                                   <td className="p-4 flex justify-end gap-2">
                                      <button onClick={() => handleEditUser(u)} className="text-blue-600 p-2 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 p-2 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                    {/* User Editor Modal */}
                    {editingUser && (
                       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                             <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold">编辑用户</h3>
                                <button onClick={() => setEditingUser(null)}><X size={20}/></button>
                             </div>
                             <div className="p-6 space-y-4">
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">姓名</label><input className="w-full border p-2 rounded" value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name: e.target.value})}/></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">邮箱</label><input className="w-full border p-2 rounded" value={editingUser.email} onChange={e=>setEditingUser({...editingUser, email: e.target.value})}/></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">手机号</label><input className="w-full border p-2 rounded" value={editingUser.phone || ''} onChange={e=>setEditingUser({...editingUser, phone: e.target.value})}/></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">密码 (留空则不修改)</label><input className="w-full border p-2 rounded" type="password" value={editingUser.password || ''} onChange={e=>setEditingUser({...editingUser, password: e.target.value})} placeholder="输入新密码"/></div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div><label className="text-xs font-bold text-slate-500 block mb-1">角色</label><select className="w-full border p-2 rounded bg-white" value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role: e.target.value as 'admin' | 'user'})}><option value="user">普通用户</option><option value="admin">管理员</option></select></div>
                                   <div>
                                       <label className="text-xs font-bold text-slate-500 block mb-1">订阅计划</label>
                                       <select className="w-full border p-2 rounded bg-white" value={editingUser.plan} onChange={e=>setEditingUser({...editingUser, plan: e.target.value as 'free' | 'pro'})}><option value="free">免费版</option><option value="pro">专业版</option></select>
                                   </div>
                                </div>
                             </div>
                             <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
                                <button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded">取消</button>
                                <button onClick={handleSaveUser} className="px-6 py-2 bg-blue-600 text-white rounded font-bold">保存用户</button>
                             </div>
                          </div>
                       </div>
                    )}
                  </>
              )}

              {userMgmtTab === 'roles' && (
                  <div className="space-y-6">
                      {/* ... (Permission code unchanged) ... */}
                      <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg">权限模块配置</h3>
                          <button onClick={() => handleEditPermission(null)} className="text-blue-600 text-sm font-bold hover:underline">+ 新增权限点</button>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">权限Key</th><th className="p-4">描述</th><th className="p-4">所属模块</th><th className="p-4 text-center">免费版</th><th className="p-4 text-center">专业版</th><th className="p-4 text-right">操作</th></tr></thead>
                              <tbody className="divide-y divide-slate-100">
                                  {permissionDefinitions.map(def => (
                                      <tr key={def.key}>
                                          <td className="p-4 font-mono text-xs text-slate-500">{def.key}</td>
                                          <td className="p-4 font-bold">{def.label}</td>
                                          <td className="p-4 text-xs text-slate-500">{def.module || '通用'}</td>
                                          <td className="p-4 text-center">
                                              <button 
                                                  onClick={() => {
                                                      if(!permissions) return;
                                                      const newConfig = {...permissions, free: {...permissions.free, [def.key]: !permissions.free[def.key]}};
                                                      setPermissions(newConfig);
                                                      savePermissionConfig(newConfig);
                                                  }} 
                                                  className={`w-8 h-5 rounded-full p-1 transition-colors ${permissions?.free[def.key] ? 'bg-green-500' : 'bg-slate-300'}`}
                                              >
                                                  <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${permissions?.free[def.key] ? 'translate-x-3' : ''}`}></div>
                                              </button>
                                          </td>
                                          <td className="p-4 text-center">
                                              <button 
                                                  onClick={() => {
                                                      if(!permissions) return;
                                                      const newConfig = {...permissions, pro: {...permissions.pro, [def.key]: !permissions.pro[def.key]}};
                                                      setPermissions(newConfig);
                                                      savePermissionConfig(newConfig);
                                                  }}
                                                  className={`w-8 h-5 rounded-full p-1 transition-colors ${permissions?.pro[def.key] ? 'bg-blue-600' : 'bg-slate-300'}`}
                                              >
                                                  <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${permissions?.pro[def.key] ? 'translate-x-3' : ''}`}></div>
                                              </button>
                                          </td>
                                          <td className="p-4 text-right">
                                              <button onClick={() => handleDeletePermission(def.key)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      {/* Permission Editor */}
                      {editingPermission && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                             <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
                                 <h3 className="font-bold text-lg mb-4">编辑权限点</h3>
                                 <div className="space-y-4 mb-6">
                                     <div><label className="text-xs font-bold text-slate-500 block mb-1">权限标识 (Key)</label><input className="w-full border p-2 rounded" value={editingPermission.key} onChange={e=>setEditingPermission({...editingPermission, key: e.target.value})} placeholder="例如: export_data"/></div>
                                     <div><label className="text-xs font-bold text-slate-500 block mb-1">权限名称</label><input className="w-full border p-2 rounded" value={editingPermission.label} onChange={e=>setEditingPermission({...editingPermission, label: e.target.value})}/></div>
                                     <div>
                                         <label className="text-xs font-bold text-slate-500 block mb-1">所属模块</label>
                                         <select className="w-full border p-2 rounded bg-white" value={editingPermission.module || '通用'} onChange={e=>setEditingPermission({...editingPermission, module: e.target.value})}>
                                             {MODULE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                                         </select>
                                     </div>
                                 </div>
                                 <div className="flex justify-end gap-2">
                                     <button onClick={() => setEditingPermission(null)} className="px-4 py-2 border rounded text-sm">取消</button>
                                     <button onClick={handleSavePermission} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold">保存</button>
                                 </div>
                             </div>
                          </div>
                      )}
                  </div>
              )}

              {userMgmtTab === 'business' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* ... (Business info code unchanged) ... */}
                      <div className="space-y-6">
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Smartphone size={20}/> 商务联系人配置</h3>
                              <div className="space-y-4">
                                  <div><label className="text-sm font-bold text-slate-700 block mb-1">联系人姓名</label><input className="w-full border p-2 rounded" value={businessInfo?.contactPerson || ''} onChange={e => businessInfo && setBusinessInfo({...businessInfo, contactPerson: e.target.value})}/></div>
                                  <div><label className="text-sm font-bold text-slate-700 block mb-1">微信号 / 电话</label><input className="w-full border p-2 rounded" value={businessInfo?.contactMethod || ''} onChange={e => businessInfo && setBusinessInfo({...businessInfo, contactMethod: e.target.value})}/></div>
                                  <div><label className="text-sm font-bold text-slate-700 block mb-1">联系邮箱</label><input className="w-full border p-2 rounded" value={businessInfo?.email || ''} onChange={e => businessInfo && setBusinessInfo({...businessInfo, email: e.target.value})}/></div>
                                  <button onClick={handleSaveBusinessInfo} className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">保存配置</button>
                              </div>
                          </div>
                          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><QrCode size={20}/> 支付/商务二维码</h3>
                              <div className="flex items-center gap-6">
                                  <div className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                                      {paymentQR ? <img src={paymentQR} className="w-full h-full object-contain"/> : <span className="text-xs text-slate-400">未上传</span>}
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-xs text-slate-500 mb-3">此二维码将显示在“升级计划”页面，供用户扫码联系商务或支付。</p>
                                      <label className="inline-block px-4 py-2 border border-slate-300 rounded bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                                          上传图片
                                          <input type="file" className="hidden" accept="image/*" onChange={handlePaymentQRUpload} />
                                      </label>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Briefcase size={20}/> 销售线索 (Leads)</h3>
                          <div className="flex-1 overflow-y-auto border rounded-lg">
                              <table className="w-full text-left text-sm">
                                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0"><tr><th className="p-3">提交时间</th><th className="p-3">姓名/职位</th><th className="p-3">联系方式</th><th className="p-3">状态</th></tr></thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {businessLeads.length === 0 ? (
                                          <tr><td colSpan={4} className="p-8 text-center text-slate-400">暂无销售线索</td></tr>
                                      ) : (
                                          businessLeads.map(lead => (
                                              <tr key={lead.id} className="hover:bg-blue-50/30">
                                                  <td className="p-3 text-slate-500 text-xs">{lead.submittedAt}</td>
                                                  <td className="p-3">
                                                      <div className="font-bold text-slate-800">{lead.name}</div>
                                                      <div className="text-xs text-slate-500">{lead.position} @ {lead.company}</div>
                                                  </td>
                                                  <td className="p-3">
                                                      <div className="text-blue-600">{lead.phone}</div>
                                                      <div className="text-xs text-slate-400">{lead.email}</div>
                                                  </td>
                                                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] ${lead.status==='new'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-500'}`}>{lead.status==='new'?'新提交':'已处理'}</span></td>
                                              </tr>
                                          ))
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}
      
      {/* --- EMAIL LOGS --- */}
      {activeTab === 'emails' && (
          <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Mail size={20} /> 系统邮件发送日志</h3>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4">时间</th><th className="p-4">接收邮箱</th><th className="p-4">验证码</th><th className="p-4">主题</th><th className="p-4">状态</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                          {emailLogs.length === 0 ? (
                              <tr><td colSpan={5} className="p-8 text-center text-slate-400">暂无邮件记录</td></tr>
                          ) : (
                              emailLogs.map(log => (
                                  <tr key={log.id}>
                                      <td className="p-4 text-slate-500">{log.sentAt}</td>
                                      <td className="p-4 font-bold">{log.recipient}</td>
                                      <td className="p-4 font-mono bg-slate-50 w-24 text-center text-blue-600 font-bold tracking-widest rounded border border-slate-100">{log.code}</td>
                                      <td className="p-4">{log.subject}</td>
                                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${log.status==='verified'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{log.status==='verified'?'已验证':'已发送'}</span></td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default Admin;
