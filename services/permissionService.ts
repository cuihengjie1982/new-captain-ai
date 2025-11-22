
import { User, PermissionConfig, PermissionKey, PermissionDefinition } from '../types';

const CONFIG_KEY = 'captain_permission_config';
const DEFINITIONS_KEY = 'captain_permission_definitions';

const DEFAULT_DEFINITIONS: PermissionDefinition[] = [
  { key: 'download_resources', label: '下载专业资源/报告' },
  { key: 'expert_diagnosis', label: '使用专家人工诊断' },
  { key: 'export_transcript', label: '导出课程字幕/文稿' },
  { key: 'advanced_analytics', label: '查看高级数据分析' }
];

const DEFAULT_CONFIG: PermissionConfig = {
  free: {
    'download_resources': false,
    'expert_diagnosis': false,
    'export_transcript': false,
    'advanced_analytics': false
  },
  pro: {
    'download_resources': true,
    'expert_diagnosis': true,
    'export_transcript': true,
    'advanced_analytics': true
  }
};

export const getPermissionDefinitions = (): PermissionDefinition[] => {
  try {
    const stored = localStorage.getItem(DEFINITIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load permission definitions", e);
  }
  localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(DEFAULT_DEFINITIONS));
  return DEFAULT_DEFINITIONS;
};

export const savePermissionDefinition = (def: PermissionDefinition): void => {
  const defs = getPermissionDefinitions();
  const idx = defs.findIndex(d => d.key === def.key);
  if (idx >= 0) {
    defs[idx] = def;
  } else {
    defs.push(def);
  }
  localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(defs));
};

export const deletePermissionDefinition = (key: string): void => {
  const defs = getPermissionDefinitions();
  const newDefs = defs.filter(d => d.key !== key);
  localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(newDefs));
};

export const getPermissionConfig = (): PermissionConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load permissions", e);
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  return DEFAULT_CONFIG;
};

export const savePermissionConfig = (config: PermissionConfig): void => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const hasPermission = (user: User | null, key: PermissionKey): boolean => {
  // Admin always has access
  if (user?.role === 'admin') return true;
  
  const config = getPermissionConfig();
  
  // Treat null user (Guest) as 'free' plan
  const userPlan = user?.plan || 'free'; 
  
  // Safe access in case config is partial or key is new
  return config[userPlan]?.[key] || false;
};

// Helper to get user plan for display
export const getUserPlanLabel = (user: User | null): string => {
  if (!user) return '访客 (免费)';
  if (user.role === 'admin') return '管理员';
  return user.plan === 'pro' ? '专业版 (Pro)' : '免费版 (Free)';
};
