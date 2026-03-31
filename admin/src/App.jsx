import { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Conversations from './pages/Conversations.jsx';
import KnowledgeBase from './pages/KnowledgeBase.jsx';
import Appearance from './pages/Appearance.jsx';
import AISettings from './pages/AISettings.jsx';
import Leads from './pages/Leads.jsx';
import Settings from './pages/Settings.jsx';
import Clients from './pages/Clients.jsx';
import { getTenants, createTenant, deleteTenant } from './api.js';

const NAV_ITEMS = [
    { id: 'clients', label: 'Clients', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { id: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
    { id: 'conversations', label: 'Conversations', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg> },
    { id: 'appearance', label: 'Appearance', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> },
    { id: 'ai', label: 'AI Settings', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" /><circle cx="12" cy="15" r="2" /></svg> },
    { id: 'leads', label: 'Leads', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    { id: 'settings', label: 'Settings', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg> },
];

const PAGES = {
    dashboard: Dashboard,
    conversations: Conversations,
    knowledge: KnowledgeBase,
    appearance: Appearance,
    ai: AISettings,
    leads: Leads,
    settings: Settings,
};

export default function App() {
    const [authed, setAuthed] = useState(!!localStorage.getItem('nexuschat_token'));
    const [page, setPage] = useState('clients');
    const [tenantId, setTenantId] = useState('default');
    const [tenants, setTenants] = useState([{ id: 'default', name: 'Default' }]);
    const [showNewTenant, setShowNewTenant] = useState(false);
    const [newTenantName, setNewTenantName] = useState('');
    const [creating, setCreating] = useState(false);

    // Listen for 401 events from api.js
    useEffect(() => {
        const handler = () => setAuthed(false);
        window.addEventListener('nexuschat:unauthorized', handler);
        return () => window.removeEventListener('nexuschat:unauthorized', handler);
    }, []);

    useEffect(() => {
        if (authed) {
            getTenants().then(data => setTenants(data.tenants || [])).catch(console.error);
        }
    }, [authed]);

    const handleLogin = () => setAuthed(true);

    const handleLogout = () => {
        localStorage.removeItem('nexuschat_token');
        setAuthed(false);
    };

    const handleCreateTenant = async () => {
        if (!newTenantName.trim()) return;
        setCreating(true);
        try {
            const t = await createTenant(newTenantName.trim());
            const updated = await getTenants();
            setTenants(updated.tenants || []);
            setTenantId(t.id);
            setNewTenantName('');
            setShowNewTenant(false);
        } catch (e) { alert(e.message); }
        setCreating(false);
    };

    const handleDeleteTenant = async (id) => {
        const t = tenants.find(t => t.id === id);
        if (!confirm(`Delete client "${t?.name}"? This deletes ALL their data.`)) return;
        try {
            await deleteTenant(id);
            const updated = await getTenants();
            setTenants(updated.tenants || []);
            if (tenantId === id) setTenantId('default');
        } catch (e) { alert(e.message); }
    };

    // From Clients page: click "Manage" on a client
    const handleManageTenant = (id) => {
        setTenantId(id);
        setPage('dashboard');
    };

    if (!authed) return <Login onLogin={handleLogin} />;

    const Page = PAGES[page];
    const currentTenant = tenants.find(t => t.id === tenantId);

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">N</div>
                        <span className="sidebar-logo-text">NexusChat</span>
                    </div>
                </div>

                {/* Tenant selector (shown when not on Clients page) */}
                {page !== 'clients' && (
                    <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Client</div>
                        <select
                            value={tenantId}
                            onChange={e => { setTenantId(e.target.value); }}
                            style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
                        >
                            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button
                                onClick={() => setShowNewTenant(v => !v)}
                                style={{ flex: 1, fontSize: 12, padding: '5px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer' }}
                            >
                                + New client
                            </button>
                            {tenantId !== 'default' && (
                                <button
                                    onClick={() => handleDeleteTenant(tenantId)}
                                    style={{ fontSize: 12, padding: '5px 8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: 6, color: 'var(--danger)', cursor: 'pointer' }}
                                    title="Delete this client"
                                >✕</button>
                            )}
                        </div>
                        {showNewTenant && (
                            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                                <input
                                    autoFocus
                                    value={newTenantName}
                                    onChange={e => setNewTenantName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreateTenant()}
                                    placeholder="Client name..."
                                    style={{ flex: 1, fontSize: 12, padding: '5px 8px', background: 'var(--bg-input)', border: '1px solid var(--primary)', borderRadius: 6, color: 'var(--text)' }}
                                />
                                <button
                                    onClick={handleCreateTenant}
                                    disabled={creating}
                                    style={{ fontSize: 12, padding: '5px 10px', background: 'var(--primary)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}
                                >{creating ? '...' : 'Add'}</button>
                            </div>
                        )}
                    </div>
                )}

                <nav className="sidebar-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            className={`nav-item ${page === item.id ? 'active' : ''}`}
                            onClick={() => setPage(item.id)}
                        >
                            {item.icon}{item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer" style={{ cursor: 'pointer' }} onClick={handleLogout} title="Sign out">
                    <div className="sidebar-avatar">A</div>
                    <div>
                        <div className="sidebar-user-name">Admin</div>
                        <div className="sidebar-user-role">Sign out</div>
                    </div>
                </div>
            </aside>

            <main className="main fadeIn" key={page + tenantId}>
                {page === 'clients' ? (
                    <Clients onManageTenant={handleManageTenant} />
                ) : (
                    <Page tenantId={tenantId} />
                )}
            </main>
        </div>
    );
}
