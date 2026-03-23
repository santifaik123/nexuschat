import { useState, useEffect } from 'react';
import { getLeads, deleteLead } from '../api.js';

export default function Leads() {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getLeads({ limit: 50 });
            setLeads(data.leads || []);
            setTotal(data.total || 0);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this lead?')) return;
        await deleteLead(id);
        load();
    };

    const exportCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Message', 'Date'];
        const rows = leads.map(l => [l.name || '', l.email || '', l.phone || '', l.message || '', l.created_at || '']);
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'nexuschat-leads.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Leads</h1>
                    <p className="page-subtitle">{total} leads captured from chatbot conversations</p>
                </div>
                {leads.length > 0 && (
                    <button className="btn btn-primary" onClick={exportCSV}>📥 Export CSV</button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div className="empty-state"><p>Loading leads...</p></div>
                    ) : leads.length === 0 ? (
                        <div className="empty-state">
                            <h3>No leads captured yet</h3>
                            <p>Leads will appear here when users provide their contact information in the chatbot</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Date</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {leads.map(l => (
                                        <tr key={l.id}>
                                            <td style={{ fontWeight: 500 }}>{l.name || '—'}</td>
                                            <td>{l.email || '—'}</td>
                                            <td>{l.phone || '—'}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                {new Date(l.created_at).toLocaleDateString()} {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td>
                                                <button className="btn-icon" onClick={() => handleDelete(l.id)} style={{ color: 'var(--danger)' }}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
