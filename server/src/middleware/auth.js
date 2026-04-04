import crypto from 'crypto';

const EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

const computeHmac = (timestamp) => {
    const secret = process.env.JWT_SECRET || 'nexuschat-dev-secret';
    const pass = (process.env.ADMIN_PASSWORD || 'admin').trim();
    return crypto.createHmac('sha256', secret).update(`${pass}:${timestamp}`).digest('hex');
};

export function requireAuth(req, res, next) {
    const raw = req.headers.authorization?.split(' ')[1];
    if (!raw) return res.status(401).json({ error: 'Unauthorized' });

    const dotIndex = raw.indexOf('.');
    if (dotIndex === -1) return res.status(401).json({ error: 'Unauthorized' });

    const timestamp = parseInt(raw.slice(0, dotIndex), 10);
    const token = raw.slice(dotIndex + 1);

    if (isNaN(timestamp)) return res.status(401).json({ error: 'Unauthorized' });

    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > EXPIRY_SECONDS) {
        return res.status(401).json({ error: 'Token expired' });
    }

    const expected = computeHmac(timestamp);
    try {
        // Both are 64-char hex strings — safe for timingSafeEqual
        const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
        if (!valid) return res.status(401).json({ error: 'Unauthorized' });
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

export function signToken() {
    const timestamp = Math.floor(Date.now() / 1000);
    return `${timestamp}.${computeHmac(timestamp)}`;
}
