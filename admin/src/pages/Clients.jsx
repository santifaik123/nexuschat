import { useState, useEffect } from 'react';
import { getTenants, createTenant, deleteTenant, getAnalytics } from '../api.js';

function EmbedCode({ tenantId }) {
    const [copied, setCopied] = useState(false);
    const serverUrl = window.location.origin.replace(':5173', ':3000');
    const code = `<!-- NexusChat Widget -->
<script>
  window.NexusChatConfig = {
    tenantId: '${tenantId}',
    serverUrl: '${serverUrl}',
  };
</script>
<script src="${serverUrl}/widget/nexuschat.min.js"></script>`;

    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Embed Code</span>
                <button
                    onClick={copy}
                    style={{
                        fontSize: 12, padding: '4px 10px',
                        background: copied ? 'rgba(16,185,129,0.1)' : 'var(--bg-input)',
                        border: `1px solid ${copied ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: 6, color: copied ? 'var(--success)' : 'var(--text)',
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
            </div>
            <pre style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 11,
                lineHeight: 1.6,
                overflow: 'auto',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                color: 'var(--text-muted)',
                margin: 0,
                whiteSpace: 'pre',
            }}>
                {code}
            </pre>
        </div>
    );
}

function ClientCard({ tenant, onManage, onDelete }) {
    const [showEmbed, setShowEmbed] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        getAnalytics(30, tenant.id)
            .then(setStats)
            .catch(() => {});
    }, [tenant.id]);

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-body">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0,
                        }}>
                            {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{tenant.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                                ID: {tenant.id}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => onManage(tenant.id)}
                        >
                            Manage
                        </button>
                        {tenant.id !== 'default' && (
                            <button
                                className="btn-icon"
                                onClick={() => onDelete(tenant)}
                                style={{ color: 'var(--danger)' }}
                                title="Delete client"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    {[
                        { label: 'Conversations', value: stats?.totalConversations ?? '—' },
                        { label: 'Active', value: stats?.activeChats ?? '—' },
                        { label: 'Leads', value: stats?.totalLeads ?? '—' },
                    ].map(s => (
                        <div key={s.label} style={{
                            flex: 1, background: 'var(--bg-input)',
                            borderRadius: 8, padding: '10px 12px', textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Embed toggle */}
                <button
                    onClick={() => setShowEmbed(v => !v)}
                    style={{
                        width: '100%', fontSize: 13, padding: '8px 0',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text-muted)',
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}
                >
                    {showEmbed ? '▲ Hide embed code' : '▼ Show embed code'}
                </button>

                {showEmbed && <EmbedCode tenantId={tenant.id} />}
            </div>
        </div>
    );
}

export default function Clients({ onManageTenant }) {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    const load = () => getTenants().then(d => setTenants(d.tenants || [])).catch(console.error).finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await createTenant(newName.trim());
            await load();
            setNewName('');
            setShowNew(false);
        } catch (e) { alert(e.message); }
        setCreating(false);
    };

    const handleDelete = async (tenant) => {
        if (!confirm(`Delete client "${tenant.name}"?\nThis will permanently delete ALL their data (conversations, leads, knowledge base, settings).`)) return;
        try {
            await deleteTenant(tenant.id);
            await load();
        } catch (e) { alert(e.message); }
    };

    return (
        <div className="fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Clients</h1>
                    <p className="page-subtitle">{tenants.length} client{tenants.length !== 1 ? 's' : ''} — each with their own bot configuration and embed code</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowNew(v => !v)}>
                    + New Client
                </button>
            </div>

            {showNew && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <input
                                className="form-input"
                                autoFocus
                                placeholder="Client name (e.g. Acme Corp)"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setShowNew(false); setNewName(''); }}>
                                Cancel
                            </button>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                            A unique ID and embed code will be generated automatically.
                        </p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="empty-state"><p>Loading clients...</p></div>
            ) : (
                <div className="grid-2">
                    {tenants.map(t => (
                        <ClientCard
                            key={t.id}
                            tenant={t}
                            onManage={(id) => onManageTenant(id)}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
