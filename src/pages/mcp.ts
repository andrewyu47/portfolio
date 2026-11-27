/**
 * /mcp: this site as an MCP server. Three read-only tools over the published content.
 * The server and its HTTP handling live in src/lib/mcp/server.ts. How to connect: /teaching/connect.
 */
import type { APIRoute } from 'astro';
import { handleMcpRequest } from '../lib/mcp/server';

// On demand, so the Vercel adapter serves it as a function.
export const prerender = false;

export const ALL: APIRoute = ({ request }) => handleMcpRequest(request);
