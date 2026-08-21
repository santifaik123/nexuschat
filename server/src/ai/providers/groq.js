import { AIProvider } from '../adapter.js';
import { Groq } from 'groq-sdk';

export class GroqProvider extends AIProvider {
    constructor() {
        super('groq');
        this.apiKey = process.env.GROQ_API_KEY;
        this.client = this.apiKey ? new Groq({ apiKey: this.apiKey }) : null;
        this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    }

    isAvailable() {
        return !!this.apiKey;
    }

    async generateResponse(messages, options = {}) {
        const model = options.model && options.model !== 'default' ? options.model : this.model;
        const temperature = Number.isFinite(options.temperature) ? options.temperature : 1;
        const maxCompletionTokens = Number.isInteger(options.maxTokens) ? options.maxTokens : 2048;
        const topP = Number.isFinite(options.topP) ? options.topP : 1;
        const isQwenReasoning = model === 'qwen/qwen3.6-27b';
        const isGptOssReasoning = model === 'openai/gpt-oss-20b' || model === 'openai/gpt-oss-120b';
        const startTime = Date.now();

        const payload = {
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            temperature: Math.max(0, Math.min(2, temperature)),
            max_completion_tokens: Math.max(50, Math.min(16384, maxCompletionTokens)),
            top_p: Math.max(0, Math.min(1, topP)),
            stream: true,
            stop: null,
        };

        // Keep reasoning enabled for answer quality, but never expose its
        // private trace inside the public customer-support widget.
        if (isGptOssReasoning) {
            const allowedEfforts = new Set(['low', 'medium', 'high']);
            payload.reasoning_effort = allowedEfforts.has(options.reasoningEffort)
                ? options.reasoningEffort
                : 'medium';
            payload.reasoning_format = 'hidden';
        } else if (isQwenReasoning) {
            payload.reasoning_effort = options.reasoningEffort === 'none' ? 'none' : 'default';
            payload.reasoning_format = 'hidden';
        }

        if (!this.client) throw new Error('Groq API key is not configured');

        const completion = await this.client.chat.completions.create(payload, {
            timeout: 45000,
        });

        let content = '';
        let responseModel = model;
        let tokensUsed = 0;

        for await (const chunk of completion) {
            content += chunk.choices?.[0]?.delta?.content || '';
            responseModel = chunk.model || responseModel;
            tokensUsed = chunk.usage?.total_tokens || chunk.x_groq?.usage?.total_tokens || tokensUsed;
        }

        if (!content) throw new Error('No content in Groq response');

        return {
            content: content.trim(),
            model: responseModel,
            confidence: 0.9,
            tokensUsed,
            responseTime: Date.now() - startTime,
        };
    }
}
