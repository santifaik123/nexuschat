import test from 'node:test';
import assert from 'node:assert/strict';

import { GroqProvider } from '../src/ai/providers/groq.js';

test('streams GPT-OSS 20B with the NexusChat production parameters', async () => {
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
            model: 'openai/gpt-oss-20b',
            temperature: 1,
            maxTokens: 2048,
            topP: 1,
            reasoningEffort: 'medium',
        },
    );

    assert.deepEqual(request, {
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: 'Hola' }],
        temperature: 1,
        max_completion_tokens: 2048,
        top_p: 1,
        stream: true,
        stop: null,
        reasoning_effort: 'medium',
        reasoning_format: 'hidden',
    });
    assert.equal(result.content, 'Hola desde Nuvi');
    assert.equal(result.model, 'openai/gpt-oss-20b');
    assert.equal(result.tokensUsed, 42);
});

test('keeps Qwen reasoning options compatible when selected manually', async () => {
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
        model: 'qwen/qwen3.6-27b',
        reasoningEffort: 'default',
    });

    assert.equal(request.reasoning_effort, 'default');
    assert.equal(request.reasoning_format, 'hidden');
});
