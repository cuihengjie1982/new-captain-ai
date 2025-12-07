import { BlogPost, IntroVideo, DiagnosisIssue, BlogPostComment, CommentReply, User, AboutUsInfo, BusinessContactInfo, DiagnosisWidgetConfig, PlansPageConfig, CommunityPageConfig, UserCenterConfig, DashboardConfig, DashboardWidget } from '../types';

const STORAGE_KEY = 'captain_blog_posts';
const INTRO_VIDEO_KEY = 'captain_intro_video';
const DIAGNOSIS_ISSUES_KEY = 'captain_diagnosis_issues';
const DIAGNOSIS_WIDGET_KEY = 'captain_diagnosis_widget_config';
const COMMENTS_KEY = 'captain_blog_comments';
const PAYMENT_QR_KEY = 'captain_payment_qr';
const ABOUT_US_KEY = 'captain_about_us';
const BUSINESS_CONTACT_KEY = 'captain_business_contact';
const PLANS_CONFIG_KEY = 'captain_plans_config';
const COMMUNITY_CONFIG_KEY = 'captain_community_config';
const USER_CENTER_CONFIG_KEY = 'captain_user_center_config';
const DASHBOARD_CONFIG_KEY = 'captain_dashboard_config';

const DEFAULT_POSTS: BlogPost[] = [
  {
    id: '1',
    title: '为什么您的核心骨干总在流失？',
    summary: '了解最优秀坐席离职的三大原因，以及如何尽早发现离职征兆。',
    thumbnail: 'https://picsum.photos/600/400?random=1',
    readTime: '5 分钟阅读',
    date: '2024年05月20日',
    author: 'Captain AI',
    requiredPlan: 'free',
    content: `
      <p>在呼叫中心行业，核心骨干（Top Performers）的流失往往比普通员工的流失带来更大的破坏力。他们不仅贡献了最高的KPI，往往还是团队的精神支柱。</p>
      
      <h2 class="text-xl font-bold mt-6 mb-4 text-slate-900">1. 职业发展天花板</h2>
      <p>这是最常见的原因。核心骨干往往学习能力强，当他们熟练掌握现有工作后，如果没有明确的晋升通道（如Team Leader、QA、培训师），他们会迅速感到厌倦。</p>
      <blockquote class="border-l-4 border-blue-500 pl-4 italic my-4 text-slate-600 bg-slate-50 p-2">
        “我看不到未来，每天只是在重复接电话。” —— 某离职Top Sales访谈
      </blockquote>

      <h2 class="text-xl font-bold mt-6 mb-4 text-slate-900">2. 薪资与贡献不匹配</h2>
      <p>虽然钱不是万能的，但对于高绩效员工，如果他们的收入与普通员工拉不开差距，这就成了“大锅饭”。必须建立基于绩效的激进奖金制度。</p>

      <h2 class="text-xl font-bold mt-6 mb-4 text-slate-900">3. 缺乏认可</h2>
      <p>很多管理者认为核心骨干“不用操心”，从而忽略了对他们的关注。实际上，高绩效员工更需要定期的反馈和认可。</p>

      <div class="mt-8 p-4 bg-blue-50 rounded-lg text-center">
        <p class="font-bold text-blue-800">如何解决？</p>
        <p class="text-sm text-blue-600 mt-1">请使用我们的“诊断罗盘”工具，定制您的留存方案。</p>
      </div>
    `
  },
  {
    id: '2',
    title: '1对1辅导的艺术',
    summary: '将每周的例行检查转化为强有力的辅导课程，而非简单的状态更新。',
    thumbnail: 'https://picsum.photos/600/400?random=2',
    readTime: '8 分钟阅读',
    date: '2024年05月18日',
    author: 'Captain AI',
    requiredPlan: 'free',
    content: `
      <p>大多数经理的1对1（One-on-One）都变成了“工作汇报流水账”。这不仅浪费时间，还错失了建立信任的良机。</p>
      <h2 class="text-xl font-bold mt-6 mb-4 text-slate-900">辅导模型：GROW</h2>
      <ul class="list-disc pl-5 space-y-2">
        <li><strong>G (Goal)</strong>: 目标是什么？</li>
        <li><strong>R (Reality)</strong>: 现状如何？</li>
        <li><strong>O (Options)</strong>: 有哪些选择？</li>
        <li><strong>W (Will)</strong>: 下一步做什么？</li>
      </ul>
      <p class="mt-4">在下一次面谈中，尝试少问“这周做了什么”，多问“你这周遇到的最大挑战是什么”。</p>
    `
  },
  {
    id: '3',
    title: '优化排班遵从度',
    summary: '数据驱动策略：在不伤害团队士气的前提下提高排班遵从度。',
    thumbnail: 'https://picsum.photos/600/400?random=3',
    readTime: '6 分钟阅读',
    date: '2024年05月15日',
    author: '数据中心',
    requiredPlan: 'pro',
    content: `
      <p>排班遵从度（Adherence）直接影响接通率和服务水平（SLA）。但强硬的手段往往导致员工不满。</p>
      <p>更有效的策略是引入<strong>“自主排班”</strong>和<strong>“班次置换”</strong>机制，让员工在一定规则下拥有掌控感。</p>
    `
  }
];

