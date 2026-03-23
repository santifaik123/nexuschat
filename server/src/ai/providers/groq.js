import { AIProvider } from '../adapter.js';

export class GroqProvider extends AIProvider {
    constructor() {
        super('groq');
        this.apiKey = process.env.GROQ_API_KEY;
        this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.baseUrl = 'https://api.groq.com/openai/v1';
    }

    isAvailable() {
        return !!this.apiKey;
    }

    async generateResponse(messages, options = {}) {
        const model = options.model && options.model !== 'default' ? options.model : this.model;
        const startTime = Date.now();

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 500,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error('No content in Groq response');

        return {
            content: content.trim(),
            model: data.model || model,
            confidence: 0.9,
            tokensUsed: data.usage?.total_tokens || 0,
            responseTime: Date.now() - startTime,
        };
    }
}
