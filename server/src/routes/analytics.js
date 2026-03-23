import { Router } from 'express';
import { query, queryOne } from '../db/database.js';

const router = Router();

// Overview stats
router.get('/overview', async (req, res) => {
    try {
        const { tenantId = 'default', days = 7 } = req.query;
        const daysInt = parseInt(days);

        // Total conversations in period
        const totalConvRow = await queryOne(
            `SELECT COUNT(*) as count FROM conversations
             WHERE tenant_id = ? AND started_at >= datetime('now', ?)`,
            [tenantId, `-${daysInt} days`]
        );
        const totalConversations = totalConvRow.count;

        // Active chats (right now)
        const activeRow = await queryOne(
            `SELECT COUNT(*) as count FROM conversations
             WHERE tenant_id = ? AND status = 'active'`,
            [tenantId]
        );
        const activeChats = activeRow.count;

        // Resolved conversations
        const resolvedRow = await queryOne(
            `SELECT COUNT(*) as count FROM conversations
             WHERE tenant_id = ? AND status = 'resolved' AND started_at >= datetime('now', ?)`,
            [tenantId, `-${daysInt} days`]
        );
        const resolved = resolvedRow.count;

        const resolutionRate = totalConversations > 0
            ? Math.round((resolved / totalConversations) * 100)
            : 0;

        // Average response time from analytics events
        const avgRespRow = await queryOne(
            `SELECT AVG(CAST(json_extract(event_data, '$.response_time_ms') AS REAL)) as avg
             FROM analytics_events
             WHERE tenant_id = ? AND event_type = 'chat_response'
               AND created_at >= datetime('now', ?)`,
            [tenantId, `-${daysInt} days`]
        );
        const avgResponseTime = Math.round(avgRespRow?.avg || 0);

        // Daily chat counts
        const dailyChats = await query(
            `SELECT DATE(started_at) as date, COUNT(*) as count
             FROM conversations
             WHERE tenant_id = ? AND started_at >= datetime('now', ?)
             GROUP BY DATE(started_at)
             ORDER BY date ASC`,
            [tenantId, `-${daysInt} days`]
        );

        // Total leads
        const leadsRow = await queryOne(
            `SELECT COUNT(*) as count FROM leads WHERE tenant_id = ?`,
            [tenantId]
        );
        const totalLeads = leadsRow.count;

        // Provider usage breakdown
        const providerUsage = await query(
            `SELECT json_extract(event_data, '$.provider') as provider, COUNT(*) as count
             FROM analytics_events
             WHERE tenant_id = ? AND event_type = 'chat_response'
               AND created_at >= datetime('now', ?)
             GROUP BY provider
             ORDER BY count DESC`,
            [tenantId, `-${daysInt} days`]
        );

        // Top FAQ categories
        const topCategories = await query(
            `SELECT category, COUNT(*) as count
             FROM faqs
             WHERE tenant_id = ? AND enabled = 1
             GROUP BY category
             ORDER BY count DESC
             LIMIT 5`,
            [tenantId]
        );

        res.json({
            totalConversations,
            activeChats,
            resolutionRate,
            avgResponseTime,
            dailyChats,
            totalLeads,
            providerUsage,
            topCategories
        });
    } catch (err) {
        console.error('Analytics overview error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

export default router;
