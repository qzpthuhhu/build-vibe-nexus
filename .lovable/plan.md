

## 完整方案：审核增强 + 全量邮件通知体系

### 待解决问题汇总
1. **链接跳转 Bug** — `url` 缺 `https://` 导致"立即体验"跳到站内 404
2. **管理员审核信息不全** — 展开行只有备注/操作，看不到描述、媒体、技术栈
3. **缺邮件通知** — 提交、审核、互动均无通知
4. **邮件域名 DNS 失败** — `notify.vbcodingshow.com` 需重新激活

---

### 一、修复链接跳转（Bug）

- 新建 `src/lib/url.ts` → `ensureHttpUrl(url)`：缺协议自动补 `https://`
- `AppDetail.tsx`：「立即体验」按钮 + iframe 预览统一调用
- `Submit.tsx`：表单提交前规范化 `url` / `experience_url` / 下载链接
- 数据库迁移：一次性修复历史缺协议数据

---

### 二、管理员审核详情面板（增强）

`AdminDashboard.tsx` 展开行扩展为完整审核视图：

```text
┌─────────────────────────────────────────┐
│ [封面]  标题 · 状态 · 提交者 · 时间      │
│         [🔗 在新标签打开真实网址]        │
├─────────────────────────────────────────┤
│ 描述（Markdown）                        │
│ 分类 · 标签 · 技术栈 · 平台 · 阶段      │
│ 体验地址 · App Store · 安卓下载 · 二维码│
│ 出售信息（价格 + 联系方式）             │
│ Prompt（可折叠）                        │
│ 媒体画廊（复用 MediaGallery）           │
│ 历史审核日志                            │
├─────────────────────────────────────────┤
│ 备注 + 驳回原因                         │
│ [✅通过] [⚠️打回] [⛔下线] [🗑️删除]     │
└─────────────────────────────────────────┘
```

---

### 三、邮件域名恢复

先检查 `notify.vbcodingshow.com` DNS 状态。若仍失败，引导用户重新走域名设置流程（`<lov-open-email-setup>` 对话框），通过后再继续后续步骤。

**发件人**：`notify@notify.vbcodingshow.com`  
**管理员收件邮箱**：`richardandelu50@gmail.com`（存入 `app_settings` 表，便于以后改）

---

### 四、邮件通知体系（8 类）

| # | 触发 | 收件人 | 模板 | 频率策略 |
|---|------|-------|------|---------|
| 1 | 用户提交作品 | 管理员 | `app-submitted-admin` | 即时 |
| 2 | 用户提交作品 | 提交者 | `app-submitted-user` | 即时 |
| 3 | 审核通过 | 提交者 | `app-approved-user` | 即时 |
| 4 | 审核驳回 | 提交者 | `app-rejected-user` | 即时（含原因）|
| 5 | 作品被评论 | 作者 | `app-new-comment` | 即时 |
| 6 | 作品被点赞 | 作者 | `app-likes-daily-digest` | **每日聚合** |
| 7 | 作品被收藏 | 作者 | `app-favorites-daily-digest` | **每日聚合** |
| 8 | 注册成功 | 新用户 | `welcome-user` | 即时 |

#### 每日聚合实现（点赞/收藏）
- 新建 `pending_engagement_notifications` 表：暂存当日点赞/收藏事件 `(user_id, app_id, type, actor_id, created_at)`
- 新建 Edge Function `dispatch-daily-digest`，pg_cron 每日 20:00 触发：
  - 按作者聚合昨天的点赞/收藏事件
  - 检查作者偏好是否开启
  - 发送聚合邮件（"今天你的作品 X 收到 5 个赞、2 个收藏…"）
  - 清理已处理记录

---

### 五、用户偏好控制（防骚扰 + 退订）

- 新建 `email_preferences` 表：`comment_notify / like_digest / favorite_digest / review_notify / announcement_notify`（默认全开）
- 注册触发器自动创建偏好行
- Profile 页新增「邮件通知偏好」卡片（5 个开关）
- 每封邮件由系统自动追加退订链接（无需手动加）
- 新建 `/unsubscribe` 页面处理退订

---

### 六、触发点接入

| 触发位置 | 行为 |
|---------|------|
| `Submit.tsx` 提交成功 | 双发：管理员通知 + 用户确认 |
| `AdminDashboard.tsx` 通过/驳回（含批量） | 循环单发对应模板 |
| `AppDetail.tsx` 评论提交 | 检查偏好 → 即时发 |
| `AppDetail.tsx` 点赞/收藏 | 写入 `pending_engagement_notifications`（不立即发）|
| `auth.tsx` 注册成功 | 欢迎邮件 |
| pg_cron 每日 20:00 | 触发 `dispatch-daily-digest` |

---

### 七、多语言

7 个语言文件补齐：邮件偏好开关标签、退订页文案、通知设置卡片标题。

---

### 涉及文件

| 类别 | 文件 |
|------|------|
| 新建 | `src/lib/url.ts`、`src/pages/Unsubscribe.tsx` |
| 新建 Edge Functions | `send-transactional-email`、`handle-email-unsubscribe`、`handle-email-suppression`、`dispatch-daily-digest` |
| 新建邮件模板 | 8 个 `.tsx` + `registry.ts` |
| 修改 | `AppDetail.tsx`、`Submit.tsx`、`AdminDashboard.tsx`、`Profile.tsx`、`App.tsx` |
| 数据库迁移 | `email_preferences` 表、`app_settings` 表、`pending_engagement_notifications` 表、URL 修复、注册触发器扩展、pg_cron 任务 |
| 多语言 | 7 个 i18n 文件 |

---

### 执行顺序

1. 检查邮件域名状态 → 失败则引导重设
2. 数据库迁移（4 张表 + URL 修复 + 触发器）
3. 搭建邮件基础设施 + 8 个模板 + 4 个 Edge Functions
4. 修复 URL Bug（`url.ts` + 调用点）
5. 增强管理员审核面板
6. 接入所有触发点 + 注册欢迎邮件
7. Profile 偏好 UI + 退订页
8. 配置 pg_cron 每日聚合任务
9. 多语言补齐

