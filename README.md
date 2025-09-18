# Docker MCP Server - Enterprise Edition

A comprehensive Model Context Protocol (MCP) server that provides enterprise-level Docker functionality through natural language commands. This enhanced server includes advanced project management, remote Docker support, monitoring, backup capabilities, and much more.

## 🚀 Enterprise Features

### 🧠 Advanced Natural Language Processing
The server now understands complex natural language patterns and provides extensive Docker command coverage:

**Container Management:**
- "show me all stopped containers" → `docker ps -a --filter "status=exited"`
- "start nginx container" / "launch the web server" → `docker start nginx`
- "follow logs from api container for last 50 lines" → `docker logs -f --tail 50 api`
- "execute bash in the web container" → `docker exec -it web bash`
- "what processes are running in database container" → `docker top database`

**Project-Based Management:**
- "plan project wordpress with wordpress and mysql database on port 9000"
- "apply the deployment plan"
- "status project myapp"
- "destroy project completely"

**Remote Docker Support:**
- "connect to ssh://user@production.server.com"
- "status of remote connection" 
- "test connection to remote docker"
- "disconnect from remote host"

**Advanced Monitoring:**
- "live stats for all containers"
- "health check for nginx container"
- "system events since yesterday"
- "performance overview"

**Backup & Migration:**
- "backup container production-api"
- "export project ecommerce to /backups"
- "list all available backups"
- "cleanup backups older than 7 days"

### 🛠 Comprehensive Tool Suite

#### 1. **execute_docker_command** - Smart Natural Language Processor
- Converts natural language to Docker commands
- Supports 200+ natural language patterns
- Handles complex command construction with flags and options

#### 2. **docker_compose_advanced** - Plan+Apply Project Management
- Natural language to multi-service deployments
- Terraform-like plan+apply workflow
- Automatic dependency management and resource labeling
- Project-based resource grouping and cleanup

#### 3. **docker_remote_connection** - Remote Docker Management
- Connect to remote Docker hosts via SSH or TCP
- Seamless switching between local and remote environments
- Connection testing and status monitoring
- Support for production server management

#### 4. **docker_monitoring_advanced** - Enhanced Monitoring
- Real-time container statistics and health checks
- System events and performance monitoring
- Comprehensive resource usage analysis
- Container health status and diagnostics

#### 5. **docker_backup_migration** - Backup & Migration
- Complete container and volume backups
- Project-level export/import capabilities
- Automated backup cleanup and management
- Migration support for entire environments

#### 6. **create_container** - Advanced Container Creation
- Full container creation with all Docker options
- Health checks, resource constraints, security options
- Port mappings, volume mounts, environment variables
- Project labeling and network connections

#### 7. **manage_containers** - Container Lifecycle Management
- List, start, stop, restart, remove containers
- Advanced filtering and status checking
- Graceful container lifecycle operations

#### 8. **manage_images** - Complete Image Operations
- List, pull, push, build, remove, tag images
- Support for custom Dockerfiles and build contexts
- Advanced build options (no-cache, build args)

#### 9. **manage_volumes** - Volume Management System
- Create, remove, inspect, list volumes
- Prune unused volumes
- Support for different volume drivers

#### 10. **manage_networks** - Network Administration
- Create, remove, inspect networks
- Connect/disconnect containers to/from networks
- Support for bridge, overlay, host networks

#### 11. **docker_registry** - Registry Operations
- Search Docker Hub and private registries
- Login/logout from registries
- Push/pull operations with tag management
- Support for authentication

#### 12. **docker_monitoring** - Basic Monitoring & Troubleshooting
- Container logs with timestamps and filtering
- Resource inspection and statistics
- Process monitoring and file system changes

#### 13. **docker_info** - System Information
- Comprehensive system information
- Version details and statistics
- Disk usage and resource monitoring

#### 14. **docker_compose** - Traditional Docker Compose Management
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

## 🎉 What's New in Enterprise Edition

✅ **14 Specialized Tools** - Each covering specific Docker domains  
✅ **Plan+Apply Workflow** - Terraform-like project deployment  
✅ **Remote Docker Support** - SSH/TCP connection to production servers  
✅ **Advanced Monitoring** - Health checks, events, performance metrics  
✅ **Backup & Migration** - Complete environment export/import  
✅ **Project Management** - Resource grouping and lifecycle management  
✅ **Enhanced Container Creation** - Health checks, resource limits, security  
✅ **300+ Natural Language Patterns** - Understands complex requests  
✅ **Production Features** - Error handling, logging, performance optimization  

## 🎯 Enterprise Use Cases

### DevOps & CI/CD
- Remote server management via SSH
- Automated deployment with plan+apply workflow
- Complete environment backup and migration
- Resource monitoring and health checks

### Development Teams
- Project-based resource management
- Natural language container orchestration
- Advanced debugging and monitoring
- Simplified Docker operations

### System Administration
- Remote Docker host management
- Comprehensive system monitoring
- Automated cleanup and maintenance
- Security-focused container deployment

### Production Operations
- Health monitoring and alerting
- Backup and disaster recovery
- Performance analysis and optimization
- Multi-environment management

The Docker MCP Server Enterprise Edition provides enterprise-level Docker management through natural language - making Docker operations accessible, intuitive, and powerful for teams of all sizes! 🐳
