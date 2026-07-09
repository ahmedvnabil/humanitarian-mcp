import { createServer as createNodeServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SERVER_NAME, SERVER_VERSION } from '../config.js';
import type { AppContext } from '../context.js';
import { createServer } from '../server.js';
import { DASHBOARD_HTML } from './dashboard-html.js';

/**
 * HTTP mode: one process serving
 *   POST /mcp        — stateless streamable HTTP MCP endpoint
 *   GET  /           — demo dashboard (static, self-contained)
 *   GET  /api/status — providers, health, tool/resource/prompt catalogue, stats
 *   GET  /api/logs   — recent structured log entries
 *   POST /api/call   — run a tool via an in-process MCP client (demo only)
 *
 * The dashboard talks to a real MCP client connected over an in-memory
 * transport, so what it displays is exactly what any MCP client would see.
 */

const MAX_BODY_BYTES = 1024 * 1024;

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('request body too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

export async function startHttpServer(ctx: AppContext, port: number): Promise<void> {
  // In-process MCP pair backing the dashboard API.
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const inProcessServer = createServer(ctx);
  const client = new Client({ name: `${SERVER_NAME}-dashboard`, version: SERVER_VERSION });
  await Promise.all([inProcessServer.connect(serverTransport), client.connect(clientTransport)]);

  const httpServer = createNodeServer((req, res) => {
    void route(req, res).catch((err: unknown) => {
      ctx.logger.error('http: unhandled route error', {
        error: err instanceof Error ? err.message : String(err),
      });
      if (!res.headersSent) sendJson(res, 500, { error: 'internal error' });
      else res.end();
    });
  });

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    if (url.pathname === '/mcp') {
      await handleMcp(req, res);
      return;
    }
    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(DASHBOARD_HTML);
      return;
    }
    if (url.pathname === '/api/status' && req.method === 'GET') {
      await handleStatus(res);
      return;
    }
    if (url.pathname === '/api/logs' && req.method === 'GET') {
      sendJson(res, 200, { logs: ctx.logger.recent(200) });
      return;
    }
    if (url.pathname === '/api/call' && req.method === 'POST') {
      await handleCall(req, res);
      return;
    }
    sendJson(res, 404, { error: 'not found' });
  }

  async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      // Stateless mode: no server-initiated streams, no sessions to delete.
      sendJson(res, 405, {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed — POST JSON-RPC to /mcp' },
        id: null,
      });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readBody(req));
    } catch {
      sendJson(res, 400, {
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error' },
        id: null,
      });
      return;
    }

    // A fresh server+transport per request keeps the endpoint fully stateless.
    const mcpServer = createServer(ctx);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void mcpServer.close();
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, parsed);
  }

  async function handleStatus(res: ServerResponse): Promise<void> {
    const providers = await Promise.all(
      ctx.registry.all().map(async (provider) => ({
        metadata: await provider.metadata(),
        health: await provider.health(),
      })),
    );
    const [tools, resources, templates, prompts, cacheSize] = await Promise.all([
      client.listTools(),
      client.listResources(),
      client.listResourceTemplates(),
      client.listPrompts(),
      ctx.cache.size(),
    ]);
    sendJson(res, 200, {
      server: { name: SERVER_NAME, version: SERVER_VERSION },
      endpoint: `http://localhost:${port}/mcp`,
      config: {
        providers: ctx.config.providers,
        cache: ctx.cache.backend,
        offline: ctx.config.offline,
        rateLimitRps: ctx.config.rateLimitRps,
        cacheTtlSeconds: ctx.config.cacheTtlSeconds,
      },
      providers,
      tools: tools.tools.map((t) => ({ name: t.name, title: t.title, description: t.description })),
      resources: [
        ...resources.resources.map((r) => ({ uri: r.uri, name: r.name })),
        ...templates.resourceTemplates.map((t) => ({ uri: t.uriTemplate, name: t.name })),
      ],
      prompts: prompts.prompts.map((p) => ({ name: p.name, title: p.title })),
      cache: { backend: ctx.cache.backend, entries: cacheSize, ...ctx.cache.stats },
      analytics: ctx.analytics.snapshot(),
    });
  }

  async function handleCall(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let payload: { tool?: string; arguments?: Record<string, unknown> };
    try {
      payload = JSON.parse(await readBody(req)) as typeof payload;
    } catch {
      sendJson(res, 400, { error: 'invalid JSON body' });
      return;
    }
    if (!payload.tool) {
      sendJson(res, 400, { error: 'missing "tool"' });
      return;
    }
    try {
      const result = await client.callTool({
        name: payload.tool,
        arguments: payload.arguments ?? {},
      });
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 200, {
        isError: true,
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      });
    }
  }

  const host = ctx.config.httpHost;
  await new Promise<void>((resolve) => httpServer.listen(port, host, resolve));
  ctx.logger.info(`${SERVER_NAME} ${SERVER_VERSION} http mode`, {
    host,
    dashboard: `http://localhost:${port}/`,
    mcpEndpoint: `http://localhost:${port}/mcp`,
  });
}
