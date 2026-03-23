import { AIProvider } from '../adapter.js';

export class HuggingFaceProvider extends AIProvider {
    constructor() {
        super('huggingface');
        this.apiKey = process.env.HUGGINGFACE_API_KEY;
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        this.model = 'mistralai/Mistral-7B-Instruct-v0.3';
    }

    isAvailable() {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    async generateResponse(messages, options = {}) {
        const model = options.model || this.model;
        const temperature = options.temperature || 0.7;
        const maxTokens = options.maxTokens || 500;

        // Format messages for Mistral instruction format
        let prompt = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                prompt += `<s>[INST] <<SYS>>\n${msg.content}\n<</SYS>>\n\n`;
            } else if (msg.role === 'user') {
                prompt += `${msg.content} [/INST]`;
            } else if (msg.role === 'assistant') {
                prompt += `${msg.content}</s><s>[INST] `;
            }
        }

        const response = await fetch(`${this.baseUrl}/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    temperature,
                    max_new_tokens: maxTokens,
                    return_full_text: false,
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HuggingFace error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;

        if (!content) {
            throw new Error('No content in HuggingFace response');
        }

        return {
            content: content.trim(),
            model,
            confidence: 0.75,
            tokensUsed: 0
        };
    }
}
