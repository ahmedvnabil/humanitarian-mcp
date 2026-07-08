import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SERVER_NAME, SERVER_VERSION } from './config.js';
import type { AppContext } from './context.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';

const INSTRUCTIONS = `Humanitarian MCP exposes trusted humanitarian open data (currently UNHCR refugee statistics) through semantic tools.

Conventions:
- Countries accept names or ISO3 codes; when unsure of spelling, call search_country first.
- role="asylum" means people hosted IN a country; role="origin" means people displaced FROM it.
- All data is read-only, sourced from official public APIs, and cached locally. Figures are end-year stocks; cite the year and UNHCR as the source.
- Start broad (get_metadata, country_profile) before drilling into specific datasets.`;

/**
 * Build the MCP server: every tool, resource and prompt registered against
 * the given context. Transport-agnostic — callers connect stdio, streamable
 * HTTP or in-memory transports.
 */
export function createServer(ctx: AppContext): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );
  registerTools(server, ctx);
  registerResources(server, ctx);
  registerPrompts(server, ctx);
  return server;
}
