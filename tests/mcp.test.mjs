// Tests for the MCP endpoint at /mcp, through the real v2 client over HTTP.
//
//   node --test tests/mcp.test.mjs
//   MCP_URL=https://andrewyu.app/mcp node --test tests/mcp.test.mjs
//
// The same checks run twice: once as a 2025-era client (the initialize handshake,
// the SDK client's default) and once pinned to the 2026-07-28 revision
// (server/discover, no handshake). Then a few raw HTTP checks for the parts a
// client library hides: the body limit, JSON-RPC errors, CORS, and a browser GET.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { TOOLS } from '../src/lib/portfolio-tools.mjs';

const MCP_URL = process.env.MCP_URL ?? 'http://localhost:4321/mcp';

const ERAS = [
  { era: '2025 (initialize handshake)', options: {} },
  { era: '2026-07-28 (server/discover)', options: { versionNegotiation: { mode: { pin: '2026-07-28' } } } },
];

/** Parse the JSON a tool returned as text. */
const textJson = (result) => JSON.parse(result.content.find((c) => c.type === 'text').text);

for (const { era, options } of ERAS) {
  describe(`MCP over ${era}`, () => {
    let client;

    before(async () => {
      client = new Client({ name: 'portfolio-mcp-test', version: '1.0.0' }, options);
      await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
    });

    after(async () => {
      await client?.close();
    });

    test('connects and names the server', () => {
      assert.equal(client.getServerVersion()?.name, 'andrewyu-app');
      assert.ok(client.getServerCapabilities()?.tools, 'server advertises tools');
      const version = client.getNegotiatedProtocolVersion();
      assert.ok(version, 'a protocol version was negotiated');
      if (options.versionNegotiation) assert.equal(version, '2026-07-28');
    });

    test('lists exactly the three tools, with the names and descriptions from TOOLS', async () => {
      const { tools } = await client.listTools();
      assert.deepEqual(
        tools.map((t) => t.name).sort(),
        TOOLS.map((t) => t.name).sort(),
      );
      for (const def of TOOLS) {
        const listed = tools.find((t) => t.name === def.name);
        assert.equal(listed.description, def.description, `${def.name} description`);
        assert.deepEqual(listed.inputSchema, def.input_schema, `${def.name} input schema`);
        assert.equal(listed.annotations?.readOnlyHint, true, `${def.name} is marked read-only`);
        assert.equal(listed.annotations?.openWorldHint, false, `${def.name} reaches nothing outside the site`);
        assert.ok(listed.outputSchema, `${def.name} has an output schema`);
      }
    });

    let firstSlug;

    test('list_work returns every case study, as text and as structured content', async () => {
      const result = await client.callTool({ name: 'list_work', arguments: {} });
      assert.notEqual(result.isError, true);
      const data = textJson(result);
      assert.equal(typeof data.count, 'number');
      assert.equal(data.work.length, data.count);
      assert.deepEqual(result.structuredContent, data);
      for (const w of data.work) assert.match(w.url, /\/work\//);
      firstSlug = data.work[0]?.slug;
    });

    test('search_portfolio returns at most five results, each with a page URL', async () => {
      const result = await client.callTool({ name: 'search_portfolio', arguments: { query: 'Claude Code teaching' } });
      assert.notEqual(result.isError, true);
      const data = textJson(result);
      assert.ok(Array.isArray(data.results));
      assert.ok(data.results.length <= 5);
      for (const r of data.results) assert.match(r.url, /^https:\/\/andrewyu\.app/);
      assert.deepEqual(result.structuredContent, data);
    });

    test('get_case_study returns the full text of a real slug', async (t) => {
      if (!firstSlug) {
        t.skip('the index has no case studies yet (run node scripts/build-index.mjs after content lands)');
        return;
      }
      const result = await client.callTool({ name: 'get_case_study', arguments: { slug: firstSlug } });
      assert.notEqual(result.isError, true);
      const data = textJson(result);
      assert.equal(data.slug, firstSlug);
      assert.equal(typeof data.text, 'string');
      assert.deepEqual(result.structuredContent, data);
    });

    test('get_case_study with a bad slug is a tool error that lists the real slugs', async () => {
      const result = await client.callTool({ name: 'get_case_study', arguments: { slug: 'no-such-case-study' } });
      assert.equal(result.isError, true);
      const data = textJson(result);
      assert.match(data.error, /no-such-case-study/);
      assert.ok(Array.isArray(data.available));
    });

    test('arguments that break the schema are a tool error, and the tool never runs', async () => {
      const result = await client.callTool({ name: 'search_portfolio', arguments: {} });
      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /validation/i);
    });

    test('an unknown tool fails with JSON-RPC error -32602', async () => {
      await assert.rejects(
        client.callTool({ name: 'delete_everything', arguments: {} }),
        (err) => err.code === -32602 && /delete_everything/.test(err.message),
      );
    });
  });
}

describe('MCP endpoint over raw HTTP', () => {
  const post = (body, headers = {}) =>
    fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
      body,
    });

  test('a body over 100 KB is refused with 413 and a JSON-RPC error', async () => {
    const big = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { pad: 'x'.repeat(101 * 1024) } });
    const res = await post(big);
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.equal(body.jsonrpc, '2.0');
    assert.equal(body.error.code, -32600);
  });

  test('malformed JSON is a JSON-RPC parse error', async () => {
    const res = await post('{"jsonrpc": "2.0", "id": 1,');
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, -32700);
  });

  test('subscriptions/listen is refused: nothing here changes', async () => {
    const res = await post(JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'subscriptions/listen', params: {} }));
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.id, 9);
    assert.equal(body.error.code, -32601);
  });

  test('responses carry CORS headers for browser clients', async () => {
    const res = await post(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }), {
      Origin: 'https://example.com',
      'MCP-Protocol-Version': '2025-06-18',
    });
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    await res.body?.cancel();
  });

  test('a browser GET gets a short pointer to the connect page', async () => {
    const res = await fetch(MCP_URL, { headers: { Accept: 'text/html,application/xhtml+xml' } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /\/teaching\/connect/);
  });

  test('a protocol GET (event stream) is 405: there is no GET stream', async () => {
    const res = await fetch(MCP_URL, { headers: { Accept: 'text/event-stream' } });
    assert.equal(res.status, 405);
    await res.body?.cancel();
  });
});
