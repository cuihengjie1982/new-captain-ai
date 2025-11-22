
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LabelList
} from 'recharts';
import { DashboardProject, User, KPIItem, KPIRecord } from '../types';
import { getDashboardProjects } from '../services/dashboardService';
import { hasPermission } from '../services/permissionService';
import { 
  TrendingUp, TrendingDown, Users, Activity, 
  ChevronDown, Target, FileText, BarChart3, Clock, Zap, Smile, Download,
  X, CheckCircle, Loader2, File, AlertCircle, FileCheck, Calendar, AlertTriangle, Lock,
  ArrowUpRight, ArrowDownRight, ArrowRight, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '../types';

// Helper to aggregate data
type TimeGranularity = 'Month' | 'Quarter' | 'HalfYear' | 'Year';

interface AggregatedRecord {
  label: string;
  value: number;
  rawDate: string; // For sorting/matching
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [currentData, setCurrentData] = useState<DashboardProject | null>(null);
  const [selectedKpiIndex, setSelectedKpiIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // View & Comparison State
  const [granularity, setGranularity] = useState<TimeGranularity>('Month');
  const [compareA, setCompareA] = useState<string>(''); // Selected label for Period A
  const [compareB, setCompareB] = useState<string>(''); // Selected label for Period B

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modals State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFile, setDownloadFile] = useState<{ name: string, label: string } | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  
  const downloadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const data = getDashboardProjects();
    setProjects(data);
    if (data.length > 0) {
      setSelectedProjectId(data[0].id);
      setCurrentData(data[0]);
      setSelectedKpiIndex(0);
    }
    
    const storedUser = localStorage.getItem('captainUser');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId) || projects[0];
      setCurrentData(project);
      setSelectedKpiIndex(0);
      // Reset Granularity based on KPI default if needed, or keep 'Month'
      setGranularity('Month');
    }
  }, [selectedProjectId, projects]);

  // --- Aggregation Logic ---
  const aggregatedData = useMemo<AggregatedRecord[]>(() => {
    if (!currentData) return [];
    const kpi = currentData.kpis[selectedKpiIndex];
    if (!kpi || !kpi.chartData) return [];

    const rawData = kpi.chartData; // Assuming YYYY-MM strings
    const aggregationType = kpi.aggregation || 'avg';

    const grouped: Record<string, number[]> = {};

    rawData.forEach(item => {
      const [year, month] = item.month.split('-');
      let key = '';

      switch (granularity) {
        case 'Month':
          key = item.month; // "2024-05"
          break;
        case 'Quarter':
          const q = Math.ceil(parseInt(month) / 3);
          key = `${year}-Q${q}`;
          break;
        case 'HalfYear':
          const h = parseInt(month) <= 6 ? 'H1' : 'H2';
          key = `${year}-${h}`;
          break;
        case 'Year':
          key = year;
          break;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item.value);
    });

    // Compute aggregated values
    const result = Object.keys(grouped).map(key => {
      const values = grouped[key];
      let val = 0;
      if (aggregationType === 'sum') {
        val = values.reduce((a, b) => a + b, 0);
      } else {
        val = values.reduce((a, b) => a + b, 0) / values.length;
      }
      // Round to 1 decimal for display
      return {
        label: key,
        value: parseFloat(val.toFixed(1)),
        rawDate: key
      };
    }).sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    return result;
  }, [currentData, selectedKpiIndex, granularity]);

  // Set Default Comparison Periods when data changes
  useEffect(() => {
    if (aggregatedData.length >= 2) {
      setCompareA(aggregatedData[aggregatedData.length - 1].label); // Latest
      setCompareB(aggregatedData[aggregatedData.length - 2].label); // Previous
    } else if (aggregatedData.length === 1) {
      setCompareA(aggregatedData[0].label);
      setCompareB(aggregatedData[0].label);
    }
  }, [aggregatedData]);

  // --- Click Outside for Project Dropdown ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ... Download logic ...
  const handleDownload = (filename: string | undefined, typeLabel: string) => {
    if (!hasPermission(currentUser, 'download_resources')) {
      alert('这是专业版功能。请在个人中心升级您的计划以解锁文件下载。');
      return;
    }
    if (!filename) {
      alert(`当前项目暂无"${typeLabel}"可供下载或查看。`);
      return;
    }
    setDownloadFile({ name: filename, label: typeLabel });
    setDownloadStatus('idle');
    setProgress(0);
    setShowDownloadModal(true);
  };

  const startDownload = () => {
    if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);
    setDownloadStatus('downloading');
    setProgress(0);
    downloadTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);
          setDownloadStatus('completed');
          return 100;
        }
        return Math.min(prev + Math.floor(Math.random() * 15) + 5, 100); 
      });
    }, 200);
  };

  const closeDownloadModal = () => {
    if (downloadTimerRef.current) clearInterval(downloadTimerRef.current);
    setShowDownloadModal(false);
    setDownloadStatus('idle');
    setProgress(0);
    setDownloadFile(null);
  };

  const renderRiskIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return <Users size={20} />;
      case 'Smile': return <Smile size={20} />;
      case 'Clock': return <Clock size={20} />;
      case 'Activity': return <Activity size={20} />;
      case 'Zap': return <Zap size={20} />;
      default: return <Activity size={20} />;
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText size={40} className="text-red-500" />;
    if (['doc', 'docx'].includes(ext || '')) return <FileText size={40} className="text-blue-500" />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileText size={40} className="text-green-500" />;
    return <File size={40} className="text-slate-400" />;
  };

  if (!currentData) return <div className="p-8">Loading...</div>;

  const currentKpi = currentData.kpis[selectedKpiIndex];
  const isBetterUp = currentKpi.direction === 'up'; // true if higher is better

  // Comparison Calculations
  const valA = aggregatedData.find(d => d.label === compareA)?.value || 0;
  const valB = aggregatedData.find(d => d.label === compareB)?.value || 0;
  const delta = valA - valB;
  const percentChange = valB !== 0 ? (delta / valB) * 100 : 0;
  
  // Improvement Logic
  const isImproved = isBetterUp ? delta >= 0 : delta <= 0;
  const deltaColor = isImproved ? 'text-green-600' : 'text-red-600';
  const deltaBg = isImproved ? 'bg-green-50' : 'bg-red-50';
  const TrendIcon = isImproved ? TrendingUp : TrendingDown;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-full flex flex-col">
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="relative" ref={dropdownRef}>
           <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
              <Target size={12} /> 当前诊断项目
           </div>
           <button 
             onClick={() => setIsDropdownOpen(!isDropdownOpen)}
             className="flex items-center gap-4 group text-left focus:outline-none bg-white p-2 rounded-2xl border border-transparent hover:border-slate-200 hover:shadow-sm transition-all -ml-2"
           >
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
                 <Activity size={28} />
              </div>
              <div className="min-w-[200px]">
                 <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                      ID: {currentData.id}
                    </span>
                 </div>
                 <div className="text-xl font-bold text-slate-900 flex items-center gap-2 group-hover:text-blue-700 transition-colors">
                    {currentData.name}
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                 </div>
                 <div className="text-xs text-slate-500 mt-1">分类: {currentData.category}</div>
              </div>
           </button>
           {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                 {projects.map(p => (
                   <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-blue-50 ${p.id === selectedProjectId ? 'bg-blue-50/60' : ''}`}>
                      <div className="font-bold text-sm text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.category}</div>
                   </button>
                 ))}
              </div>
           )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* LEFT: Report & Charts */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Comparison & Chart Card */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* KPI Selector Tabs */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                 <BarChart3 size={18} className="text-blue-600 flex-shrink-0" />
                 <div className="flex gap-2">
                    {currentData.kpis.map((kpi, idx) => (
                        <button 
                            key={kpi.id}
                            onClick={() => setSelectedKpiIndex(idx)}
                            className={`text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium ${selectedKpiIndex === idx ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {kpi.label}
                        </button>
                    ))}
                 </div>
              </div>

              <div className="p-6">
                 {/* Granularity Tabs */}
                 <div className="flex justify-center mb-8">
                    <div className="bg-slate-100 p-1 rounded-xl inline-flex">
                       {(['Month', 'Quarter', 'HalfYear', 'Year'] as TimeGranularity[]).map((g) => (
                          <button
                             key={g}
                             onClick={() => setGranularity(g)}
                             className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${granularity === g ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                             {g === 'Month' ? '月度' : g === 'Quarter' ? '季度' : g === 'HalfYear' ? '半年度' : '年度'}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Comparison Tool */}
                 <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8 items-center">
                    {/* Left Side: Period A */}
                    <div className="md:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">当前周期</span>
                            <select 
                               value={compareA}
                               onChange={(e) => setCompareA(e.target.value)}
                               className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 outline-none focus:border-blue-500"
                            >
                                {aggregatedData.map(d => <option key={d.label} value={d.label}>{d.label}</option>)}
                            </select>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 flex items-baseline gap-1">
                            {valA} <span className="text-sm font-normal text-slate-400">{currentKpi.unit}</span>
                        </div>
                    </div>

                    {/* Middle: Delta */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${deltaBg}`}>
                            {isImproved ? <ArrowUpRight size={20} className="text-green-600" /> : <ArrowDownRight size={20} className="text-red-600" />}
                        </div>
                        <span className={`text-xs font-bold ${deltaColor}`}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                           ({percentChange.toFixed(1)}%)
                        </span>
                    </div>

                    {/* Right Side: Period B */}
                    <div className="md:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">对比周期</span>
                            <select 
                               value={compareB}
                               onChange={(e) => setCompareB(e.target.value)}
                               className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 outline-none focus:border-blue-500"
                            >
                                {aggregatedData.map(d => <option key={d.label} value={d.label}>{d.label}</option>)}
                            </select>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 flex items-baseline gap-1">
                            {valB} <span className="text-sm font-normal text-slate-400">{currentKpi.unit}</span>
                        </div>
                    </div>
                 </div>

                 {/* Chart Area */}
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={aggregatedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="label" 
                            stroke="#94a3b8" 
                            tickLine={false} 
                            axisLine={false} 
                            dy={10}
                            fontSize={11}
                        />
                        <YAxis 
                            stroke="#94a3b8" 
                            tickLine={false} 
                            axisLine={false} 
                            dx={-10}
                            fontSize={11}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>

           {/* Project Briefing */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                 <FileText size={18} className="text-blue-600" />
                 <h2 className="font-bold text-slate-800">项目改善报告</h2>
              </div>
              <div className="p-6 md:p-8">
                <div 
                  className="prose prose-slate prose-sm md:prose-base max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentData.content }}
                />
                <div className="mt-8 flex flex-wrap gap-3">
                   <button 
                     onClick={() => handleDownload(currentData.actionPlanFile, '详细行动计划')}
                     className="px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20 active:transform active:scale-95"
                   >
                      {hasPermission(currentUser, 'download_resources') ? <Download size={16} /> : <Lock size={16} />}
                      下载详细行动计划
                   </button>
                   <button 
                     onClick={() => handleDownload(currentData.meetingRecordFile, '历史会议记录')}
                     className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 active:transform active:scale-95"
                   >
                      {hasPermission(currentUser, 'download_resources') ? <FileCheck size={16} /> : <Lock size={16} />}
                      查看历史会议记录
                   </button>
                </div>
              </div>
           </div>
        </div>

        {/* RIGHT: Stats & Risk */}
        <div className="space-y-6">
           {/* Current Stat Card */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                   <span className="text-slate-500 font-medium text-sm">最新{currentKpi.label}</span>
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-sm"><Activity size={20} /></div>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                   <div className="text-5xl font-bold text-slate-900 tracking-tight">{currentKpi.value}</div>
                   <div className="text-xl font-medium text-slate-400">{currentKpi.unit}</div>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium mt-3">
                   <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${isBetterUp ? (currentKpi.value >= currentKpi.target ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50') : (currentKpi.value <= currentKpi.target ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50')}`}>
                       {currentKpi.value >= currentKpi.target ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                       目标: {currentKpi.target}{currentKpi.unit}
                   </div>
                </div>
              </div>
           </div>

           {/* Risk Card */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-slate-500 font-medium text-sm">{currentData.risk.label}</span>
                 <div className={`p-2 rounded-lg shadow-sm ${currentData.risk.color}`}>
                    {renderRiskIcon(currentData.risk.icon)}
                 </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">{currentData.risk.value}</div>
              <div className="text-slate-400 text-xs mt-2 leading-relaxed">
                需重点关注的异常指标或人员名单，点击下方按钮查看详情。
              </div>
              <button 
                onClick={() => setIsRiskModalOpen(true)}
                className="w-full mt-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                查看详细列表
              </button>
           </div>
        </div>
      </div>

      {/* Risk Modal */}
      {isRiskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                 <div className="flex items-center gap-2">
                   <div className={`p-1.5 rounded-lg ${currentData.risk.color}`}>{renderRiskIcon(currentData.risk.icon)}</div>
                   <h3 className="text-lg font-bold text-slate-900">{currentData.risk.label}详情</h3>
                 </div>
                 <button onClick={() => setIsRiskModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-0">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 backdrop-blur-sm">
                       <tr><th className="p-4 text-slate-500 font-medium w-1/3">对象 / ID</th><th className="p-4 text-slate-500 font-medium w-1/2">详细情况</th><th className="p-4 text-slate-500 font-medium text-right">指标数值</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {currentData.risk.details?.map(item => (
                             <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="p-4"><div className="font-bold text-slate-800">{item.name}</div></td>
                                <td className="p-4"><div className="text-slate-600 leading-relaxed">{item.desc}</div></td>
                                <td className="p-4 text-right"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${item.status === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : item.status === 'warning' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>{item.metric}</span></td>
                             </tr>
                          ))}
                    </tbody>
                 </table>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                 <button onClick={() => setIsRiskModalOpen(false)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-100 transition-colors">关闭列表</button>
              </div>
           </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && downloadFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative">
              <button onClick={closeDownloadModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"><X size={20} /></button>
              <div className="p-8 flex flex-col items-center text-center">
                 <div className="mb-6 relative">
                    {downloadStatus === 'completed' ? (
                       <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 animate-in zoom-in duration-300 border-4 border-green-100"><CheckCircle size={40} /></div>
                    ) : (
                       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center animate-in zoom-in duration-300 border-4 border-slate-100 relative">
                          {downloadStatus === 'downloading' && <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>}
                          {getFileIcon(downloadFile.name)}
                       </div>
                    )}
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">{downloadFile.label}</h3>
                 <p className="text-sm text-slate-500 mb-8 break-all font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2"><File size={12} /> {downloadFile.name}</p>
                 <div className="w-full">
                    {downloadStatus === 'idle' && <button onClick={startDownload} className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 hover:-translate-y-0.5"><Download size={18} /> 立即下载</button>}
                    {downloadStatus === 'downloading' && <div className="w-full"><div className="flex justify-between text-xs font-bold text-slate-500 mb-2"><span>下载中...</span><span>{progress}%</span></div><div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4"><div className="h-full bg-blue-600 transition-all duration-200 ease-out" style={{ width: `${progress}%` }}></div></div></div>}
                    {downloadStatus === 'completed' && <div className="w-full space-y-3"><div className="p-3 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-100 flex items-center justify-center gap-2"><CheckCircle size={16} /> 下载成功</div><button onClick={closeDownloadModal} className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-colors">关闭</button></div>}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
