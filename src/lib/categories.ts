export const CATEGORIES = [
  'tools',
  'ai',
  'content',
  'business',
  'education',
  'lifestyle',
  'developer',
  'data',
  'other',
] as const;

export type AppCategory = typeof CATEGORIES[number];

// Keywords for auto-inferring category from parsed content
export function inferCategory(title: string, description: string, tags: string[]): AppCategory {
  const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  const rules: [AppCategory, RegExp][] = [
    ['ai', /\b(ai|artificial intelligence|gpt|llm|chatbot|machine learning|ml|neural|深度学习|人工智能|大模型|语言模型)\b/],
    ['developer', /\b(api|devops|github|code|sdk|cli|ide|developer|debug|deploy|编程|开发者|代码)\b/],
    ['data', /\b(analytics|dashboard|report|chart|bi|visualization|数据|报表|可视化|分析)\b/],
    ['education', /\b(learn|course|education|quiz|study|tutorial|学习|教育|课程|知识)\b/],
    ['content', /\b(write|design|video|blog|cms|editor|创作|写作|设计|视频|编辑)\b/],
    ['business', /\b(crm|marketing|ecommerce|shop|sales|commerce|营销|商业|电商|客户)\b/],
    ['lifestyle', /\b(game|social|health|fitness|music|entertainment|游戏|社交|健康|娱乐)\b/],
    ['tools', /\b(tool|productivity|automation|utility|convert|calculator|工具|效率|自动化)\b/],
  ];

  for (const [cat, re] of rules) {
    if (re.test(text)) return cat;
  }
  return 'other';
}
