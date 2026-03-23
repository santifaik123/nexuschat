import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api.js';

export default function Settings() {
    const [settings, setSettings] = useState({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [embedCode, setEmbedCode] = useState('');

    useEffect(() => {
        getSettings().then(s => {
            setSettings(s);
            generateEmbed(s);
        }).catch(console.error);
    }, []);

    const get = (key, def = '') => settings[key] ?? def;
    const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

    const generateEmbed = (s) => {
        const serverUrl = window.location.origin.replace(':5173', ':3000');
        setEmbedCode(`<!-- NexusChat Widget -->
<script>
  window.NexusChatConfig = {
    tenantId: 'default',
    serverUrl: '${serverUrl}',
  };
</script>
<script src="${serverUrl}/widget/nexuschat.min.js"></script>`);
    };

    const save = async () => {
        setSaving(true);
        try {
            await updateSettings({
                'business.name': get('business.name', ''),
                'business.description': get('business.description', ''),
                'business.hours': get('business.hours', ''),
                'business.contact_email': get('business.contact_email', ''),
                'business.contact_phone': get('business.contact_phone', ''),
                'leads.enabled': get('leads.enabled', 'true'),
                'leads.capture_after': get('leads.capture_after', '3'),
                'rate_limit.max_requests': get('rate_limit.max_requests', '30'),
                'rate_limit.window_minutes': get('rate_limit.window_minutes', '1'),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const copyEmbed = () => {
        navigator.clipboard.writeText(embedCode);
    };

    return (
        <div className="fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">General settings and business information</p>
                </div>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </div>

            <div className="grid-2">
                {/* Business Info */}
                <div className="card">
                    <div className="card-header"><span className="card-title">Business Information</span></div>
                    <div className="card-body">
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                            This information is provided to the AI as context to help answer customer questions accurately.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Business Name</label>
                            <input className="form-input" value={get('business.name', '')} onChange={e => set('business.name', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" value={get('business.description', '')} onChange={e => set('business.description', e.target.value)} rows={3} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Business Hours</label>
                            <input className="form-input" value={get('business.hours', '')} onChange={e => set('business.hours', e.target.value)} placeholder="e.g., Mon-Fri 9AM-6PM EST" />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Support Email</label>
                                <input className="form-input" value={get('business.contact_email', '')} onChange={e => set('business.contact_email', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Support Phone</label>
                                <input className="form-input" value={get('business.contact_phone', '')} onChange={e => set('business.contact_phone', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leads & Rate Limiting */}
                <div>
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header"><span className="card-title">Lead Capture</span></div>
                        <div className="card-body">
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Enable Lead Capture</label>
                                <div className={`toggle ${get('leads.enabled', 'true') === 'true' ? 'active' : ''}`}
                                    onClick={() => set('leads.enabled', get('leads.enabled', 'true') === 'true' ? 'false' : 'true')}></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Capture After (# messages)</label>
                                <input className="form-input" type="number" value={get('leads.capture_after', '3')} onChange={e => set('leads.capture_after', e.target.value)} min={1} max={20} />
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Show lead form after this many user messages</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><span className="card-title">Rate Limiting</span></div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Max Requests Per Window</label>
                                <input className="form-input" type="number" value={get('rate_limit.max_requests', '30')} onChange={e => set('rate_limit.max_requests', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Window Duration (minutes)</label>
                                <input className="form-input" type="number" value={get('rate_limit.window_minutes', '1')} onChange={e => set('rate_limit.window_minutes', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Embed Code */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <span className="card-title">Embed Code</span>
                    <button className="btn btn-secondary btn-sm" onClick={copyEmbed}>📋 Copy</button>
                </div>
                <div className="card-body">
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Paste this code snippet just before the <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>&lt;/body&gt;</code> tag on your website.
                    </p>
                    <pre style={{
                        background: 'var(--bg-subtle)',
                        padding: 20, borderRadius: 12,
                        fontSize: 13, lineHeight: 1.6,
                        overflow: 'auto',
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                    }}>
                        {embedCode}
                    </pre>
                </div>
            </div>
        </div>
    );
}
