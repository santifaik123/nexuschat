import { Router } from 'express';
import { query, queryOne, run, getDB } from '../db/database.js';

// Default settings seeded for every new tenant
const DEFAULT_TENANT_SETTINGS = {
    'widget.name': 'NexusChat',
    'widget.welcome_message': '👋 Hi there! How can I help you today?',
    'widget.primary_color': '#f3f3ef',
    'widget.secondary_color': '#9da0a2',
    'widget.position': 'bottom-right',
    'widget.theme': 'dark',
    'widget.logo_url': '',
    'widget.border_radius': '18',
    'widget.language': 'es',
    'widget.placeholder': 'Escribe tu consulta…',
    'widget.quick_replies': JSON.stringify(['Ver servicios', 'Solicitar una cotización', 'Hablar con una persona']),
    'ai.provider': 'groq',
    'ai.model': 'openai/gpt-oss-20b',
    'ai.temperature': '1',
    'ai.max_tokens': '2048',
    'ai.top_p': '1',
    'ai.reasoning_effort': 'medium',
    'ai.system_prompt': 'You are a helpful AI customer support assistant. Answer questions accurately and concisely.',
    'ai.tone': 'professional',
    'business.name': 'My Business',
    'business.description': '',
    'business.hours': 'Monday-Friday, 9 AM - 6 PM',
    'business.contact_email': '',
    'leads.enabled': 'true',
    'leads.capture_after': '3',
    'leads.fields': JSON.stringify(['name', 'email']),
};

const router = Router();

// ============= Settings =============

