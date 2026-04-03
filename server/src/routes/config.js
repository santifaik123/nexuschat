import { Router } from 'express';
import { query, queryOne } from '../db/database.js';

const router = Router();

// Get widget config for a tenant
router.get('/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;

        const settings = await query(
            "SELECT key, value FROM settings WHERE tenant_id = ? AND (key LIKE 'widget.%' OR key LIKE 'proactive.%')",
            [tenantId]
        );

        if (settings.length === 0) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        const config = {};
        for (const s of settings) {
            const key = s.key.replace('widget.', '').replace('proactive.', 'proactive_');
            try {
                config[key] = JSON.parse(s.value);
            } catch {
                config[key] = s.value;
            }
        }

        // Add business name
        const businessName = await queryOne(
            "SELECT value FROM settings WHERE tenant_id = ? AND key = 'business.name'",
            [tenantId]
        );
        if (businessName) config.business_name = businessName.value;

        res.json(config);
    } catch (err) {
        console.error('Config error:', err);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

export default router;
