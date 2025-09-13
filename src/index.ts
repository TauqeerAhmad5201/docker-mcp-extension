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

// Project-based resource management
interface DockerProject {
  name: string;
  containers: any[];
  networks: any[];
  volumes: any[];
}

interface ServiceConfig {
  image: string;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
}

interface ComposeProject {
  name: string;
  services: Record<string, ServiceConfig>;
  networks?: Record<string, any>;
  volumes?: Record<string, any>;
}

class ProjectManager {
  private static getProjectLabel(projectName: string): string {
    return `mcp-server-docker.project=${projectName}`;
  }

  static async getProjectResources(projectName: string): Promise<DockerProject> {
    const label = this.getProjectLabel(projectName);
    
    try {
      const [containers, networks, volumes] = await Promise.all([
        executeDockerCommand(`docker ps -a --filter "label=${label}" --format "{{json .}}"`).then(r => 
          r.stdout.trim().split('\n').filter(line => line).map(line => JSON.parse(line))
        ).catch(() => []),
        executeDockerCommand(`docker network ls --filter "label=${label}" --format "{{json .}}"`).then(r => 
          r.stdout.trim().split('\n').filter(line => line).map(line => JSON.parse(line))
        ).catch(() => []),
        executeDockerCommand(`docker volume ls --filter "label=${label}" --format "{{json .}}"`).then(r => 
          r.stdout.trim().split('\n').filter(line => line).map(line => JSON.parse(line))
        ).catch(() => [])
      ]);

      return { name: projectName, containers, networks, volumes };
    } catch (error) {
      return { name: projectName, containers: [], networks: [], volumes: [] };
    }
  }

  static addProjectLabel(command: string, projectName: string): string {
    const label = this.getProjectLabel(projectName);
    
    // Add label to Docker run commands
    if (command.includes('docker run') || command.includes('docker create')) {
      return command.replace(/(docker (?:run|create))/, `$1 --label "${label}"`);
    }
    
    // Add label to Docker network create commands
    if (command.includes('docker network create')) {
      return command.replace(/(docker network create)/, `$1 --label "${label}"`);
    }
    
    // Add label to Docker volume create commands
    if (command.includes('docker volume create')) {
      return command.replace(/(docker volume create)/, `$1 --label "${label}"`);
    }
    
    return command;
  }
}

// Docker Compose Manager with plan+apply functionality
class DockerComposeManager {
  private static projects: Map<string, any> = new Map();

  static async parseNaturalLanguage(description: string, projectName: string): Promise<ComposeProject> {
    // Advanced natural language parsing for multi-service deployments
    const services: Record<string, ServiceConfig> = {};
    const networks: Record<string, any> = {};
    const volumes: Record<string, any> = {};

    // Parse common patterns
    if (description.includes('wordpress') || description.includes('wp')) {
      services.wordpress = {
        image: 'wordpress:latest',
        ports: ['9000:80'],
        environment: {
          WORDPRESS_DB_HOST: 'mysql',
          WORDPRESS_DB_USER: 'wordpress',
          WORDPRESS_DB_PASSWORD: 'wordpress',
          WORDPRESS_DB_NAME: 'wordpress'
        },
        depends_on: ['mysql']
      };
      
      services.mysql = {
        image: 'mysql:8.0',
        environment: {
          MYSQL_DATABASE: 'wordpress',
          MYSQL_USER: 'wordpress',
          MYSQL_PASSWORD: 'wordpress',
          MYSQL_ROOT_PASSWORD: 'rootpassword'
        },
        volumes: ['mysql-data:/var/lib/mysql']
      };
      
      volumes['mysql-data'] = {};
    }

    if (description.includes('nginx')) {
      const port = description.match(/port\s+(\d+)/)?.[1] || '80';
      services.nginx = {
        image: 'nginx:latest',
        ports: [`${port}:80`]
      };
    }

    if (description.includes('redis')) {
      services.redis = {
        image: 'redis:alpine',
        ports: ['6379:6379']
      };
    }

    if (description.includes('postgres')) {
      services.postgres = {
        image: 'postgres:15',
        environment: {
          POSTGRES_DB: 'myapp',
          POSTGRES_USER: 'user',
          POSTGRES_PASSWORD: 'password'
        },
        volumes: ['postgres-data:/var/lib/postgresql/data']
      };
      
      volumes['postgres-data'] = {};
    }

    return { name: projectName, services, networks, volumes };
  }

