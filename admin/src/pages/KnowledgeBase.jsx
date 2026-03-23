import { useState, useEffect } from 'react';
import { getFAQs, createFAQ, updateFAQ, deleteFAQ, getDocuments, createDocument, deleteDocument } from '../api.js';

export default function KnowledgeBase() {
    const [tab, setTab] = useState('faqs');
    const [faqs, setFAQs] = useState([]);
    const [docs, setDocs] = useState([]);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ question: '', answer: '', category: 'General', priority: 0 });
    const [docForm, setDocForm] = useState({ title: '', content: '', doc_type: 'text' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [f, d] = await Promise.all([getFAQs(), getDocuments()]);
            setFAQs(f);
            setDocs(d);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSaveFAQ = async () => {
        if (!form.question || !form.answer) return;
        try {
            if (editing) {
                await updateFAQ(editing.id, form);
            } else {
                await createFAQ(form);
            }
            setForm({ question: '', answer: '', category: 'General', priority: 0 });
            setEditing(null);
            loadAll();
        } catch (e) { console.error(e); }
    };

    const handleDeleteFAQ = async (id) => {
        if (!confirm('Delete this FAQ?')) return;
        await deleteFAQ(id);
        loadAll();
    };

    const handleEditFAQ = (faq) => {
        setEditing(faq);
        setForm({ question: faq.question, answer: faq.answer, category: faq.category, priority: faq.priority });
    };

    const handleToggleFAQ = async (faq) => {
        await updateFAQ(faq.id, { enabled: !faq.enabled });
        loadAll();
    };

    const handleSaveDoc = async () => {
        if (!docForm.title || !docForm.content) return;
        await createDocument(docForm);
        setDocForm({ title: '', content: '', doc_type: 'text' });
        loadAll();
    };

    const handleDeleteDoc = async (id) => {
        if (!confirm('Delete this document?')) return;
        await deleteDocument(id);
        loadAll();
    };

    return (
        <div className="fadeIn">
            <div className="page-header">
                <h1 className="page-title">Knowledge Base</h1>
                <p className="page-subtitle">Manage the information your chatbot uses to answer questions</p>
            </div>

            <div className="tabs">
                {[['faqs', 'FAQs'], ['documents', 'Documents']].map(([id, label]) => (
                    <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                        {label} ({id === 'faqs' ? faqs.length : docs.length})
                    </button>
                ))}
            </div>

            {/* FAQs Tab */}
            {tab === 'faqs' && (
                <div style={{ display: 'flex', gap: 24 }}>
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <span className="card-title">Frequently Asked Questions</span>
                            <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setForm({ question: '', answer: '', category: 'General', priority: 0 }); }}>+ Add FAQ</button>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {loading ? (
                                <div className="empty-state"><p>Loading...</p></div>
                            ) : faqs.length === 0 ? (
                                <div className="empty-state"><h3>No FAQs yet</h3><p>Add your first FAQ to help the chatbot answer questions accurately</p></div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Question</th><th>Category</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                                        <tbody>
                                            {faqs.map(f => (
                                                <tr key={f.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 500 }}>{f.question}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{f.answer.substring(0, 80)}...</div>
                                                    </td>
                                                    <td><span className="badge badge-primary">{f.category}</span></td>
                                                    <td>{f.priority}</td>
                                                    <td>
                                                        <div className={`toggle ${f.enabled ? 'active' : ''}`} onClick={() => handleToggleFAQ(f)}></div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button className="btn-icon" onClick={() => handleEditFAQ(f)} title="Edit">✎</button>
                                                            <button className="btn-icon" onClick={() => handleDeleteFAQ(f.id)} title="Delete" style={{ color: 'var(--danger)' }}>✕</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FAQ Form */}
                    <div className="card" style={{ width: 360, flexShrink: 0 }}>
                        <div className="card-header">
                            <span className="card-title">{editing ? 'Edit FAQ' : 'Add FAQ'}</span>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Question</label>
                                <input className="form-input" value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="What question will users ask?" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Answer</label>
                                <textarea className="form-textarea" value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="Provide a clear, helpful answer..." rows={4} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    {['General', 'Pricing', 'Support', 'Billing', 'Product', 'Shipping', 'Returns'].map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority (higher = matched first)</label>
                                <input className="form-input" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-primary" onClick={handleSaveFAQ}>{editing ? 'Update' : 'Save'} FAQ</button>
                                {editing && <button className="btn btn-secondary" onClick={() => { setEditing(null); setForm({ question: '', answer: '', category: 'General', priority: 0 }); }}>Cancel</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents Tab */}
            {tab === 'documents' && (
                <div style={{ display: 'flex', gap: 24 }}>
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <span className="card-title">Business Documents</span>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {docs.length === 0 ? (
                                <div className="empty-state"><h3>No documents yet</h3><p>Add documents, policies, or any business information</p></div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Title</th><th>Type</th><th>Added</th><th></th></tr></thead>
                                        <tbody>
                                            {docs.map(d => (
                                                <tr key={d.id}>
                                                    <td style={{ fontWeight: 500 }}>{d.title}</td>
                                                    <td><span className="badge badge-primary">{d.doc_type}</span></td>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(d.created_at).toLocaleDateString()}</td>
                                                    <td><button className="btn-icon" onClick={() => handleDeleteDoc(d.id)} style={{ color: 'var(--danger)' }}>✕</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ width: 360, flexShrink: 0 }}>
                        <div className="card-header"><span className="card-title">Add Document</span></div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input className="form-input" value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} placeholder="e.g. Return Policy" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Content</label>
                                <textarea className="form-textarea" value={docForm.content} onChange={e => setDocForm({ ...docForm, content: e.target.value })} placeholder="Paste your document content here..." rows={8} />
                            </div>
                            <button className="btn btn-primary" onClick={handleSaveDoc}>Save Document</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
