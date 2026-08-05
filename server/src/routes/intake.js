import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { queryOne, run } from '../db/database.js';

const router = Router();

function clean(value, maxLength) {
    if (value === null || value === undefined) return null;
    const result = String(value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
    return result || null;
}

function validSecret(header) {
    const configured = process.env.NEXUS_INGEST_SECRET || '';
    const supplied = (header || '').replace(/^Bearer\s+/i, '');
    if (!configured || !supplied) return false;
    const expectedHash = createHash('sha256').update(configured).digest();
    const suppliedHash = createHash('sha256').update(supplied).digest();
    return timingSafeEqual(expectedHash, suppliedHash);
}

router.post('/leads', async (req, res) => {
    if (!validSecret(req.get('authorization'))) return res.status(401).json({ error: 'Unauthorized' });

    const tenantId = clean(req.body?.tenantId, 64);
    const externalId = clean(req.body?.externalId, 64);
    const name = clean(req.body?.name, 100);
    const email = clean(req.body?.email, 254)?.toLowerCase();
    const message = clean(req.body?.message, 2000);

    if (!tenantId || !externalId || !/^[a-zA-Z0-9_-]{16,64}$/.test(externalId)) {
        return res.status(400).json({ error: 'Invalid reference' });
    }
    if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
        return res.status(422).json({ error: 'Invalid lead fields' });
    }

    const tenant = await queryOne('SELECT id FROM tenants WHERE id = ?', [tenantId]);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const existing = await queryOne('SELECT id FROM leads WHERE external_id = ? AND tenant_id = ?', [externalId, tenantId]);
    if (existing) return res.json({ success: true, id: String(existing.id), duplicate: true });

    try {
        await run(
            `INSERT INTO leads (
              tenant_id, external_id, source, name, email, company, inquiry_type, message,
              status, campaign_source, campaign_medium, campaign_name, landing_path,
              consent_at, privacy_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                tenantId, externalId, 'pagweb1', name, email,
                clean(req.body.company, 150), clean(req.body.inquiryType, 120), message,
                clean(req.body.campaignSource, 120), clean(req.body.campaignMedium, 120),
                clean(req.body.campaignName, 120), clean(req.body.landingPath, 300),
                clean(req.body.consentAt, 40), clean(req.body.privacyVersion, 32)
            ]
        );
        const lead = await queryOne('SELECT id FROM leads WHERE external_id = ? AND tenant_id = ?', [externalId, tenantId]);
        await run(
            `INSERT INTO lead_events (tenant_id, lead_id, event_type, event_data)
             VALUES (?, ?, 'received_from_pagweb1', ?)`,
            [tenantId, lead.id, JSON.stringify({ source: 'pagweb1' })]
        );
        res.status(201).json({ success: true, id: String(lead.id) });
    } catch {
        console.error('[INTAKE] lead_store_failed');
        res.status(500).json({ error: 'Unable to store lead' });
    }
});

export default router;
