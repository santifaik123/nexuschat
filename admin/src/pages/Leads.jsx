import { useEffect, useState } from 'react';
import { deleteLead, getLeads, updateLeadStatus } from '../api.js';

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'archived'];

function csvCell(value) {
    let text = String(value ?? '').replace(/\r?\n/g, ' ');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

export default function Leads({ tenantId = 'default' }) {
    const [leads, setLeads] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const data = await getLeads({ limit: 100, tenantId, status: filter || undefined });
            setLeads(data.leads || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, [tenantId, filter]);

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este lead de NexusChat? Esta acción no elimina la copia principal de Neon.')) return;
        await deleteLead(id, tenantId);
        await load();
    };

    const handleStatus = async (id, status) => {
        await updateLeadStatus(id, status, tenantId);
        setLeads(current => current.map(lead => lead.id === id ? { ...lead, status } : lead));
    };

    const exportCSV = () => {
        const headers = ['Nombre', 'Email', 'Empresa', 'Tipo', 'Estado', 'Origen', 'Campaña', 'Ruta', 'Mensaje', 'Fecha'];
        const rows = leads.map(lead => [
            lead.name, lead.email, lead.company, lead.inquiry_type, lead.status,
            lead.source, lead.campaign_name, lead.landing_path, lead.message, lead.created_at,
        ]);
        const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `nexuschat-leads-${tenantId}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fadeIn">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Leads</h1>
                    <p className="page-subtitle">{total} contactos del formulario web y de conversaciones. Sin datos sensibles.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <select className="form-select" value={filter} onChange={event => setFilter(event.target.value)} aria-label="Filtrar por estado" style={{ width: 160 }}>
                        <option value="">Todos los estados</option>
                        {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                    {leads.length > 0 && <button className="btn btn-primary" onClick={exportCSV}>Exportar CSV</button>}
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div className="empty-state"><p>Cargando leads…</p></div>
                    ) : leads.length === 0 ? (
                        <div className="empty-state">
                            <h3>Aún no hay leads</h3>
                            <p>Los formularios de pagweb1 y las capturas del chatbot aparecerán aquí.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr><th>Contacto</th><th>Necesidad</th><th>Origen</th><th>Estado</th><th>Fecha</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {leads.map(lead => (
                                        <tr key={lead.id}>
                                            <td>
                                                <strong>{lead.name || '—'}</strong>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{lead.email || '—'}</div>
                                                {lead.company && <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{lead.company}</div>}
                                            </td>
                                            <td style={{ maxWidth: 360 }}>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{lead.inquiry_type || 'Consulta general'}</div>
                                                <div title={lead.message || ''}>{lead.message ? `${lead.message.slice(0, 180)}${lead.message.length > 180 ? '…' : ''}` : '—'}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-primary">{lead.source || 'nexus_chat'}</span>
                                                {lead.campaign_name && <div style={{ fontSize: 12, marginTop: 5 }}>{lead.campaign_name}</div>}
                                                {lead.landing_path && <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>{lead.landing_path}</div>}
                                            </td>
                                            <td>
                                                <select className="form-select" value={lead.status || 'new'} onChange={event => void handleStatus(lead.id, event.target.value)} style={{ width: 130 }}>
                                                    {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {new Date(lead.created_at).toLocaleDateString()}<br />
                                                {new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td><button className="btn-icon" onClick={() => void handleDelete(lead.id)} style={{ color: 'var(--danger)' }} aria-label="Eliminar lead">×</button></td>
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