const DEFAULT_INTRO_VIDEO: IntroVideo = {
  id: 'intro-default',
  title: 'Captain AI 平台价值演示',
  sourceType: 'link',
  url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', 
  thumbnail: 'https://picsum.photos/1280/720?random=99',
  isVisible: true,
  duration: '02:30',
  lastUpdated: '2024-05-20 10:00',
  publisher: 'Captain Official',
  publishDate: '2024-05-01'
};

const DEFAULT_DIAGNOSIS_WIDGET: DiagnosisWidgetConfig = {
  title: '您在苦恼些什么？',
  description: '不要等到更加恶化了才发现问题。填写右侧表单，AI 和专家团队将立即为您分析团队现状并提供解决方案。',
  highlightText: '智能诊断工具'
};

const DEFAULT_DIAGNOSIS_ISSUES: DiagnosisIssue[] = [
  {
    id: '1',
    title: '核心人才留存',
    userText: '我们的核心骨干流失严重，我担心留不住关键人才。',
    aiResponse: '明白。人员流失往往有多重因素。当骨干觉得触碰到天花板时最容易流失。目前我们除了纵向晋升（做组长），有横向发展的机会吗（如QA、培训师）？'
  },
  {
    id: '2',
    title: '薪酬与绩效',
    userText: '我觉得目前的薪资没有竞争力，绩效激励也不到位，大家是为了钱走的。',
    aiResponse: '收到。薪资确实是敏感点。除了底薪，您觉得我们的绩效奖金设计是否能拉开差距，激励到核心骨干？'
  },
  {
    id: '3',
    title: '管理与辅导',
    userText: '基层管理人员的辅导能力较弱，不知道怎么带人。',
    aiResponse: '这是一个关键的观察。一线管理者的能力直接决定团队状态。您觉得如果我们提供针对性的管理培训（如GROW模型），情况会在短期内改善吗？'
  },
  {
    id: '4',
    title: '高绩效人员画像',
    userText: '我们缺乏清晰的高绩效人才画像，招聘和选拔标准模糊。',
    aiResponse: '精准的画像是成功的开始。我们可以从现有Top Performer的行为特征入手。您是否对现有的绩优员工做过深度访谈？'
  },
  {
    id: '5',
    title: '培训效果评估',
    userText: '投入了很多培训资源，但无法评估实际产出和效果。',
    aiResponse: '培训评估确实是个难题。我们通常建议使用柯氏四级评估模型。您目前主要停留在“反应层”（满意度），还是已经关注“行为层”（业务改变）了？'
  },
  {
    id: '6',
    title: '预测与人员匹配',
    userText: '话务预测不准，导致排班和人员匹配经常出现偏差。',
    aiResponse: '排班问题直接影响接通率和员工满意度。您目前是使用Erlang-C模型还是其他工具来进行预测的？误差率大约是多少？'
  },
  {
    id: '7',
    title: '客户体验评估',
    userText: '客户体验指标（NPS/CSAT）停滞不前，找不到体验痛点在哪里。',
    aiResponse: '指标停滞往往是因为我们只看分数，没看动因。您最近有分析过客户的非结构化数据（如录音文本或文本反馈）吗？'
  },
  {
    id: '8',
    title: '质量评估',
    userText: '质检分数很高，但客户实际感受并不好，质量评估体系可能失效了。',
    aiResponse: '这是典型的“质检与体验脱节”。您的质检表是基于内部流程合规设计的，还是基于客户感受设计的？'
  },
  {
    id: '9',
    title: '指标波动管理',
    userText: '各项KPI经常异常波动，我们缺乏有效的监控和复盘机制。',
    aiResponse: '波动管理需要建立“异常熔断”机制。当指标偏离正常值（如+/- 10%）时，我们的第一反应流程是什么？'
  },
  {
    id: '10',
    title: '成本效率评估',
    userText: '运营成本居高不下，效率提升遇到了瓶颈。',
    aiResponse: '降本增效的核心在于AHT（平均处理时长）和FCR（首问解决率）。您觉得目前最大的效率杀手是系统慢，还是流程繁琐？'
  }
];

