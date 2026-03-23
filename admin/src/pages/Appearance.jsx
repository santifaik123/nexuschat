import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api.js';

export default function Appearance() {
    const [settings, setSettings] = useState({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getSettings().then(setSettings).catch(console.error);
    }, []);

    const get = (key, def = '') => settings[key] ?? def;
    const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

    const save = async () => {
        setSaving(true);
        try {
            await updateSettings({
                'widget.name': get('widget.name', 'NexusChat'),
                'widget.welcome_message': get('widget.welcome_message'),
                'widget.primary_color': get('widget.primary_color', '#4F46E5'),
                'widget.secondary_color': get('widget.secondary_color', '#7C3AED'),
                'widget.theme': get('widget.theme', 'light'),
                'widget.position': get('widget.position', 'bottom-right'),
                'widget.border_radius': get('widget.border_radius', '16'),
                'widget.language': get('widget.language', 'en'),
                'widget.placeholder': get('widget.placeholder', 'Type your message...'),
                'widget.logo_url': get('widget.logo_url', ''),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    const primaryColor = get('widget.primary_color', '#4F46E5');
    const secondaryColor = get('widget.secondary_color', '#7C3AED');

    return (
        <div className="fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Appearance</h1>
                    <p className="page-subtitle">Customize how your chatbot looks on your website</p>
                </div>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: 32 }}>
                {/* Settings Form */}
                <div style={{ flex: 1 }}>
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header"><span className="card-title">Identity</span></div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Bot Name</label>
                                <input className="form-input" value={get('widget.name', 'NexusChat')} onChange={e => set('widget.name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Welcome Message</label>
                                <textarea className="form-textarea" value={get('widget.welcome_message', '')} onChange={e => set('widget.welcome_message', e.target.value)} rows={3} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Input Placeholder</label>
                                <input className="form-input" value={get('widget.placeholder', 'Type your message...')} onChange={e => set('widget.placeholder', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Logo URL (optional)</label>
                                <input className="form-input" value={get('widget.logo_url', '')} onChange={e => set('widget.logo_url', e.target.value)} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header"><span className="card-title">Style</span></div>
                        <div className="card-body">
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Primary Color</label>
                                    <div className="color-input-group">
                                        <div className="color-swatch" style={{ background: primaryColor }}><input type="color" value={primaryColor} onChange={e => set('widget.primary_color', e.target.value)} /></div>
                                        <input className="form-input" value={primaryColor} onChange={e => set('widget.primary_color', e.target.value)} style={{ width: 120 }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Secondary Color</label>
                                    <div className="color-input-group">
                                        <div className="color-swatch" style={{ background: secondaryColor }}><input type="color" value={secondaryColor} onChange={e => set('widget.secondary_color', e.target.value)} /></div>
                                        <input className="form-input" value={secondaryColor} onChange={e => set('widget.secondary_color', e.target.value)} style={{ width: 120 }} />
                                    </div>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Theme</label>
                                    <select className="form-select" value={get('widget.theme', 'light')} onChange={e => set('widget.theme', e.target.value)}>
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Position</label>
                                    <select className="form-select" value={get('widget.position', 'bottom-right')} onChange={e => set('widget.position', e.target.value)}>
                                        <option value="bottom-right">Bottom Right</option>
                                        <option value="bottom-left">Bottom Left</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Border Radius (px)</label>
                                    <input className="form-input" type="number" value={get('widget.border_radius', '16')} onChange={e => set('widget.border_radius', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Language</label>
                                    <select className="form-select" value={get('widget.language', 'en')} onChange={e => set('widget.language', e.target.value)}>
                                        <option value="en">English</option>
                                        <option value="es">Español</option>
                                        <option value="pt">Português</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                <div style={{ width: 340, flexShrink: 0 }}>
                    <div className="card" style={{ position: 'sticky', top: 32 }}>
                        <div className="card-header"><span className="card-title">Preview</span></div>
                        <div className="card-body" style={{ background: get('widget.theme', 'light') === 'dark' ? '#1a1a2e' : '#f8fafc', padding: 20 }}>
                            {/* Mini preview */}
                            <div style={{
                                borderRadius: parseInt(get('widget.border_radius', '16')),
                                overflow: 'hidden',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                border: `1px solid ${get('widget.theme', 'light') === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                            }}>
                                {/* Header */}
                                <div style={{
                                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                    padding: '16px 20px',
                                    color: 'white',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: 14,
                                    }}>
                                        {(get('widget.name', 'N') || 'N').charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{get('widget.name', 'NexusChat')}</div>
                                        <div style={{ fontSize: 11, opacity: 0.85 }}>● Online</div>
                                    </div>
                                </div>
                                {/* Messages */}
                                <div style={{ padding: 16, minHeight: 160, background: get('widget.theme', 'light') === 'dark' ? '#1a1a2e' : '#ffffff' }}>
                                    <div style={{
                                        background: get('widget.theme', 'light') === 'dark' ? '#1e293b' : '#f1f5f9',
                                        color: get('widget.theme', 'light') === 'dark' ? '#e2e8f0' : '#1e293b',
                                        padding: '8px 14px', borderRadius: 12, fontSize: 13, marginBottom: 12, maxWidth: '80%',
                                    }}>
                                        {get('widget.welcome_message', '👋 Hi there!')}
                                    </div>
                                    <div style={{
                                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                        color: 'white',
                                        padding: '8px 14px', borderRadius: 12, fontSize: 13, marginLeft: 'auto', maxWidth: '70%', textAlign: 'right',
                                    }}>
                                        Hello!
                                    </div>
                                </div>
                                {/* Input */}
                                <div style={{ padding: '10px 14px', borderTop: `1px solid ${get('widget.theme', 'light') === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, background: get('widget.theme', 'light') === 'dark' ? '#1a1a2e' : '#ffffff' }}>
                                    <div style={{
                                        background: get('widget.theme', 'light') === 'dark' ? '#1e293b' : '#f8fafc',
                                        borderRadius: 20, padding: '8px 14px', fontSize: 12,
                                        color: get('widget.theme', 'light') === 'dark' ? '#94a3b8' : '#94a3b8',
                                    }}>
                                        {get('widget.placeholder', 'Type your message...')}
                                    </div>
                                </div>
                            </div>

                            {/* FAB */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                    boxShadow: `0 6px 20px ${primaryColor}66`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: 20,
                                }}>💬</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
