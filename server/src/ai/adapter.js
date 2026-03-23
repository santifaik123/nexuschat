// AI Provider Adapter — Abstract Interface
// All providers must implement: generateResponse(messages, options) → { content, provider, model, confidence }

export class AIProvider {
    constructor(name) {
        this.name = name;
    }

    async generateResponse(messages, options = {}) {
        throw new Error(`generateResponse not implemented for provider: ${this.name}`);
    }

    isAvailable() {
        return false;
    }
}

export class AIProviderManager {
    constructor() {
        this.providers = new Map();
        this.primaryProvider = null;
    }

    register(name, provider) {
        this.providers.set(name, provider);
        if (!this.primaryProvider) {
            this.primaryProvider = name;
        }
    }

    setPrimary(name) {
        if (this.providers.has(name)) {
            this.primaryProvider = name;
        }
    }

    getProvider(name) {
        return this.providers.get(name);
    }

    async getAvailableProviders() {
        const available = [];
        for (const [name, provider] of this.providers) {
            const ready = await Promise.resolve(provider.isAvailable());
            if (ready) {
                available.push({ name, provider });
            }
        }
        return available;
    }

    async generateWithFallback(messages, options = {}) {
        const preferredProvider = options.provider || this.primaryProvider;
        const errors = [];

        // Try preferred provider first
        if (preferredProvider && this.providers.has(preferredProvider)) {
            const provider = this.providers.get(preferredProvider);
            if (await Promise.resolve(provider.isAvailable())) {
                try {
                    const result = await provider.generateResponse(messages, options);
                    return { ...result, provider: preferredProvider };
                } catch (err) {
                    errors.push({ provider: preferredProvider, error: err.message });
                }
            }
        }

        // Try all other available providers
        for (const [name, provider] of this.providers) {
            if (name === preferredProvider || name === 'fallback') continue;
            if (!(await Promise.resolve(provider.isAvailable()))) continue;

            try {
                const result = await provider.generateResponse(messages, options);
                return { ...result, provider: name };
            } catch (err) {
                errors.push({ provider: name, error: err.message });
            }
        }

        // Use fallback as last resort
        if (this.providers.has('fallback')) {
            try {
                const result = await this.providers.get('fallback').generateResponse(messages, options);
                return { ...result, provider: 'fallback' };
            } catch (err) {
                errors.push({ provider: 'fallback', error: err.message });
            }
        }

        return {
            content: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment, or contact our support team for immediate assistance.",
            provider: 'error',
            model: 'none',
            confidence: 0,
            errors
        };
    }
}
