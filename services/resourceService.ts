

import { KnowledgeCategory } from '../types';

const STORAGE_KEY = 'captain_resources_v3';

const DEFAULT_RESOURCES: KnowledgeCategory[] = [
  // AI Repository Item (Level 1: ai_reply)
  {
    id: 'ai-lib-1', 
    name: '通用知识库附件', 
    color: 'violet',
    section: 'ai_reply',
    requiredPlan: 'pro',
    items: [
       { title: "标准诊断报告模版.docx", type: "doc", size: "1.2 MB", tags: ["AI生成", "报告"] },
       { title: "AI 建议实施路径图.pdf", type: "pdf", size: "0.8 MB", tags: ["图表", "实施"] },
       { title: "自动化数据采集脚本.xlsx", type: "xlsx", size: "45 KB", tags: ["脚本", "工具"] }
    ]
  },
  // Project Improvement Reports (Level 1: project_reports)
  {
    id: 'project-reports-1', 
    name: '年度改善项目归档', 
    color: 'rose',
    section: 'project_reports',
    requiredPlan: 'pro',
    items: [
       { title: "Q3_核心骨干留存_行动计划_v2.pdf", type: "pdf", size: "2.4 MB", tags: ["Q3", "留存"] },
       { title: "Q3_核心骨干留存_会议纪要.doc", type: "doc", size: "1.1 MB", tags: ["会议", "纪要"] },
       { title: "NPS提升_全渠道体验_实施方案.pdf", type: "pdf", size: "3.5 MB", tags: ["NPS", "方案"] },
       { title: "NPS项目_周会记录_0520.doc", type: "doc", size: "0.5 MB", tags: ["周会"] },
       { title: "AHT缩减_流程优化指南.pdf", type: "pdf", size: "1.8 MB", tags: ["AHT", "指南"] },
       { title: "AHT项目_复盘会议记录.doc", type: "doc", size: "0.9 MB", tags: ["复盘"] }
    ]
  },
  // Diagnostic Tools (Level 1: diagnosis_tools)
  {
    id: '1', name: '核心人才留存', color: 'blue', section: 'diagnosis_tools', requiredPlan: 'free',
    items: [
       { title: "离职倾向调查问卷", type: "xlsx", size: "45 KB", tags: ["调查", "HR"] },
       { title: "核心骨干盘点表 (9-Box)", type: "xlsx", size: "32 KB", tags: ["九宫格", "盘点"] },
       { title: "留存访谈话术指南", type: "pdf", size: "1.2 MB", tags: ["话术", "访谈"] },
       { title: "人才流失预警模型", type: "ppt", size: "4.5 MB", tags: ["模型", "预警"] }
    ]
  },
  {
    id: '2', name: '薪酬与绩效', color: 'emerald', section: 'diagnosis_tools', requiredPlan: 'pro',
    items: [
       { title: "薪资竞争力分析计算器", type: "xlsx", size: "156 KB", tags: ["薪资", "计算器"] },
       { title: "绩效奖金测算工具", type: "xlsx", size: "88 KB", tags: ["绩效", "工具"] },
       { title: "非物质激励方案清单", type: "pdf", size: "620 KB", tags: ["激励", "清单"] }
    ]
  },
  {
    id: '3', name: '管理与辅导', color: 'orange', section: 'diagnosis_tools', requiredPlan: 'free',
    items: [
       { title: "1对1辅导标准化手册", type: "ppt", size: "5.4 MB", tags: ["辅导", "手册"] },
       { title: "GROW模型教练卡", type: "pdf", size: "2.1 MB", tags: ["GROW", "教练"] },
       { title: "团队氛围诊断工具", type: "doc", size: "45 KB", tags: ["诊断", "氛围"] }
    ]
  },
  {
    id: '4', name: '高绩效人员画像', color: 'purple', section: 'diagnosis_tools', requiredPlan: 'pro',
    items: [
       { title: "胜任力模型构建指南", type: "pdf", size: "3.2 MB", tags: ["胜任力", "模型"] },
       { title: "明星员工访谈提纲", type: "doc", size: "45 KB", tags: ["访谈", "招聘"] },
       { title: "行为面试打分表", type: "xlsx", size: "56 KB", tags: ["面试", "工具"] }
    ]
  },
  {
    id: '5', name: '培训效果评估', color: 'pink', section: 'diagnosis_tools', requiredPlan: 'free',
    items: [
       { title: "柯氏四级评估模型", type: "ppt", size: "2.8 MB", tags: ["评估", "柯氏"] },
       { title: "培训ROI计算器", type: "xlsx", size: "92 KB", tags: ["ROI", "计算器"] },
       { title: "岗前培训通关测试卷", type: "doc", size: "120 KB", tags: ["测试", "试卷"] }
    ]
  },
  {
    id: '6', name: '预测与人员匹配', color: 'indigo', section: 'diagnosis_tools', requiredPlan: 'pro',
    items: [
       { title: "Erlang-C排班计算器", type: "xlsx", size: "450 KB", tags: ["排班", "Erlang-C"] },
       { title: "话务量预测模型", type: "xlsx", size: "210 KB", tags: ["预测", "模型"] },
       { title: "Shrinkage(损耗)分析表", type: "xlsx", size: "65 KB", tags: ["损耗", "分析"] }
    ]
  },
  {
    id: '7', name: '客户体验评估', color: 'cyan', section: 'diagnosis_tools', requiredPlan: 'free',
    items: [
       { title: "客户旅程地图模板", type: "ppt", size: "6.5 MB", tags: ["旅程地图", "体验"] },
       { title: "NPS/CSAT驱动因素分析", type: "xlsx", size: "180 KB", tags: ["NPS", "分析"] },
       { title: "痛点分析报告模板", type: "ppt", size: "2.2 MB", tags: ["痛点", "报告"] }
    ]
  },
  {
    id: '8', name: '质量评估', color: 'teal', section: 'diagnosis_tools', requiredPlan: 'free',
    items: [
       { title: "QA评分标准表(COPC参考)", type: "xlsx", size: "115 KB", tags: ["QA", "评分"] },
       { title: "质检校准(Calibration)记录", type: "xlsx", size: "78 KB", tags: ["校准", "质检"] }
    ]
  },
  {
    id: '9', name: '指标波动管理', color: 'rose', section: 'diagnosis_tools', requiredPlan: 'pro',
    items: [
       { title: "KPI异常波动鱼骨图", type: "ppt", size: "1.5 MB", tags: ["鱼骨图", "KPI"] },
       { title: "指标复盘报告模板", type: "doc", size: "55 KB", tags: ["复盘", "报告"] }
    ]
  },
  {
    id: '10', name: '成本效率评估', color: 'slate', section: 'diagnosis_tools', requiredPlan: 'pro',
    items: [
       { title: "单次联络成本(CPC)模型", type: "xlsx", size: "130 KB", tags: ["CPC", "成本"] },
       { title: "运营效率仪表盘", type: "xlsx", size: "240 KB", tags: ["仪表盘", "效率"] },
       { title: "ROI分析工具", type: "xlsx", size: "95 KB", tags: ["ROI", "工具"] }
    ]
  }
];

const loadCategories = (): KnowledgeCategory[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error(e); }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RESOURCES));
  return DEFAULT_RESOURCES;
};

export const getKnowledgeCategories = (): KnowledgeCategory[] => loadCategories();

export const saveKnowledgeCategory = (category: KnowledgeCategory): void => {
  const categories = loadCategories();
  const idx = categories.findIndex(c => c.id === category.id);
  if (idx >= 0) categories[idx] = category;
  else categories.push(category);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
};

export const deleteKnowledgeCategory = (id: string): void => {
  const categories = loadCategories();
  const newCategories = categories.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newCategories));
};