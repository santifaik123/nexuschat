import { useState, useEffect } from 'react';
import { getSettings, updateSettings, getProviders } from '../api.js';

export default function AISettings() {
    const [settings, setSettings] = useState({});
    const [providers, setProviders] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        Promise.all([getSettings(), getProviders()])
            .then(([s, p]) => { setSettings(s); setProviders(p.providers || []); })
            .catch(console.error);
    }, []);

    const get = (key, def = '') => settings[key] ?? def;
    const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

    const save = async () => {
        setSaving(true);
        try {
            await updateSettings({
                'ai.provider': get('ai.provider', 'fallback'),
                'ai.model': get('ai.model', 'default'),
                'ai.temperature': get('ai.temperature', '0.7'),
                'ai.max_tokens': get('ai.max_tokens', '500'),
                'ai.system_prompt': get('ai.system_prompt', ''),
                'ai.tone': get('ai.tone', 'professional'),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const currentProvider = providers.find(p => p.id === get('ai.provider', 'fallback'));

    return (
        <div className="fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">AI Settings</h1>
                    <p className="page-subtitle">Configure how the AI responds to customer questions</p>
                </div>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </div>

            <div className="grid-2">
                {/* Provider Selection */}
                <div className="card">
                    <div className="card-header"><span className="card-title">AI Provider</span></div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {providers.map(p => (
                                <label key={p.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    padding: '16px 20px', borderRadius: 12,
                                    background: get('ai.provider') === p.id ? 'rgba(79,70,229,0.1)' : 'var(--bg-input)',
                                    border: `2px solid ${get('ai.provider') === p.id ? 'var(--primary)' : 'var(--border)'}`,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}>
                                    <input type="radio" name="provider" value={p.id} checked={get('ai.provider') === p.id} onChange={e => set('ai.provider', e.target.value)} style={{ accentColor: 'var(--primary)' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.description}</div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                            <span className="badge badge-success">{p.free ? 'Free' : 'Paid'}</span>
                                            {p.requiresKey && <span className="badge badge-warning">API Key Required</span>}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {currentProvider?.models && (
                            <div className="form-group" style={{ marginTop: 20 }}>
                                <label className="form-label">Model</label>
                                <select className="form-select" value={get('ai.model', 'default')} onChange={e => set('ai.model', e.target.value)}>
                                    <option value="default">Default</option>
                                    {currentProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Parameters */}
                <div className="card">
                    <div className="card-header"><span className="card-title">Response Settings</span></div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label">Tone</label>
                            <select className="form-select" value={get('ai.tone', 'professional')} onChange={e => set('ai.tone', e.target.value)}>
                                {['professional', 'friendly', 'casual', 'formal', 'technical'].map(t => (
                                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Temperature ({get('ai.temperature', '0.7')})</label>
                            <input type="range" min="0" max="1" step="0.1" value={get('ai.temperature', '0.7')} onChange={e => set('ai.temperature', e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                <span>Precise</span><span>Creative</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max Response Length (tokens)</label>
                            <input className="form-input" type="number" value={get('ai.max_tokens', '500')} onChange={e => set('ai.max_tokens', e.target.value)} min={50} max={2000} />
                        </div>
                    </div>
                </div>
            </div>

            {/* System Prompt */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><span className="card-title">System Prompt</span></div>
                <div className="card-body">
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        This prompt defines how the AI behaves. It gets injected before every conversation along with your business context and knowledge base.
                    </p>
                    <textarea
                        className="form-textarea"
                        value={get('ai.system_prompt', '')}
                        onChange={e => set('ai.system_prompt', e.target.value)}
                        rows={12}
                        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13 }}
                    />
                </div>
            </div>
        </div>
    );
}
