import { useState, useEffect } from 'react';
import { getConversations, getConversationMessages } from '../api.js';

export default function Conversations({ tenantId = 'default' }) {
    const [conversations, setConversations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getConversations({ status: filter || undefined, limit: 50, tenantId })
            .then(data => setConversations(data.conversations || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [filter, tenantId]);

    const viewConversation = async (conv) => {
        setSelected(conv);
        try {
            const data = await getConversationMessages(conv.id);
            setMessages(data.messages || []);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="fadeIn">
            <div className="page-header">
                <h1 className="page-title">Conversations</h1>
                <p className="page-subtitle">View and manage all chat conversations</p>
            </div>

            <div className="tabs">
                {['', 'active', 'resolved'].map(f => (
                    <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
                {/* Conversation List */}
                <div className="card" style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-body" style={{ padding: 0 }}>
                        {loading ? (
                            <div className="empty-state"><p>Loading...</p></div>
                        ) : conversations.length === 0 ? (
                            <div className="empty-state"><h3>No conversations yet</h3><p>Conversations will appear here when users start chatting</p></div>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr><th>User</th><th>Messages</th><th>Last Message</th><th>Status</th><th>Date</th></tr>
                                    </thead>
                                    <tbody>
                                        {conversations.map(c => (
                                            <tr key={c.id} onClick={() => viewConversation(c)} style={{ cursor: 'pointer', background: selected?.id === c.id ? 'rgba(79,70,229,0.1)' : undefined }}>
                                                <td style={{ fontWeight: 500 }}>{c.user_name || c.user_email || 'Anonymous'}</td>
                                                <td>{c.messageCount || 0}</td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {c.lastMessage?.content?.substring(0, 60) || '—'}
                                                </td>
                                                <td><span className={`badge badge-${c.status === 'resolved' ? 'success' : 'primary'}`}>{c.status}</span></td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(c.started_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Message Detail */}
                {selected && (
                    <div className="card" style={{ width: 400, flexShrink: 0 }}>
                        <div className="card-header">
                            <span className="card-title">{selected.user_name || 'Anonymous'}</span>
                            <button className="btn-icon" onClick={() => setSelected(null)}>✕</button>
                        </div>
                        <div className="card-body" style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {messages.map(m => (
                                <div key={m.id} style={{
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    fontSize: 14,
                                    maxWidth: '85%',
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: m.role === 'user' ? 'var(--primary)' : 'var(--bg-input)',
                                    color: m.role === 'user' ? 'white' : 'var(--text)',
                                }}>
                                    {m.content}
                                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {m.source && m.role === 'assistant' && ` · ${m.source}`}
                                    </div>
                                </div>
                            ))}
                            {messages.length === 0 && <div className="empty-state"><p>No messages</p></div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
