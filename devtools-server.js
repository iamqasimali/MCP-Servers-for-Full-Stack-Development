// devtools-server.js - MCP server for Docker and development tools
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const execAsync = promisify(exec);

const server = new Server(
  {
    name: "devtools-server",
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
        name: "docker_ps",
        description: "List Docker containers (running or all)",
        inputSchema: {
          type: "object",
          properties: {
            all: {
              type: "boolean",
              description: "Show all containers (default: false, only running)",
            },
          },
        },
      },
      {
        name: "docker_logs",
        description: "Get logs from a Docker container",
        inputSchema: {
          type: "object",
          properties: {
            container: {
              type: "string",
              description: "Container name or ID",
            },
            tail: {
              type: "number",
              description: "Number of lines to show from the end (default: 100)",
            },
            follow: {
              type: "boolean",
              description: "Follow log output (default: false)",
            },
          },
          required: ["container"],
        },
      },
      {
        name: "docker_exec",
        description: "Execute a command in a running Docker container",
        inputSchema: {
          type: "object",
          properties: {
            container: {
              type: "string",
              description: "Container name or ID",
            },
            command: {
              type: "string",
              description: "Command to execute",
            },
          },
          required: ["container", "command"],
        },
      },
      {
        name: "docker_compose",
        description: "Run Docker Compose commands",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["up", "down", "restart", "ps", "logs"],
              description: "Docker Compose action",
            },
            projectPath: {
              type: "string",
              description: "Path to docker-compose.yml directory",
            },
            service: {
              type: "string",
              description: "Specific service name (optional)",
            },
          },
          required: ["action", "projectPath"],
        },
      },
      {
        name: "docker_stats",
        description: "Get resource usage statistics for containers",
        inputSchema: {
          type: "object",
          properties: {
            container: {
              type: "string",
              description: "Container name or ID (optional, all if not specified)",
            },
          },
        },
      },
      {
        name: "run_command",
        description: "Run a shell command (use with caution)",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Shell command to execute",
            },
            workingDir: {
              type: "string",
              description: "Working directory (optional)",
            },
          },
          required: ["command"],
        },
      },
      {
        name: "monitor_logs",
        description: "Monitor log files in real-time",
        inputSchema: {
          type: "object",
          properties: {
            logPath: {
              type: "string",
              description: "Path to log file",
            },
            lines: {
              type: "number",
              description: "Number of recent lines to show (default: 50)",
            },
          },
          required: ["logPath"],
        },
      },
      {
        name: "check_ports",
        description: "Check which processes are using specific ports",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "number",
              description: "Port number to check",
            },
          },
          required: ["port"],
        },
      },
      {
        name: "npm_scripts",
        description: "List and run npm scripts from package.json",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to project directory",
            },
            action: {
              type: "string",
              enum: ["list", "run"],
              description: "List scripts or run a specific script",
            },
            scriptName: {
              type: "string",
              description: "Script name to run (required if action is 'run')",
            },
          },
          required: ["projectPath", "action"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "docker_ps": {
        const flag = args.all ? "-a" : "";
        const { stdout } = await execAsync(
          `docker ps ${flag} --format "table {{.ID}}\\t{{.Names}}\\t{{.Status}}\\t{{.Image}}\\t{{.Ports}}"`
        );
        return {
          content: [
            {
              type: "text",
              text: stdout,
            },
          ],
        };
      }

      case "docker_logs": {
        const tail = args.tail || 100;
        const followFlag = args.follow ? "-f" : "";
        const { stdout } = await execAsync(
          `docker logs ${args.container} --tail ${tail} ${followFlag}`
        );
        return {
          content: [
            {
              type: "text",
              text: stdout || "No logs available",
            },
          ],
        };
      }

      case "docker_exec": {
        const { stdout, stderr } = await execAsync(
          `docker exec ${args.container} ${args.command}`
        );
        return {
          content: [
            {
              type: "text",
              text: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
            },
          ],
        };
      }

      case "docker_compose": {
        let command = `docker-compose -f ${args.projectPath}/docker-compose.yml ${args.action}`;
        
        if (args.service) {
          command += ` ${args.service}`;
        }
        
        if (args.action === "up") {
          command += " -d"; // detached mode
        }
        
        const { stdout, stderr } = await execAsync(command);
        return {
          content: [
            {
              type: "text",
              text: `${stdout}\n${stderr}`,
            },
          ],
        };
      }

      case "docker_stats": {
        const container = args.container || "";
        const { stdout } = await execAsync(
          `docker stats ${container} --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}\\t{{.BlockIO}}"`
        );
        return {
          content: [
            {
              type: "text",
              text: stdout,
            },
          ],
        };
      }

      case "run_command": {
        const options = args.workingDir ? { cwd: args.workingDir } : {};
        const { stdout, stderr } = await execAsync(args.command, options);
        return {
          content: [
            {
              type: "text",
              text: `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
            },
          ],
        };
      }

      case "monitor_logs": {
        const lines = args.lines || 50;
        try {
          const content = await fs.readFile(args.logPath, "utf-8");
          const logLines = content.split("\n");
          const recentLines = logLines.slice(-lines).join("\n");
          
          return {
            content: [
              {
                type: "text",
                text: `Last ${lines} lines from ${args.logPath}:\n\n${recentLines}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error reading log file: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "check_ports": {
        try {
          // Works on macOS and Linux
          const { stdout } = await execAsync(
            `lsof -i :${args.port} || netstat -an | grep ${args.port}`
          );
          return {
            content: [
              {
                type: "text",
                text: stdout || `No process found using port ${args.port}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Port ${args.port} appears to be free`,
              },
            ],
          };
        }
      }

      case "npm_scripts": {
        const packageJsonPath = `${args.projectPath}/package.json`;
        
        try {
          const packageJson = JSON.parse(
            await fs.readFile(packageJsonPath, "utf-8")
          );
          
          if (args.action === "list") {
            const scripts = packageJson.scripts || {};
            const scriptList = Object.entries(scripts)
              .map(([name, command]) => `  ${name}: ${command}`)
              .join("\n");
            
            return {
              content: [
                {
                  type: "text",
                  text: `Available scripts:\n${scriptList}`,
                },
              ],
            };
          } else if (args.action === "run") {
            if (!args.scriptName) {
              throw new Error("scriptName is required for 'run' action");
            }
            
            const { stdout, stderr } = await execAsync(
              `npm run ${args.scriptName}`,
              { cwd: args.projectPath }
            );
            
            return {
              content: [
                {
                  type: "text",
                  text: `Output from '${args.scriptName}':\n\n${stdout}\n${stderr}`,
                },
              ],
            };
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
  console.error("DevTools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});