import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { query, queryOne, run } from '../db/database.js';

export function createChatRouter(aiEngine) {
    const router = Router();

    // Send a message and get AI response
    router.post('/message', async (req, res) => {
        try {
            const { tenantId = 'default', sessionId, message, userName, userEmail } = req.body;

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return res.status(400).json({ error: 'Message is required' });
            }

            if (message.length > 2000) {
                return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
            }

            const sid = sessionId || uuid();

            // Get or create conversation
            let conversation = await queryOne(
                'SELECT * FROM conversations WHERE session_id = ? AND tenant_id = ? AND status = ?',
                [sid, tenantId, 'active']
            );

            if (!conversation) {
                const convId = uuid();
                await run(
                    `INSERT INTO conversations (id, tenant_id, session_id, user_name, user_email, status)
                     VALUES (?, ?, ?, ?, ?, 'active')`,
                    [convId, tenantId, sid, userName || null, userEmail || null]
                );
                conversation = { id: convId };

                // Log new chat event
                await run(
                    `INSERT INTO analytics_events (tenant_id, event_type, event_data)
                     VALUES (?, 'chat_started', ?)`,
                    [tenantId, JSON.stringify({ conversation_id: convId })]
                );
            }

            // Save user message
            await run(
                `INSERT INTO messages (conversation_id, role, content, source)
                 VALUES (?, 'user', ?, 'user')`,
                [conversation.id, message.trim()]
            );

            // Get conversation history
            const history = await query(
                `SELECT role, content FROM messages
                 WHERE conversation_id = ?
                 ORDER BY created_at ASC`,
                [conversation.id]
            );

            // Process with AI engine
            const result = await aiEngine.processMessage(
                tenantId,
                conversation.id,
                message.trim(),
                history.slice(0, -1) // exclude the just-added message
            );

            // Parse inline suggestions from AI response [SUGGEST: a | b | c]
            let suggestions = [];
            const suggestMatch = result.content.match(/\[SUGGEST:\s*([^\]]+)\]/i);
            if (suggestMatch) {
                suggestions = suggestMatch[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 4);
                result.content = result.content.replace(/\[SUGGEST:[^\]]+\]/i, '').trim();
            }

            // Save assistant message
            await run(
                `INSERT INTO messages (conversation_id, role, content, source, confidence)
                 VALUES (?, 'assistant', ?, ?, ?)`,
                [conversation.id, result.content, result.source, result.confidence]
            );

            // Update conversation timestamp
            await run(
                `UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`,
                [conversation.id]
            );

            // Check if we should prompt for lead capture
            const countRow = await queryOne(
                'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND role = ?',
                [conversation.id, 'user']
            );
            const messageCount = countRow.count;

            const settingsRows = await query(
                'SELECT key, value FROM settings WHERE tenant_id = ?',
                [tenantId]
            );
            const settings = {};
            for (const row of settingsRows) settings[row.key] = row.value;

            const captureAfter = parseInt(settings['leads.capture_after'] || '3');
            const leadsEnabled = settings['leads.enabled'] === 'true';
            const existingLead = await queryOne(
                'SELECT id FROM leads WHERE conversation_id = ?',
                [conversation.id]
            );

            const shouldCaptureLead = leadsEnabled && messageCount >= captureAfter && !existingLead;

            res.json({
                sessionId: sid,
                conversationId: conversation.id,
                message: result.content,
                source: result.source,
                confidence: result.confidence,
                responseTime: result.responseTime,
                suggestions,
                shouldCaptureLead,
                leadFields: shouldCaptureLead ? JSON.parse(settings['leads.fields'] || '["name","email"]') : undefined
            });

        } catch (err) {
            console.error('Chat error:', err);
            res.status(500).json({
                error: 'Failed to process message',
                message: "I'm having trouble right now. Please try again in a moment."
            });
        }
    });

    // Submit lead info
    router.post('/lead', async (req, res) => {
        try {
            const { tenantId = 'default', conversationId, name, email, phone, message } = req.body;

            await run(
                `INSERT INTO leads (tenant_id, conversation_id, name, email, phone, message)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [tenantId, conversationId || null, name || null, email || null, phone || null, message || null]
            );

            // Update conversation with user info
            if (conversationId) {
                if (name) await run('UPDATE conversations SET user_name = ? WHERE id = ?', [name, conversationId]);
                if (email) await run('UPDATE conversations SET user_email = ? WHERE id = ?', [email, conversationId]);
            }

            await run(
                `INSERT INTO analytics_events (tenant_id, event_type, event_data)
                 VALUES (?, 'lead_captured', ?)`,
                [tenantId, JSON.stringify({ conversation_id: conversationId, has_email: !!email })]
            );

            res.json({ success: true });
        } catch (err) {
            console.error('Lead capture error:', err);
            res.status(500).json({ error: 'Failed to save lead information' });
        }
    });

    // Message feedback (thumbs up/down)
    router.post('/feedback', async (req, res) => {
        try {
            const { conversationId, rating } = req.body;
            if (!conversationId || !['up', 'down'].includes(rating)) {
                return res.status(400).json({ error: 'Invalid feedback' });
            }
            await run(
                `INSERT INTO analytics_events (tenant_id, event_type, event_data)
                 SELECT tenant_id, 'message_feedback', ? FROM conversations WHERE id = ?`,
                [JSON.stringify({ conversation_id: conversationId, rating }), conversationId]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Feedback error:', err);
            res.status(500).json({ error: 'Failed to save feedback' });
        }
    });

    // End conversation
    router.post('/end', async (req, res) => {
        try {
            const { conversationId } = req.body;

            await run(
                `UPDATE conversations SET status = 'resolved', updated_at = datetime('now') WHERE id = ?`,
                [conversationId]
            );

            await run(
                `INSERT INTO analytics_events (tenant_id, event_type, event_data)
                 SELECT tenant_id, 'chat_resolved', ? FROM conversations WHERE id = ?`,
                [JSON.stringify({ conversation_id: conversationId }), conversationId]
            );

            res.json({ success: true });
        } catch (err) {
            console.error('End conversation error:', err);
            res.status(500).json({ error: 'Failed to end conversation' });
        }
    });

    return router;
}
