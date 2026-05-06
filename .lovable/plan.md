## 概述

新增管理员专属的「服务商 & 模型映射管理」功能，并集成 Token 计数技术。对外按 Token 用量收费（而非请求次数），使用 `js-tiktoken`（纯 JS，兼容 Deno Edge Function）进行精确计数。

---

## MiniMax 国内平台接入信息

- **Anthropic 兼容端点**: `https://api.minimaxi.com/anthropic`
- **OpenAI 兼容端点**: `https://api.minimaxi.com/v1`

## 模型映射方案


| 对外模型名             | MiniMax 实际模型           | 定位         |
| ----------------- | ---------------------- | ---------- |
| Claude Opus 4.7   | MiniMax-M2.7           | 旗舰推理 60tps |
| Claude Sonnet 4.6 | MiniMax-M2.7-highspeed | 快速版 100tps |
| Claude Haiku 4.5  | MiniMax-M2.5           | 高性价比       |
| GPT-5.5           | MiniMax-M2.7           | 旗舰推理       |
| GPT-5.2           | MiniMax-M2.7-highspeed | 快速版        |
| GPT-5.4 Mini      | MiniMax-M2.5           | 轻量版        |


---

## Token 计数方案

**技术选型**: `js-tiktoken`（纯 JavaScript 实现的 OpenAI BPE tokenizer）

- 支持 Deno / Edge Runtime（原版 tiktoken WASM 不支持 Deno）
- 使用 `cl100k_base` 编码（GPT-4 / Claude 通用标准）
- 在 Edge Function 代理层中，对请求的 prompt 和返回的 completion 分别计数
- 计数结果写入 `api_request_logs` 的 `prompt_tokens` / `completion_tokens` / `total_tokens` 字段

**计费逻辑**:

- 用户余额以 Token 为单位（`token_balances` 表已有 `total_balance` / `used_balance`）
- 每次请求扣减实际消耗的 Token 数
- 不同模型可设置不同的 Token 单价倍率（通过 `model_mappings.config` JSONB 存储 `cost_multiplier`）

---

## 实施内容

### 1. 数据库：新建 `ai_providers` 表

- `name`、`slug`、`base_url_openai`、`base_url_anthropic`
- `api_key_ref`（Secrets 中的密钥名称引用，如 "MINIMAX_API_KEY"）
- `is_active`、`config`（JSONB 扩展）
- RLS：仅管理员可读写

### 2. 更新 `model_mappings` 表

- 添加 `provider_id`（关联 ai_providers）
- 在 `config` JSONB 中存储 `cost_multiplier`（Token 单价倍率）

### 3. 存储 MiniMax API Key

使用 Secrets 工具添加 `MINIMAX_API_KEY`

### 4. 预填默认数据

- 插入 MiniMax 供应商记录（两个端点 URL）
- 插入 6 条模型映射 + 各自的 cost_multiplier

### 5. 管理员页面（Admin 新增 Tab）

在 `/admin` 页面新增 `providers` Tab：

- **服务商管理**：查看/编辑/启用停用供应商
- **API Key 状态**：显示是否已配置（掩码）
- **模型映射表格**：可视化管理映射关系，含 Token 单价倍率编辑
- 中英文多语言支持

### 6. 安装 js-tiktoken

- 前端项目：`bun add js-tiktoken`（供 Playground 前端预估 Token 数）
- Edge Function：通过 `npm:js-tiktoken` 导入（Deno 兼容）

---

## 技术要点

- API Key 不进数据库，仅通过 Secrets 管理；`ai_providers.api_key_ref` 存储密钥名
- `js-tiktoken` 使用 `cl100k_base` 编码，这是 GPT-4 / Claude 系列的标准 tokenizer
- 扩展性：新增供应商只需在 `ai_providers` 插入记录 + 添加对应 Secret