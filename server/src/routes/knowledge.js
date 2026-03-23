import { Router } from 'express';
import { query, queryOne, run } from '../db/database.js';

const router = Router();

// ============= FAQs =============

// List all FAQs for a tenant
router.get('/faqs', async (req, res) => {
    try {
        const { tenantId = 'default' } = req.query;
        const faqs = await query(
            'SELECT * FROM faqs WHERE tenant_id = ? ORDER BY priority DESC, created_at DESC',
            [tenantId]
        );
        res.json(faqs);
    } catch (err) {
        console.error('FAQs list error:', err);
        res.status(500).json({ error: 'Failed to fetch FAQs' });
    }
});

// Create a FAQ
router.post('/faqs', async (req, res) => {
    try {
        const { tenantId = 'default', question, answer, category = 'General', priority = 0 } = req.body;
        if (!question || !answer) {
            return res.status(400).json({ error: 'question and answer are required' });
        }
        const result = await run(
            'INSERT INTO faqs (tenant_id, question, answer, category, priority) VALUES (?, ?, ?, ?, ?)',
            [tenantId, question, answer, category, priority]
        );
        const faq = await queryOne('SELECT * FROM faqs WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(faq);
    } catch (err) {
        console.error('FAQ create error:', err);
        res.status(500).json({ error: 'Failed to create FAQ' });
    }
});

// Update a FAQ
router.put('/faqs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer, category, priority, enabled } = req.body;

        const existing = await queryOne('SELECT * FROM faqs WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'FAQ not found' });

        await run(
            `UPDATE faqs SET
                question = COALESCE(?, question),
                answer = COALESCE(?, answer),
                category = COALESCE(?, category),
                priority = COALESCE(?, priority),
                enabled = CASE WHEN ? IS NOT NULL THEN ? ELSE enabled END,
                updated_at = datetime('now')
            WHERE id = ?`,
            [
                question ?? null,
                answer ?? null,
                category ?? null,
                priority ?? null,
                enabled !== undefined ? 1 : null,
                enabled !== undefined ? (enabled ? 1 : 0) : null,
                id
            ]
        );

        const updated = await queryOne('SELECT * FROM faqs WHERE id = ?', [id]);
        res.json(updated);
    } catch (err) {
        console.error('FAQ update error:', err);
        res.status(500).json({ error: 'Failed to update FAQ' });
    }
});

// Delete a FAQ
router.delete('/faqs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await queryOne('SELECT id FROM faqs WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'FAQ not found' });
        await run('DELETE FROM faqs WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('FAQ delete error:', err);
        res.status(500).json({ error: 'Failed to delete FAQ' });
    }
});

// ============= Documents =============

// List all documents for a tenant
router.get('/documents', async (req, res) => {
    try {
        const { tenantId = 'default' } = req.query;
        const docs = await query(
            'SELECT id, tenant_id, title, doc_type, enabled, created_at FROM documents WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );
        res.json(docs);
    } catch (err) {
        console.error('Documents list error:', err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Create a document
router.post('/documents', async (req, res) => {
    try {
        const { tenantId = 'default', title, content, doc_type = 'text' } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'title and content are required' });
        }
        const result = await run(
            'INSERT INTO documents (tenant_id, title, content, doc_type) VALUES (?, ?, ?, ?)',
            [tenantId, title, content, doc_type]
        );
        const doc = await queryOne(
            'SELECT id, tenant_id, title, doc_type, enabled, created_at FROM documents WHERE id = ?',
            [result.lastInsertRowid]
        );
        res.status(201).json(doc);
    } catch (err) {
        console.error('Document create error:', err);
        res.status(500).json({ error: 'Failed to create document' });
    }
});

// Update a document
router.put('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, doc_type, enabled } = req.body;

        const existing = await queryOne('SELECT id FROM documents WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'Document not found' });

        await run(
            `UPDATE documents SET
                title = COALESCE(?, title),
                content = COALESCE(?, content),
                doc_type = COALESCE(?, doc_type),
                enabled = CASE WHEN ? IS NOT NULL THEN ? ELSE enabled END
            WHERE id = ?`,
            [
                title ?? null,
                content ?? null,
                doc_type ?? null,
                enabled !== undefined ? 1 : null,
                enabled !== undefined ? (enabled ? 1 : 0) : null,
                id
            ]
        );

        const updated = await queryOne(
            'SELECT id, tenant_id, title, doc_type, enabled, created_at FROM documents WHERE id = ?',
            [id]
        );
        res.json(updated);
    } catch (err) {
        console.error('Document update error:', err);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

// Delete a document
router.delete('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await queryOne('SELECT id FROM documents WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ error: 'Document not found' });
        await run('DELETE FROM documents WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Document delete error:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

export default router;
