import test from 'node:test';
import assert from 'node:assert/strict';

import { GroqProvider } from '../src/ai/providers/groq.js';

test('streams Qwen 3.6 with the NexusChat production parameters', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const provider = new GroqProvider();
    let request;

    provider.client = {
        chat: {
            completions: {
                create: async (payload) => {
                    request = payload;
                    return (async function* stream() {
                        yield { model: payload.model, choices: [{ delta: { content: 'Hola' } }] };
                        yield { model: payload.model, choices: [{ delta: { content: ' desde Nuvi' } }], x_groq: { usage: { total_tokens: 42 } } };
                    })();
                },
            },
        },
    };

    const result = await provider.generateResponse(
        [{ role: 'user', content: 'Hola' }],
        {
            model: 'qwen/qwen3.6-27b',
            temperature: 0.6,
            maxTokens: 2048,
            topP: 0.95,
            reasoningEffort: 'default',
        },
    );

    assert.deepEqual(request, {
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: 'Hola' }],
        temperature: 0.6,
        max_completion_tokens: 2048,
        top_p: 0.95,
        stream: true,
        stop: null,
        reasoning_effort: 'default',
        reasoning_format: 'hidden',
    });
    assert.equal(result.content, 'Hola desde Nuvi');
    assert.equal(result.model, 'qwen/qwen3.6-27b');
    assert.equal(result.tokensUsed, 42);
});

test('does not send Qwen-only reasoning options to other Groq models', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const provider = new GroqProvider();
    let request;

    provider.client = {
        chat: {
            completions: {
                create: async (payload) => {
                    request = payload;
                    return (async function* stream() {
                        yield { choices: [{ delta: { content: 'OK' } }] };
                    })();
                },
            },
        },
    };

    await provider.generateResponse([{ role: 'user', content: 'Hola' }], {
        model: 'llama-3.1-8b-instant',
    });

    assert.equal(request.reasoning_effort, undefined);
    assert.equal(request.reasoning_format, undefined);
});