// Get all settings for a tenant
router.get('/settings', async (req, res) => {
    try {
        const { tenantId = 'default' } = req.query;
        const rows = await query('SELECT key, value FROM settings WHERE tenant_id = ?', [tenantId]);
        const settings = {};
        for (const row of rows) {
            settings[row.key] = row.value;
        }
        res.json(settings);
    } catch (err) {
        console.error('Settings get error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings for a tenant
router.put('/settings', async (req, res) => {
    try {
        const { tenantId = 'default', settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'settings object is required' });
        }

        const statements = Object.entries(settings).map(([key, value]) => ({
            sql: `INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)
                  ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value`,
            args: [tenantId, key, String(value)]
        }));

        await getDB().batch(statements, 'write');

        res.json({ success: true });
    } catch (err) {
        console.error('Settings update error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ============= Conversations =============

// List conversations
router.get('/conversations', async (req, res) => {
    try {
        const { tenantId = 'default', status, limit = 50, offset = 0 } = req.query;

        let sql = 'SELECT c.*, (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_content, (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as messageCount FROM conversations c WHERE c.tenant_id = ?';
        const params = [tenantId];

        if (status) {
            sql += ' AND c.status = ?';
            params.push(status);
        }

        sql += ' ORDER BY c.updated_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const conversations = await query(sql, params);

        // Attach last message object
        const result = conversations.map(c => ({
            ...c,
            lastMessage: c.last_message_content ? { content: c.last_message_content } : null,
            last_message_content: undefined
        }));

        const countSql = 'SELECT COUNT(*) as count FROM conversations WHERE tenant_id = ?' + (status ? ' AND status = ?' : '');
        const countParams = status ? [tenantId, status] : [tenantId];
        const totalRow = await queryOne(countSql, countParams);
        const total = totalRow.count;

        res.json({ conversations: result, total });
    } catch (err) {
        console.error('Conversations list error:', err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Delete resolved conversations older than N days (default 30)
router.delete('/conversations/cleanup', async (req, res) => {
    try {
        const { tenantId = 'default', days = 30 } = req.query;
        const daysInt = Math.max(1, Math.min(365, parseInt(days) || 30));
        const intervalStr = `-${daysInt} days`;

        const old = await query(
            `SELECT id FROM conversations WHERE tenant_id = ? AND status = 'resolved' AND updated_at < datetime('now', ?)`,
            [tenantId, intervalStr]
        );

        if (old.length === 0) return res.json({ deleted: 0 });

        for (const conv of old) {
            await run('DELETE FROM messages WHERE conversation_id = ?', [conv.id]);
        }
        await run(
            `DELETE FROM conversations WHERE tenant_id = ? AND status = 'resolved' AND updated_at < datetime('now', ?)`,
            [tenantId, intervalStr]
        );

        console.log(`[CLEANUP] Deleted ${old.length} resolved conversations older than ${daysInt} days for tenant: ${tenantId}`);
        res.json({ deleted: old.length });
    } catch (err) {
        console.error('Cleanup error:', err);
        res.status(500).json({ error: 'Failed to cleanup conversations' });
    }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId = 'default' } = req.query;
        const conversation = await queryOne(
            'SELECT id FROM conversations WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
        const messages = await query(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [id]
        );
        res.json({ messages });
    } catch (err) {
        console.error('Messages list error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// ============= Leads =============

// List leads
router.get('/leads', async (req, res) => {
    try {
        const { tenantId = 'default', status, limit = 50, offset = 0 } = req.query;
        const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 50));
        const safeOffset = Math.max(0, parseInt(offset) || 0);
        const allowedStatuses = new Set(['new', 'contacted', 'qualified', 'won', 'lost', 'archived']);
        const statusFilter = allowedStatuses.has(status) ? status : null;
        const where = statusFilter ? 'tenant_id = ? AND status = ?' : 'tenant_id = ?';
        const args = statusFilter ? [tenantId, statusFilter] : [tenantId];
        const leads = await query(
            `SELECT id, tenant_id, external_id, source, conversation_id, name, email, company,
                    inquiry_type, message, status, campaign_source, campaign_medium,
                    campaign_name, landing_path, consent_at, privacy_version, created_at, updated_at
             FROM leads WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...args, safeLimit, safeOffset]
        );
        const totalRow = await queryOne(
            `SELECT COUNT(*) as count FROM leads WHERE ${where}`,
            args
        );
        res.json({ leads, total: totalRow.count });
    } catch (err) {
        console.error('Leads list error:', err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// Delete a lead
router.delete('/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId = 'default' } = req.query;
        const existing = await queryOne('SELECT id FROM leads WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        if (!existing) return res.status(404).json({ error: 'Lead not found' });
        await run('DELETE FROM lead_events WHERE lead_id = ? AND tenant_id = ?', [id, tenantId]);
        await run('DELETE FROM leads WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Lead delete error:', err);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

router.patch('/leads/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { tenantId = 'default', status } = req.body || {};
        const allowed = new Set(['new', 'contacted', 'qualified', 'won', 'lost', 'archived']);
        if (!allowed.has(status)) return res.status(400).json({ error: 'Invalid status' });
        const existing = await queryOne('SELECT id, status FROM leads WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        if (!existing) return res.status(404).json({ error: 'Lead not found' });
        await run('UPDATE leads SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND tenant_id = ?', [status, id, tenantId]);
        await run(
            `INSERT INTO lead_events (tenant_id, lead_id, event_type, event_data)
             VALUES (?, ?, 'status_changed', ?)`,
            [tenantId, id, JSON.stringify({ from: existing.status || 'new', to: status })]
        );
        res.json({ success: true, status });
    } catch {
        console.error('Lead status update failed');
        res.status(500).json({ error: 'Failed to update lead status' });
    }
});

// ============= Tenants =============

router.get('/tenants', async (req, res) => {
    try {
        const tenants = await query('SELECT id, name, created_at FROM tenants ORDER BY created_at ASC');
        res.json({ tenants });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

router.post('/tenants', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

        const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const existing = await queryOne('SELECT id FROM tenants WHERE id = ?', [id]);
        if (existing) return res.status(409).json({ error: 'A tenant with that name already exists' });

        const statements = [
            { sql: 'INSERT INTO tenants (id, name) VALUES (?, ?)', args: [id, name.trim()] },
            ...Object.entries(DEFAULT_TENANT_SETTINGS).map(([key, value]) => ({
                sql: 'INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)',
                args: [id, key, value]
            }))
        ];
        await getDB().batch(statements, 'write');

        res.json({ id, name: name.trim() });
    } catch (err) {
        console.error('Tenant create error:', err);
        res.status(500).json({ error: 'Failed to create tenant' });
    }
});

router.delete('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (id === 'default') return res.status(400).json({ error: 'Cannot delete the default tenant' });
        await getDB().batch([
            { sql: 'DELETE FROM analytics_events WHERE tenant_id = ?', args: [id] },
            { sql: 'DELETE FROM leads WHERE tenant_id = ?', args: [id] },
            { sql: 'DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE tenant_id = ?)', args: [id] },
            { sql: 'DELETE FROM conversations WHERE tenant_id = ?', args: [id] },
            { sql: 'DELETE FROM faqs WHERE tenant_id = ?', args: [id] },
            { sql: 'DELETE FROM documents WHERE tenant_id = ?', args: [id] },
            { sql: 'DELETE FROM settings WHERE tenant_id = ?', args: [id] },
            { sql: 'DELETE FROM tenants WHERE id = ?', args: [id] },
        ], 'write');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete tenant' });
    }
});

// ============= AI Providers =============

// Get available AI providers info
router.get('/ai/providers', (req, res) => {
    try {
        const providers = [
            {
                id: 'groq',
                name: 'Groq (Cloud, Free)',
                description: 'Ultra-fast cloud AI. GPT-OSS 20B is production-ready, multilingual and optimized for low latency.',
                free: true,
                requiresKey: true,
                models: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b']
            },
            {
                id: 'ollama',
                name: 'Ollama (Local)',
                description: 'Free local AI. Runs on your machine. No API key needed. Install from ollama.com.',
                free: true,
                requiresKey: false,
                models: ['llama3.2', 'llama3.1', 'mistral', 'gemma2', 'phi3']
            },
            {
                id: 'google-ai',
                name: 'Google Gemini',
                description: "Google's Gemini models. Free tier available. Requires an API key from Google AI Studio.",
                free: false,
                requiresKey: true,
                models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
            },
            {
                id: 'huggingface',
                name: 'HuggingFace',
                description: 'Open source models via HuggingFace Inference API. Free tier available.',
                free: false,
                requiresKey: true,
                models: ['mistralai/Mistral-7B-Instruct-v0.3']
            },
            {
                id: 'fallback',
                name: 'Rule-Based Fallback',
                description: 'No AI required. Uses pattern matching and your knowledge base to answer questions.',
                free: true,
                requiresKey: false,
                models: []
            }
        ];
        res.json({ providers });
    } catch (err) {
        console.error('Providers error:', err);
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
});

export default router;
