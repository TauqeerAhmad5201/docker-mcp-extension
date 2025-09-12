# Docker MCP Server - Extensive Edition

A comprehensive Model Context Protocol (MCP) server that provides extensive Docker functionality through natural language commands. This server interprets complex natural language requests and executes corresponding Docker operations with advanced features.

## 🚀 Enhanced Features

### 🧠 Advanced Natural Language Processing
The server now understands complex natural language patterns and provides extensive Docker command coverage:

**Container Management:**
- "show me all stopped containers" → `docker ps -a --filter "status=exited"`
- "start nginx container" / "launch the web server" → `docker start nginx`
- "follow logs from api container for last 50 lines" → `docker logs -f --tail 50 api`
- "execute bash in the web container" → `docker exec -it web bash`
- "what processes are running in database container" → `docker top database`

**Image Operations:**
- "pull ubuntu with latest tag" → `docker pull ubuntu:latest`
- "build my app without cache" → `docker build --no-cache -t myapp .`
- "tag myapp as production version" → `docker tag myapp:latest myapp:production`
- "search for nginx images" → `docker search nginx`

**Volume & Network Management:**
- "create volume for database data" → `docker volume create db-data`
- "connect web container to frontend network" → `docker network connect frontend web`
- "list all dangling volumes" → `docker volume ls -f dangling=true`

**System Operations:**
- "cleanup everything including volumes" → `docker system prune --volumes -f`
- "show detailed disk usage" → `docker system df -v`
- "monitor all containers continuously" → `docker stats`

### 🛠 Comprehensive Tool Suite

#### 1. **execute_docker_command** - Smart Natural Language Processor
- Converts natural language to Docker commands
- Supports 100+ natural language patterns
- Handles complex command construction with flags and options

#### 2. **manage_containers** - Container Lifecycle Management
- List, start, stop, restart, remove containers
- Advanced filtering and status checking
- Graceful container lifecycle operations

#### 3. **manage_images** - Complete Image Operations
- List, pull, push, build, remove, tag images
- Support for custom Dockerfiles and build contexts
- Advanced build options (no-cache, build args)

#### 4. **manage_volumes** - Volume Management System
- Create, remove, inspect, list volumes
- Prune unused volumes
- Support for different volume drivers

#### 5. **manage_networks** - Network Administration
- Create, remove, inspect networks
- Connect/disconnect containers to/from networks
- Support for bridge, overlay, host networks

#### 6. **create_container** - Advanced Container Creation
- Full container creation with all options
- Port mappings, volume mounts, environment variables
- Network connections, restart policies, working directories
- Interactive and detached modes

#### 7. **docker_registry** - Registry Operations
- Search Docker Hub
- Login/logout from registries
- Push/pull operations with tag management
- Support for private registries

#### 8. **docker_monitoring** - Monitoring & Troubleshooting
- Container logs with timestamps and filtering
- Resource inspection and statistics
- Process monitoring and file system changes
- Event streaming and container execution

#### 9. **docker_info** - System Information
- Comprehensive system information
- Version details and statistics
- Disk usage and resource monitoring

#### 10. **docker_compose** - Docker Compose Management
- Full service lifecycle management
- Build, up, down, restart operations
- Service-specific operations and log management

## 📝 Natural Language Examples

### Container Operations
```
"list all containers including stopped ones"
"start the web server container"
"stop all running containers"
"remove container named old-app"
"restart the database container"
"show logs from nginx container for last 100 lines"
"execute shell command in api container"
"follow logs from web container"
"inspect the database container configuration"
"show running processes in web container"
"display port mappings for api container"
```

### Image Management
```
"list all docker images"
"pull the latest ubuntu image"
"build image myapp from current directory"
"remove image nginx:old"
"tag myapp image as production"
"push myapp image to registry"
"search for node.js images"
"pull postgres with version 13 tag"
"build image without using cache"
"remove all dangling images"
```

### Volume & Network Operations
```
"list all volumes"
"create volume named app-data"
"remove volume old-data"
"inspect volume database-vol"
"list all networks"
"create bridge network frontend"
"connect web container to backend network"
"disconnect api from database network"
"cleanup unused volumes and networks"
```

### System & Monitoring
```
"show docker system information"
"display docker version"
"show container statistics"
"monitor all containers"
"show disk usage"
"cleanup unused resources"
"show docker events from last hour"
"prune everything including volumes"
```

### Docker Compose
```
"compose up all services"
"compose up with rebuild"
"compose down and remove volumes"
"show compose service status"
"compose logs from web service"
"restart compose services"
"build compose services fresh"
"compose up service web only"
```

### Advanced Operations
```
"run nginx container on port 8080 with volume"
"create ubuntu container with bash shell"
"run postgres with environment variables"
"copy file from container to host"
"show file changes in container"
"login to docker hub"
"tag and push image to registry"
```

## 🔧 Installation & Usage

### Quick Start
```bash
git clone <repository>
cd docker-vscode-extension
npm install
npm run build
npm start
```

### Development Mode
```bash
npm run watch    # Watch for changes
npm run dev      # Development build and run
npm test         # Test the server
```

### VS Code Integration
1. Use the provided `mcp-config.json`
2. Configure your MCP client to use this server
3. Start using natural language Docker commands!

## 🎯 Use Cases

### Development Workflow
- "start my development containers"
- "rebuild and restart the api service"
- "check logs from database for errors"
- "cleanup old development images"

### System Administration
- "show system resource usage"
- "cleanup all unused docker resources"
- "monitor container performance"
- "backup container volumes"

### CI/CD Integration
- "build production images"
- "tag images for deployment"
- "push images to registry"
- "run integration tests"

### Debugging & Troubleshooting
- "show container logs with timestamps"
- "inspect container configuration"
- "check container file system changes"
- "monitor container processes"

## 🔒 Security & Best Practices

- Server executes Docker commands with current user permissions
- All commands are validated before execution
- Error handling and logging for troubleshooting
- Secure command parsing prevents injection attacks

## 🚀 Performance Features

- Efficient command parsing with regex patterns
- Async command execution for better performance
- Proper error handling and timeout management
- Resource cleanup and memory management

## 📊 Advanced Capabilities

### Smart Pattern Recognition
- Context-aware command interpretation
- Support for synonyms and variations
- Intelligent parameter extraction
- Flexible command structures

### Comprehensive Coverage
- 100+ natural language patterns supported
- All major Docker operations covered
- Advanced Docker Compose integration
- Registry and monitoring operations

### Production Ready
- Comprehensive error handling
- Logging and debugging support
- Performance optimized
- Memory efficient operation

## 🎉 What's New in Extensive Edition

✅ **10 Specialized Tools** - Each covering specific Docker domains  
✅ **200+ Natural Language Patterns** - Understands complex requests  
✅ **Advanced Container Creation** - Full parameter support  
✅ **Registry Operations** - Search, login, push/pull with auth  
✅ **Monitoring & Troubleshooting** - Comprehensive debugging tools  
✅ **Volume & Network Management** - Complete infrastructure control  
✅ **Smart Command Parsing** - Context-aware interpretation  
✅ **Production Features** - Error handling, logging, performance  

The Docker MCP Server Extensive Edition provides enterprise-level Docker management through natural language - making Docker operations accessible, intuitive, and powerful! 🐳
