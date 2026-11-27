/**
 * The portfolio as an MCP server.
 *
 * This file wraps the three plain tool functions in src/lib/portfolio-tools.mjs
 * (names, descriptions, and input schemas come from TOOLS, unchanged) in an MCP
 * server from @modelcontextprotocol/server v2, and serves it over stateless
 * Streamable HTTP with the SDK's web-standard handler: Request in, Response out.
 *
 * Stateless by construction. createMcpHandler builds a fresh McpServer for every
 * request, the tools read from an index that is bundled at build time, and
 * nothing is written anywhere. 2026-07-28 clients are served directly; 2025-era
 * clients (initialize handshake) are served by the SDK's stateless legacy leg.
 *
 * Around the SDK handler, handleMcpRequest adds what a public, read-only endpoint
 * needs: CORS for browser clients, a 100 KB body limit, a refusal of
 * subscriptions/listen (nothing here ever changes, so there is nothing to listen
 * for, and a serverless function should not hold a stream open), and a short
 * human-readable answer for a plain browser GET.
 */
import { createMcpHandler, fromJsonSchema, McpServer } from '@modelcontextprotocol/server';
import { TOOLS, createTools, runTool } from '../portfolio-tools.mjs';
import index from '../../data/generated/portfolio-index.json';

export const MAX_BODY_BYTES = 100 * 1024;
const SITE = 'https://andrewyu.app';
const CONNECT_PAGE = `${SITE}/teaching/connect`;

const SERVER_INFO = { name: 'andrewyu-app', title: "Andrew Yu's portfolio", version: '1.0.0' };
const INSTRUCTIONS =
  "Read-only tools over Andrew Yu's published portfolio: case studies, lessons, writing, and his career timeline. " +
  'Start with search_portfolio or list_work, then get_case_study for the full text of one piece of work. ' +
  'Every result carries the URL of the page it came from; cite it.';

/** Short human titles for clients that show one. Names and descriptions stay exactly as TOOLS has them. */
const TITLES: Record<string, string> = {
  search_portfolio: 'Search the portfolio',
  get_case_study: 'Read one case study',
  list_work: 'List the work',
};

const str = { type: 'string' };
/** What each tool returns, so clients can read structuredContent without guessing. */
const OUTPUT_SCHEMAS: Record<string, Record<string, unknown>> = {
  search_portfolio: {
    type: 'object',
    properties: {
      query: str,
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: { title: str, kind: str, url: str, excerpt: str },
          required: ['title', 'kind', 'url', 'excerpt'],
        },
      },
      note: str,
    },
    required: ['results'],
  },
  get_case_study: {
    type: 'object',
    properties: {
      slug: str,
      title: str,
      url: str,
      where: str,
      role: str,
      when: str,
      outcome: str,
      numbers: { type: 'array', items: str },
      links: { type: 'array', items: { type: 'object', properties: { label: str, href: str } } },
      text: str,
    },
    required: ['slug', 'title', 'url'],
  },
  list_work: {
    type: 'object',
    properties: {
      count: { type: 'integer' },
      work: {
        type: 'array',
        items: {
          type: 'object',
          properties: { slug: str, title: str, where: str, when: str, outcome: str, url: str },
          required: ['slug', 'title', 'url'],
        },
      },
    },
    required: ['count', 'work'],
  },
};

const tools = createTools(index);

/** One fresh server per request. Called by createMcpHandler; holds nothing between requests. */
export function createPortfolioServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: INSTRUCTIONS,
    // The tool list never changes at runtime, so do not invite clients to listen for changes.
    capabilities: { tools: { listChanged: false } },
  });

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: TITLES[tool.name],
        description: tool.description,
        inputSchema: fromJsonSchema(tool.input_schema as never),
        outputSchema: fromJsonSchema(OUTPUT_SCHEMAS[tool.name] as never),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async (args: unknown) => {
        const result = runTool(tools, tool.name, args ?? {}) as Record<string, unknown>;
        const text = JSON.stringify(result, null, 2);
        if (result && typeof result.error === 'string') {
          // A miss the model can recover from (a bad slug): a tool error, with the list of valid slugs in the text.
          return { content: [{ type: 'text' as const, text }], isError: true };
        }
        return { content: [{ type: 'text' as const, text }], structuredContent: result };
      },
    );
  }
  return server;
}

const handler = createMcpHandler(createPortfolioServer, {
  maxRequestBodySize: MAX_BODY_BYTES,
  // Every tool answers at once and sends no progress. 2026-07-28 requests get a plain JSON
  // body; the SDK's 2025 legacy leg (initialize, then tools/call) still answers over SSE.
  responseMode: 'json',
});

/* ---------- HTTP edge ---------- */

const ALLOWED_HEADERS = [
  'Content-Type',
  'Accept',
  'Authorization',
  'MCP-Protocol-Version',
  'Mcp-Method',
  'Mcp-Name',
  'Mcp-Session-Id',
  'Last-Event-ID',
].join(', ');

