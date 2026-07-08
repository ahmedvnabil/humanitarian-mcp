import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { markdownTable } from '../viz/table.js';
import { defineTool } from './common.js';

export function registerMetaTools(server: McpServer, ctx: AppContext): void {
  defineTool(
    server,
    ctx,
    'get_metadata',
    {
      title: 'Get metadata',
      description:
        'Describe the connected data providers: datasets served, metrics available, attribution and terms. Call this to learn what data exists before querying.',
      inputSchema: {},
      outputSchema: {
        providers: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            homepage: z.string(),
            attribution: z.string(),
            terms: z.string(),
            datasets: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                metrics: z.array(z.string()),
                citation: z.string(),
              }),
            ),
          }),
        ),
      },
    },
    async () => {
      const providers = await Promise.all(ctx.registry.all().map((p) => p.metadata()));
      const lines = providers.map((p) => {
        const datasets = markdownTable(
          ['Dataset', 'Metrics', 'Description'],
          p.datasets.map((d) => [d.id, d.metrics.join(', '), d.description]),
        );
        return `## ${p.name} (\`${p.id}\`)\n\n${p.description}\n\n${datasets}\n\n_${p.attribution}_`;
      });
      return {
        content: [{ type: 'text', text: lines.join('\n\n') }],
        structuredContent: {
          providers: providers.map((p) => ({
            ...p,
            datasets: p.datasets.map((d) => ({ ...d, metrics: [...d.metrics] })),
          })),
        },
      };
    },
  );

  defineTool(
    server,
    ctx,
    'provider_health',
    {
      title: 'Provider health',
      description:
        'Liveness check of every connected data provider (latency, reachability). Use when queries fail to distinguish upstream outages from bad parameters.',
      inputSchema: {},
      outputSchema: {
        healthy: z.boolean(),
        providers: z.array(
          z.object({
            provider: z.string(),
            ok: z.boolean(),
            latencyMs: z.number().optional(),
            detail: z.string(),
            checkedAt: z.string(),
          }),
        ),
      },
    },
    async () => {
      const results = await Promise.all(ctx.registry.all().map((p) => p.health()));
      const table = markdownTable(
        ['Provider', 'Status', 'Latency', 'Detail'],
        results.map((r) => [
          r.provider,
          r.ok ? '✅ ok' : '❌ down',
          r.latencyMs !== undefined ? `${r.latencyMs} ms` : '—',
          r.detail,
        ]),
      );
      return {
        content: [{ type: 'text', text: table }],
        structuredContent: { healthy: results.every((r) => r.ok), providers: results },
      };
    },
  );
}