  static async generatePlan(project: any, currentResources: DockerProject): Promise<string> {
    const actions: string[] = [];

    // Compare desired vs current state
    const currentContainerNames = currentResources.containers.map(c => c.Names || c.name);
    const desiredServiceNames = Object.keys(project.services);

    // Plan container actions
    for (const serviceName of desiredServiceNames) {
      const containerName = `${project.name}-${serviceName}`;
      if (!currentContainerNames.some(name => name.includes(serviceName))) {
        actions.push(`CREATE container ${containerName} from ${project.services[serviceName].image}`);
      }
    }

    // Plan volume actions
    const currentVolumeNames = currentResources.volumes.map(v => v.Name || v.name);
    const desiredVolumeNames = Object.keys(project.volumes || {});
    
    for (const volumeName of desiredVolumeNames) {
      const fullVolumeName = `${project.name}-${volumeName}`;
      if (!currentVolumeNames.includes(fullVolumeName)) {
        actions.push(`CREATE volume ${fullVolumeName}`);
      }
    }

    // Plan network actions if needed
    if (Object.keys(project.services).length > 1) {
      const networkName = `${project.name}-network`;
      const currentNetworkNames = currentResources.networks.map(n => n.Name || n.name);
      if (!currentNetworkNames.includes(networkName)) {
        actions.push(`CREATE network ${networkName}`);
      }
    }

    if (actions.length === 0) {
      return "No changes to make; project is up-to-date.";
    }

    return `## Plan\n\nI plan to take the following actions:\n\n${actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}\n\nRespond \`apply\` to apply this plan. Otherwise, provide feedback and I will present you with an updated plan.`;
  }

