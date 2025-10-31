// git-server.js - MCP server for Git operations
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const server = new Server(
  {
    name: "git-server",
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
        name: "git_status",
        description: "Get the current git status of the repository",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
          },
          required: ["repoPath"],
        },
      },
      {
        name: "git_log",
        description: "Get git commit history",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            limit: {
              type: "number",
              description: "Number of commits to retrieve (default: 10)",
            },
            branch: {
              type: "string",
              description: "Branch name (optional)",
            },
          },
          required: ["repoPath"],
        },
      },
      {
        name: "git_diff",
        description: "Get git diff for staged/unstaged changes or between commits",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            staged: {
              type: "boolean",
              description: "Show staged changes (default: false)",
            },
            file: {
              type: "string",
              description: "Specific file to diff (optional)",
            },
            commit1: {
              type: "string",
              description: "First commit hash for comparison (optional)",
            },
            commit2: {
              type: "string",
              description: "Second commit hash for comparison (optional)",
            },
          },
          required: ["repoPath"],
        },
      },
      {
        name: "git_branches",
        description: "List all branches in the repository",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            remote: {
              type: "boolean",
              description: "Include remote branches (default: false)",
            },
          },
          required: ["repoPath"],
        },
      },
      {
        name: "generate_commit_message",
        description: "Generate a commit message based on staged changes",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
          },
          required: ["repoPath"],
        },
      },
      {
        name: "git_blame",
        description: "Show what revision and author last modified each line of a file",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            file: {
              type: "string",
              description: "File path relative to repo root",
            },
          },
          required: ["repoPath", "file"],
        },
      },
      {
        name: "git_search_commits",
        description: "Search commits by message, author, or content",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            query: {
              type: "string",
              description: "Search query",
            },
            searchType: {
              type: "string",
              enum: ["message", "author", "content"],
              description: "Type of search to perform",
            },
          },
          required: ["repoPath", "query", "searchType"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "git_status": {
        const { stdout } = await execAsync(`git -C "${args.repoPath}" status --porcelain -b`);
        const { stdout: statusLong } = await execAsync(`git -C "${args.repoPath}" status`);
        return {
          content: [
            {
              type: "text",
              text: `Short status:\n${stdout}\n\nDetailed status:\n${statusLong}`,
            },
          ],
        };
      }

      case "git_log": {
        const limit = args.limit || 10;
        const branch = args.branch || "";
        const { stdout } = await execAsync(
          `git -C "${args.repoPath}" log ${branch} --oneline --decorate -n ${limit} --pretty=format:"%h | %an | %ar | %s"`
        );
        return {
          content: [
            {
              type: "text",
              text: `Recent commits:\n${stdout}`,
            },
          ],
        };
      }

      case "git_diff": {
        let command = `git -C "${args.repoPath}" diff`;
        
        if (args.staged) {
          command += " --staged";
        }
        
        if (args.commit1 && args.commit2) {
          command = `git -C "${args.repoPath}" diff ${args.commit1} ${args.commit2}`;
        }
        
        if (args.file) {
          command += ` -- "${args.file}"`;
        }
        
        const { stdout } = await execAsync(command);
        return {
          content: [
            {
              type: "text",
              text: stdout || "No changes found",
            },
          ],
        };
      }

      case "git_branches": {
        const flag = args.remote ? "-a" : "";
        const { stdout } = await execAsync(`git -C "${args.repoPath}" branch ${flag} -v`);
        return {
          content: [
            {
              type: "text",
              text: `Branches:\n${stdout}`,
            },
          ],
        };
      }

      case "generate_commit_message": {
        const { stdout: diff } = await execAsync(`git -C "${args.repoPath}" diff --staged`);
        const { stdout: status } = await execAsync(`git -C "${args.repoPath}" status --short`);
        
        if (!diff && !status) {
          return {
            content: [
              {
                type: "text",
                text: "No staged changes to commit",
              },
            ],
          };
        }

        // Parse the changes
        const files = status.split("\n").filter(Boolean);
        const changeTypes = {
          added: files.filter(f => f.startsWith("A ")).length,
          modified: files.filter(f => f.startsWith("M ")).length,
          deleted: files.filter(f => f.startsWith("D ")).length,
        };

        let message = "";
        const changes = [];
        
        if (changeTypes.added > 0) changes.push(`add ${changeTypes.added} file(s)`);
        if (changeTypes.modified > 0) changes.push(`modify ${changeTypes.modified} file(s)`);
        if (changeTypes.deleted > 0) changes.push(`delete ${changeTypes.deleted} file(s)`);
        
        message = `chore: ${changes.join(", ")}`;

        return {
          content: [
            {
              type: "text",
              text: `Suggested commit message:\n${message}\n\nFiles changed:\n${status}\n\nYou can customize this message based on the actual changes.`,
            },
          ],
        };
      }

      case "git_blame": {
        const { stdout } = await execAsync(
          `git -C "${args.repoPath}" blame "${args.file}" --line-porcelain`
        );
        
        // Parse blame output for better readability
        const lines = stdout.split("\n");
        const blameInfo = [];
        let currentCommit = null;
        
        for (const line of lines) {
          if (line.match(/^[0-9a-f]{40}/)) {
            currentCommit = {
              hash: line.split(" ")[0].substring(0, 8),
            };
          } else if (line.startsWith("author ")) {
            currentCommit.author = line.substring(7);
          } else if (line.startsWith("author-time ")) {
            const timestamp = parseInt(line.substring(12));
            currentCommit.date = new Date(timestamp * 1000).toLocaleDateString();
          } else if (line.startsWith("\t")) {
            blameInfo.push({
              ...currentCommit,
              content: line.substring(1),
            });
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(blameInfo, null, 2),
            },
          ],
        };
      }

      case "git_search_commits": {
        let command = `git -C "${args.repoPath}" log --all --pretty=format:"%h | %an | %ar | %s"`;
        
        switch (args.searchType) {
          case "message":
            command += ` --grep="${args.query}"`;
            break;
          case "author":
            command += ` --author="${args.query}"`;
            break;
          case "content":
            command += ` -S"${args.query}"`;
            break;
        }
        
        const { stdout } = await execAsync(command);
        return {
          content: [
            {
              type: "text",
              text: stdout || `No commits found matching "${args.query}"`,
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
  console.error("Git MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});