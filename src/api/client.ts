// ============================================================================
// AI 接口调用封装 — 多 Provider 统一接口
// F46 AI 提供商选择 + F48 自定义 API 端点
// ============================================================================

import type { AiConfig } from '../schema/types';
import { getApiKey, getApiEndpoint } from '../shared/ai-config';

/** 聊天消息格式 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** OpenAI 兼容的请求体 */
interface OpenAICompatibleRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  stream?: false;
}

/** Anthropic 请求体 */
interface AnthropicRequest {
  model: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  max_tokens: number;
  temperature?: number;
}

/** Anthropic 响应体 */
interface AnthropicResponse {
  content: Array<{ type: 'text'; text: string }>;
}

/**
 * 调用 AI Chat Completion（OpenAI 兼容格式）
 * 支持：deepseek / openai / zhipu / moonshot / custom
 */
async function openaiCompatibleChat(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const body: OpenAICompatibleRequest = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 16384,
  };

  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // Zhipu 使用不同的授权头格式
  if (endpoint.includes('bigmodel.cn')) {
    // Zhipu uses the same Bearer format now
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`AI API 错误 (${resp.status}): ${errorText}`);
  }

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('AI API 返回空响应');
  }
  return text;
}

/**
 * 调用 Anthropic Messages API
 */
async function anthropicChat(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  // 提取 system 消息
  const systemMsg = messages.find((m) => m.role === 'system');
  const userMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const body: AnthropicRequest = {
    model,
    messages: userMessages,
    max_tokens: options?.maxTokens ?? 16384,
    temperature: options?.temperature ?? 0.7,
  };

  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Anthropic API 错误 (${resp.status}): ${errorText}`);
  }

  const data = await resp.json() as AnthropicResponse;
  const text = data.content.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('Anthropic API 返回空响应');
  return text;
}

/**
 * 清理 AI 返回的 JSON 字符串（去除 markdown 代码块标记）
 */
function extractJson(text: string): string {
  // 尝试匹配 ```json ... ``` 或 ``` ... ```
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();

  // 尝试匹配直接的 JSON 对象
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();

  return text.trim();
}

/**
 * 统一的 AI 聊天调用入口
 * 根据 aiConfig 自动选择正确的提供商和 API 格式
 *
 * @param messages 聊天消息数组
 * @param config AI 配置（可选，默认从 localStorage 加载）
 * @param options 可选参数
 * @returns AI 返回的文本内容
 */
export async function chatCompletion(
  messages: ChatMessage[],
  config?: AiConfig,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const aiConfig = config ?? {
    ai_provider: 'deepseek',
    ai_model: 'deepseek-v4-pro',
  };

  const endpoint = getApiEndpoint(aiConfig);
  const apiKey = getApiKey(aiConfig.ai_provider);

  if (!apiKey) {
    throw new Error(
      `未设置 ${aiConfig.ai_provider} 的 API Key。请在配置面板中输入您的 API Key。`
    );
  }

  if (!endpoint) {
    throw new Error(`无法确定 ${aiConfig.ai_provider} 的 API 端点。请在配置中设置自定义端点。`);
  }

  if (aiConfig.ai_provider === 'anthropic') {
    return anthropicChat(endpoint, apiKey, aiConfig.ai_model, messages, options);
  }

  return openaiCompatibleChat(endpoint, apiKey, aiConfig.ai_model, messages, options);
}

/**
 * 调用 AI 并返回解析后的 JSON 对象
 * 自动处理 markdown 代码块清理
 */
export async function chatCompletionJson<T>(
  messages: ChatMessage[],
  config?: AiConfig,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const text = await chatCompletion(messages, config, { ...options, jsonMode: true });
  const cleaned = extractJson(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    throw new Error(`AI 返回的不是有效的 JSON:\n${text.substring(0, 500)}...`);
  }
}

/**
 * 批量调用 AI（并行，限并发数）
 */
export async function batchChatCompletion(
  messageBatches: Array<{ messages: ChatMessage[]; config?: AiConfig }>,
  concurrency = 3
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < messageBatches.length; i += concurrency) {
    const batch = messageBatches.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((b) => chatCompletion(b.messages, b.config).catch((e) => `[ERROR] ${e.message}`))
    );
    results.push(...batchResults);
  }
  return results;
}
