import jwt from 'jsonwebtoken';

const SECRET = () => process.env.JWT_SECRET || 'nexuschat-dev-secret';

export function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        jwt.verify(token, SECRET());
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function signToken() {
    return jwt.sign({ role: 'admin' }, SECRET(), { expiresIn: '30d' });
}
