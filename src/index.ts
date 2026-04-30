/**
 * claude-context
 * Main entry point for the claude-context MCP server
 * Provides context management and vector search capabilities for Claude AI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { toolHandlers } from './tools/index.js';
import { toolDefinitions } from './tools/definitions.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

const SERVER_NAME = 'claude-context';
const SERVER_VERSION = '0.1.0';

/**
 * Initialize and start the MCP server
 */
async function main(): Promise<void> {
  logger.info(`Starting ${SERVER_NAME} v${SERVER_VERSION}`);

  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing available tools');
    return {
      tools: toolDefinitions,
    };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug(`Executing tool: ${name}`, { args });

    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args ?? {});
      return result;
    } catch (error) {
      logger.error(`Tool execution failed: ${name}`, { error });
      throw error;
    }
  });

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info(`${SERVER_NAME} MCP server running on stdio`);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Fatal error during startup', { error });
  process.exit(1);
});
