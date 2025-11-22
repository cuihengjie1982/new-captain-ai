
import { Lesson } from '../types';

const STORAGE_KEY = 'captain_lessons';

const MOCK_LESSONS: Lesson[] = [
  {
    id: '1',
    title: '01. 核心人才留存：理解离职背后的真实动因',
    duration: '08:45',
    durationSec: 525,
    thumbnail: 'https://picsum.photos/id/1/800/450',
    category: '人员管理',
    requiredPlan: 'free',
    highlights: [
      { label: '离职动因模型', time: 15, color: 'bg-blue-100 text-blue-700' },
      { label: '薪资误区', time: 145, color: 'bg-orange-100 text-orange-700' },
      { label: '职业天花板', time: 280, color: 'bg-purple-100 text-purple-700' },
      { label: '管理者盲区', time: 410, color: 'bg-red-100 text-red-700' }
    ],
    transcript: [
      { time: 0, text: "大家好，欢迎回到 Captain AI 管理课程。今天我们要深入探讨一个让所有管理者头疼的问题：核心人才流失。" },
      { time: 5, text: "很多时候，我们认为员工离职是因为钱没给够。但这往往只是表面原因。" },
      { time: 15, text: "让我们来看一下这个离职动因模型。它由三个核心圆环组成：职业发展、薪资待遇和团队氛围。" },
      { time: 28, text: "对于Top Performer来说，'职业天花板'往往是他们离开的首要原因。" },
      { time: 45, text: "他们需要看到的不是明年的工资涨幅，而是三年后的自己在哪里。" },
      { time: 60, text: "接下来，我们听听一位真实的一线主管是如何描述这种无力感的..." },
      { time: 145, text: "关于薪资，这里有一个常见的误区。核心骨干在乎的不仅仅是绝对值，更是'内部公平性'。" },
      { time: 160, text: "如果他们的产出是普通员工的2倍，但奖金只多出20%，这就是一种负向激励。" },
      { time: 280, text: "我们来谈谈职业通道。除了升职做主管，我们是否提供了专家路线？" },
      { time: 300, text: "例如，设立QA专家、培训导师或者数据分析专员的兼职岗位。" },
      { time: 410, text: "最后，管理者的盲区在于，我们往往把最多的时间花在了'后进员工'身上，而忽略了那些'省心'的骨干。" },
      { time: 430, text: "这会导致骨干感到被冷落，觉得只有犯错才能得到关注。" }
    ]
  },
  {
    id: '2',
    title: '02. 薪酬激励：如何用有限预算设计高能奖金包',
    duration: '12:30',
    durationSec: 750,
    thumbnail: 'https://picsum.photos/id/2/800/450',
    category: '人员管理',
    requiredPlan: 'pro',
    highlights: [
      { label: '奖金结构', time: 30, color: 'bg-green-100 text-green-700' },
      { label: '及时激励', time: 200, color: 'bg-blue-100 text-blue-700' },
      { label: '非物质奖励', time: 450, color: 'bg-pink-100 text-pink-700' }
    ],
    transcript: [
      { time: 0, text: "上一节我们聊了留存，今天我们来谈谈钱。" },
      { time: 10, text: "预算总是有限的，如何切蛋糕才能最大化激励效果？" },
      { time: 30, text: "传统的奖金结构往往是'底薪+提成'，这在呼叫中心可能不够灵活。" },
      { time: 45, text: "我们可以引入'游戏化积分制'，让每一个微小的正向行为都能被量化。" },
      { time: 200, text: "记住，激励的时效性比金额更重要。周结甚至日结的奖励，刺激效果远好于月度奖金。" }
    ]
  },
  {
    id: '3',
    title: '03. 管理赋能：从“监工”转型为“教练”',
    duration: '15:10',
    durationSec: 910,
    thumbnail: 'https://picsum.photos/id/3/800/450',
    category: '人员管理',
    requiredPlan: 'free',
    highlights: [
      { label: 'GROW模型', time: 60, color: 'bg-indigo-100 text-indigo-700' },
      { label: '信任建立', time: 320, color: 'bg-yellow-100 text-yellow-700' }
    ],
    transcript: [
      { time: 0, text: "如果你每天的工作就是盯着监控大屏，看谁在Ready状态，那你不是管理者，你是监工。" },
      { time: 20, text: "新时代的管理者，必须转型为教练（Coach）。" },
      { time: 60, text: "介绍一下GROW模型：Goal（目标）、Reality（现状）、Options（选择）、Will（意愿）。" },
      { time: 80, text: "在1对1辅导中，多问问题，少给指令。" }
    ]
  }
];

// Mock generating more lessons
const CATEGORIES = ['人员管理', 'WFM管理', '质量与体验', '运营效率', '客户满意度'];

for (let i = 4; i <= 20; i++) {
  const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const titles: Record<string, string[]> = {
    'WFM管理': ['排班预测进阶', '实时监控技巧', 'Erlang-C模型详解', 'Shrinkage管理实战'],
    '质量与体验': ['质检校准工作坊', 'NPS提升策略', '客户旅程地图绘制', '投诉处理艺术'],
    '运营效率': ['AHT缩减指南', 'FCR首问解决率', '流程自动化案例', '多技能路由策略'],
    '客户满意度': ['同理心沟通', '化解愤怒客户', '服务意识培养', 'VOC声音分析'],
    '人员管理': ['高绩效团队建设', '新生代员工管理', '压力与情绪管理', '招聘面试技巧']
  };
  
  const catTitles = titles[randomCategory] || ['通用管理课程'];
  const randomTitle = catTitles[Math.floor(Math.random() * catTitles.length)];

  MOCK_LESSONS.push({
    id: i.toString(),
    title: `${i < 10 ? '0' + i : i}. ${randomTitle} ${i}`,
    duration: '10:00',
    durationSec: 600,
    thumbnail: `https://picsum.photos/id/${i + 15}/800/450`,
    category: randomCategory,
    requiredPlan: i % 3 === 0 ? 'pro' : 'free',
    highlights: [],
    transcript: [{ time: 0, text: "本课程内容即将上线，敬请期待。" }]
  });
}

const loadLessons = (): Lesson[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error(e); }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_LESSONS));
  return MOCK_LESSONS;
};

export const getLessons = (): Lesson[] => loadLessons();

export const saveLesson = (lesson: Lesson): void => {
  const lessons = loadLessons();
  const idx = lessons.findIndex(l => l.id === lesson.id);
  if (idx >= 0) lessons[idx] = lesson;
  else lessons.push(lesson);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
};

export const deleteLesson = (id: string): void => {
  const lessons = loadLessons();
  const newLessons = lessons.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newLessons));
};
