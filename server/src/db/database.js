import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let client;

export function getDB() {
    if (!client) {
        const localPath = path.join(__dirname, '..', '..', 'data', 'nexuschat.db');
        const url = process.env.TURSO_DATABASE_URL || `file:${localPath}`;
        const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
        client = createClient({ url, authToken });
    }
    return client;
}

export async function query(sql, args = []) {
    const result = await getDB().execute({ sql, args });
    return result.rows;
}

export async function queryOne(sql, args = []) {
    const result = await getDB().execute({ sql, args });
    return result.rows[0] || null;
}

export async function run(sql, args = []) {
    return getDB().execute({ sql, args });
}

export async function initDB() {
    await initSchema();
    await seedDefaults();
    await seedNuvikWidgetDesign();
    await seedNuvikAIConfig();
}

async function initSchema() {
    const statements = [
        {
            sql: `CREATE TABLE IF NOT EXISTS tenants (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL DEFAULT 'My Business',
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now'))
            )`,
            args: []
        },
        {
            sql: `CREATE TABLE IF NOT EXISTS settings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id TEXT NOT NULL,
              key TEXT NOT NULL,
              value TEXT,
              UNIQUE(tenant_id, key),
              FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )`,
            args: []
        },
        {
            sql: `CREATE TABLE IF NOT EXISTS conversations (
              id TEXT PRIMARY KEY,
              tenant_id TEXT NOT NULL,
              session_id TEXT NOT NULL,
              user_name TEXT,
              user_email TEXT,
              status TEXT DEFAULT 'active',
              started_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now')),
              metadata TEXT DEFAULT '{}',
              FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )`,
            args: []
        },
        {
            sql: `CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              conversation_id TEXT NOT NULL,
              role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
              content TEXT NOT NULL,
              source TEXT DEFAULT 'ai',
              confidence REAL,
              created_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            )`,
            args: []
        },
        {
            sql: `CREATE TABLE IF NOT EXISTS faqs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id TEXT NOT NULL,
              question TEXT NOT NULL,
              answer TEXT NOT NULL,
              category TEXT DEFAULT 'General',
              priority INTEGER DEFAULT 0,
              enabled INTEGER DEFAULT 1,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )`,
            args: []
        },
        {
            sql: `CREATE TABLE IF NOT EXISTS documents (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id TEXT NOT NULL,
              title TEXT NOT NULL,
              content TEXT NOT NULL,
              doc_type TEXT DEFAULT 'text',
              enabled INTEGER DEFAULT 1,
              created_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )`,
            args: []
        },
        {
            sql: `CREATE TABLE IF NOT EXISTS leads (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id TEXT NOT NULL,
              conversation_id TEXT,
              name TEXT,
              email TEXT,
              phone TEXT,
              message TEXT,
              created_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )`,
            args: []
        },
        {
            sql: `CREATE TABLE IF NOT EXISTS analytics_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id TEXT NOT NULL,
              event_type TEXT NOT NULL,
              event_data TEXT DEFAULT '{}',
              created_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )`,
            args: []
        }
    ];

    await getDB().batch(statements, 'write');

    await ensureLeadColumn('external_id', 'TEXT');
    await ensureLeadColumn('source', "TEXT NOT NULL DEFAULT 'nexus_chat'");
    await ensureLeadColumn('company', 'TEXT');
    await ensureLeadColumn('inquiry_type', 'TEXT');
    await ensureLeadColumn('status', "TEXT NOT NULL DEFAULT 'new'");
    await ensureLeadColumn('campaign_source', 'TEXT');
    await ensureLeadColumn('campaign_medium', 'TEXT');
    await ensureLeadColumn('campaign_name', 'TEXT');
    await ensureLeadColumn('landing_path', 'TEXT');
    await ensureLeadColumn('consent_at', 'TEXT');
    await ensureLeadColumn('privacy_version', 'TEXT');
    await ensureLeadColumn('updated_at', 'TEXT');

    await getDB().batch([
        { sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_id ON leads (external_id) WHERE external_id IS NOT NULL', args: [] },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_leads_tenant_status_created ON leads (tenant_id, status, created_at DESC)', args: [] },
        {
            sql: `CREATE TABLE IF NOT EXISTS lead_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tenant_id TEXT NOT NULL,
              lead_id INTEGER NOT NULL,
              event_type TEXT NOT NULL,
              event_data TEXT DEFAULT '{}',
              created_at TEXT DEFAULT (datetime('now')),
              FOREIGN KEY (tenant_id) REFERENCES tenants(id),
              FOREIGN KEY (lead_id) REFERENCES leads(id)
            )`,
            args: []
        },
        { sql: 'CREATE INDEX IF NOT EXISTS idx_lead_events_tenant_lead ON lead_events (tenant_id, lead_id, created_at DESC)', args: [] },
    ], 'write');
}

async function ensureLeadColumn(name, definition) {
    const columns = await query('PRAGMA table_info(leads)');
    if (!columns.some(column => column.name === name)) {
        await run(`ALTER TABLE leads ADD COLUMN ${name} ${definition}`);
    }
}

