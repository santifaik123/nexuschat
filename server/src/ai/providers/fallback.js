import { AIProvider } from '../adapter.js';

const FALLBACK_RESPONSES = {
    greeting: [
        "Hello! Welcome! How can I assist you today?",
        "Hi there! I'm here to help. What can I do for you?",
        "Welcome! Feel free to ask me anything about our services."
    ],
    unknown: [
        "I appreciate your question! While I don't have a specific answer right now, I'd love to connect you with our support team who can help. Would you like their contact information?",
        "That's a great question! I want to make sure you get the most accurate answer. Let me suggest reaching out to our support team for detailed assistance.",
        "I'm not quite sure about that one. To get you the best possible answer, I'd recommend contacting our team directly. Want me to provide their details?"
    ],
    farewell: [
        "Thank you for chatting with us! Have a wonderful day! 😊",
        "Glad I could help! Don't hesitate to reach out if you need anything else.",
        "Thanks for stopping by! We're always here if you need us."
    ],
    thanks: [
        "You're welcome! Is there anything else I can help with?",
        "Happy to help! Let me know if you have any other questions.",
        "My pleasure! Feel free to ask if you need anything else."
    ]
};

const INTENT_PATTERNS = {
    greeting: /\b(hi|hello|hey|good\s*(morning|afternoon|evening)|hola|greetings)\b/i,
    farewell: /\b(bye|goodbye|see\s*you|thanks?\s*bye|adios|later)\b/i,
    thanks: /\b(thank|thanks|thx|ty|appreciate|grateful)\b/i,
    pricing: /\b(price|pricing|cost|plan|subscription|pay|fee|charge)\b/i,
    support: /\b(help|support|issue|problem|error|bug|broken|not\s*working)\b/i,
    contact: /\b(contact|email|phone|call|reach|talk\s*to|human|agent|person)\b/i,
    hours: /\b(hours|open|close|schedule|when|available|business\s*hours)\b/i,
};

export class FallbackProvider extends AIProvider {
    constructor() {
        super('fallback');
    }

    isAvailable() {
        return true; // Always available
    }

    async generateResponse(messages, options = {}) {
        const lastMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastMessage) {
            return this._respond('unknown');
        }

        const text = lastMessage.content.toLowerCase();

        // Detect intent
        for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
            if (pattern.test(text)) {
                if (FALLBACK_RESPONSES[intent]) {
                    return this._respond(intent);
                }
                // For specific intents without direct responses, guide the user
                return {
                    content: this._getIntentGuidance(intent),
                    model: 'fallback-rules',
                    confidence: 0.5,
                    source: 'fallback'
                };
            }
        }

        return this._respond('unknown');
    }

    _respond(category) {
        const responses = FALLBACK_RESPONSES[category] || FALLBACK_RESPONSES.unknown;
        const content = responses[Math.floor(Math.random() * responses.length)];
        return {
            content,
            model: 'fallback-rules',
            confidence: 0.4,
            source: 'fallback'
        };
    }

    _getIntentGuidance(intent) {
        const guidance = {
            pricing: "For detailed pricing information, I'd recommend checking our pricing page or speaking with our sales team. Would you like me to provide their contact details?",
            support: "I understand you need help! Our support team is ready to assist you. You can reach them via email or continue chatting here, and I'll do my best to help.",
            contact: "You can reach our team at support@example.com or call us at +1 (555) 123-4567. Our hours are Monday-Friday, 9 AM - 6 PM EST.",
            hours: "Our business hours are Monday through Friday, 9 AM to 6 PM EST. We're happy to help during those times!"
        };
        return guidance[intent] || FALLBACK_RESPONSES.unknown[0];
    }
}
