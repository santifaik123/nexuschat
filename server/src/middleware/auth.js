import crypto from 'crypto';

const makeToken = () => {
    const secret = process.env.JWT_SECRET || 'nexuschat-dev-secret';
    const pass = (process.env.ADMIN_PASSWORD || 'admin').trim();
    return crypto.createHmac('sha256', secret).update(pass).digest('hex');
};

export function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token !== makeToken()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

export function signToken() {
    return makeToken();
}
