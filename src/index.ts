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

// Helper function to parse natural language and convert to Docker commands
function parseDockerCommand(naturalLanguage: string): string {
  const input = naturalLanguage.toLowerCase().trim();
  
  // Container operations
  if (input.includes("list") && input.includes("container")) {
    return "docker ps -a";
  }
  
  if (input.includes("list") && input.includes("running")) {
    return "docker ps";
  }
  
  if (input.includes("stop") && input.includes("container")) {
    const containerMatch = input.match(/container\s+(\w+)/);
    if (containerMatch) {
      return `docker stop ${containerMatch[1]}`;
    }
    return "echo 'Please specify container name or ID'";
  }
  
  if (input.includes("start") && input.includes("container")) {
    const containerMatch = input.match(/container\s+(\w+)/);
    if (containerMatch) {
      return `docker start ${containerMatch[1]}`;
    }
    return "echo 'Please specify container name or ID'";
  }
  
  if (input.includes("remove") && input.includes("container")) {
    const containerMatch = input.match(/container\s+(\w+)/);
    if (containerMatch) {
      return `docker rm ${containerMatch[1]}`;
    }
    return "echo 'Please specify container name or ID'";
  }
  
  // Image operations
  if (input.includes("list") && input.includes("image")) {
    return "docker images";
  }
  
  if (input.includes("pull") && input.includes("image")) {
    const imageMatch = input.match(/image\s+([^\s]+)/);
    if (imageMatch) {
      return `docker pull ${imageMatch[1]}`;
    }
    return "echo 'Please specify image name'";
  }
  
  if (input.includes("remove") && input.includes("image")) {
    const imageMatch = input.match(/image\s+([^\s]+)/);
    if (imageMatch) {
      return `docker rmi ${imageMatch[1]}`;
    }
    return "echo 'Please specify image name or ID'";
  }
  
  // Network operations
  if (input.includes("list") && input.includes("network")) {
    return "docker network ls";
  }
  
  // Volume operations
  if (input.includes("list") && input.includes("volume")) {
    return "docker volume ls";
  }
  
  // System operations
  if (input.includes("system") && input.includes("info")) {
    return "docker system info";
  }
  
  if (input.includes("system") && input.includes("prune")) {
    return "docker system prune -f";
  }
  
  // Docker Compose operations
  if (input.includes("compose") && input.includes("up")) {
    return "docker-compose up -d";
  }
  
  if (input.includes("compose") && input.includes("down")) {
    return "docker-compose down";
  }
  
  if (input.includes("compose") && input.includes("logs")) {
    return "docker-compose logs";
  }
  
  // General commands
  if (input.includes("version")) {
    return "docker --version";
  }
  
  // If no pattern matches, return the original input as a docker command
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
    description: "Docker commands and natural language examples",
    mimeType: "text/plain"
  },
  async (uri) => {
    const helpContent = `
Docker MCP Server - Natural Language Commands

CONTAINER OPERATIONS:
- "list containers" or "list running containers" → docker ps
- "list all containers" → docker ps -a
- "start container <name>" → docker start <name>
- "stop container <name>" → docker stop <name>
- "remove container <name>" → docker rm <name>
- "restart container <name>" → docker restart <name>

IMAGE OPERATIONS:
- "list images" → docker images
- "pull image <name>" → docker pull <name>
- "remove image <name>" → docker rmi <name>
- "build image <name>" → docker build -t <name> .

SYSTEM OPERATIONS:
- "system info" → docker system info
- "version" → docker --version
- "system prune" → docker system prune -f
- "docker stats" → docker stats --no-stream
- "disk usage" → docker system df

DOCKER COMPOSE:
- "compose up" → docker-compose up -d
- "compose down" → docker-compose down
- "compose logs" → docker-compose logs

NETWORK & VOLUMES:
- "list networks" → docker network ls
- "list volumes" → docker volume ls

You can use either natural language commands or direct Docker commands.
Examples:
- "show me all running containers"
- "stop the nginx container"
- "pull the latest ubuntu image"
- "docker ps -a"
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
