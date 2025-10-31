// database-server.js - MCP server for database operations
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import mysql from "mysql2/promise";

const { Pool } = pg;

// Database configurations
const DB_CONFIGS = {
  postgres: {
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || "postgres",
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
  },
  mysql: {
    host: process.env.MYSQL_HOST || "localhost",
    port: process.env.MYSQL_PORT || 3306,
    database: process.env.MYSQL_DATABASE || "mysql",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
  },
};

let pgPool = null;
let mysqlPool = null;

const server = new Server(
  {
    name: "database-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_query",
        description: "Execute a SQL query on PostgreSQL or MySQL database",
        inputSchema: {
          type: "object",
          properties: {
            dbType: {
              type: "string",
              enum: ["postgres", "mysql"],
              description: "Database type",
            },
            query: {
              type: "string",
              description: "SQL query to execute",
            },
          },
          required: ["dbType", "query"],
        },
      },
      {
        name: "get_schema",
        description: "Get database schema information (tables, columns, types)",
        inputSchema: {
          type: "object",
          properties: {
            dbType: {
              type: "string",
              enum: ["postgres", "mysql"],
              description: "Database type",
            },
            tableName: {
              type: "string",
              description: "Specific table name (optional)",
            },
          },
          required: ["dbType"],
        },
      },
      {
        name: "get_table_stats",
        description: "Get statistics about tables (row count, size, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            dbType: {
              type: "string",
              enum: ["postgres", "mysql"],
              description: "Database type",
            },
          },
          required: ["dbType"],
        },
      },
      {
        name: "generate_migration",
        description: "Generate a migration script based on schema differences",
        inputSchema: {
          type: "object",
          properties: {
            dbType: {
              type: "string",
              enum: ["postgres", "mysql"],
              description: "Database type",
            },
            description: {
              type: "string",
              description: "Description of the migration",
            },
          },
          required: ["dbType", "description"],
        },
      },
    ],
  };
});

// Initialize database connections
function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool(DB_CONFIGS.postgres);
  }
  return pgPool;
}

async function getMysqlPool() {
  if (!mysqlPool) {
    mysqlPool = await mysql.createPool(DB_CONFIGS.mysql);
  }
  return mysqlPool;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "execute_query": {
        let result;
        if (args.dbType === "postgres") {
          const pool = getPgPool();
          const res = await pool.query(args.query);
          result = {
            rows: res.rows,
            rowCount: res.rowCount,
            command: res.command,
          };
        } else {
          const pool = await getMysqlPool();
          const [rows] = await pool.query(args.query);
          result = {
            rows: Array.isArray(rows) ? rows : [rows],
            rowCount: Array.isArray(rows) ? rows.length : 1,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_schema": {
        let schema;
        if (args.dbType === "postgres") {
          const pool = getPgPool();
          const query = args.tableName
            ? `
              SELECT 
                column_name, data_type, character_maximum_length,
                is_nullable, column_default
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = $1
              ORDER BY ordinal_position;
            `
            : `
              SELECT 
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns c 
                 WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
              FROM information_schema.tables t
              WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
              ORDER BY table_name;
            `;
          const res = args.tableName
            ? await pool.query(query, [args.tableName])
            : await pool.query(query);
          schema = res.rows;
        } else {
          const pool = await getMysqlPool();
          const query = args.tableName
            ? `
              SELECT 
                COLUMN_NAME as column_name,
                DATA_TYPE as data_type,
                CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
                IS_NULLABLE as is_nullable,
                COLUMN_DEFAULT as column_default
              FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
              ORDER BY ORDINAL_POSITION;
            `
            : `
              SELECT 
                TABLE_NAME as table_name,
                (SELECT COUNT(*) FROM information_schema.COLUMNS c 
                 WHERE c.TABLE_NAME = t.TABLE_NAME AND c.TABLE_SCHEMA = DATABASE()) as column_count
              FROM information_schema.TABLES t
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
              ORDER BY TABLE_NAME;
            `;
          const [rows] = args.tableName
            ? await pool.query(query, [args.tableName])
            : await pool.query(query);
          schema = rows;
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case "get_table_stats": {
        let stats;
        if (args.dbType === "postgres") {
          const pool = getPgPool();
          const query = `
            SELECT 
              schemaname,
              tablename,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
              n_live_tup as row_count
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
          `;
          const res = await pool.query(query);
          stats = res.rows;
        } else {
          const pool = await getMysqlPool();
          const query = `
            SELECT 
              TABLE_NAME as table_name,
              ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb,
              TABLE_ROWS as row_count
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
          `;
          const [rows] = await pool.query(query);
          stats = rows;
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "generate_migration": {
        const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
        const migrationName = args.description.toLowerCase().replace(/\s+/g, "_");
        const fileName = `${timestamp}_${migrationName}.sql`;
        
        const template = `-- Migration: ${args.description}
-- Created: ${new Date().toISOString()}
-- Database: ${args.dbType}

-- Up Migration
BEGIN;

-- Add your migration SQL here

COMMIT;

-- Down Migration (Rollback)
BEGIN;

-- Add your rollback SQL here

COMMIT;
`;
        return {
          content: [
            {
              type: "text",
              text: `Migration file generated: ${fileName}\n\n${template}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Database MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});