import { useState } from 'react';
import { login } from '../api.js';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { token } = await login(username, password);
            localStorage.setItem('nexuschat_token', token);
            onLogin();
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
        }}>
            <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, fontWeight: 700, color: 'white',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
                    }}>N</div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>NexusChat</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>Admin Panel</p>
                </div>

                {/* Card */}
                <div className="card">
                    <div className="card-body">
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Username</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoFocus
                                    autoComplete="username"
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Password</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                            </div>

                            {error && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    fontSize: 13,
                                    color: 'var(--danger)',
                                }}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ width: '100%', marginTop: 4 }}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
