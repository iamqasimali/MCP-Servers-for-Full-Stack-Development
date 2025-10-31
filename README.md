# MCP Servers for Full-Stack Development

A comprehensive collection of Model Context Protocol (MCP) servers designed to supercharge your development workflow with Claude Desktop. These servers enable Claude to interact with your databases, Git repositories, APIs, Docker containers, and development tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

## 🚀 Features

### 📦 Available Servers

1. **Filesystem Server** - File operations and code navigation
2. **Database Server** - PostgreSQL and MySQL management
3. **Git Server** - Repository operations and history analysis
4. **API Testing Server** - REST API testing and validation
5. **DevTools Server** - Docker, logs, and system monitoring

## 📋 Prerequisites

- Node.js v18 or higher
- Claude Desktop App
- Docker (optional, for DevTools server)
- PostgreSQL/MySQL (optional, for Database server)

## 🛠️ Installation

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-servers.git
cd mcp-servers

# Install dependencies
npm install

# Run the setup script
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Claude Desktop**

Create or edit: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/absolute/path/to/server.js"]
    },
    "database": {
      "command": "node",
      "args": ["/absolute/path/to/database-server.js"],
      "env": {
        "PG_HOST": "localhost",
        "PG_PORT": "5432",
        "PG_DATABASE": "your_database",
        "PG_USER": "your_user",
        "PG_PASSWORD": "your_password"
      }
    },
    "git": {
      "command": "node",
      "args": ["/absolute/path/to/git-server.js"]
    },
    "api-testing": {
      "command": "node",
      "args": ["/absolute/path/to/api-testing-server.js"]
    },
    "devtools": {
      "command": "node",
      "args": ["/absolute/path/to/devtools-server.js"]
    }
  }
}
```

3. **Restart Claude Desktop**

## 📖 Server Documentation

### 1. Filesystem Server

Provides file system operations for reading, writing, and navigating your codebase.

**Available Tools:**
- `read_file` - Read file contents
- `write_file` - Write content to files
- `list_directory` - List directory contents

**Example Usage:**
```
Claude: "Read the contents of src/App.js"
Claude: "List all files in the components directory"
Claude: "Create a new file called utils.js with helper functions"
```

---

### 2. Database Server

Manage PostgreSQL and MySQL databases directly through Claude.

**Available Tools:**
- `execute_query` - Run SQL queries
- `get_schema` - Retrieve table schemas
- `get_table_stats` - Get database statistics
- `generate_migration` - Create migration scripts

**Example Usage:**
```
Claude: "Show me all tables in my PostgreSQL database"
Claude: "Get the schema for the users table"
Claude: "Query all orders from the last 7 days"
Claude: "Generate a migration to add email column to users table"
```

**Configuration:**
Set these environment variables in your Claude config:
- `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD` (PostgreSQL)
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` (MySQL)

---

### 3. Git Server

Interact with Git repositories for version control operations.

**Available Tools:**
- `git_status` - Get repository status
- `git_log` - View commit history
- `git_diff` - Show differences
- `git_branches` - List branches
- `generate_commit_message` - Auto-generate commit messages
- `git_blame` - Show line-by-line authorship
- `git_search_commits` - Search commit history

**Example Usage:**
```
Claude: "Show me the git status of /path/to/my/project"
Claude: "Get the last 20 commits with their authors"
Claude: "Show me what changed in the last commit"
Claude: "Generate a commit message for my staged changes"
Claude: "Who last modified line 50 of app.js"
```

---

### 4. API Testing Server

Test and validate REST APIs with comprehensive testing capabilities.

**Available Tools:**
- `http_request` - Make HTTP requests
- `test_endpoint` - Run test scenarios
- `generate_test_cases` - Auto-generate test cases
- `performance_test` - Load testing
- `validate_response` - Schema validation

**Example Usage:**
```
Claude: "Test my API at http://localhost:3000/api/users with a GET request"
Claude: "Run a performance test on my health check endpoint with 50 requests"
Claude: "Generate test cases for my /api/products POST endpoint"
Claude: "Validate this response against my JSON schema"
```

---

