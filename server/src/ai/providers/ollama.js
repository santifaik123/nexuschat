import { AIProvider } from '../adapter.js';

export class OllamaProvider extends AIProvider {
    constructor() {
        super('ollama');
        this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = process.env.OLLAMA_MODEL || 'llama3.2';
    }

    async isAvailable() {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
            if (!res.ok) return false;
            const data = await res.json();
            return data.models && data.models.length > 0;
        } catch {
            return false;
        }
    }

    async generateResponse(messages, options = {}) {
        const model = options.model || this.model;
        const temperature = options.temperature || 0.7;
        const maxTokens = options.maxTokens || 500;

        // Convert messages to Ollama format
        const ollamaMessages = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        const startTime = Date.now();

        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: ollamaMessages,
                stream: false,
                options: {
                    temperature,
                    num_predict: maxTokens,
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Ollama error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const elapsed = Date.now() - startTime;

        if (!data.message?.content) {
            throw new Error('No content in Ollama response');
        }

        return {
            content: data.message.content.trim(),
            model: data.model || model,
            confidence: 0.85,
            tokensUsed: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            responseTime: elapsed
        };
    }
}