async function seedDefaults() {
    const existing = await queryOne('SELECT id FROM tenants WHERE id = ?', ['default']);
    if (existing) return;

    const defaultSettings = {
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
        'ai.system_prompt': `You are NexusChat, a professional, friendly, and helpful AI customer support assistant. Your role is to:

1. Answer customer questions accurately and concisely
2. Use the provided business knowledge base when available
3. Be warm but professional in tone
4. If you don't know something, say so honestly and offer to connect with a human agent
5. Keep responses focused and relevant
6. Use formatting (bullet points, etc.) when it improves clarity
7. Never make up information about the business
8. Always be respectful and patient

When responding:
- Prioritize information from the knowledge base
- Keep answers under 150 words unless more detail is needed
- Suggest related topics or follow-up questions when helpful
- If the question is unclear, ask for clarification politely`,
        'ai.tone': 'professional',
        'business.name': 'Demo Business',
        'business.description': 'We are a demo business showcasing NexusChat capabilities.',
        'business.hours': 'Monday-Friday, 9 AM - 6 PM EST',
        'business.contact_email': 'support@example.com',
        'business.contact_phone': '+1 (555) 123-4567',
        'leads.enabled': 'true',
        'leads.capture_after': '3',
        'leads.fields': JSON.stringify(['name', 'email']),
        'rate_limit.max_requests': '30',
        'rate_limit.window_minutes': '1'
    };

    const demoFAQs = [
        ['What are your pricing plans?', 'We offer three plans: Starter ($9/mo), Professional ($29/mo), and Enterprise (custom pricing). All plans include a 14-day free trial.', 'Pricing', 10],
        ['How do I contact support?', 'You can reach us via email at support@example.com, by phone at +1 (555) 123-4567, or through this chat. Our support hours are Monday-Friday, 9 AM - 6 PM EST.', 'Support', 9],
        ['Do you offer a free trial?', 'Yes! We offer a 14-day free trial on all plans. No credit card required to start.', 'Pricing', 8],
        ['What is your refund policy?', "We offer a 30-day money-back guarantee on all plans. If you're not satisfied, contact us for a full refund.", 'Billing', 7],
        ['How do I cancel my subscription?', 'You can cancel anytime from your account settings. Go to Settings > Billing > Cancel Subscription. Your access continues until the end of your billing period.', 'Billing', 6],
    ];

    const statements = [
        { sql: 'INSERT INTO tenants (id, name) VALUES (?, ?)', args: ['default', 'NexusChat Demo'] },
        ...Object.entries(defaultSettings).map(([key, value]) => ({
            sql: 'INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)',
            args: ['default', key, value]
        })),
        ...demoFAQs.map(([question, answer, category, priority]) => ({
            sql: 'INSERT INTO faqs (tenant_id, question, answer, category, priority) VALUES (?, ?, ?, ?, ?)',
            args: ['default', question, answer, category, priority]
        }))
    ];

    await getDB().batch(statements, 'write');
}

async function seedNuvikWidgetDesign() {
    const tenant = await queryOne('SELECT id FROM tenants WHERE id = ?', ['nuvik']);
    if (!tenant) return;

    const version = await queryOne(
        "SELECT value FROM settings WHERE tenant_id = ? AND key = 'widget.design_version'",
        ['nuvik']
    );
    if (version?.value === '2') return;

    const settings = {
        'widget.design_version': '2',
        'widget.name': 'Nuvi · Asistente NUVIK',
        'widget.welcome_message': 'Hola, soy Nuvi. Puedo orientarte sobre servicios, productos y próximos pasos de NUVIK.',
        'widget.primary_color': '#f3f3ef',
        'widget.secondary_color': '#9da0a2',
        'widget.position': 'bottom-right',
        'widget.theme': 'dark',
        'widget.border_radius': '18',
        'widget.language': 'es',
        'widget.placeholder': 'Escribe tu consulta…',
        'widget.quick_replies': JSON.stringify(['Ver servicios', 'Solicitar una cotización', 'Conocer NexusChat']),
        'proactive.delay': '0',
        'proactive.message': '',
    };

    await getDB().batch(Object.entries(settings).map(([key, value]) => ({
        sql: `INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)
              ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value`,
        args: ['nuvik', key, value]
    })), 'write');
}

async function seedNuvikAIConfig() {
    const tenant = await queryOne('SELECT id FROM tenants WHERE id = ?', ['nuvik']);
    if (!tenant) return;

    const version = await queryOne(
        "SELECT value FROM settings WHERE tenant_id = ? AND key = 'ai.groq_config_version'",
        ['nuvik']
    );
    if (version?.value === '2') return;

    const settings = {
        'ai.groq_config_version': '2',
        'ai.provider': 'groq',
        'ai.model': 'openai/gpt-oss-20b',
        'ai.temperature': '1',
        'ai.max_tokens': '2048',
        'ai.top_p': '1',
        'ai.reasoning_effort': 'medium',
    };

    await getDB().batch(Object.entries(settings).map(([key, value]) => ({
        sql: `INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?)
              ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value`,
        args: ['nuvik', key, value]
    })), 'write');
}