/**
 * Any origin may call this endpoint. It is public, read-only, takes no credentials,
 * sets no cookies, and can reach nothing but the site's own published text, so there
 * is nothing a cross-origin page could do with it that it could not do by reading
 * the site. That is the whole Origin policy.
 */
function cors(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || ALLOWED_HEADERS,
    'Access-Control-Expose-Headers': 'MCP-Protocol-Version, Mcp-Session-Id',
    'Access-Control-Max-Age': '86400',
  };
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}

function jsonRpcError(status: number, code: number, message: string, id: string | number | null = null): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Read the body as text, stopping as soon as it passes the limit. Returns null when it is too large. */
async function readCapped(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > limit) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** Method names in a JSON-RPC body (one message or a batch), or [] when it does not parse. */
function methodsIn(text: string): { method: string; id: string | number | null }[] {
  try {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((m) => m && typeof m === 'object' && typeof m.method === 'string')
      .map((m) => ({ method: m.method, id: m.id ?? null }));
  } catch {
    return [];
  }
}

const POINTER_TEXT = `This is the MCP server for ${SITE}.

It is not a web page. It answers MCP clients (Claude Code, the Claude apps, and others)
with three read-only tools over this site's published content:
${TOOLS.map((t) => `  - ${t.name}`).join('\n')}

How to connect: ${CONNECT_PAGE}
`;

const POINTER_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>MCP endpoint · Andrew Yu</title>
<style>
:root{color-scheme:light dark;--stock:#edefea;--ink:#0b5f69;--text:#0b1d43}
@media (prefers-color-scheme:dark){:root{--stock:#0e1a1c;--ink:#7fcfcf;--text:#eaf3f1}}
body{margin:0;background:var(--stock);color:var(--text);font:17px/1.55 Georgia,serif}
main{max-width:40rem;margin:0 auto;padding:56px 16px}
p{margin:0 0 14px}code{font:14px ui-monospace,Menlo,monospace}
a{color:inherit;text-decoration-color:var(--ink);text-underline-offset:4px}
.k{font:500 12px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.05em;text-transform:uppercase;color:var(--ink);border-bottom:1.5px solid var(--ink);padding-bottom:10px;margin-bottom:22px}
</style></head><body><main>
<p class="k">MCP endpoint</p>
<p>This address is for MCP clients, not browsers. It answers them with three read-only tools over this site's published content: ${TOOLS.map((t) => `<code>${t.name}</code>`).join(', ')}.</p>
<p><a href="/teaching/connect">How to connect a client and ask this site a question</a></p>
</main></body></html>
`;

/** The whole endpoint. Exported for src/pages/mcp.ts. */
export async function handleMcpRequest(request: Request): Promise<Response> {
  const headers = cors(request);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers });

  if (method === 'GET' || method === 'HEAD') {
    const accept = request.headers.get('Accept') ?? '';
    // A client asking for an event stream is speaking the protocol: let the SDK answer it (405, no GET stream here).
    if (!accept.includes('text/event-stream')) {
      const html = accept.includes('text/html');
      return new Response(method === 'HEAD' ? null : html ? POINTER_HTML : POINTER_TEXT, {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': html ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
          // What a GET gets depends on its Accept header, so no shared cache may keep one
          // answer and hand it to the next caller. (A CDN did exactly that once: it kept the
          // plain-text pointer and served it to a client that was speaking the protocol.)
          'Cache-Control': 'no-store',
          Vary: 'Accept',
          Link: `<${CONNECT_PAGE}>; rel="help"`,
        },
      });
    }
    return withHeaders(await handler.fetch(request), { ...headers, 'Cache-Control': 'no-store', Vary: 'Accept' });
  }

  if (method === 'POST') {
    const body = await readCapped(request, MAX_BODY_BYTES);
    if (body === null) {
      return withHeaders(jsonRpcError(413, -32600, `Request body is larger than ${MAX_BODY_BYTES / 1024} KB.`), headers);
    }
    const listen = methodsIn(body).find((m) => m.method === 'subscriptions/listen');
    if (listen) {
      // Spec: an unimplemented method is 404 with -32601. Nothing on this server changes, so there is nothing to listen for.
      return withHeaders(
        jsonRpcError(404, -32601, 'Method not found: subscriptions/listen. This server is read-only and never changes.', listen.id),
        headers,
      );
    }
    const rebuilt = new Request(request.url, { method: 'POST', headers: request.headers, body, signal: request.signal });
    const response = await handler.fetch(rebuilt);
    return withHeaders(response, { ...headers, 'Cache-Control': 'no-store' });
  }

  // DELETE (a 2025-era session teardown) and anything else: the SDK answers with the right status.
  return withHeaders(await handler.fetch(request), headers);
}
