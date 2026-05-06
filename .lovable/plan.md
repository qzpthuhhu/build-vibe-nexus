
# Token 服务平台 — 分阶段实施计划

这是一个大型功能，将分多轮实施。本轮（第一轮）聚焦核心页面和数据库基础。

## 第一轮：核心页面 + 数据库

### 1. 数据库迁移
新建以下表：
- **api_keys** — 用户的 API Key（存储 hash、名称、状态、限速、用量）
- **token_balances** — 用户 Token 余额
- **api_request_logs** — 请求日志（prompt tokens、completion tokens、延迟、模型、成本）
- **token_packages** — 套餐定义（Free/Pro/Team/Enterprise）
- **token_orders** — 充值/购买订单
- **model_mappings** — 模型映射配置（claude-3-opus → minimax-text-01）

### 2. 前端页面（6个新页面）
- **/token-service** — Hero 首页（高转化率着陆页）
- **/token-service/pricing** — SaaS 定价页（4档套餐）
- **/token-service/docs** — API 文档中心（Claude/OpenAI 兼容说明、代码示例）
- **/token-service/dashboard** — 用户仪表盘（Token 趋势图、请求统计、余额）
- **/token-service/api-keys** — API Key 管理（创建/删除/查看用量）
- **/token-service/playground** — 在线 Playground

### 3. 导航更新
- 顶部导航新增 "Token Service" 入口
- Token Service 区域有独立子导航

### 4. 设计系统
- 深色主题，紫蓝渐变
- 毛玻璃卡片
- 科技感动画
- 与现有 VibeDir 风格统一但有独立视觉标识

## 后续轮次（本轮不实施）
- Edge Function: Claude/OpenAI 兼容 API 代理
- 模型管理后台
- 计费系统集成
- 邀请返佣系统
- Webhook/通知系统
- Redis 缓存 + 限流

## 技术细节
- React + Vite + TypeScript + Tailwind（非 Next.js，适配现有技术栈）
- Supabase 数据库 + RLS
- Recharts 图表
- react-syntax-highlighter 代码高亮
- 所有页面响应式设计
