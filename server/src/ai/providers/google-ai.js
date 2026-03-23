import { AIProvider } from '../adapter.js';

export class GoogleAIProvider extends AIProvider {
    constructor() {
        super('google-ai');
        this.apiKey = process.env.GOOGLE_AI_API_KEY;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.model = 'gemini-2.0-flash';
    }

    isAvailable() {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    async generateResponse(messages, options = {}) {
        const model = options.model || this.model;
        const temperature = options.temperature || 0.7;
        const maxTokens = options.maxTokens || 500;

        const systemMsg = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const contents = chatMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const body = {
            contents,
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
                topP: 0.95,
            }
        };

        if (systemMsg) {
            body.systemInstruction = { parts: [{ text: systemMsg.content }] };
        }

        const response = await fetch(
            `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Google AI error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            throw new Error('No content in Google AI response');
        }

        return {
            content,
            model,
            confidence: 0.85,
            tokensUsed: data.usageMetadata?.totalTokenCount || 0
        };
    }
}
