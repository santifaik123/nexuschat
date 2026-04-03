/*! NexusChat Embeddable Widget v1.0.0 | https://nexuschat.dev */
(function () {
    'use strict';

    const DEFAULT_CONFIG = {
        tenantId: 'default',
        serverUrl: (function () {
            // Auto-detect: use the origin of the script tag, fallback to current page origin
            try {
                const scripts = document.querySelectorAll('script[src*="nexuschat"]');
                if (scripts.length > 0) {
                    const url = new URL(scripts[scripts.length - 1].src);
                    return url.origin;
                }
            } catch (e) {}
            return window.location.origin;
        })(),
        position: 'bottom-right',
        primaryColor: '#4F46E5',
        secondaryColor: '#7C3AED',
        name: 'NexusChat',
        welcomeMessage: '👋 Hi there! How can I help you today?',
        placeholder: 'Type your message...',
        theme: 'light',
        borderRadius: 16,
        language: 'en',
        quickReplies: ['Pricing', 'How it works', 'Contact support', 'FAQs'],
        logoUrl: '',
        showBranding: true,
        zIndex: 999999,
    };

    const TRANSLATIONS = {
        en: { placeholder: 'Type your message...', powered: 'Powered by', send: 'Send', close: 'Close', minimize: 'Minimize', restart: 'New conversation', typing: 'is typing', leadTitle: "We'd love to stay in touch!", leadName: 'Your name', leadEmail: 'Your email', leadSubmit: 'Continue', leadSkip: 'Skip' },
        es: { placeholder: 'Escribe tu mensaje...', powered: 'Impulsado por', send: 'Enviar', close: 'Cerrar', minimize: 'Minimizar', restart: 'Nueva conversación', typing: 'está escribiendo', leadTitle: '¡Nos encantaría mantenernos en contacto!', leadName: 'Tu nombre', leadEmail: 'Tu email', leadSubmit: 'Continuar', leadSkip: 'Omitir' },
        pt: { placeholder: 'Digite sua mensagem...', powered: 'Desenvolvido por', send: 'Enviar', close: 'Fechar', minimize: 'Minimizar', restart: 'Nova conversa', typing: 'está digitando', leadTitle: 'Adoraríamos manter contato!', leadName: 'Seu nome', leadEmail: 'Seu email', leadSubmit: 'Continuar', leadSkip: 'Pular' },
    };

    class NexusChat {
        constructor(config = {}) {
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.isOpen = false;
            this.sessionId = this._getSessionId();
            this.conversationId = null;
            this.messages = [];
            this.isTyping = false;
            this.t = TRANSLATIONS[this.config.language] || TRANSLATIONS.en;
            this.leadCaptured = false;

            this._init();
        }

        _getSessionId() {
            let sid = sessionStorage.getItem('nexuschat_session');
            if (!sid) {
                sid = 'nc_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
                sessionStorage.setItem('nexuschat_session', sid);
            }
            return sid;
        }

        async _init() {
            // Try to load remote config
            try {
                const resp = await fetch(`${this.config.serverUrl}/api/config/${this.config.tenantId}`);
                if (resp.ok) {
                    const remote = await resp.json();
                    if (remote.primary_color) this.config.primaryColor = remote.primary_color;
                    if (remote.secondary_color) this.config.secondaryColor = remote.secondary_color;
                    if (remote.name) this.config.name = remote.name;
                    if (remote.welcome_message) this.config.welcomeMessage = remote.welcome_message;
                    if (remote.placeholder) this.config.placeholder = remote.placeholder;
                    if (remote.theme) this.config.theme = remote.theme;
                    if (remote.border_radius) this.config.borderRadius = parseInt(remote.border_radius);
                    if (remote.position) this.config.position = remote.position;
                    if (remote.language) { this.config.language = remote.language; this.t = TRANSLATIONS[remote.language] || TRANSLATIONS.en; }
                    if (remote.quick_replies) this.config.quickReplies = remote.quick_replies;
                    if (remote.logo_url) this.config.logoUrl = remote.logo_url;
                    if (remote.proactive_delay) this.config.proactiveDelay = parseInt(remote.proactive_delay);
                    if (remote.proactive_message) this.config.proactiveMessage = remote.proactive_message;
                }
            } catch (e) { /* Use defaults */ }

            this._createWidget();
            this._attachEvents();

            // Proactive message
            if (this.config.proactiveDelay > 0 && this.config.proactiveMessage && !sessionStorage.getItem('nexuschat_proactive_shown')) {
                setTimeout(() => {
                    if (!this.isOpen) {
                        this.open();
                        this._addBotMessage(this.config.proactiveMessage);
                        sessionStorage.setItem('nexuschat_proactive_shown', '1');
                    }
                }, this.config.proactiveDelay * 1000);
            }
        }

        _createWidget() {
            // Create container with shadow DOM
            this.container = document.createElement('div');
            this.container.id = 'nexuschat-widget';
            this.shadow = this.container.attachShadow({ mode: 'open' });

            const style = document.createElement('style');
            style.textContent = this._getStyles();
            this.shadow.appendChild(style);

            const wrapper = document.createElement('div');
            wrapper.className = `nc-wrapper nc-${this.config.position} nc-theme-${this.config.theme}`;
            wrapper.innerHTML = this._getHTML();
            this.shadow.appendChild(wrapper);

            document.body.appendChild(this.container);

            // Cache DOM refs
            this.els = {
                fab: this.shadow.querySelector('.nc-fab'),
                window: this.shadow.querySelector('.nc-window'),
                messages: this.shadow.querySelector('.nc-messages'),
                input: this.shadow.querySelector('.nc-input-field'),
                sendBtn: this.shadow.querySelector('.nc-send-btn'),
                closeBtn: this.shadow.querySelector('.nc-close-btn'),
                minimizeBtn: this.shadow.querySelector('.nc-minimize-btn'),
                restartBtn: this.shadow.querySelector('.nc-restart-btn'),
                quickReplies: this.shadow.querySelector('.nc-quick-replies'),
                typingIndicator: this.shadow.querySelector('.nc-typing'),
                leadForm: this.shadow.querySelector('.nc-lead-form'),
                badge: this.shadow.querySelector('.nc-fab-badge'),
            };

            // Add welcome message
            this._addBotMessage(this.config.welcomeMessage);
        }

        _getHTML() {
            const quickReplies = this.config.quickReplies.map(q =>
                `<button class="nc-quick-reply" data-message="${q}">${q}</button>`
            ).join('');

            const logoHtml = this.config.logoUrl
                ? `<img src="${this.config.logoUrl}" class="nc-header-logo" alt="${this.config.name}"/>`
                : `<div class="nc-header-avatar">${this.config.name.charAt(0).toUpperCase()}</div>`;

            return `
        <!-- FAB Button -->
        <button class="nc-fab" aria-label="Open chat">
          <svg class="nc-fab-icon nc-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <svg class="nc-fab-icon nc-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span class="nc-fab-badge" style="display:none">1</span>
        </button>

        <!-- Chat Window -->
        <div class="nc-window" aria-hidden="true">
          <!-- Header -->
          <div class="nc-header">
            <div class="nc-header-left">
              ${logoHtml}
              <div class="nc-header-info">
                <span class="nc-header-name">${this.config.name}</span>
                <span class="nc-header-status"><span class="nc-status-dot"></span> Online</span>
              </div>
            </div>
            <div class="nc-header-actions">
              <button class="nc-restart-btn" title="${this.t.restart}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </button>
              <button class="nc-minimize-btn" title="${this.t.minimize}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button class="nc-close-btn" title="${this.t.close}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div class="nc-messages">
            <div class="nc-typing" style="display:none">
              <div class="nc-msg nc-msg-bot">
                <div class="nc-msg-avatar">${this.config.name.charAt(0)}</div>
                <div class="nc-msg-bubble nc-typing-bubble">
                  <div class="nc-typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Replies -->
          <div class="nc-quick-replies">${quickReplies}</div>

          <!-- Lead Capture Form -->
          <div class="nc-lead-form" style="display:none">
            <div class="nc-lead-content">
              <p class="nc-lead-title">${this.t.leadTitle}</p>
              <input type="text" class="nc-lead-name" placeholder="${this.t.leadName}"/>
              <input type="email" class="nc-lead-email" placeholder="${this.t.leadEmail}"/>
              <div class="nc-lead-actions">
                <button class="nc-lead-submit">${this.t.leadSubmit}</button>
                <button class="nc-lead-skip">${this.t.leadSkip}</button>
              </div>
            </div>
          </div>

          <!-- Input -->
          <div class="nc-input-area">
            <div class="nc-input-wrapper">
              <input type="text" class="nc-input-field" placeholder="${this.config.placeholder || this.t.placeholder}" maxlength="2000" autocomplete="off"/>
              <button class="nc-send-btn" title="${this.t.send}" disabled>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>

          <!-- Branding -->
          ${this.config.showBranding ? `<div class="nc-branding">${this.t.powered} <strong>NexusChat</strong></div>` : ''}
        </div>
      `;
        }

        _getStyles() {
            const c1 = this.config.primaryColor;
            const c2 = this.config.secondaryColor;
            const br = this.config.borderRadius;
            const isDark = this.config.theme === 'dark';

            return `
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :host {
          --nc-primary: ${c1};
          --nc-secondary: ${c2};
          --nc-radius: ${br}px;
          --nc-bg: ${isDark ? '#1a1a2e' : '#ffffff'};
          --nc-bg-subtle: ${isDark ? '#16213e' : '#f8fafc'};
          --nc-text: ${isDark ? '#e2e8f0' : '#1e293b'};
          --nc-text-muted: ${isDark ? '#94a3b8' : '#64748b'};
          --nc-border: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
          --nc-shadow: ${isDark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.15)'};
          --nc-user-bubble: linear-gradient(135deg, var(--nc-primary), var(--nc-secondary));
          --nc-bot-bubble: ${isDark ? '#1e293b' : '#f1f5f9'};
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: var(--nc-text);
        }

        .nc-wrapper {
          position: fixed;
          z-index: ${this.config.zIndex};
        }
        .nc-bottom-right { bottom: 20px; right: 20px; }
        .nc-bottom-left { bottom: 20px; left: 20px; }

        /* ============= FAB ============= */
        .nc-fab {
          width: 60px; height: 60px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--nc-primary), var(--nc-secondary));
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(79,70,229,0.4);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          outline: none;
        }
        .nc-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 40px rgba(79,70,229,0.5);
        }
        .nc-fab:active { transform: scale(0.95); }
        .nc-fab-icon { width: 28px; height: 28px; transition: all 0.3s ease; }
        .nc-icon-close { display: none; }
        .nc-fab.nc-open .nc-icon-chat { display: none; }
        .nc-fab.nc-open .nc-icon-close { display: block; }
        .nc-fab-badge {
          position: absolute; top: -4px; right: -4px;
          background: #ef4444; color: white;
          width: 20px; height: 20px;
          border-radius: 50%; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          animation: nc-bounce 0.5s ease;
        }
        .nc-fab::after {
          content: '';
          position: absolute;
          width: 100%; height: 100%;
          border-radius: 50%;
          background: inherit;
          opacity: 0;
          animation: nc-pulse 2s ease-out infinite;
        }

        @keyframes nc-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes nc-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }

        /* ============= Chat Window ============= */
        .nc-window {
          position: absolute;
          bottom: 76px;
          width: 400px;
          height: 600px;
          max-height: calc(100vh - 120px);
          background: var(--nc-bg);
          border-radius: var(--nc-radius);
          box-shadow: var(--nc-shadow);
          border: 1px solid var(--nc-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .nc-bottom-right .nc-window { right: 0; }
        .nc-bottom-left .nc-window { left: 0; }
        .nc-window.nc-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }

        /* ============= Header ============= */
        .nc-header {
          background: linear-gradient(135deg, var(--nc-primary), var(--nc-secondary));
          color: white;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .nc-header-left { display: flex; align-items: center; gap: 12px; }
        .nc-header-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 16px;
        }
        .nc-header-logo { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .nc-header-info { display: flex; flex-direction: column; }
        .nc-header-name { font-weight: 600; font-size: 15px; }
        .nc-header-status { font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 4px; }
        .nc-status-dot { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; display: inline-block; }
        .nc-header-actions { display: flex; gap: 4px; }
        .nc-header-actions button {
          background: rgba(255,255,255,0.15);
          border: none; border-radius: 8px;
          color: white; cursor: pointer;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .nc-header-actions button:hover { background: rgba(255,255,255,0.25); }

        /* ============= Messages ============= */
        .nc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }
        .nc-messages::-webkit-scrollbar { width: 4px; }
        .nc-messages::-webkit-scrollbar-track { background: transparent; }
        .nc-messages::-webkit-scrollbar-thumb { background: var(--nc-border); border-radius: 4px; }

        .nc-msg { display: flex; gap: 8px; max-width: 85%; animation: nc-msg-in 0.3s ease; }
        .nc-msg-user { align-self: flex-end; flex-direction: row-reverse; }
        .nc-msg-bot { align-self: flex-start; }

        .nc-msg-avatar {
          width: 30px; height: 30px; min-width: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--nc-primary), var(--nc-secondary));
          color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
        }
        .nc-msg-user .nc-msg-avatar { display: none; }

        .nc-msg-bubble {
          padding: 10px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .nc-msg-user .nc-msg-bubble {
          background: var(--nc-user-bubble);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .nc-msg-bot .nc-msg-bubble {
          background: var(--nc-bot-bubble);
          color: var(--nc-text);
          border-bottom-left-radius: 4px;
        }

        .nc-msg-time {
          font-size: 10px;
          color: var(--nc-text-muted);
          margin-top: 4px;
          text-align: right;
        }
        .nc-msg-bot .nc-msg-time { text-align: left; margin-left: 38px; }

        @keyframes nc-msg-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ============= Typing Indicator ============= */
        .nc-typing-bubble { padding: 12px 16px !important; }
        .nc-typing-dots { display: flex; gap: 4px; align-items: center; }
        .nc-typing-dots span {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--nc-text-muted);
          animation: nc-typing-bounce 1.4s infinite;
        }
        .nc-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .nc-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes nc-typing-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* ============= Quick Replies ============= */
        .nc-quick-replies {
          padding: 8px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid var(--nc-border);
          background: var(--nc-bg-subtle);
        }
        .nc-quick-reply {
          background: transparent;
          border: 1.5px solid var(--nc-primary);
          color: var(--nc-primary);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
        }
        .nc-quick-reply:hover {
          background: var(--nc-primary);
          color: white;
          transform: translateY(-1px);
        }

        /* ============= Input Area ============= */
        .nc-input-area {
          padding: 12px 16px;
          border-top: 1px solid var(--nc-border);
          background: var(--nc-bg);
          flex-shrink: 0;
        }
        .nc-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--nc-bg-subtle);
          border: 1.5px solid var(--nc-border);
          border-radius: 24px;
          padding: 4px 4px 4px 16px;
          transition: border-color 0.2s;
        }
        .nc-input-wrapper:focus-within { border-color: var(--nc-primary); }

        .nc-input-field {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          font-family: inherit;
          color: var(--nc-text);
          outline: none;
          min-width: 0;
        }
        .nc-input-field::placeholder { color: var(--nc-text-muted); }

        .nc-send-btn {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--nc-primary), var(--nc-secondary));
          color: white;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .nc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .nc-send-btn:not(:disabled):hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(79,70,229,0.4); }

        /* ============= Lead Form ============= */
        .nc-lead-form {
          padding: 16px;
          background: var(--nc-bg-subtle);
          border-top: 1px solid var(--nc-border);
        }
        .nc-lead-content { display: flex; flex-direction: column; gap: 10px; }
        .nc-lead-title { font-weight: 600; font-size: 14px; color: var(--nc-text); text-align: center; }
        .nc-lead-content input {
          border: 1.5px solid var(--nc-border);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: inherit;
          background: var(--nc-bg);
          color: var(--nc-text);
          outline: none;
          transition: border-color 0.2s;
        }
        .nc-lead-content input:focus { border-color: var(--nc-primary); }
        .nc-lead-actions { display: flex; gap: 8px; }
        .nc-lead-submit {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--nc-primary), var(--nc-secondary));
          color: white;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s;
        }
        .nc-lead-submit:hover { opacity: 0.9; }
        .nc-lead-skip {
          padding: 10px 16px;
          border: 1.5px solid var(--nc-border);
          border-radius: 10px;
          background: transparent;
          color: var(--nc-text-muted);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }
        .nc-lead-skip:hover { border-color: var(--nc-text-muted); }

        /* ============= Message Footer (time + feedback) ============= */
        .nc-msg-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
          min-height: 20px;
        }
        .nc-feedback {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .nc-msg-bot:hover .nc-feedback { opacity: 1; }
        .nc-feedback-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 13px;
          padding: 0 2px;
          transition: transform 0.2s;
          line-height: 1;
        }
        .nc-feedback-btn:hover { transform: scale(1.2); }

        /* ============= Inline Suggestions ============= */
        .nc-inline-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .nc-inline-suggest {
          background: transparent;
          border: 1.5px solid var(--nc-primary);
          color: var(--nc-primary);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
        }
        .nc-inline-suggest:hover {
          background: var(--nc-primary);
          color: white;
          transform: translateY(-1px);
        }

        /* ============= Rich Formatting ============= */
        .nc-msg-header {
          font-weight: 700;
          font-size: 11px;
          color: var(--nc-primary);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin: 10px 0 4px;
        }
        .nc-msg-header:first-child { margin-top: 0; }

        .nc-callout {
          background: rgba(79,70,229,0.08);
          border-left: 3px solid var(--nc-primary);
          padding: 8px 12px;
          border-radius: 0 8px 8px 0;
          margin: 6px 0;
          font-size: 13px;
        }

        .nc-divider {
          border: none;
          border-top: 1px solid var(--nc-border);
          margin: 8px 0;
        }

        .nc-numbered-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 6px 0;
        }
        .nc-num-item {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .nc-num {
          background: var(--nc-primary);
          color: white;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .nc-bullet-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin: 6px 0;
        }
        .nc-bullet-item {
          display: flex;
          gap: 6px;
          align-items: flex-start;
        }
        .nc-bullet-dot {
          color: var(--nc-primary);
          font-weight: 700;
          flex-shrink: 0;
          font-size: 15px;
          line-height: 1.3;
        }

        .nc-price {
          font-weight: 700;
          color: var(--nc-primary);
        }

        .nc-link {
          color: var(--nc-primary);
          text-decoration: underline;
          word-break: break-all;
        }

        .nc-cta-btn {
          display: inline-block;
          background: linear-gradient(135deg, var(--nc-primary), var(--nc-secondary));
          color: white !important;
          text-decoration: none !important;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin: 8px 0 4px;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .nc-cta-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        /* ============= Branding ============= */
        .nc-branding {
          text-align: center;
          padding: 6px;
          font-size: 11px;
          color: var(--nc-text-muted);
          background: var(--nc-bg);
          border-top: 1px solid var(--nc-border);
          flex-shrink: 0;
        }
        .nc-branding strong { color: var(--nc-primary); }

        /* ============= Mobile ============= */
        @media (max-width: 480px) {
          .nc-window {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            border-radius: 0 !important;
            position: fixed !important;
          }
          .nc-window.nc-visible ~ .nc-fab { display: none; }
        }
      `;
        }

        _attachEvents() {
            this.els.fab.addEventListener('click', () => this.toggle());
            this.els.closeBtn.addEventListener('click', () => this.close());
            this.els.minimizeBtn.addEventListener('click', () => this.close());
            this.els.restartBtn.addEventListener('click', () => this._restart());

            this.els.input.addEventListener('input', () => {
                this.els.sendBtn.disabled = !this.els.input.value.trim();
            });

            this.els.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && this.els.input.value.trim()) {
                    e.preventDefault();
                    this._sendMessage();
                }
            });

            this.els.sendBtn.addEventListener('click', () => this._sendMessage());

            // Quick replies
            this.shadow.querySelectorAll('.nc-quick-reply').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._sendMessage(btn.dataset.message);
                    this.els.quickReplies.style.display = 'none';
                });
            });

            // Lead form
            const leadSubmit = this.shadow.querySelector('.nc-lead-submit');
            const leadSkip = this.shadow.querySelector('.nc-lead-skip');
            if (leadSubmit) leadSubmit.addEventListener('click', () => this._submitLead());
            if (leadSkip) leadSkip.addEventListener('click', () => this._hideLead());
        }

        toggle() {
            this.isOpen ? this.close() : this.open();
        }

        open() {
            this.isOpen = true;
            this.els.window.classList.add('nc-visible');
            this.els.window.setAttribute('aria-hidden', 'false');
            this.els.fab.classList.add('nc-open');
            this.els.badge.style.display = 'none';
            setTimeout(() => this.els.input.focus(), 350);
        }

        close() {
            this.isOpen = false;
            this.els.window.classList.remove('nc-visible');
            this.els.window.setAttribute('aria-hidden', 'true');
            this.els.fab.classList.remove('nc-open');
        }

        async _sendMessage(text) {
            const msg = text || this.els.input.value.trim();
            if (!msg || this.isTyping) return;

            // Add user message to UI
            this._addUserMessage(msg);
            this.els.input.value = '';
            this.els.sendBtn.disabled = true;

            // Show typing
            this._showTyping();

            try {
                const resp = await fetch(`${this.config.serverUrl}/api/chat/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tenantId: this.config.tenantId,
                        sessionId: this.sessionId,
                        message: msg,
                    })
                });

                const data = await resp.json();
                this._hideTyping();

                if (resp.ok) {
                    this.conversationId = data.conversationId;
                    this._addBotMessage(data.message, data.suggestions || []);

                    // Lead capture
                    if (data.shouldCaptureLead && !this.leadCaptured) {
                        this._showLead();
                    }
                } else {
                    this._addBotMessage(data.message || "I'm having trouble right now. Please try again.");
                }
            } catch (err) {
                this._hideTyping();
                this._addBotMessage("I'm sorry, I can't connect to the server right now. Please try again later.");
            }
        }

        _addUserMessage(text) {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const el = document.createElement('div');
            el.className = 'nc-msg nc-msg-user';
            el.innerHTML = `
        <div class="nc-msg-content">
          <div class="nc-msg-bubble">${this._escapeHtml(text)}</div>
          <div class="nc-msg-time">${time}</div>
        </div>
      `;
            this.els.messages.insertBefore(el, this.els.typingIndicator);
            this._scrollToBottom();
        }

        _addBotMessage(text, suggestions = []) {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const avatar = this.config.name.charAt(0).toUpperCase();
            const el = document.createElement('div');
            el.className = 'nc-msg nc-msg-bot';

            const suggestionsHtml = suggestions.length > 0
                ? `<div class="nc-inline-suggestions">${suggestions.map(s =>
                    `<button class="nc-inline-suggest">${s}</button>`).join('')}</div>`
                : '';

            el.innerHTML = `
        <div class="nc-msg-avatar">${avatar}</div>
        <div class="nc-msg-content">
          <div class="nc-msg-bubble">${this._formatMessage(text)}</div>
          ${suggestionsHtml}
          <div class="nc-msg-footer">
            <span class="nc-msg-time">${time}</span>
            <div class="nc-feedback">
              <button class="nc-feedback-btn" data-rating="up" title="Útil">👍</button>
              <button class="nc-feedback-btn" data-rating="down" title="No útil">👎</button>
            </div>
          </div>
        </div>
      `;

            // Feedback buttons
            el.querySelectorAll('.nc-feedback-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._sendFeedback(btn.dataset.rating);
                    el.querySelectorAll('.nc-feedback-btn').forEach(b => b.style.opacity = '0.3');
                    btn.style.opacity = '1';
                    btn.style.transform = 'scale(1.3)';
                });
            });

            // Inline suggestion clicks
            el.querySelectorAll('.nc-inline-suggest').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._sendMessage(btn.textContent);
                    el.querySelector('.nc-inline-suggestions').remove();
                });
            });

            this.els.messages.insertBefore(el, this.els.typingIndicator);
            this._scrollToBottom();
        }

        async _sendFeedback(rating) {
            if (!this.conversationId) return;
            try {
                await fetch(`${this.config.serverUrl}/api/chat/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId: this.conversationId, rating })
                });
            } catch (e) { /* silently fail */ }
        }

        _showTyping() {
            this.isTyping = true;
            this.els.typingIndicator.style.display = 'block';
            this._scrollToBottom();
        }

        _hideTyping() {
            this.isTyping = false;
            this.els.typingIndicator.style.display = 'none';
        }

        _showLead() {
            this.els.leadForm.style.display = 'block';
        }

        _hideLead() {
            this.els.leadForm.style.display = 'none';
            this.leadCaptured = true;
        }

        async _submitLead() {
            const name = this.shadow.querySelector('.nc-lead-name').value.trim();
            const email = this.shadow.querySelector('.nc-lead-email').value.trim();

            if (!email) return;

            try {
                await fetch(`${this.config.serverUrl}/api/chat/lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tenantId: this.config.tenantId,
                        conversationId: this.conversationId,
                        name, email
                    })
                });
            } catch (e) { /* silently fail */ }

            this._hideLead();
            this._addBotMessage(`Thanks${name ? ', ' + name : ''}! I've saved your info. How else can I help?`);
        }

        _restart() {
            // Clear messages (except typing indicator)
            const msgs = this.els.messages.querySelectorAll('.nc-msg:not(.nc-typing .nc-msg)');
            msgs.forEach(m => m.remove());

            this.sessionId = 'nc_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
            sessionStorage.setItem('nexuschat_session', this.sessionId);
            this.conversationId = null;
            this.leadCaptured = false;
            this.els.quickReplies.style.display = 'flex';
            this.els.leadForm.style.display = 'none';

            this._addBotMessage(this.config.welcomeMessage);
        }

        _scrollToBottom() {
            requestAnimationFrame(() => {
                this.els.messages.scrollTop = this.els.messages.scrollHeight;
            });
        }

        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        _formatMessage(text) {
            let html = this._escapeHtml(text);

            // CTA buttons [CTA: label | url]
            html = html.replace(/\[CTA:\s*([^|]+)\|\s*([^\]]+)\]/gi, (_, label, url) =>
                `<a href="${url.trim()}" target="_blank" rel="noopener" class="nc-cta-btn">${label.trim()} →</a>`
            );

            // Headers ### Title
            html = html.replace(/^###\s+(.+)$/gm,
                '<div class="nc-msg-header">$1</div>'
            );

            // Callout > text
            html = html.replace(/^&gt;\s+(.+)$/gm,
                '<div class="nc-callout">$1</div>'
            );

            // Bold and italic
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

            // Divider ---
            html = html.replace(/^---$/gm, '<hr class="nc-divider"/>');

            // Numbered lists (consecutive 1. 2. 3. lines)
            html = html.replace(/((?:^\d+\.\s+.+\n?)+)/gm, (block) => {
                const items = block.trim().split('\n').map((line, i) =>
                    line.replace(/^\d+\.\s+/, '').trim()
                ).filter(Boolean).map((item, i) =>
                    `<div class="nc-num-item"><span class="nc-num">${i + 1}</span><span>${item}</span></div>`
                ).join('');
                return `<div class="nc-numbered-list">${items}</div>`;
            });

            // Bullet points (consecutive - lines)
            html = html.replace(/((?:^[-•]\s+.+\n?)+)/gm, (block) => {
                const items = block.trim().split('\n').map(line =>
                    line.replace(/^[-•]\s+/, '').trim()
                ).filter(Boolean).map(item =>
                    `<div class="nc-bullet-item"><span class="nc-bullet-dot">›</span><span>${item}</span></div>`
                ).join('');
                return `<div class="nc-bullet-list">${items}</div>`;
            });

            // Auto-link URLs
            html = html.replace(/(https?:\/\/[^\s<"]+)/g,
                '<a href="$1" target="_blank" rel="noopener" class="nc-link">$1</a>'
            );

            // Highlight prices
            html = html.replace(/(\$[\d.,]+(?:\s*CLP)?)/g,
                '<span class="nc-price">$1</span>'
            );

            // Line breaks
            html = html.replace(/\n/g, '<br>');

            return html;
        }
    }

    // Auto-initialize if config exists
    if (window.NexusChatConfig) {
        window.NexusChatWidget = new NexusChat(window.NexusChatConfig);
    }

    // API
    window.NexusChat = NexusChat;
})();
