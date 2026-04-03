import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { initDB } from './db/database.js';
import { AIProviderManager } from './ai/adapter.js';
import { GoogleAIProvider } from './ai/providers/google-ai.js';
import { HuggingFaceProvider } from './ai/providers/huggingface.js';
import { OllamaProvider } from './ai/providers/ollama.js';
import { GroqProvider } from './ai/providers/groq.js';
import { FallbackProvider } from './ai/providers/fallback.js';
import { AIEngine } from './ai/engine.js';
import { createChatRouter } from './routes/chat.js';
import configRouter from './routes/config.js';
import knowledgeRouter from './routes/knowledge.js';
import adminRouter from './routes/admin.js';
import analyticsRouter from './routes/analytics.js';
import { requireAuth, signToken } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Initialize database
await initDB();
console.log('✅ Database initialized');

// Initialize AI providers (order = priority)
const providerManager = new AIProviderManager();
providerManager.register('groq', new GroqProvider());
providerManager.register('ollama', new OllamaProvider());
providerManager.register('google-ai', new GoogleAIProvider());
providerManager.register('huggingface', new HuggingFaceProvider());
providerManager.register('fallback', new FallbackProvider());

// Set primary based on availability
const available = await providerManager.getAvailableProviders();
const primaryAI = available.find(p => p.name !== 'fallback');
if (primaryAI) {
    providerManager.setPrimary(primaryAI.name);
    console.log(`✅ Primary AI provider: ${primaryAI.name}`);
    if (primaryAI.name === 'ollama') {
        console.log(`   Model: ${process.env.OLLAMA_MODEL || 'llama3.2'} (local, free)`);
    } else if (primaryAI.name === 'groq') {
        console.log(`   Model: ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'} (free, cloud)`);
    }
} else {
    providerManager.setPrimary('fallback');
    console.log('⚠️  No AI providers available. Using fallback (rule-based responses).');
    console.log('   → Set GROQ_API_KEY in .env for free cloud AI');
    console.log('   → Or install Ollama (https://ollama.com) for free local AI');
}

const aiEngine = new AIEngine(providerManager);

// ============= Middleware =============

// Trust Render/cloud proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));

app.use(express.json({ limit: '1mb' }));

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many requests. Please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path !== '/api/health') {
            console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

// ============= API Routes =============

app.get('/api/health', async (req, res) => {
    const available = await providerManager.getAvailableProviders();
    res.json({
        status: 'ok',
        version: '1.0.0',
        providers: available.map(p => p.name),
        uptime: process.uptime()
    });
});

app.use('/api/chat', chatLimiter, createChatRouter(aiEngine));
app.use('/api/config', configRouter);

// Login — public, registered BEFORE the protected admin middleware
app.post('/api/admin/auth/login', adminLimiter, (req, res) => {
    const { username, password } = req.body || {};
    const adminUser = (process.env.ADMIN_USERNAME || 'admin').trim();
    const adminPass = (process.env.ADMIN_PASSWORD || 'admin').trim();
    const inputUser = (username || '').trim();
    const inputPass = (password || '').trim();
    console.log(`[LOGIN] expected="${adminUser}" got="${inputUser}" match=${inputUser === adminUser}`);
    if (inputUser !== adminUser || inputPass !== adminPass) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ token: signToken() });
});

app.use('/api/knowledge', adminLimiter, requireAuth, knowledgeRouter);
app.use('/api/admin', adminLimiter, requireAuth, adminRouter);
app.use('/api/analytics', adminLimiter, requireAuth, analyticsRouter);

// ============= Static Files =============

// Widget (embeddable script)
app.use('/widget', express.static(path.join(__dirname, '..', '..', 'widget', 'dist')));

// Demo page
app.use('/examples', express.static(path.join(__dirname, '..', '..', 'examples')));
app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'examples', 'demo.html'));
});

// Admin panel (production build)
const adminDist = path.join(__dirname, '..', '..', 'admin', 'dist');
if (fs.existsSync(adminDist)) {
    app.use('/admin', express.static(adminDist));
    app.get('/admin', (req, res) => res.redirect('/admin/'));
    app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDist, 'index.html')));
}

// ============= Error handling =============

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ============= Start =============

app.listen(PORT, () => {
    console.log(`\n🚀 NexusChat running on http://localhost:${PORT}`);
    console.log(`   Admin:  http://localhost:${PORT}/admin`);
    console.log(`   Demo:   http://localhost:${PORT}/demo`);
    console.log(`   Widget: http://localhost:${PORT}/widget/nexuschat.min.js`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

export default app;
