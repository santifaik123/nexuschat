import { useState, useEffect } from 'react';
import { getAnalytics, getConversations } from '../api.js';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState([]);
    const [days, setDays] = useState(7);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getAnalytics(days),
            getConversations({ limit: 5 })
        ]).then(([s, c]) => {
            setStats(s);
            setRecent(c.conversations || []);
        }).catch(console.error).finally(() => setLoading(false));
    }, [days]);

    if (loading) return <div className="empty-state"><p>Loading dashboard...</p></div>;

    const maxChat = Math.max(...(stats?.dailyChats || []).map(d => d.count), 1);

    return (
        <div className="fadeIn">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of your chatbot's performance</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Conversations</div>
                    <div className="stat-value">{stats?.totalConversations || 0}</div>
                    <div className="stat-change up">Last {days} days</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Chats</div>
                    <div className="stat-value">{stats?.activeChats || 0}</div>
                    <div className="stat-change" style={{ color: 'var(--primary)' }}>Now</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Resolution Rate</div>
                    <div className="stat-value">{stats?.resolutionRate || 0}%</div>
                    <div className="stat-change up">{stats?.resolutionRate >= 80 ? '✓ Good' : 'Needs improvement'}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Avg Response Time</div>
                    <div className="stat-value">{stats?.avgResponseTime || 0}<span style={{ fontSize: '14px', fontWeight: 400 }}>ms</span></div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Conversation Volume</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[7, 14, 30].map(d => (
                                <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDays(d)}>{d}d</button>
                            ))}
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="chart-area">
                            {(stats?.dailyChats || []).map((d, i) => (
                                <div key={i} className="chart-bar" style={{ height: `${(d.count / maxChat) * 100}%` }} title={`${d.date}: ${d.count} chats`} />
                            ))}
                            {(!stats?.dailyChats || stats.dailyChats.length === 0) && (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No data yet</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Recent Conversations</span>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {recent.length > 0 ? (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr><th>User</th><th>Last Message</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {recent.map(c => (
                                            <tr key={c.id}>
                                                <td>{c.user_name || c.user_email || 'Anonymous'}</td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.lastMessage?.content?.substring(0, 50) || '—'}
                                                </td>
                                                <td><span className={`badge badge-${c.status === 'resolved' ? 'success' : c.status === 'active' ? 'primary' : 'warning'}`}>{c.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state"><p>No conversations yet. Start chatting!</p></div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid-3" style={{ marginTop: 24 }}>
                <div className="stat-card">
                    <div className="stat-label">Total Leads</div>
                    <div className="stat-value">{stats?.totalLeads || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">AI Providers</div>
                    <div className="stat-value" style={{ fontSize: 20 }}>
                        {(stats?.providerUsage || []).map(p => p.provider).join(', ') || 'Fallback'}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Top Categories</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {(stats?.topCategories || []).map((c, i) => (
                            <span key={i} className="badge badge-primary">{c.category} ({c.count})</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
