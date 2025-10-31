#!/bin/bash

# Setup script for MCP servers
echo "🚀 Setting up MCP Servers..."

# Create project directory
PROJECT_DIR="$HOME/Projects/mcp-server"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "📁 Project directory: $PROJECT_DIR"

# Create package.json
cat > package.json << 'EOF'
{
  "name": "my-mcp-servers",
  "version": "1.0.0",
  "type": "module",
  "description": "Collection of MCP servers for development workflow",
  "scripts": {
    "start:filesystem": "node server.js",
    "start:db": "node database-server.js",
    "start:git": "node git-server.js",
    "start:api": "node api-testing-server.js",
    "start:devtools": "node devtools-server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "pg": "^8.11.3",
    "mysql2": "^3.6.5"
  }
}
EOF

echo "📦 Installing dependencies..."
npm install

echo "✅ Dependencies installed!"

# Create .env.example file
cat > .env.example << 'EOF'
# PostgreSQL Configuration
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=your_database
PG_USER=your_user
PG_PASSWORD=your_password

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=your_database
MYSQL_USER=root
MYSQL_PASSWORD=your_password
EOF

echo "📝 Created .env.example - Copy this to .env and update with your credentials"

# Detect Node.js path
NODE_PATH=$(which node)
echo "🔍 Detected Node.js at: $NODE_PATH"

# Create Claude Desktop config
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
mkdir -p "$CLAUDE_CONFIG_DIR"

cat > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json" << EOF
{
  "mcpServers": {
    "filesystem": {
      "command": "$NODE_PATH",
      "args": ["$PROJECT_DIR/server.js"]
    },
    "database": {
      "command": "$NODE_PATH",
      "args": ["$PROJECT_DIR/database-server.js"],
      "env": {
        "PG_HOST": "localhost",
        "PG_PORT": "5432",
        "PG_DATABASE": "your_database",
        "PG_USER": "your_user",
        "PG_PASSWORD": "your_password",
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_DATABASE": "your_database",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password"
      }
    },
    "git": {
      "command": "$NODE_PATH",
      "args": ["$PROJECT_DIR/git-server.js"]
    },
    "api-testing": {
      "command": "$NODE_PATH",
      "args": ["$PROJECT_DIR/api-testing-server.js"]
    },
    "devtools": {
      "command": "$NODE_PATH",
      "args": ["$PROJECT_DIR/devtools-server.js"]
    }
  }
}
EOF

echo "⚙️  Claude Desktop config created at: $CLAUDE_CONFIG_DIR/claude_desktop_config.json"

echo ""
echo "✨ Setup complete! Next steps:"
echo ""
echo "1. Copy the server files to: $PROJECT_DIR"
echo "   - server.js (filesystem)"
echo "   - database-server.js"
echo "   - git-server.js"
echo "   - api-testing-server.js"
echo "   - devtools-server.js"
echo ""
echo "2. Update database credentials in: $CLAUDE_CONFIG_DIR/claude_desktop_config.json"
echo ""
echo "3. Restart Claude Desktop"
echo ""
echo "4. Test a server manually:"
echo "   cd $PROJECT_DIR"
echo "   node server.js"
echo ""
echo "🎉 Happy coding!"