const DEFAULT_ABOUT_US: AboutUsInfo = {
  title: '关于我们',
  description: 'Captain AI 是由行业领先的呼叫中心管理咨询公司打造的智能辅助平台。我们致力于通过人工智能与管理科学的结合，帮助运营管理者解决人才保留、效率提升和客户体验优化等核心难题。',
  teamInfo: '我们的团队由拥有20年+经验的BPO运营专家、数据科学家及全栈工程师组成。我们深知一线管理的痛点，因此开发了这套“更懂业务”的AI系统。',
  websiteUrl: 'https://www.cmbpo.com',
  contactEmail: 'contact@cmbpo.com'
};

const DEFAULT_BUSINESS_CONTACT: BusinessContactInfo = {
    contactPerson: '客户经理',
    contactMethod: '188-8888-8888',
    email: 'business@captain.ai'
};

const DEFAULT_PLANS_CONFIG: PlansPageConfig = {
  free: {
    title: '免费版',
    subtitle: '适合个人学习与体验',
    buttonText: '当前计划',
    features: [
      { text: '基础视频课程', icon: 'Video' },
      { text: 'AI 博客助手 (有限)', icon: 'Zap' },
      { text: '基础笔记功能', icon: 'Check' }
    ]
  },
  pro: {
    title: '专业版 PRO',
    subtitle: '企业级权限',
    buttonText: '联系商务升级',
    features: [
      { text: '解锁全部 50+ 高级课程', icon: 'Video' },
      { text: '专家级 AI 诊断与方案', icon: 'Zap' },
      { text: '导出课程字幕与PPT', icon: 'ArrowUpRight' },
      { text: '无限下载专业报表模版', icon: 'FileText' },
      { text: '优先人工专家支持通道', icon: 'ArrowUpRight' }
    ]
  }
};

// Mock Comments Data
const DEFAULT_COMMENTS: BlogPostComment[] = [
  {
    id: 'c1',
    postId: '1',
    userName: '李明 - 运营总监',
    userAvatar: 'https://i.pravatar.cc/150?u=1',
    content: '非常有共鸣！我们团队最近走了两个Team Leader，确实是因为没有上升空间了。文中提到的“专家岗”是个很好的思路，准备尝试一下。',
    date: '昨天',
    likes: 24,
    isLiked: false,
    isTop: true,
    replies: [
      {
        id: 'r1',
        userName: 'Captain AI',
        userAvatar: 'https://i.pravatar.cc/150?u=captain',
        content: '感谢李总认可！专家岗（SME）不仅能留住人，还能有效沉淀组织经验。',
        date: '昨天',
        likes: 5,
        isLiked: false
      }
    ]
  },
  {
    id: 'c2',
    postId: '1',
    userName: 'Sarah Zhang',
    userAvatar: 'https://i.pravatar.cc/150?u=2',
    content: '请问关于薪资激励，如果是外包团队（预算受限），有什么好的非物质激励建议吗？',
    date: '2小时前',
    likes: 8,
    isLiked: false,
    replies: []
  }
];

