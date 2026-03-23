import { query, run } from '../db/database.js';

export class AIEngine {
    constructor(providerManager) {
        this.providerManager = providerManager;
    }

    async processMessage(tenantId, conversationId, userMessage, sessionHistory = []) {
        const startTime = Date.now();

        // 1. Load settings
        const settings = await this._getSettings(tenantId);
        const systemPrompt = settings['ai.system_prompt'] || '';
        const businessContext = await this._getBusinessContext(tenantId);

        // 2. Search knowledge base first
        const kbResult = await this._searchKnowledgeBase(tenantId, userMessage);

        // 3. Build messages array
        const messages = [];

        // System prompt with business context
        let fullSystemPrompt = systemPrompt;
        if (businessContext) {
            fullSystemPrompt += `\n\n--- Business Information ---\n${businessContext}`;
        }
        if (kbResult) {
            fullSystemPrompt += `\n\n--- Relevant Knowledge Base Information ---\n${kbResult.content}\n\nUse this information to answer the user's question accurately. Cite this information naturally without mentioning "knowledge base".`;
        }

        messages.push({ role: 'system', content: fullSystemPrompt });

        // Add session history (last 10 messages for context)
        const recentHistory = sessionHistory.slice(-10);
        for (const msg of recentHistory) {
            messages.push({ role: msg.role, content: msg.content });
        }

        // Add current user message
        messages.push({ role: 'user', content: userMessage });

        // 4. Generate response
        const aiOptions = {
            provider: settings['ai.provider'],
            model: settings['ai.model'],
            temperature: parseFloat(settings['ai.temperature'] || '0.7'),
            maxTokens: parseInt(settings['ai.max_tokens'] || '500'),
        };

        let result;

        // If we have a high-confidence KB match, we might use it directly
        if (kbResult && kbResult.confidence > 0.9) {
            result = {
                content: kbResult.content,
                provider: 'knowledge-base',
                model: 'exact-match',
                confidence: kbResult.confidence,
                source: 'knowledge-base'
            };
        } else {
            // Use AI with KB context injected
            result = await this.providerManager.generateWithFallback(messages, aiOptions);
            if (kbResult) {
                result.source = 'ai+knowledge-base';
            } else {
                result.source = result.provider === 'fallback' ? 'fallback' : 'ai';
            }
        }

        const responseTime = Date.now() - startTime;

        // 5. Log analytics event
        try {
            await run(
                `INSERT INTO analytics_events (tenant_id, event_type, event_data)
                 VALUES (?, 'chat_response', ?)`,
                [tenantId, JSON.stringify({
                    conversation_id: conversationId,
                    provider: result.provider,
                    source: result.source,
                    confidence: result.confidence,
                    response_time_ms: responseTime,
                })]
            );
        } catch (e) {
            console.error('Analytics logging failed:', e.message);
        }

        return {
            content: result.content,
            source: result.source,
            provider: result.provider,
            confidence: result.confidence || 0,
            responseTime
        };
    }

    async _searchKnowledgeBase(tenantId, userQuery) {
        const queryLower = userQuery.toLowerCase().trim();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // Search FAQs
        const faqs = await query(
            `SELECT question, answer, category, priority
             FROM faqs
             WHERE tenant_id = ? AND enabled = 1
             ORDER BY priority DESC`,
            [tenantId]
        );

        let bestMatch = null;
        let bestScore = 0;

        for (const faq of faqs) {
            const faqLower = faq.question.toLowerCase();

            // Exact match
            if (faqLower === queryLower) {
                return { content: faq.answer, confidence: 1.0, type: 'faq', category: faq.category };
            }

            // Word overlap scoring
            const faqWords = faqLower.split(/\s+/).filter(w => w.length > 2);
            let matchCount = 0;
            for (const word of queryWords) {
                if (faqWords.some(fw => fw.includes(word) || word.includes(fw))) {
                    matchCount++;
                }
            }

            const score = queryWords.length > 0 ? matchCount / Math.max(queryWords.length, faqWords.length) : 0;
            if (score > bestScore && score > 0.4) {
                bestScore = score;
                bestMatch = { content: faq.answer, confidence: score, type: 'faq', category: faq.category };
            }
        }

        // Search documents
        const docs = await query(
            `SELECT title, content FROM documents
             WHERE tenant_id = ? AND enabled = 1`,
            [tenantId]
        );

        for (const doc of docs) {
            const docLower = doc.content.toLowerCase();
            let matchCount = 0;
            for (const word of queryWords) {
                if (docLower.includes(word)) matchCount++;
            }
            const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
            if (score > bestScore && score > 0.5) {
                bestScore = score;
                bestMatch = {
                    content: `From "${doc.title}":\n${doc.content.substring(0, 500)}`,
                    confidence: score * 0.8,
                    type: 'document'
                };
            }
        }

        return bestMatch;
    }

    async _getBusinessContext(tenantId) {
        const businessSettings = await query(
            `SELECT key, value FROM settings
             WHERE tenant_id = ? AND key LIKE 'business.%'`,
            [tenantId]
        );

        if (businessSettings.length === 0) return '';

        const lines = [];
        for (const s of businessSettings) {
            const key = s.key.replace('business.', '').replace(/_/g, ' ');
            lines.push(`${key}: ${s.value}`);
        }
        return lines.join('\n');
    }

    async _getSettings(tenantId) {
        const rows = await query('SELECT key, value FROM settings WHERE tenant_id = ?', [tenantId]);
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        return settings;
    }
}
