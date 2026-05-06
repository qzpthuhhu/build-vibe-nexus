
# 核心上线待办实施计划

## 🔴 任务 1：API 代理 Edge Function（最高优先级）

创建 `supabase/functions/ai-proxy/index.ts`，这是整个 Token 服务的核心。

**功能流程：**

1. **认证**：从 `Authorization: Bearer vb-sk-xxx` 提取 API Key，SHA-256 哈希后查 `api_keys` 表验证
2. **路由判断**：
   - 请求路径 `/ai-proxy/v1/chat/completions` → OpenAI 格式，转发到 `api.minimaxi.com/v1`
   - 请求路径 `/ai-proxy/v1/messages` → Anthropic 格式，转发到 `api.minimaxi.com/anthropic`
3. **模型映射**：从 `model_mappings` 表查找 `source_model` → `target_model`，替换请求体中的 model 字段
4. **余额检查**：查 `token_balances` 确认用户余额充足，不足返回 402
5. **速率限制**（任务4）：基于滑动窗口检查 RPM/TPM
6. **转发请求**：用 `MINIMAX_API_KEY` 向 MiniMax 发起请求
7. **流式支持**：支持 `stream: true`，逐块透传 SSE
8. **Token 计数**：使用 `js-tiktoken` (cl100k_base) 对 prompt 和 completion 分别计数
9. **扣费 & 日志**：
   - 扣减 `token_balances.used_balance`（乘以 `cost_multiplier`）
   - 写入 `api_request_logs`（含 prompt_tokens、completion_tokens、latency_ms 等）
   - 更新 `api_keys` 的 `total_requests` 和 `total_tokens_used`

**配置：** 在 `supabase/config.toml` 添加 `verify_jwt = false`（因为使用自定义 API Key 认证）

---

## 🟡 任务 2：Dashboard 真实数据

更新 `TokenServiceDashboard.tsx`：

- 替换 mock `usageData`，改为从 `api_request_logs` 按天聚合查询
- "今日请求数"从 `api_request_logs` 的 `created_at` 过滤当天记录
- "平均延迟"从 `api_request_logs.latency_ms` 计算
- "最近请求"表格：展示最近 20 条日志（模型、Token 数、状态码、时间）

---

## 🟡 任务 3：Token 充值购买流程

**数据库：**
- `token_packages` 表已存在，需要插入实际套餐数据（免费体验 / Pro / Team，价格用人民币分）

**前端：**
- 更新 `TokenServicePricing.tsx`，从 `token_packages` 表动态读取套餐
- 添加"购买"按钮 → 创建 `token_orders` 记录（status=pending）
- 显示订单历史

**支付：** 由于中国区支付集成（微信/支付宝）不在 Lovable 内置支付范围内，先实现：
- 管理员手动确认充值的流程：管理员在后台看到 pending 订单 → 确认后系统自动增加 `token_balances`
- 预留支付回调接口，后期接入实际支付

---

## 🟡 任务 4：速率限制（RPM/TPM）

在 AI Proxy Edge Function 内实现（不单独做后端服务）：

- **RPM（每分钟请求数）**：用 `api_request_logs` 查询最近 60 秒内该 API Key 的请求数
- **TPM（每分钟 Token 数）**：查询最近 60 秒内该 API Key 的 `total_tokens` 总和
- 限制值从 `token_packages` 表的 `rpm_limit` / `tpm_limit` 获取（通过用户已购套餐关联）
- 超限返回 `429 Too Many Requests`，响应头包含 `X-RateLimit-*` 信息

---

## 技术细节

### Edge Function 依赖
```json
// supabase/functions/ai-proxy/deno.json
{
  "imports": {
    "js-tiktoken": "npm:js-tiktoken@1.0.15"
  }
}
```

### 数据库变更
- 新增 `token_packages` 默认套餐数据（INSERT）
- 可能需要给 `api_request_logs` 添加索引以支持速率限制查询

### 实施顺序
1. API Proxy Edge Function（含速率限制）
2. 插入默认套餐数据
3. Dashboard 真实数据
4. 充值购买流程前端

### Playground 更新
将 Playground 的 mock `setTimeout` 替换为实际调用 AI Proxy Edge Function，实现真实对话。