// Helper to get posts from storage or default
const loadPosts = (): BlogPost[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load blog posts", e);
  }
  const defaults = JSON.parse(JSON.stringify(DEFAULT_POSTS));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
};

export const getBlogPosts = (): BlogPost[] => {
  return loadPosts();
};

export const getPostById = (id: string): BlogPost | undefined => {
  const posts = loadPosts();
  return posts.find(p => p.id === id);
};

export const saveBlogPost = (post: BlogPost): void => {
  const posts = loadPosts();
  const index = posts.findIndex(p => p.id === post.id);
  if (index >= 0) {
    posts[index] = post;
  } else {
    posts.unshift(post);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
};

export const deleteBlogPost = (id: string): void => {
  const posts = loadPosts();
  const newPosts = posts.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosts));
};

// --- Intro Video Methods ---

export const getIntroVideo = (): IntroVideo => {
  try {
    const stored = localStorage.getItem(INTRO_VIDEO_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error(e); }
  
  localStorage.setItem(INTRO_VIDEO_KEY, JSON.stringify(DEFAULT_INTRO_VIDEO));
  return DEFAULT_INTRO_VIDEO;
};

export const saveIntroVideo = (video: IntroVideo): void => {
  localStorage.setItem(INTRO_VIDEO_KEY, JSON.stringify(video));
};

export const deleteIntroVideo = (): void => {
  const hiddenVideo = { ...getIntroVideo(), isVisible: false };
  localStorage.setItem(INTRO_VIDEO_KEY, JSON.stringify(hiddenVideo));
};

// --- Diagnosis Widget Config Methods ---
export const getDiagnosisWidgetConfig = (): DiagnosisWidgetConfig => {
    try {
        const stored = localStorage.getItem(DIAGNOSIS_WIDGET_KEY);
        if(stored) return JSON.parse(stored);
    } catch(e) { console.error(e); }
    return DEFAULT_DIAGNOSIS_WIDGET;
};

export const saveDiagnosisWidgetConfig = (config: DiagnosisWidgetConfig): void => {
    localStorage.setItem(DIAGNOSIS_WIDGET_KEY, JSON.stringify(config));
};

// --- Diagnosis Issues Methods ---

export const getDiagnosisIssues = (): DiagnosisIssue[] => {
  try {
    const stored = localStorage.getItem(DIAGNOSIS_ISSUES_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error(e); }
  
  localStorage.setItem(DIAGNOSIS_ISSUES_KEY, JSON.stringify(DEFAULT_DIAGNOSIS_ISSUES));
  return DEFAULT_DIAGNOSIS_ISSUES;
};

export const saveDiagnosisIssue = (issue: DiagnosisIssue): void => {
  const issues = getDiagnosisIssues();
  const idx = issues.findIndex(i => i.id === issue.id);
  if (idx >= 0) issues[idx] = issue;
  else issues.push(issue);
  localStorage.setItem(DIAGNOSIS_ISSUES_KEY, JSON.stringify(issues));
};

export const deleteDiagnosisIssue = (id: string): void => {
  const issues = getDiagnosisIssues();
  const newIssues = issues.filter(i => i.id !== id);
  localStorage.setItem(DIAGNOSIS_ISSUES_KEY, JSON.stringify(newIssues));
};

// --- About Us Methods ---

export const getAboutUsInfo = (): AboutUsInfo => {
  try {
    const stored = localStorage.getItem(ABOUT_US_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error(e); }
  
  localStorage.setItem(ABOUT_US_KEY, JSON.stringify(DEFAULT_ABOUT_US));
  return DEFAULT_ABOUT_US;
};

export const saveAboutUsInfo = (info: AboutUsInfo): void => {
  localStorage.setItem(ABOUT_US_KEY, JSON.stringify(info));
};

// --- Business Contact / QR Code Methods ---

export const getPaymentQRCode = (): string => {
  try {
    return localStorage.getItem(PAYMENT_QR_KEY) || '';
  } catch(e) { return ''; }
};

export const savePaymentQRCode = (url: string): void => {
  localStorage.setItem(PAYMENT_QR_KEY, url);
};

export const getBusinessContactInfo = (): BusinessContactInfo => {
  try {
    const stored = localStorage.getItem(BUSINESS_CONTACT_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) { console.error(e); }
  return DEFAULT_BUSINESS_CONTACT;
};

export const saveBusinessContactInfo = (info: BusinessContactInfo): void => {
  localStorage.setItem(BUSINESS_CONTACT_KEY, JSON.stringify(info));
};

// --- Plans Page Config Methods ---

export const getPlansPageConfig = (): PlansPageConfig => {
  try {
    const stored = localStorage.getItem(PLANS_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error(e); }
  return DEFAULT_PLANS_CONFIG;
};

export const savePlansPageConfig = (config: PlansPageConfig): void => {
  localStorage.setItem(PLANS_CONFIG_KEY, JSON.stringify(config));
};

// --- Comment Management Methods ---

const loadComments = (): BlogPostComment[] => {
  try {
    const stored = localStorage.getItem(COMMENTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error(e); }
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(DEFAULT_COMMENTS));
  return DEFAULT_COMMENTS;
};

export const getComments = (postId: string): BlogPostComment[] => {
  const all = loadComments();
  return all.filter(c => c.postId === postId).sort((a, b) => (b.isTop ? 1 : 0) - (a.isTop ? 1 : 0));
};

export const addComment = (postId: string, content: string, user: Partial<User>): BlogPostComment => {
  const comments = loadComments();
  const newComment: BlogPostComment = {
    id: Date.now().toString(),
    postId,
    userName: user.name || '访客',
    userAvatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
    content,
    date: '刚刚',
    likes: 0,
    isLiked: false,
    replies: []
  };
  
  comments.unshift(newComment);
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  return newComment;
};

export const addReply = (postId: string, commentId: string, content: string, user: Partial<User>): void => {
  const comments = loadComments();
  const commentIdx = comments.findIndex(c => c.id === commentId);
  
  if (commentIdx >= 0) {
    const newReply: CommentReply = {
      id: Date.now().toString(),
      userName: user.name || '访客',
      userAvatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
      content,
      date: '刚刚',
      likes: 0,
      isLiked: false
    };
    comments[commentIdx].replies.push(newReply);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  }
};

export const toggleCommentLike = (commentId: string, replyId?: string): void => {
  const comments = loadComments();
  const commentIdx = comments.findIndex(c => c.id === commentId);

  if (commentIdx >= 0) {
    if (replyId) {
      const replyIdx = comments[commentIdx].replies.findIndex(r => r.id === replyId);
      if (replyIdx >= 0) {
         const reply = comments[commentIdx].replies[replyIdx];
         reply.isLiked = !reply.isLiked;
         reply.likes = reply.isLiked ? reply.likes + 1 : reply.likes - 1;
      }
    } else {
      const comment = comments[commentIdx];
      comment.isLiked = !comment.isLiked;
      comment.likes = comment.isLiked ? comment.likes + 1 : comment.likes - 1;
    }
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  }
};

// 社区页面配置管理
const DEFAULT_COMMUNITY_CONFIG: CommunityPageConfig = {
  title: "知识社区",
  description: "与行业专家和同行交流经验，分享最佳实践",
  welcomeMessage: "欢迎来到Captain AI知识社区！在这里您可以分享经验、提出问题、获得专业建议。",
  postingGuidelines: "请发布与呼叫中心管理、AI应用、团队建设相关的内容。保持专业和友好的交流氛围。",
  featuredCategories: ["经验分享", "技术讨论", "最佳实践", "问题求助"],
  allowAnonymousPosts: false,
  requireModeration: true,
  maxPostLength: 5000,
  enableAttachments: true,
  allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]
};

export const getCommunityPageConfig = (): CommunityPageConfig => {
  try {
    const stored = localStorage.getItem(COMMUNITY_CONFIG_KEY);
    return stored ? { ...DEFAULT_COMMUNITY_CONFIG, ...JSON.parse(stored) } : DEFAULT_COMMUNITY_CONFIG;
  } catch {
    return DEFAULT_COMMUNITY_CONFIG;
  }
};

export const saveCommunityPageConfig = (config: CommunityPageConfig): void => {
  localStorage.setItem(COMMUNITY_CONFIG_KEY, JSON.stringify(config));
};

// 用户中心页面配置管理
const DEFAULT_USER_CENTER_CONFIG: UserCenterConfig = {
  myVideos: {
    title: "我的视频",
    description: "管理和查看您上传的诊断视频",
    maxStoragePerUser: 1000, // 1GB
    allowedVideoFormats: ["mp4", "webm", "mov", "avi", "mkv"],
    enableTranscription: true,
    enableAIAnalysis: true
  },
  myArticles: {
    title: "我的文章",
    description: "保存和收藏您感兴趣的文章内容",
    enableBookmarks: true,
    enableNotes: true,
    enableSharing: true,
    maxNotesPerArticle: 50
  },
  myNotes: {
    title: "我的笔记",
    description: "记录学习心得和重要信息",
    enableCategories: true,
    enableTags: true,
    enableSearch: true,
    enableExport: true,
    syncAcrossDevices: true
  },
  settings: {
    enableProfileCustomization: true,
    enableEmailNotifications: true,
    enableDataExport: true,
    enableAccountDeletion: true,
    privacySettings: {
      showProfile: true,
      showActivity: false,
      allowDataAnalysis: true
    }
  }
};

export const getUserCenterConfig = (): UserCenterConfig => {
  try {
    const stored = localStorage.getItem(USER_CENTER_CONFIG_KEY);
    return stored ? { ...DEFAULT_USER_CENTER_CONFIG, ...JSON.parse(stored) } : DEFAULT_USER_CENTER_CONFIG;
  } catch {
    return DEFAULT_USER_CENTER_CONFIG;
  }
};

export const saveUserCenterConfig = (config: UserCenterConfig): void => {
  localStorage.setItem(USER_CENTER_CONFIG_KEY, JSON.stringify(config));
};

// 仪表盘配置管理
const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  title: "指挥中心",
  welcomeMessage: "欢迎回到Captain AI指挥中心",
  defaultKPIs: ["坐席效率", "客户满意度", "通话时长", "转化率"],
  refreshInterval: 30, // 30秒
  enableRealTimeUpdates: true,
  showQuickActions: true,
  customWidgets: []
};

export const getDashboardConfig = (): DashboardConfig => {
  try {
    const stored = localStorage.getItem(DASHBOARD_CONFIG_KEY);
    return stored ? { ...DEFAULT_DASHBOARD_CONFIG, ...JSON.parse(stored) } : DEFAULT_DASHBOARD_CONFIG;
  } catch {
    return DEFAULT_DASHBOARD_CONFIG;
  }
};

export const saveDashboardConfig = (config: DashboardConfig): void => {
  localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(config));
};

// 仪表盘小部件管理
export const addDashboardWidget = (widget: DashboardWidget): void => {
  const config = getDashboardConfig();
  config.customWidgets.push(widget);
  saveDashboardConfig(config);
};

export const updateDashboardWidget = (widgetId: string, updates: Partial<DashboardWidget>): void => {
  const config = getDashboardConfig();
  const index = config.customWidgets.findIndex(w => w.id === widgetId);
  if (index >= 0) {
    config.customWidgets[index] = { ...config.customWidgets[index], ...updates };
    saveDashboardConfig(config);
  }
};

export const deleteDashboardWidget = (widgetId: string): void => {
  const config = getDashboardConfig();
  config.customWidgets = config.customWidgets.filter(w => w.id !== widgetId);
  saveDashboardConfig(config);
};