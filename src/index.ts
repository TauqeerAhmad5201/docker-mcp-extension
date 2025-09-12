#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Create the MCP server
const server = new McpServer({
  name: "docker-mcp-server",
  version: "1.0.0"
});

// Helper function to execute Docker commands
async function executeDockerCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command);
    return result;
  } catch (error: any) {
    throw new Error(`Docker command failed: ${error.message}`);
  }
}

// Advanced natural language parsing with extensive Docker feature coverage
function parseDockerCommand(naturalLanguage: string): string {
  const input = naturalLanguage.toLowerCase().trim();
  
  // === CONTAINER OPERATIONS ===
  
  // List containers with various formats
  if (input.match(/(list|show|display|get)\s+(all\s+)?(containers?|running|stopped)/)) {
    if (input.includes("all") || input.includes("stopped")) {
      return "docker ps -a";
    }
    if (input.includes("running")) {
      return "docker ps";
    }
    return "docker ps -a";
  }
  
  if (input.match(/(what|which)\s+containers?\s+are\s+(running|active)/)) {
    return "docker ps";
  }
  
  // Container lifecycle operations
  if (input.match(/(start|run|launch)\s+(container\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(start|run|launch)\s+(?:container\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker start ${match[2]}`;
    }
  }
  
  if (input.match(/(stop|halt|kill)\s+(container\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(stop|halt|kill)\s+(?:container\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      const action = match[1] === "kill" ? "kill" : "stop";
      return `docker ${action} ${match[3]}`;
    }
  }
  
  if (input.match(/(restart|reboot)\s+(container\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(restart|reboot)\s+(?:container\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker restart ${match[3]}`;
    }
  }
  
  if (input.match(/(remove|delete|rm)\s+(container\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(remove|delete|rm)\s+(?:container\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker rm ${match[3]}`;
    }
  }
  
  // Container inspection and logs
  if (input.match(/(inspect|examine|details?)\s+(container\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(inspect|examine|details?)\s+(?:container\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker inspect ${match[3]}`;
    }
  }
  
  if (input.match(/(logs?|output)\s+(from\s+)?(container\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(logs?|output)\s+(?:from\s+)?(?:container\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      const follow = input.includes("follow") || input.includes("tail") ? " -f" : "";
      const lines = input.match(/(\d+)\s+lines?/) ? ` --tail ${input.match(/(\d+)\s+lines?/)![1]}` : "";
      return `docker logs${follow}${lines} ${match[2]}`;
    }
  }
  
  if (input.match(/(exec|execute|run)\s+(in|into)\s+(container\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(exec|execute|run)\s+(?:in|into)\s+(?:container\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      const command = input.includes("bash") ? "bash" : input.includes("sh") ? "sh" : "bash";
      return `docker exec -it ${match[2]} ${command}`;
    }
  }
  
  // === IMAGE OPERATIONS ===
  
  // List images
  if (input.match(/(list|show|display|get)\s+(all\s+)?(images?|repos?|repositories)/)) {
    if (input.includes("dangling")) {
      return "docker images -f dangling=true";
    }
    return "docker images";
  }
  
  // Pull images
  if (input.match(/(pull|download|fetch)\s+(image\s+)?([a-zA-Z0-9/_.-]+)(:([a-zA-Z0-9._-]+))?/)) {
    const match = input.match(/(pull|download|fetch)\s+(?:image\s+)?([a-zA-Z0-9/_.-]+)(?::([a-zA-Z0-9._-]+))?/);
    if (match) {
      const image = match[2];
      const tag = match[3] || (input.includes("latest") ? "latest" : "");
      return `docker pull ${image}${tag ? `:${tag}` : ""}`;
    }
  }
  
  // Push images
  if (input.match(/(push|upload)\s+(image\s+)?([a-zA-Z0-9/_.-]+)(:([a-zA-Z0-9._-]+))?/)) {
    const match = input.match(/(push|upload)\s+(?:image\s+)?([a-zA-Z0-9/_.-]+)(?::([a-zA-Z0-9._-]+))?/);
    if (match) {
      const image = match[2];
      const tag = match[3] || "";
      return `docker push ${image}${tag ? `:${tag}` : ""}`;
    }
  }
  
  // Build images
  if (input.match(/(build|create)\s+(image\s+)?([a-zA-Z0-9/_.-]+)/)) {
    const match = input.match(/(build|create)\s+(?:image\s+)?([a-zA-Z0-9/_.-]+)/);
    if (match) {
      const dockerfile = input.includes("dockerfile") ? ` -f ${input.match(/dockerfile[:\s]+([^\s]+)/)?.[1] || "Dockerfile"}` : "";
      const context = input.match(/(?:from|in)\s+([^\s]+)/) ? ` ${input.match(/(?:from|in)\s+([^\s]+)/)![1]}` : " .";
      return `docker build${dockerfile} -t ${match[3]}${context}`;
    }
  }
  
  // Remove images
  if (input.match(/(remove|delete|rm)\s+(image\s+)?([a-zA-Z0-9/_.-]+)/)) {
    const match = input.match(/(remove|delete|rm)\s+(?:image\s+)?([a-zA-Z0-9/_.-]+)/);
    if (match) {
      const force = input.includes("force") ? " -f" : "";
      return `docker rmi${force} ${match[3]}`;
    }
  }
  
  // Tag images
  if (input.match(/(tag|label)\s+(image\s+)?([a-zA-Z0-9/_.-]+)\s+(as\s+)?([a-zA-Z0-9/_.-]+)/)) {
    const match = input.match(/(tag|label)\s+(?:image\s+)?([a-zA-Z0-9/_.-]+)\s+(?:as\s+)?([a-zA-Z0-9/_.-]+)/);
    if (match) {
      return `docker tag ${match[2]} ${match[3]}`;
    }
  }
  
  // === VOLUME OPERATIONS ===
  
  if (input.match(/(list|show|display)\s+(all\s+)?(volumes?|storage)/)) {
    if (input.includes("dangling")) {
      return "docker volume ls -f dangling=true";
    }
    return "docker volume ls";
  }
  
  if (input.match(/(create|make)\s+(volume\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(create|make)\s+(?:volume\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker volume create ${match[2]}`;
    }
  }
  
  if (input.match(/(remove|delete)\s+(volume\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(remove|delete)\s+(?:volume\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker volume rm ${match[3]}`;
    }
  }
  
  if (input.match(/(inspect|examine)\s+(volume\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(inspect|examine)\s+(?:volume\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker volume inspect ${match[3]}`;
    }
  }
  
  // === NETWORK OPERATIONS ===
  
  if (input.match(/(list|show|display)\s+(all\s+)?(networks?|networking)/)) {
    return "docker network ls";
  }
  
  if (input.match(/(create|make)\s+(network\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(create|make)\s+(?:network\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      const driver = input.includes("bridge") ? " --driver bridge" : input.includes("overlay") ? " --driver overlay" : "";
      return `docker network create${driver} ${match[2]}`;
    }
  }
  
  if (input.match(/(remove|delete)\s+(network\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(remove|delete)\s+(?:network\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker network rm ${match[3]}`;
    }
  }
  
  if (input.match(/(connect|attach)\s+([a-zA-Z0-9_-]+)\s+(to\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(connect|attach)\s+([a-zA-Z0-9_-]+)\s+(?:to\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker network connect ${match[3]} ${match[2]}`;
    }
  }
  
  if (input.match(/(disconnect|detach)\s+([a-zA-Z0-9_-]+)\s+(from\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(disconnect|detach)\s+([a-zA-Z0-9_-]+)\s+(?:from\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker network disconnect ${match[4]} ${match[2]}`;
    }
  }
  
  // === SYSTEM OPERATIONS ===
  
  if (input.match(/(system\s+)?(info|information|details)/)) {
    return "docker system info";
  }
  
  if (input.match(/(version|ver)/)) {
    return "docker --version && docker-compose --version";
  }
  
  if (input.match(/(stats|statistics|status|monitor)/)) {
    const noStream = !input.includes("follow") && !input.includes("continuous");
    return `docker stats${noStream ? " --no-stream" : ""}`;
  }
  
  if (input.match(/(disk\s+usage|space|storage\s+usage)/)) {
    const verbose = input.includes("verbose") || input.includes("detailed") ? " -v" : "";
    return `docker system df${verbose}`;
  }
  
  if (input.match(/(clean\s*up?|prune|cleanup)/)) {
    if (input.includes("all") || input.includes("everything")) {
      return "docker system prune -a -f";
    }
    if (input.includes("volumes")) {
      return "docker system prune --volumes -f";
    }
    return "docker system prune -f";
  }
  
  // === DOCKER COMPOSE OPERATIONS ===
  
  if (input.match(/(compose\s+)?(up|start|launch)/)) {
    const detached = !input.includes("foreground") && !input.includes("attached");
    const build = input.includes("build") || input.includes("rebuild");
    const service = input.match(/service\s+([a-zA-Z0-9_-]+)/) ? ` ${input.match(/service\s+([a-zA-Z0-9_-]+)/)![1]}` : "";
    return `docker-compose up${detached ? " -d" : ""}${build ? " --build" : ""}${service}`;
  }
  
  if (input.match(/(compose\s+)?(down|stop|halt)/)) {
    const volumes = input.includes("volumes") || input.includes("data") ? " --volumes" : "";
    const images = input.includes("images") ? " --rmi all" : "";
    return `docker-compose down${volumes}${images}`;
  }
  
  if (input.match(/(compose\s+)?(logs|output)/)) {
    const follow = input.includes("follow") || input.includes("tail") ? " -f" : "";
    const service = input.match(/(?:from\s+|service\s+)([a-zA-Z0-9_-]+)/) ? ` ${input.match(/(?:from\s+|service\s+)([a-zA-Z0-9_-]+)/)![1]}` : "";
    return `docker-compose logs${follow}${service}`;
  }
  
  if (input.match(/(compose\s+)?(ps|status|services)/)) {
    return "docker-compose ps";
  }
  
  if (input.match(/(compose\s+)?(restart|reboot)/)) {
    const service = input.match(/service\s+([a-zA-Z0-9_-]+)/) ? ` ${input.match(/service\s+([a-zA-Z0-9_-]+)/)![1]}` : "";
    return `docker-compose restart${service}`;
  }
  
  if (input.match(/(compose\s+)?(build|rebuild)/)) {
    const service = input.match(/service\s+([a-zA-Z0-9_-]+)/) ? ` ${input.match(/service\s+([a-zA-Z0-9_-]+)/)![1]}` : "";
    const noCache = input.includes("fresh") || input.includes("clean") ? " --no-cache" : "";
    return `docker-compose build${noCache}${service}`;
  }
  
  // === ADVANCED OPERATIONS ===
  
  // Search Docker Hub
  if (input.match(/(search|find)\s+(for\s+)?([a-zA-Z0-9/_.-]+)/)) {
    const match = input.match(/(search|find)\s+(?:for\s+)?([a-zA-Z0-9/_.-]+)/);
    if (match) {
      return `docker search ${match[2]}`;
    }
  }
  
  // Copy files
  if (input.match(/(copy|cp)\s+([^\s]+)\s+(from|to)\s+([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(copy|cp)\s+([^\s]+)\s+(from|to)\s+([a-zA-Z0-9_-]+)/);
    if (match) {
      const [, , path, direction, container] = match;
      if (direction === "from") {
        return `docker cp ${container}:${path} .`;
      } else {
        return `docker cp ${path} ${container}:/tmp/`;
      }
    }
  }
  
  // Port mapping info
  if (input.match(/(port|ports)\s+(of\s+|for\s+)?([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(port|ports)\s+(?:of\s+|for\s+)?([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker port ${match[2]}`;
    }
  }
  
  // Process list in container
  if (input.match(/(processes?|ps|top)\s+(in|inside)\s+([a-zA-Z0-9_-]+)/)) {
    const match = input.match(/(processes?|ps|top)\s+(?:in|inside)\s+([a-zA-Z0-9_-]+)/);
    if (match) {
      return `docker top ${match[3]}`;
    }
  }
  
  // === REGISTRY OPERATIONS ===
  
  if (input.match(/login\s+(to\s+)?([a-zA-Z0-9._-]+)?/)) {
    const match = input.match(/login\s+(?:to\s+)?([a-zA-Z0-9._-]+)?/);
    const registry = match?.[1] || "";
    return `docker login${registry ? ` ${registry}` : ""}`;
  }
  
  if (input.match(/logout\s+(from\s+)?([a-zA-Z0-9._-]+)?/)) {
    const match = input.match(/logout\s+(?:from\s+)?([a-zA-Z0-9._-]+)?/);
    const registry = match?.[1] || "";
    return `docker logout${registry ? ` ${registry}` : ""}`;
  }
  
  // === FALLBACK ===
  
  // If no pattern matches but it starts with docker, pass through
  if (input.startsWith("docker")) {
    return input;
  }
  
  // General help
  if (input.match(/(help|usage|commands)/)) {
    return "docker --help";
  }
  
  // Default to treating as direct docker command
  return `docker ${input}`;
}

// Register Docker command execution tool
server.registerTool(
  "execute_docker_command",
  {
    title: "Execute Docker Command",
    description: "Execute Docker commands using natural language or direct commands",
    inputSchema: {
      command: z.string().describe("Natural language command or direct Docker command to execute")
    }
  },
  async ({ command }) => {
    try {
      // Parse natural language to Docker command
      const dockerCommand = parseDockerCommand(command);
      
      // Execute the Docker command
      const result = await executeDockerCommand(dockerCommand);
      
      return {
        content: [
          {
            type: "text",
            text: `Executed: ${dockerCommand}\n\nOutput:\n${result.stdout}${result.stderr ? `\nErrors:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing Docker command: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker container management tool
server.registerTool(
  "manage_containers",
  {
    title: "Manage Docker Containers",
    description: "Manage Docker containers (list, start, stop, remove)",
    inputSchema: {
      action: z.enum(["list", "start", "stop", "remove", "restart"]).describe("Action to perform on containers"),
      container: z.string().optional().describe("Container name or ID (required for start, stop, remove, restart)"),
      all: z.boolean().optional().describe("Include stopped containers when listing")
    }
  },
  async ({ action, container, all }) => {
    try {
      let command: string;
      
      switch (action) {
        case "list":
          command = all ? "docker ps -a" : "docker ps";
          break;
        case "start":
          if (!container) throw new Error("Container name or ID is required for start action");
          command = `docker start ${container}`;
          break;
        case "stop":
          if (!container) throw new Error("Container name or ID is required for stop action");
          command = `docker stop ${container}`;
          break;
        case "remove":
          if (!container) throw new Error("Container name or ID is required for remove action");
          command = `docker rm ${container}`;
          break;
        case "restart":
          if (!container) throw new Error("Container name or ID is required for restart action");
          command = `docker restart ${container}`;
          break;
      }
      
      const result = await executeDockerCommand(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Container ${action} completed:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error managing containers: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker image management tool
server.registerTool(
  "manage_images",
  {
    title: "Manage Docker Images",
    description: "Manage Docker images (list, pull, remove, build)",
    inputSchema: {
      action: z.enum(["list", "pull", "remove", "build"]).describe("Action to perform on images"),
      image: z.string().optional().describe("Image name or ID (required for pull, remove, build)"),
      tag: z.string().optional().describe("Tag for the image (optional for pull, required for build)"),
      dockerfile: z.string().optional().describe("Path to Dockerfile (required for build)")
    }
  },
  async ({ action, image, tag, dockerfile }) => {
    try {
      let command: string;
      
      switch (action) {
        case "list":
          command = "docker images";
          break;
        case "pull":
          if (!image) throw new Error("Image name is required for pull action");
          command = tag ? `docker pull ${image}:${tag}` : `docker pull ${image}`;
          break;
        case "remove":
          if (!image) throw new Error("Image name or ID is required for remove action");
          command = `docker rmi ${image}`;
          break;
        case "build":
          if (!image) throw new Error("Image name is required for build action");
          const buildTag = tag ? `${image}:${tag}` : image;
          const context = dockerfile ? dockerfile : ".";
          command = `docker build -t ${buildTag} ${context}`;
          break;
      }
      
      const result = await executeDockerCommand(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Image ${action} completed:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error managing images: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker system information tool
server.registerTool(
  "docker_info",
  {
    title: "Docker System Information",
    description: "Get Docker system information and statistics",
    inputSchema: {
      type: z.enum(["info", "version", "stats", "disk_usage"]).describe("Type of information to retrieve")
    }
  },
  async ({ type }) => {
    try {
      let command: string;
      
      switch (type) {
        case "info":
          command = "docker system info";
          break;
        case "version":
          command = "docker --version && docker-compose --version";
          break;
        case "stats":
          command = "docker stats --no-stream";
          break;
        case "disk_usage":
          command = "docker system df";
          break;
      }
      
      const result = await executeDockerCommand(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Docker ${type}:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting Docker information: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker volume management tool
server.registerTool(
  "manage_volumes",
  {
    title: "Docker Volume Management",
    description: "Manage Docker volumes (list, create, remove, inspect)",
    inputSchema: {
      action: z.enum(["list", "create", "remove", "inspect", "prune"]).describe("Action to perform on volumes"),
      volume: z.string().optional().describe("Volume name (required for create, remove, inspect)"),
      driver: z.string().optional().describe("Volume driver (optional for create)")
    }
  },
  async ({ action, volume, driver }) => {
    try {
      let command: string;
      
      switch (action) {
        case "list":
          command = "docker volume ls";
          break;
        case "create":
          if (!volume) throw new Error("Volume name is required for create action");
          command = `docker volume create${driver ? ` --driver ${driver}` : ""} ${volume}`;
          break;
        case "remove":
          if (!volume) throw new Error("Volume name is required for remove action");
          command = `docker volume rm ${volume}`;
          break;
        case "inspect":
          if (!volume) throw new Error("Volume name is required for inspect action");
          command = `docker volume inspect ${volume}`;
          break;
        case "prune":
          command = "docker volume prune -f";
          break;
      }
      
      const result = await executeDockerCommand(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Volume ${action} completed:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error managing volumes: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker network management tool
server.registerTool(
  "manage_networks",
  {
    title: "Docker Network Management",
    description: "Manage Docker networks (list, create, remove, inspect, connect, disconnect)",
    inputSchema: {
      action: z.enum(["list", "create", "remove", "inspect", "connect", "disconnect", "prune"]).describe("Action to perform on networks"),
      network: z.string().optional().describe("Network name (required for create, remove, inspect, connect, disconnect)"),
      container: z.string().optional().describe("Container name (required for connect, disconnect)"),
      driver: z.string().optional().describe("Network driver (bridge, overlay, host, none)")
    }
  },
  async ({ action, network, container, driver }) => {
    try {
      let command: string;
      
      switch (action) {
        case "list":
          command = "docker network ls";
          break;
        case "create":
          if (!network) throw new Error("Network name is required for create action");
          command = `docker network create${driver ? ` --driver ${driver}` : ""} ${network}`;
          break;
        case "remove":
          if (!network) throw new Error("Network name is required for remove action");
          command = `docker network rm ${network}`;
          break;
        case "inspect":
          if (!network) throw new Error("Network name is required for inspect action");
          command = `docker network inspect ${network}`;
          break;
        case "connect":
          if (!network || !container) throw new Error("Network and container names are required for connect action");
          command = `docker network connect ${network} ${container}`;
          break;
        case "disconnect":
          if (!network || !container) throw new Error("Network and container names are required for disconnect action");
          command = `docker network disconnect ${network} ${container}`;
          break;
        case "prune":
          command = "docker network prune -f";
          break;
      }
      
      const result = await executeDockerCommand(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Network ${action} completed:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error managing networks: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker container creation and management tool
server.registerTool(
  "create_container",
  {
    title: "Create and Run Docker Containers",
    description: "Create and run Docker containers with advanced options",
    inputSchema: {
      image: z.string().describe("Docker image to run"),
      name: z.string().optional().describe("Container name"),
      ports: z.array(z.string()).optional().describe("Port mappings (e.g., ['8080:80', '3000:3000'])"),
      volumes: z.array(z.string()).optional().describe("Volume mounts (e.g., ['/host/path:/container/path'])"),
      environment: z.record(z.string()).optional().describe("Environment variables"),
      network: z.string().optional().describe("Network to connect to"),
      detached: z.boolean().optional().default(true).describe("Run in detached mode"),
      interactive: z.boolean().optional().default(false).describe("Run in interactive mode"),
      command: z.string().optional().describe("Command to run in container"),
      workdir: z.string().optional().describe("Working directory"),
      restart: z.enum(["no", "on-failure", "always", "unless-stopped"]).optional().describe("Restart policy")
    }
  },
  async ({ image, name, ports, volumes, environment, network, detached, interactive, command, workdir, restart }) => {
    try {
      let dockerCommand = "docker run";
      
      // Add flags
      if (detached && !interactive) dockerCommand += " -d";
      if (interactive) dockerCommand += " -it";
      if (name) dockerCommand += ` --name ${name}`;
      
      // Add port mappings
      if (ports && ports.length > 0) {
        ports.forEach(port => {
          dockerCommand += ` -p ${port}`;
        });
      }
      
      // Add volume mounts
      if (volumes && volumes.length > 0) {
        volumes.forEach(volume => {
          dockerCommand += ` -v ${volume}`;
        });
      }
      
      // Add environment variables
      if (environment) {
        Object.entries(environment).forEach(([key, value]) => {
          dockerCommand += ` -e ${key}=${value}`;
        });
      }
      
      // Add network
      if (network) dockerCommand += ` --network ${network}`;
      
      // Add working directory
      if (workdir) dockerCommand += ` -w ${workdir}`;
      
      // Add restart policy
      if (restart) dockerCommand += ` --restart ${restart}`;
      
      // Add image
      dockerCommand += ` ${image}`;
      
      // Add command
      if (command) dockerCommand += ` ${command}`;
      
      const result = await executeDockerCommand(dockerCommand);
      
      return {
        content: [
          {
            type: "text",
            text: `Container created successfully:\n\nCommand: ${dockerCommand}\n\nOutput:\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating container: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker registry and search tool
server.registerTool(
  "docker_registry",
  {
    title: "Docker Registry Operations",
    description: "Search Docker Hub, login/logout, push/pull operations",
    inputSchema: {
      action: z.enum(["search", "login", "logout", "push", "pull", "tag"]).describe("Registry action to perform"),
      query: z.string().optional().describe("Search query (required for search)"),
      image: z.string().optional().describe("Image name (required for push, pull, tag)"),
      tag: z.string().optional().describe("Image tag"),
      newTag: z.string().optional().describe("New tag name (required for tag action)"),
      registry: z.string().optional().describe("Registry URL (optional for login/logout)"),
      username: z.string().optional().describe("Username for login"),
      password: z.string().optional().describe("Password for login")
    }
  },
  async ({ action, query, image, tag, newTag, registry, username, password }) => {
    try {
      let command: string;
      
      switch (action) {
        case "search":
          if (!query) throw new Error("Search query is required");
          command = `docker search ${query}`;
          break;
        case "login":
          command = `docker login${registry ? ` ${registry}` : ""}`;
          if (username && password) {
            command += ` -u ${username} -p ${password}`;
          }
          break;
        case "logout":
          command = `docker logout${registry ? ` ${registry}` : ""}`;
          break;
        case "push":
          if (!image) throw new Error("Image name is required for push");
          command = `docker push ${image}${tag ? `:${tag}` : ""}`;
          break;
        case "pull":
          if (!image) throw new Error("Image name is required for pull");
          command = `docker pull ${image}${tag ? `:${tag}` : ""}`;
          break;
        case "tag":
          if (!image || !newTag) throw new Error("Image name and new tag are required for tag action");
          command = `docker tag ${image}${tag ? `:${tag}` : ""} ${newTag}`;
          break;
      }
      
      const result = await executeDockerCommand(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Registry ${action} completed:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error with registry operation: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker monitoring and troubleshooting tool
server.registerTool(
  "docker_monitoring",
  {
    title: "Docker Monitoring and Troubleshooting",
    description: "Monitor containers, get logs, inspect resources, and troubleshoot issues",
    inputSchema: {
      action: z.enum(["logs", "inspect", "exec", "top", "port", "stats", "events", "diff"]).describe("Monitoring action to perform"),
      container: z.string().optional().describe("Container name or ID"),
      follow: z.boolean().optional().describe("Follow log output"),
      tail: z.number().optional().describe("Number of lines to show from end of logs"),
      command: z.string().optional().describe("Command to execute in container (for exec)"),
      since: z.string().optional().describe("Show logs since timestamp"),
      until: z.string().optional().describe("Show logs until timestamp")
    }
  },
  async ({ action, container, follow, tail, command, since, until }) => {
    try {
      let dockerCommand: string;
      
      switch (action) {
        case "logs":
          if (!container) throw new Error("Container name is required for logs");
          dockerCommand = `docker logs`;
          if (follow) dockerCommand += " -f";
          if (tail) dockerCommand += ` --tail ${tail}`;
          if (since) dockerCommand += ` --since ${since}`;
          if (until) dockerCommand += ` --until ${until}`;
          dockerCommand += ` ${container}`;
          break;
        case "inspect":
          if (!container) throw new Error("Container name is required for inspect");
          dockerCommand = `docker inspect ${container}`;
          break;
        case "exec":
          if (!container) throw new Error("Container name is required for exec");
          const execCommand = command || "bash";
          dockerCommand = `docker exec -it ${container} ${execCommand}`;
          break;
        case "top":
          if (!container) throw new Error("Container name is required for top");
          dockerCommand = `docker top ${container}`;
          break;
        case "port":
          if (!container) throw new Error("Container name is required for port");
          dockerCommand = `docker port ${container}`;
          break;
        case "stats":
          dockerCommand = container ? `docker stats --no-stream ${container}` : "docker stats --no-stream";
          break;
        case "events":
          dockerCommand = "docker events --since 1h";
          if (container) dockerCommand += ` --filter container=${container}`;
          break;
        case "diff":
          if (!container) throw new Error("Container name is required for diff");
          dockerCommand = `docker diff ${container}`;
          break;
      }
      
      const result = await executeDockerCommand(dockerCommand);
      
      return {
        content: [
          {
            type: "text",
            text: `Monitoring ${action} completed:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error with monitoring operation: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register Docker Compose tool
server.registerTool(
  "docker_compose",
  {
    title: "Docker Compose Management",
    description: "Manage Docker Compose services",
    inputSchema: {
      action: z.enum(["up", "down", "logs", "ps", "restart", "build"]).describe("Docker Compose action to perform"),
      service: z.string().optional().describe("Specific service name (optional)"),
      detach: z.boolean().optional().default(true).describe("Run in detached mode"),
      build: z.boolean().optional().describe("Build images before starting (for up action)")
    }
  },
  async ({ action, service, detach, build }) => {
    try {
      let command: string;
      const serviceArg = service ? ` ${service}` : "";
      
      switch (action) {
        case "up":
          command = `docker-compose up${detach ? " -d" : ""}${build ? " --build" : ""}${serviceArg}`;
          break;
        case "down":
          command = `docker-compose down${serviceArg}`;
          break;
        case "logs":
          command = `docker-compose logs${serviceArg}`;
          break;
        case "ps":
          command = "docker-compose ps";
          break;
        case "restart":
          command = `docker-compose restart${serviceArg}`;
          break;
        case "build":
          command = `docker-compose build${serviceArg}`;
          break;
      }
      
      const result = await executeDockerCommand(command);
      
      return {
        content: [
          {
            type: "text",
            text: `Docker Compose ${action} completed:\n\n${result.stdout}${result.stderr ? `\nWarnings:\n${result.stderr}` : ""}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error with Docker Compose: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register resource for Docker help and documentation
server.registerResource(
  "docker-help",
  "docker://help",
  {
    title: "Docker Commands Help",
    description: "Comprehensive Docker commands and natural language examples",
    mimeType: "text/plain"
  },
  async (uri) => {
    const helpContent = `
Docker MCP Server - Comprehensive Natural Language Commands

=== CONTAINER OPERATIONS ===
Basic Container Management:
- "list all containers" / "show containers" → docker ps -a
- "list running containers" / "what containers are running" → docker ps
- "start container nginx" / "launch nginx" → docker start nginx
- "stop container myapp" / "halt myapp" → docker stop myapp
- "restart container web" / "reboot web" → docker restart web
- "remove container old-app" / "delete old-app" → docker rm old-app
- "kill container stuck-app" → docker kill stuck-app

Container Inspection & Monitoring:
- "inspect container nginx" / "examine nginx" → docker inspect nginx
- "logs from container web" / "show logs for web" → docker logs web
- "follow logs from api" → docker logs -f api
- "last 50 lines from web logs" → docker logs --tail 50 web
- "execute bash in container web" / "run bash into web" → docker exec -it web bash
- "processes in container api" / "top in api" → docker top api
- "ports of container web" / "port mappings for web" → docker port web
- "stats for container api" → docker stats --no-stream api
- "changes in container web" → docker diff web

Container Creation (Advanced):
- Use create_container tool for complex container setups with:
  - Port mappings: ['8080:80', '3000:3000']
  - Volume mounts: ['/host/data:/app/data']
  - Environment variables: {'NODE_ENV': 'production'}
  - Network connections, restart policies, working directories

=== IMAGE OPERATIONS ===
Image Management:
- "list images" / "show all images" → docker images
- "list dangling images" → docker images -f dangling=true
- "pull image nginx" / "download nginx" → docker pull nginx
- "pull nginx with tag latest" → docker pull nginx:latest
- "push image myapp" / "upload myapp" → docker push myapp
- "remove image old-version" / "delete old-version" → docker rmi old-version
- "force remove image stuck" → docker rmi -f stuck
- "tag image myapp as production" → docker tag myapp production

Image Building:
- "build image myapp" → docker build -t myapp .
- "build image from custom dockerfile" → docker build -f Dockerfile.prod -t myapp .
- "create image webapp from current directory" → docker build -t webapp .

Image Registry:
- "search for nginx" / "find nginx images" → docker search nginx
- "login to docker hub" → docker login
- "logout from registry" → docker logout
- Use docker_registry tool for advanced registry operations

=== VOLUME OPERATIONS ===
Volume Management:
- "list volumes" / "show all volumes" → docker volume ls
- "list dangling volumes" → docker volume ls -f dangling=true
- "create volume mydata" / "make volume storage" → docker volume create mydata
- "remove volume old-data" / "delete volume temp" → docker volume rm old-data
- "inspect volume mydata" / "examine volume storage" → docker volume inspect mydata
- "cleanup unused volumes" → docker volume prune -f

=== NETWORK OPERATIONS ===
Network Management:
- "list networks" / "show networks" → docker network ls
- "create network mynet" / "make network backend" → docker network create mynet
- "create bridge network frontend" → docker network create --driver bridge frontend
- "create overlay network cluster" → docker network create --driver overlay cluster
- "remove network old-net" / "delete network temp" → docker network rm old-net
- "inspect network mynet" → docker network inspect mynet
- "connect container web to network backend" → docker network connect backend web
- "disconnect container api from network frontend" → docker network disconnect frontend api
- "cleanup unused networks" → docker network prune -f

=== SYSTEM OPERATIONS ===
System Information:
- "system info" / "docker information" → docker system info
- "version" / "docker version" → docker --version && docker-compose --version
- "stats" / "monitor containers" → docker stats --no-stream
- "continuous stats" / "follow stats" → docker stats
- "disk usage" / "storage usage" → docker system df
- "detailed disk usage" / "verbose storage info" → docker system df -v

System Cleanup:
- "cleanup" / "prune system" → docker system prune -f
- "cleanup everything" / "prune all" → docker system prune -a -f
- "cleanup with volumes" → docker system prune --volumes -f

=== DOCKER COMPOSE OPERATIONS ===
Compose Lifecycle:
- "compose up" / "start services" → docker-compose up -d
- "compose up in foreground" → docker-compose up
- "compose up with build" / "start and rebuild" → docker-compose up -d --build
- "compose up service web" → docker-compose up -d web
- "compose down" / "stop services" → docker-compose down
- "compose down with volumes" → docker-compose down --volumes
- "compose down with images" → docker-compose down --rmi all

Compose Monitoring:
- "compose logs" / "service logs" → docker-compose logs
- "compose logs from web" → docker-compose logs web
- "follow compose logs" → docker-compose logs -f
- "compose status" / "compose ps" → docker-compose ps
- "restart compose" / "restart services" → docker-compose restart
- "restart service api" → docker-compose restart api

Compose Building:
- "compose build" / "rebuild services" → docker-compose build
- "compose build service web" → docker-compose build web
- "fresh compose build" / "clean rebuild" → docker-compose build --no-cache

=== ADVANCED OPERATIONS ===
File Operations:
- "copy file.txt from container web" → docker cp web:/path/file.txt .
- "copy data.json to container api" → docker cp data.json api:/tmp/

Events & Troubleshooting:
- "show docker events" → docker events --since 1h
- "events for container web" → docker events --filter container=web
- "differences in container api" → docker diff api

Container Utilities:
- "run ubuntu interactively" → docker run -it ubuntu bash
- "run nginx detached on port 8080" → docker run -d -p 8080:80 nginx
- "run redis with volume" → docker run -d -v redis-data:/data redis

=== DIRECT COMMANDS ===
You can also use direct Docker commands:
- "docker ps -a --format table"
- "docker run -it --rm alpine sh"
- "docker build --no-cache -t myapp ."
- "docker logs --since 1h --until 30m mycontainer"

=== TOOL CATEGORIES ===
1. execute_docker_command - General NLP command execution
2. manage_containers - Container lifecycle operations
3. manage_images - Image operations and building
4. manage_volumes - Volume management
5. manage_networks - Network operations
6. create_container - Advanced container creation
7. docker_registry - Registry and search operations
8. docker_monitoring - Monitoring and troubleshooting
9. docker_info - System information
10. docker_compose - Docker Compose operations

=== EXAMPLES OF COMPLEX OPERATIONS ===
Natural Language → Command Translation:

"Show me all stopped containers that were created yesterday"
→ docker ps -a --filter "status=exited" --filter "since=24h"

"Remove all containers that have been stopped for more than a week"
→ docker container prune --filter "until=168h"

"Start an nginx container on port 8080 with a custom volume"
→ docker run -d -p 8080:80 -v /host/data:/usr/share/nginx/html nginx

"Build my app image without using cache and tag it as version 2.0"
→ docker build --no-cache -t myapp:2.0 .

The server understands context and can parse complex natural language requests!
`;

    return {
      contents: [
        {
          uri: uri.href,
          text: helpContent
        }
      ]
    };
  }
);

// Main function to start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Docker MCP Server is running...");
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.error("Shutting down Docker MCP Server...");
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error("Shutting down Docker MCP Server...");
  await server.close();
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("Fatal error in Docker MCP Server:", error);
  process.exit(1);
});