### 5. DevTools Server

Manage Docker containers, monitor logs, and run development tools.

**Available Tools:**
- `docker_ps` - List containers
- `docker_logs` - View container logs
- `docker_exec` - Execute commands in containers
- `docker_compose` - Manage Docker Compose
- `docker_stats` - Resource usage statistics
- `run_command` - Execute shell commands
- `monitor_logs` - Tail log files
- `check_ports` - Check port usage
- `npm_scripts` - List and run npm scripts

**Example Usage:**
```
Claude: "Show me all running Docker containers"
Claude: "Get the last 100 lines from the 'web' container logs"
Claude: "Check what process is using port 3000"
Claude: "List all npm scripts in /path/to/project"
Claude: "Restart my docker-compose services"
```

## 🎯 Use Cases

### For Full-Stack Developers

**Morning Routine:**
```
Claude: "Show me all running Docker containers"
Claude: "Get git status of my main project"
Claude: "Show me database table statistics"
```

**Debugging:**
```
Claude: "Check the last 200 lines of the API container logs"
Claude: "Show me recent commits by John Doe"
Claude: "Query failed login attempts from the last hour"
```

**API Development:**
```
Claude: "Test my new /api/auth endpoint"
Claude: "Generate test cases for user registration"
Claude: "Run performance tests on the search endpoint"
```

**Code Review:**
```
Claude: "Show me the diff for the last 3 commits"
Claude: "Who last modified the authentication module?"
Claude: "Read all TypeScript files in the services directory"
```

## 🔧 Development

### Testing Individual Servers

```bash
# Test filesystem server
node server.js

# Test database server
node database-server.js

# Test git server
node git-server.js

# Test API testing server
node api-testing-server.js

# Test devtools server
node devtools-server.js
```

### Adding Custom Tools

Each server follows the same pattern:

```javascript
// Add to ListToolsRequestSchema
{
  name: "your_tool_name",
  description: "Tool description",
  inputSchema: {
    type: "object",
    properties: {
      // your parameters
    },
    required: ["param1"]
  }
}

// Add to CallToolRequestSchema
case "your_tool_name": {
  // your implementation
  return {
    content: [{
      type: "text",
      text: "result"
    }]
  };
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Server Not Connecting

1. **Check Node Version**
   ```bash
   node --version  # Should be v18 or higher
   ```

2. **Verify Server Manually**
   ```bash
   node server.js  # Should output: "Server running on stdio"
   ```

3. **Check Claude Desktop Config**
   - Ensure paths are absolute
   - Verify Node.js path is correct
   - Check for JSON syntax errors

4. **View Logs**
   - Open Claude Desktop Developer settings
   - Click "Open Logs Folder"
   - Check server-specific log files

### Common Errors

**"SyntaxError: Unexpected token"**
- Update Node.js to v18 or higher
- Ensure `"type": "module"` in package.json

**"Cannot find module"**
- Run `npm install` in the project directory
- Check that all dependencies are installed

**"Permission denied"**
- Ensure execute permissions: `chmod +x setup.sh`
- Check file system permissions for log files

**Database Connection Failed**
- Verify database credentials in config
- Ensure database server is running
- Check network connectivity

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) for creating Claude and MCP
- [Model Context Protocol](https://modelcontextprotocol.io/) documentation
- The open-source community

## 📞 Support

- 🐛 [Report a Bug](https://github.com/yourusername/mcp-servers/issues)
- 💡 [Request a Feature](https://github.com/yourusername/mcp-servers/issues)
- 📖 [MCP Documentation](https://modelcontextprotocol.io/docs)
- 💬 [Discussions](https://github.com/yourusername/mcp-servers/discussions)

## 🗺️ Roadmap

- [ ] Add MongoDB support
- [ ] Redis integration
- [ ] Kubernetes tools
- [ ] AWS/Cloud provider integrations
- [ ] CI/CD pipeline tools
- [ ] Slack/Discord notifications
- [ ] Advanced log analysis with AI
- [ ] Performance monitoring dashboard

---

**Made with ❤️ for the developer community**

*If you find this useful, please ⭐ star the repository!*