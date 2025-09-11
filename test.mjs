#!/usr/bin/env node

// Simple test to verify the Docker MCP server works
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMcpServer() {
  console.log('Testing Docker MCP Server...');
  
  // Start the MCP server
  const serverPath = join(__dirname, 'build', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Send initialization message
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "1.0.0",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  server.stdin.write(JSON.stringify(initMessage) + '\n');

  // Listen for responses
  server.stdout.on('data', (data) => {
    const response = data.toString().trim();
    console.log('Server response:', response);
    
    // Send initialized notification
    if (response.includes('"result"')) {
      const initializedMessage = {
        jsonrpc: "2.0",
        method: "notifications/initialized"
      };
      server.stdin.write(JSON.stringify(initializedMessage) + '\n');
      
      // Test tools/list to see available tools
      const toolsListMessage = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
      };
      
      setTimeout(() => {
        server.stdin.write(JSON.stringify(toolsListMessage) + '\n');
      }, 100);
    }
    
    if (response.includes('execute_docker_command')) {
      console.log('✅ Docker MCP Server is working correctly!');
      console.log('✅ Tools are properly registered');
      server.kill();
    }
  });

  server.stderr.on('data', (data) => {
    console.log('Server stderr:', data.toString());
  });

  server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
  });

  // Cleanup after 5 seconds
  setTimeout(() => {
    server.kill();
    console.log('Test completed');
  }, 5000);
}

testMcpServer().catch(console.error);
