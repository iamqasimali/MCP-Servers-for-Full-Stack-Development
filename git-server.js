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
      {
        name: "git_stage",
        description: "Stage files for the next commit.",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            files: {
              type: "array",
              description:
                "An array of file paths to stage. If empty or not provided, all changes will be staged.",
              items: {
                type: "string",
              },
            },
          },
          required: ["repoPath"],
        },
      },
      {
        name: "git_commit",
        description: "Commit staged changes with a provided message.",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            message: {
              type: "string",
              description: "The commit message.",
            },
          },
          required: ["repoPath", "message"],
        },
      },
      {
        name: "git_push",
        description: "Push committed changes to a remote repository.",
        inputSchema: {
          type: "object",
          properties: {
            repoPath: {
              type: "string",
              description: "Path to the git repository",
            },
            remote: {
              type: "string",
              description: "The remote to push to (default: 'origin').",
            },
            branch: {
              type: "string",
              description: "The branch to push (default: current branch).",
            },
            force: {
              type: "boolean",
              description: "Force push (use with caution). Default: false.",
            },
          },
          required: ["repoPath"],
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
        const { stdout: diff } = await execAsync(`git -C "${args.repoPath}" diff --staged --name-status`);
        
        if (!diff) {
          return {
            content: [
              {
                type: "text",
                text: "No staged changes to create a commit message from.",
              },
            ],
          };
        }

        const files = diff.trim().split('\n').map(line => {
          const [status, file] = line.split('\t');
          return { status, file };
        });

        let type = 'chore'; // Default type
        const scope = ''; // Scope can be complex to determine, leave it empty for now.
        let summary = '';

        const added = files.filter(f => f.status.startsWith('A'));
        const modified = files.filter(f => f.status.startsWith('M'));
        const deleted = files.filter(f => f.status.startsWith('D'));
        const renamed = files.filter(f => f.status.startsWith('R'));

        if (added.length > 0 && modified.length === 0 && deleted.length === 0) {
          type = 'feat';
          summary = `add ${added.length > 1 ? `${added.length} new files` : `'${added[0].file}'`}`;
        } else if (files.every(f => f.file.endsWith('.md') || f.file.toLowerCase().includes('readme'))) {
          type = 'docs';
          summary = 'update documentation';
        } else if (files.some(f => f.file.includes('test') || f.file.includes('spec'))) {
          type = 'test';
          summary = 'update tests';
        } else if (modified.length > 0) {
          type = 'fix';
          summary = `update ${modified.length > 1 ? `${modified.length} files` : `'${modified[0].file}'`}`;
        } else {
          summary = 'update project structure';
        }

        if (files.some(f => f.file === 'package.json' || f.file === 'package-lock.json')) {
          type = 'chore';
          summary = 'update dependencies or project config';
        }

        const commitMessage = `${type}${scope ? `(${scope})` : ''}: ${summary}`;
        
        const body = `\n\nChanges:\n${files.map(f => `- ${f.status}: ${f.file}`).join('\n')}`;

        return {
          content: [
            {
              type: "text",
              text: `Suggested commit message:\n\n${commitMessage}${body}`,
            },
          ],
        };
      }

      case "git_blame": {
        const { stdout } = await execAsync(
          `git -C "${args.repoPath}" blame "${args.file}" --line-porcelain`
        );
        
        const lines = stdout.split("\n");
        const blameLines = [];
        let currentCommitInfo = {};
        
        for (const line of lines) {
          if (line.match(/^[0-9a-f]{40}/)) { // Commit info line
            const parts = line.split(" ");
            currentCommitInfo = {
              hash: parts[0].substring(0, 8),
              line: parts[2],
            };
          } else if (line.startsWith("author ")) {
            currentCommitInfo.author = line.substring(7);
          } else if (line.startsWith("author-time ")) {
            const timestamp = parseInt(line.substring(12));
            currentCommitInfo.date = new Date(timestamp * 1000).toLocaleDateString();
          } else if (line.startsWith("\t")) { // Content line
            blameLines.push({
              ...currentCommitInfo,
              content: line.substring(1),
            });
          }
        }
        
        const header = "| Line | Commit   | Author        | Date       | Content                  |";
        const separator = "|------|----------|---------------|------------|--------------------------|";
        const body = blameLines.map(l => 
          `| ${l.line.padEnd(4)} | ${l.hash} | ${l.author.padEnd(13).substring(0,13)} | ${l.date.padEnd(10)} | \`${l.content.replace(/\|/g, "\\|")}\` |`
        ).join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Blame for ${args.file}:\n\n${header}\n${separator}\n${body}`,
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

      case "git_stage": {
        let command;
        if (args.files && args.files.length > 0) {
          // Quote files to handle spaces and other special characters
          const filesToStage = args.files.map((f) => `"${f}"`).join(" ");
          command = `git -C "${args.repoPath}" add ${filesToStage}`;
        } else {
          // Stage all changes (new, modified, deleted)
          command = `git -C "${args.repoPath}" add -A`;
        }

        await execAsync(command);
        const { stdout: status } = await execAsync(`git -C "${args.repoPath}" status --short`);

        return {
          content: [{
            type: "text",
            text: `Staging successful. Current status:\n${status}`
          }],
        };
      }

      case "git_commit": {
        // To handle multi-line messages and special characters like quotes,
        // it's safer to pass the message via an environment variable.
        const { stdout: commitOutput } = await execAsync(
          `git -C "${args.repoPath}" commit -m "${args.message}"`,
        );

        const { stdout: log } = await execAsync(
          `git -C "${args.repoPath}" log -1 --oneline --decorate --pretty=format:"%h | %an | %ar | %s"`
        );

        return {
          content: [{
            type: "text",
            text: `Commit successful!\n\n${commitOutput}\n\nLatest commit:\n${log}`
          }],
        };
      }

      case "git_push": {
        const remote = args.remote || "origin";
        const branch = args.branch || ""; // Git will use the configured default if empty
        const forceFlag = args.force ? "--force" : "";

        const command = `git -C "${args.repoPath}" push ${forceFlag} ${remote} ${branch}`.trim();

        // Git push can write to stderr for progress, so we can't just check for stderr.
        // We'll rely on execAsync to throw only on a non-zero exit code, which indicates a true error.
        const { stdout, stderr } = await execAsync(command);

        return {
          content: [
            {
              type: "text",
              text: `Push command executed.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
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