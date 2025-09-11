# Docker MCP Server

A Model Context Protocol (MCP) server that allows natural language interaction with Docker commands. This server interprets natural language requests and executes corresponding Docker operations.

## Features

### Natural Language Processing
The server can understand and execute Docker commands from natural language input:

- **Container Operations**: "list containers", "start container nginx", "stop container myapp"
- **Image Operations**: "list images", "pull image ubuntu", "remove image old-app"
- **System Information**: "system info", "version", "docker stats", "disk usage"
- **Docker Compose**: "compose up", "compose down", "compose logs"
- **Network & Volumes**: "list networks", "list volumes"

### Available Tools

1. **execute_docker_command**: Execute Docker commands using natural language or direct commands
2. **manage_containers**: Manage Docker containers (list, start, stop, remove, restart)
3. **manage_images**: Manage Docker images (list, pull, remove, build)
4. **docker_info**: Get Docker system information and statistics
5. **docker_compose**: Manage Docker Compose services

### Available Resources

- **docker-help**: Documentation and examples of supported natural language commands

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Direct Execution
You can run the MCP server directly:
```bash
npm start
```

### VS Code Integration
1. Copy the `mcp-config.json` to your VS Code settings directory
2. Update the path in the config to match your installation
3. Configure VS Code to use the MCP server

### Natural Language Examples

- "show me all running containers"
- "stop the nginx container"
- "pull the latest ubuntu image"
- "list all images"
- "docker system info"
- "compose up with build"
- "remove container old-app"

### Direct Docker Commands
You can also pass direct Docker commands:
- "docker ps -a"
- "docker images"
- "docker system df"

## Configuration

The server uses stdio transport for communication with MCP clients. It automatically handles:

- Natural language parsing
- Docker command execution
- Error handling and reporting
- Resource and tool registration

## Requirements

- Node.js v18 or higher
- Docker installed and accessible from command line
- Docker Compose (optional, for compose commands)

## Security

This server executes Docker commands on your system. Only use it in trusted environments and be cautious with the commands you execute.

## Error Handling

The server provides detailed error messages and handles:
- Missing Docker installation
- Invalid commands
- Permission errors
- Network issues

## Development

1. Install dependencies: `npm install`
2. Run in development mode: `npm run dev`
3. Build for production: `npm run build`
4. Run tests: `npm test`

## License

MIT License