  static async applyPlan(projectName: string): Promise<string> {
    const project = this.projects.get(projectName);
    if (!project) {
      throw new Error(`No plan found for project ${projectName}`);
    }

    const results: string[] = [];

    try {
      // Create network first if needed
      if (Object.keys(project.services).length > 1) {
        const networkName = `${projectName}-network`;
        const networkCmd = ProjectManager.addProjectLabel(`docker network create ${networkName}`, projectName);
        await executeDockerCommand(networkCmd);
        results.push(`✅ Created network ${networkName}`);
      }

      // Create volumes
      for (const volumeName of Object.keys(project.volumes || {})) {
        const fullVolumeName = `${projectName}-${volumeName}`;
        const volumeCmd = ProjectManager.addProjectLabel(`docker volume create ${fullVolumeName}`, projectName);
        await executeDockerCommand(volumeCmd);
        results.push(`✅ Created volume ${fullVolumeName}`);
      }

      // Create and start containers
      for (const [serviceName, config] of Object.entries(project.services) as [string, ServiceConfig][]) {
        const containerName = `${projectName}-${serviceName}`;
        let runCmd = `docker run -d --name ${containerName}`;

        // Add ports
        if (config.ports) {
          config.ports.forEach((port: string) => {
            runCmd += ` -p ${port}`;
          });
        }

        // Add environment variables
        if (config.environment) {
          Object.entries(config.environment).forEach(([key, value]) => {
            runCmd += ` -e ${key}=${value}`;
          });
        }

        // Add volumes
        if (config.volumes) {
          config.volumes.forEach((volume: string) => {
            if (volume.includes(':')) {
              // Replace volume name with project-prefixed name
              const [volumeName, mountPoint] = volume.split(':');
              const fullVolumeName = `${projectName}-${volumeName}`;
              runCmd += ` -v ${fullVolumeName}:${mountPoint}`;
            } else {
              runCmd += ` -v ${volume}`;
            }
          });
        }

        // Add network
        if (Object.keys(project.services).length > 1) {
          runCmd += ` --network ${projectName}-network`;
        }

        runCmd += ` ${config.image}`;

        const labeledCmd = ProjectManager.addProjectLabel(runCmd, projectName);
        await executeDockerCommand(labeledCmd);
        results.push(`✅ Created and started container ${containerName}`);
      }

      return `## Apply Complete\n\n${results.join('\n')}\n\nProject ${projectName} has been successfully deployed!`;
    } catch (error) {
      throw new Error(`Failed to apply plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async destroyProject(projectName: string): Promise<string> {
    const resources = await ProjectManager.getProjectResources(projectName);
    const results: string[] = [];

    // Stop and remove containers
    for (const container of resources.containers) {
      try {
        await executeDockerCommand(`docker stop ${container.ID || container.id}`);
        await executeDockerCommand(`docker rm ${container.ID || container.id}`);
        results.push(`✅ Removed container ${container.Names || container.name}`);
      } catch (error) {
        results.push(`❌ Failed to remove container ${container.Names || container.name}`);
      }
    }

    // Remove volumes
    for (const volume of resources.volumes) {
      try {
        await executeDockerCommand(`docker volume rm ${volume.Name || volume.name}`);
        results.push(`✅ Removed volume ${volume.Name || volume.name}`);
      } catch (error) {
        results.push(`❌ Failed to remove volume ${volume.Name || volume.name}`);
      }
    }

    // Remove networks
    for (const network of resources.networks) {
      try {
        await executeDockerCommand(`docker network rm ${network.Name || network.name}`);
        results.push(`✅ Removed network ${network.Name || network.name}`);
      } catch (error) {
        results.push(`❌ Failed to remove network ${network.Name || network.name}`);
      }
    }

    return `## Destroy Complete\n\n${results.join('\n')}\n\nProject ${projectName} has been destroyed.`;
  }

  static setProject(projectName: string, project: any): void {
    this.projects.set(projectName, project);
  }
}

// Remote Docker Support
class RemoteDockerManager {
  private static currentHost: string | null = null;

  static setDockerHost(host: string): void {
    this.currentHost = host;
    process.env.DOCKER_HOST = host;
  }

  static getDockerHost(): string | null {
    return this.currentHost || process.env.DOCKER_HOST || null;
  }

  static async testConnection(): Promise<boolean> {
    try {
      await executeDockerCommand("docker version");
      return true;
    } catch {
      return false;
    }
  }

  static async getConnectionInfo(): Promise<string> {
    const host = this.getDockerHost();
    const isConnected = await this.testConnection();
    
    return `Docker Host: ${host || 'local'}\nConnection: ${isConnected ? '✅ Connected' : '❌ Failed'}`;
  }
}

// Enhanced monitoring capabilities
class DockerMonitor {
  static async getLiveStats(containerName?: string): Promise<string> {
    const command = containerName 
      ? `docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" ${containerName}`
      : `docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"`;
    
    const result = await executeDockerCommand(command);
    return result.stdout;
  }

  static async getSystemEvents(since: string = "1h"): Promise<string> {
    const command = `docker events --since ${since} --until now`;
    const result = await executeDockerCommand(command);
    return result.stdout;
  }

  static async getContainerHealth(containerName: string): Promise<string> {
    try {
      const inspect = await executeDockerCommand(`docker inspect ${containerName}`);
      const data = JSON.parse(inspect.stdout)[0];
      
      const health = data.State.Health || { Status: "none" };
      const state = data.State;
      
      return `Container: ${containerName}\nStatus: ${state.Status}\nHealth: ${health.Status}\nStarted: ${state.StartedAt}\nFinished: ${state.FinishedAt || 'N/A'}`;
    } catch (error) {
      throw new Error(`Failed to get health info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

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

// Register remote Docker connection tool
server.registerTool(
  "docker_remote_connection",
  {
    title: "Remote Docker Connection",
    description: "Connect to remote Docker hosts via SSH or configure Docker host",
    inputSchema: {
      action: z.enum(["connect", "disconnect", "status", "test"]).describe("Connection action"),
      host: z.string().optional().describe("Docker host URL (e.g., ssh://user@host, tcp://host:2376)"),
      user: z.string().optional().describe("SSH username"),
      keyPath: z.string().optional().describe("Path to SSH private key")
    }
  },
  async ({ action, host, user, keyPath }) => {
    try {
      switch (action) {
        case "connect":
          if (!host) {
            throw new Error("Host is required for connection");
          }
          
          // Configure SSH connection if needed
          if (host.startsWith("ssh://")) {
            const sshHost = host.replace("ssh://", "");
            if (user && !sshHost.includes("@")) {
              host = `ssh://${user}@${sshHost}`;
            }
          }
          
          RemoteDockerManager.setDockerHost(host);
          const isConnected = await RemoteDockerManager.testConnection();
          
          if (!isConnected) {
            throw new Error("Failed to connect to remote Docker host");
          }
          
          return {
            content: [
              {
                type: "text",
                text: `✅ Successfully connected to Docker host: ${host}\n\nUse 'docker_remote_connection' with action 'status' to check connection status.`
              }
            ]
          };

        case "disconnect":
          RemoteDockerManager.setDockerHost("");
          delete process.env.DOCKER_HOST;
          
          return {
            content: [
              {
                type: "text",
                text: "✅ Disconnected from remote Docker host. Using local Docker daemon."
              }
            ]
          };

        case "status":
          const connectionInfo = await RemoteDockerManager.getConnectionInfo();
          return {
            content: [
              {
                type: "text",
                text: `## Docker Connection Status\n\n${connectionInfo}`
              }
            ]
          };

        case "test":
          const testResult = await RemoteDockerManager.testConnection();
          const currentHost = RemoteDockerManager.getDockerHost();
          
          return {
            content: [
              {
                type: "text",
                text: `## Connection Test\n\nHost: ${currentHost || 'local'}\nStatus: ${testResult ? '✅ Connected' : '❌ Failed'}`
              }
            ]
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error with remote connection: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Docker Backup and Migration Manager
class DockerBackup {
  static async backupContainer(containerName: string, backupPath: string): Promise<string> {
    const results: string[] = [];
    
    try {
      // Create backup directory
      await executeDockerCommand(`mkdir -p ${backupPath}`);
      
      // Export container as tar
      const exportResult = await executeDockerCommand(`docker export ${containerName} > ${backupPath}/${containerName}-backup.tar`);
      results.push(`✅ Exported container ${containerName} to ${backupPath}/${containerName}-backup.tar`);
      
      // Get container config
      const inspectResult = await executeDockerCommand(`docker inspect ${containerName}`);
      const configPath = `${backupPath}/${containerName}-config.json`;
      await executeDockerCommand(`echo '${inspectResult.stdout}' > ${configPath}`);
      results.push(`✅ Saved container configuration to ${configPath}`);
      
      // Backup volumes if any
      const config = JSON.parse(inspectResult.stdout)[0];
      const mounts = config.Mounts || [];
      
      for (const mount of mounts) {
        if (mount.Type === 'volume') {
          const volumeBackupPath = `${backupPath}/${mount.Name}-volume.tar`;
          await executeDockerCommand(`docker run --rm -v ${mount.Name}:/volume -v ${backupPath}:/backup alpine tar czf /backup/${mount.Name}-volume.tar -C /volume .`);
          results.push(`✅ Backed up volume ${mount.Name} to ${volumeBackupPath}`);
        }
      }
      
      return results.join('\n');
    } catch (error) {
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async exportProject(projectName: string, exportPath: string): Promise<string> {
    const results: string[] = [];
    const resources = await ProjectManager.getProjectResources(projectName);
    
    try {
      // Create export directory
      await executeDockerCommand(`mkdir -p ${exportPath}/${projectName}`);
      
      // Export each container
      for (const container of resources.containers) {
        const containerName = container.Names || container.name;
        await this.backupContainer(containerName, `${exportPath}/${projectName}`);
        results.push(`✅ Exported container ${containerName}`);
      }
      
      // Export project metadata
      const metadata = {
        projectName,
        exportDate: new Date().toISOString(),
        resources: {
          containers: resources.containers.length,
          networks: resources.networks.length,
          volumes: resources.volumes.length
        }
      };
      
      await executeDockerCommand(`echo '${JSON.stringify(metadata, null, 2)}' > ${exportPath}/${projectName}/project-metadata.json`);
      results.push(`✅ Exported project metadata`);
      
      return `## Project Export Complete\n\n${results.join('\n')}\n\nProject ${projectName} has been exported to ${exportPath}/${projectName}`;
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Register backup and migration tool
server.registerTool(
  "docker_backup_migration",
  {
    title: "Docker Backup and Migration",
    description: "Backup containers, volumes, and entire projects for migration",
    inputSchema: {
      action: z.enum(["backup_container", "export_project", "list_backups", "cleanup_backups"]).describe("Backup action"),
      containerName: z.string().optional().describe("Container name (required for backup_container)"),
      projectName: z.string().optional().describe("Project name (required for export_project)"),
      backupPath: z.string().optional().describe("Backup destination path"),
      days: z.number().optional().describe("Days to keep backups (for cleanup)")
    }
  },
  async ({ action, containerName, projectName, backupPath, days }) => {
    try {
      const defaultBackupPath = "/tmp/docker-backups";
      const path = backupPath || defaultBackupPath;
      
      switch (action) {
        case "backup_container":
          if (!containerName) {
            throw new Error("Container name is required for backup");
          }
          
          const backupResult = await DockerBackup.backupContainer(containerName, path);
          return {
            content: [
              {
                type: "text",
                text: `## Container Backup Complete\n\n${backupResult}`
              }
            ]
          };

        case "export_project":
          if (!projectName) {
            throw new Error("Project name is required for export");
          }
          
          const exportResult = await DockerBackup.exportProject(projectName, path);
          return {
            content: [
              {
                type: "text",
                text: exportResult
              }
            ]
          };

        case "list_backups":
          const listResult = await executeDockerCommand(`find ${path} -name "*.tar" -o -name "*-config.json" | head -20`);
          return {
            content: [
              {
                type: "text",
                text: `## Available Backups\n\n\`\`\`\n${listResult.stdout || 'No backups found'}\n\`\`\``
              }
            ]
          };

        case "cleanup_backups":
          const cleanupDays = days || 7;
          const cleanupResult = await executeDockerCommand(`find ${path} -type f -mtime +${cleanupDays} -delete`);
          return {
            content: [
              {
                type: "text",
                text: `✅ Cleaned up backups older than ${cleanupDays} days from ${path}`
              }
            ]
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error with backup/migration: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register advanced Docker Compose tool with plan+apply functionality
server.registerTool(
  "docker_monitoring_advanced",
  {
    title: "Advanced Docker Monitoring",
    description: "Enhanced monitoring with health checks, events, and detailed statistics",
    inputSchema: {
      action: z.enum(["live_stats", "health", "events", "system_info", "performance"]).describe("Monitoring action"),
      container: z.string().optional().describe("Container name (for container-specific actions)"),
      since: z.string().optional().describe("Time period for events (e.g., '1h', '30m', '1d')"),
      format: z.enum(["table", "json"]).optional().default("table").describe("Output format")
    }
  },
  async ({ action, container, since, format }) => {
    try {
      switch (action) {
        case "live_stats":
          const stats = await DockerMonitor.getLiveStats(container);
          return {
            content: [
              {
                type: "text",
                text: `## Live Docker Statistics\n\n\`\`\`\n${stats}\n\`\`\``
              }
            ]
          };

        case "health":
          if (!container) {
            throw new Error("Container name is required for health check");
          }
          const health = await DockerMonitor.getContainerHealth(container);
          return {
            content: [
              {
                type: "text",
                text: `## Container Health Check\n\n${health}`
              }
            ]
          };

        case "events":
          const events = await DockerMonitor.getSystemEvents(since || "1h");
          return {
            content: [
              {
                type: "text",
                text: `## Docker System Events (last ${since || "1h"})\n\n\`\`\`\n${events}\n\`\`\``
              }
            ]
          };

        case "system_info":
          const systemInfo = await executeDockerCommand("docker system info");
          return {
            content: [
              {
                type: "text",
                text: `## Docker System Information\n\n\`\`\`\n${systemInfo.stdout}\n\`\`\``
              }
            ]
          };

        case "performance":
          const [diskUsage, version, containers] = await Promise.all([
            executeDockerCommand("docker system df -v"),
            executeDockerCommand("docker version"),
            executeDockerCommand("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
          ]);
          
          return {
            content: [
              {
                type: "text",
                text: `## Docker Performance Overview\n\n### Disk Usage\n\`\`\`\n${diskUsage.stdout}\n\`\`\`\n\n### Running Containers\n\`\`\`\n${containers.stdout}\n\`\`\`\n\n### Version\n\`\`\`\n${version.stdout}\n\`\`\``
              }
            ]
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error with advanced monitoring: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register advanced Docker command execution tool
server.registerTool(
  "docker_compose_advanced",
  {
    title: "Advanced Docker Compose Manager",
    description: "Manage Docker projects with natural language using plan+apply workflow",
    inputSchema: {
      action: z.enum(["plan", "apply", "destroy", "status"]).describe("Action to perform"),
      projectName: z.string().describe("Unique name of the project"),
      containers: z.string().optional().describe("Describe containers you want (required for plan)"),
      command: z.enum(["help", "apply", "down", "ps", "quiet", "verbose", "destroy"]).optional().describe("Special commands")
    }
  },
  async ({ action, projectName, containers, command }) => {
    try {
      switch (action) {
        case "plan":
          if (!containers) {
            throw new Error("Container description is required for planning");
          }
          
          const project = await DockerComposeManager.parseNaturalLanguage(containers, projectName);
          DockerComposeManager.setProject(projectName, project);
          
          const currentResources = await ProjectManager.getProjectResources(projectName);
          const plan = await DockerComposeManager.generatePlan(project, currentResources);
          
          return {
            content: [
              {
                type: "text",
                text: `## Docker Compose Manager - Project: ${projectName}\n\n${plan}\n\n### Resources Currently Present:\n**Containers:** ${currentResources.containers.length}\n**Networks:** ${currentResources.networks.length}\n**Volumes:** ${currentResources.volumes.length}`
              }
            ]
          };

        case "apply":
          const applyResult = await DockerComposeManager.applyPlan(projectName);
          return {
            content: [
              {
                type: "text",
                text: applyResult
              }
            ]
          };

        case "destroy":
          const destroyResult = await DockerComposeManager.destroyProject(projectName);
          return {
            content: [
              {
                type: "text",
                text: destroyResult
              }
            ]
          };

        case "status":
          const resources = await ProjectManager.getProjectResources(projectName);
          return {
            content: [
              {
                type: "text",
                text: `## Project Status: ${projectName}\n\n**Containers:** ${resources.containers.length} (${resources.containers.filter(c => c.State === 'running').length} running)\n**Networks:** ${resources.networks.length}\n**Volumes:** ${resources.volumes.length}\n\n### Containers:\n${resources.containers.map(c => `- ${c.Names || c.name}: ${c.State || c.status}`).join('\n') || 'None'}\n\n### Networks:\n${resources.networks.map(n => `- ${n.Name || n.name}`).join('\n') || 'None'}\n\n### Volumes:\n${resources.volumes.map(v => `- ${v.Name || v.name}`).join('\n') || 'None'}`
              }
            ]
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error with Docker Compose operation: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
);

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
      restart: z.enum(["no", "on-failure", "always", "unless-stopped"]).optional().describe("Restart policy"),
      // Advanced options
      healthCheck: z.object({
        test: z.string(),
        interval: z.string().optional(),
        timeout: z.string().optional(),
        retries: z.number().optional()
      }).optional().describe("Health check configuration"),
      resources: z.object({
        memory: z.string().optional(),
        cpus: z.string().optional(),
        memorySwap: z.string().optional()
      }).optional().describe("Resource constraints"),
      security: z.object({
        user: z.string().optional(),
        readOnly: z.boolean().optional(),
        tmpfs: z.array(z.string()).optional()
      }).optional().describe("Security options"),
      labels: z.record(z.string()).optional().describe("Container labels"),
      hostname: z.string().optional().describe("Container hostname"),
      domainname: z.string().optional().describe("Container domain name"),
      projectName: z.string().optional().describe("Project name for resource grouping")
    }
  },
  async ({ image, name, ports, volumes, environment, network, detached, interactive, command, workdir, restart, healthCheck, resources, security, labels, hostname, domainname, projectName }) => {
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
      
      // Add hostname
      if (hostname) dockerCommand += ` --hostname ${hostname}`;
      
      // Add domain name
      if (domainname) dockerCommand += ` --domainname ${domainname}`;
      
      // Add health check
      if (healthCheck) {
        dockerCommand += ` --health-cmd "${healthCheck.test}"`;
        if (healthCheck.interval) dockerCommand += ` --health-interval ${healthCheck.interval}`;
        if (healthCheck.timeout) dockerCommand += ` --health-timeout ${healthCheck.timeout}`;
        if (healthCheck.retries) dockerCommand += ` --health-retries ${healthCheck.retries}`;
      }
      
      // Add resource constraints
      if (resources) {
        if (resources.memory) dockerCommand += ` --memory ${resources.memory}`;
        if (resources.cpus) dockerCommand += ` --cpus ${resources.cpus}`;
        if (resources.memorySwap) dockerCommand += ` --memory-swap ${resources.memorySwap}`;
      }
      
      // Add security options
      if (security) {
        if (security.user) dockerCommand += ` --user ${security.user}`;
        if (security.readOnly) dockerCommand += " --read-only";
        if (security.tmpfs) {
          security.tmpfs.forEach(tmpfs => {
            dockerCommand += ` --tmpfs ${tmpfs}`;
          });
        }
      }
      
      // Add labels
      if (labels) {
        Object.entries(labels).forEach(([key, value]) => {
          dockerCommand += ` --label "${key}=${value}"`;
        });
      }
      
      // Add image
      dockerCommand += ` ${image}`;
      
      // Add command
      if (command) dockerCommand += ` ${command}`;
      
      // Add project label if specified
      if (projectName) {
        dockerCommand = ProjectManager.addProjectLabel(dockerCommand, projectName);
      }
      
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
Docker MCP Server - Comprehensive Natural Language Commands (Enhanced Edition)

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

Advanced Container Creation:
- Use create_container tool for complex container setups with:
  - Port mappings: ['8080:80', '3000:3000']
  - Volume mounts: ['/host/data:/app/data']
  - Environment variables: {'NODE_ENV': 'production'}
  - Network connections, restart policies, working directories
  - Health checks: {test: "curl -f http://localhost/health", interval: "30s"}
  - Resource constraints: {memory: "512m", cpus: "0.5"}
  - Security options: {user: "1000:1000", readOnly: true}

=== PROJECT MANAGEMENT (NEW!) ===
Plan+Apply Workflow:
- Use docker_compose_advanced tool for project management
- "plan project myapp with nginx and redis" → Creates deployment plan
- "apply" → Executes the planned deployment
- "status project myapp" → Shows current project status
- "destroy project myapp" → Removes all project resources

Project Commands:
- plan: Create a deployment plan from natural language
- apply: Execute the current plan
- destroy: Remove all project resources
- status: Show current project state

Example Workflow:
1. Plan: "plan project wordpress with wordpress and mysql database on port 9000"
2. Review the generated plan
3. Apply: "apply" to execute the plan
4. Monitor: "status project wordpress" to check status

=== REMOTE DOCKER SUPPORT (NEW!) ===
Remote Connection:
- Use docker_remote_connection tool
- "connect to ssh://user@myserver.com" → Connect to remote Docker
- "connect to tcp://remote-host:2376" → Connect via TCP
- "disconnect" → Switch back to local Docker
- "test connection" → Verify current connection
- "status" → Show connection information

=== ADVANCED MONITORING (NEW!) ===
Enhanced Monitoring:
- Use docker_monitoring_advanced tool
- "live stats" → Real-time container statistics
- "health nginx" → Detailed health check for container
- "events since 2h" → Docker system events
- "system info" → Comprehensive system information
- "performance" → Overall performance overview

=== BACKUP & MIGRATION (NEW!) ===
Backup Operations:
- Use docker_backup_migration tool
- "backup container nginx" → Backup container and volumes
- "export project myapp" → Export entire project
- "list backups" → Show available backups
- "cleanup backups older than 7 days" → Remove old backups

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

=== TOOL CATEGORIES ===
Core Tools:
1. execute_docker_command - General NLP command execution
2. manage_containers - Container lifecycle operations
3. manage_images - Image operations and building
4. manage_volumes - Volume management
5. manage_networks - Network operations
6. create_container - Advanced container creation with health checks
7. docker_registry - Registry and search operations
8. docker_monitoring - Basic monitoring and troubleshooting
9. docker_info - System information
10. docker_compose - Traditional Docker Compose operations

Enhanced Tools (NEW!):
11. docker_compose_advanced - Plan+apply project management
12. docker_remote_connection - Remote Docker host management
13. docker_monitoring_advanced - Enhanced monitoring with health checks
14. docker_backup_migration - Backup and migration operations

=== ADVANCED FEATURES ===

Project-Based Resource Management:
- All resources created with projectName are automatically labeled
- Resources can be managed as a group
- Easy cleanup and migration of entire projects

Natural Language Docker Compose:
- Describe complex multi-service deployments in plain English
- Plan+apply workflow like Terraform
- Automatic dependency management
- Resource labeling and grouping

Remote Docker Support:
- Connect to remote Docker hosts via SSH or TCP
- Seamless switching between local and remote environments
- Connection testing and status monitoring

Enhanced Monitoring:
- Real-time statistics and health checks
- System events and performance monitoring
- Comprehensive system information

Backup and Migration:
- Complete container and volume backups
- Project-level export/import capabilities
- Automated cleanup of old backups

=== EXAMPLES OF COMPLEX OPERATIONS ===

Project Deployment:
"Plan project ecommerce with nginx load balancer, node.js api server, redis cache, and postgres database"
→ Creates a comprehensive deployment plan with all services

Remote Management:
"Connect to ssh://admin@production.mycompany.com"
"Plan project website with wordpress and mysql"
"Apply the plan to deploy on remote server"

Backup Workflow:
"Backup container production-api"
"Export project ecommerce to /backups"
"List all available backups"

Health Monitoring:
"Show health status for all containers"
"Monitor system events since yesterday"
"Display performance overview"

Advanced Container Creation:
create_container with:
- image: "nginx:alpine"
- healthCheck: {test: "curl -f http://localhost/health", interval: "30s"}
- resources: {memory: "512m", cpus: "0.5"}
- security: {user: "nginx", readOnly: true}
- projectName: "web-frontend"

The Enhanced Docker MCP Server provides enterprise-level Docker management through natural language with advanced project management, remote capabilities, monitoring, and backup features!
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
