const API = '/api';

export async function fetchAPI(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

// Settings
export const getSettings = (tenantId = 'default') => fetchAPI(`/admin/settings?tenantId=${tenantId}`);
export const updateSettings = (settings, tenantId = 'default') => fetchAPI('/admin/settings', { method: 'PUT', body: { tenantId, settings } });

// Conversations
export const getConversations = (params = {}) => {
    const clean = { tenantId: 'default', ...params };
    Object.keys(clean).forEach(k => { if (clean[k] === undefined || clean[k] === '') delete clean[k]; });
    const q = new URLSearchParams(clean).toString();
    return fetchAPI(`/admin/conversations?${q}`);
};
export const getConversationMessages = (id) => fetchAPI(`/admin/conversations/${id}/messages`);

// Knowledge Base
export const getFAQs = (tenantId = 'default') => fetchAPI(`/knowledge/faqs?tenantId=${tenantId}`);
export const createFAQ = (data) => fetchAPI('/knowledge/faqs', { method: 'POST', body: { tenantId: 'default', ...data } });
export const updateFAQ = (id, data) => fetchAPI(`/knowledge/faqs/${id}`, { method: 'PUT', body: data });
export const deleteFAQ = (id) => fetchAPI(`/knowledge/faqs/${id}`, { method: 'DELETE' });

export const getDocuments = (tenantId = 'default') => fetchAPI(`/knowledge/documents?tenantId=${tenantId}`);
export const createDocument = (data) => fetchAPI('/knowledge/documents', { method: 'POST', body: { tenantId: 'default', ...data } });
export const updateDocument = (id, data) => fetchAPI(`/knowledge/documents/${id}`, { method: 'PUT', body: data });
export const deleteDocument = (id) => fetchAPI(`/knowledge/documents/${id}`, { method: 'DELETE' });

// Analytics
export const getAnalytics = (days = 7, tenantId = 'default') => fetchAPI(`/analytics/overview?tenantId=${tenantId}&days=${days}`);

// Leads
export const getLeads = (params = {}) => {
    const q = new URLSearchParams({ tenantId: 'default', ...params }).toString();
    return fetchAPI(`/admin/leads?${q}`);
};
export const deleteLead = (id) => fetchAPI(`/admin/leads/${id}`, { method: 'DELETE' });

// AI Providers
export const getProviders = () => fetchAPI('/admin/ai/providers');
