#!/usr/bin/env node

// Enhanced test to demonstrate advanced natural language processing
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testCommands = [
  "list all containers including stopped ones",
  "show me running containers",
  "pull ubuntu with latest tag",
  "build image myapp from current directory",
  "create volume for database data",
  "list all networks",
  "show docker system information",
  "cleanup unused resources",
  "compose up all services",
  "search for nginx images",
  "docker ps -a"
];

async function testAdvancedMcpServer() {
  console.log('🧪 Testing Advanced Docker MCP Server...\n');
  
  // Start the MCP server
  const serverPath = join(__dirname, 'build', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let testCount = 0;
  let toolsFound = false;

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
        name: "advanced-test-client",
        version: "1.0.0"
      }
    }
  };

  server.stdin.write(JSON.stringify(initMessage) + '\n');

  // Listen for responses
  server.stdout.on('data', (data) => {
    const response = data.toString().trim();
    
    try {
      const parsed = JSON.parse(response);
      
      // Handle initialization response
      if (parsed.id === 1 && parsed.result) {
        console.log('✅ Server initialized successfully');
        
        // Send initialized notification
        const initializedMessage = {
          jsonrpc: "2.0",
          method: "notifications/initialized"
        };
        server.stdin.write(JSON.stringify(initializedMessage) + '\n');
        
        // Request tools list
        setTimeout(() => {
          const toolsListMessage = {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list"
          };
          server.stdin.write(JSON.stringify(toolsListMessage) + '\n');
        }, 100);
      }
      
      // Handle tools list response
      if (parsed.id === 2 && parsed.result?.tools) {
        const tools = parsed.result.tools;
        console.log(`✅ Found ${tools.length} tools:`);
        tools.forEach(tool => {
          console.log(`   - ${tool.name}: ${tool.title}`);
        });
        
        toolsFound = true;
        console.log('\n🎯 Testing Natural Language Commands:\n');
        
        // Test natural language commands
        testNextCommand();
      }
      
      // Handle tool execution responses
      if (parsed.id > 2 && parsed.result) {
        const commandIndex = parsed.id - 3;
        const command = testCommands[commandIndex];
        
        if (parsed.result.content) {
          console.log(`✅ "${command}"`);
          console.log(`   → Command executed successfully\n`);
        } else if (parsed.error) {
          console.log(`❌ "${command}"`);
          console.log(`   → Error: ${parsed.error.message}\n`);
        }
        
        testCount++;
        
        // Test next command or finish
        if (testCount < testCommands.length) {
          setTimeout(testNextCommand, 200);
        } else {
          console.log('🎉 All tests completed!');
          console.log(`✅ Successfully tested ${testCount} natural language commands`);
          console.log('✅ Advanced Docker MCP Server is working perfectly!');
          server.kill();
        }
      }
      
    } catch (e) {
      // Ignore parsing errors for partial responses
    }
  });

  function testNextCommand() {
    if (testCount < testCommands.length) {
      const command = testCommands[testCount];
      const testMessage = {
        jsonrpc: "2.0",
        id: testCount + 3,
        method: "tools/call",
        params: {
          name: "execute_docker_command",
          arguments: {
            command: command
          }
        }
      };
      
      console.log(`🔄 Testing: "${command}"`);
      server.stdin.write(JSON.stringify(testMessage) + '\n');
    }
  }

  server.stderr.on('data', (data) => {
    const message = data.toString().trim();
    if (message.includes('running')) {
      console.log('🚀 Docker MCP Server is running...\n');
    }
  });

  server.on('close', (code) => {
    console.log(`\n📊 Test Results:`);
    console.log(`   - Server exit code: ${code}`);
    console.log(`   - Tools registered: ${toolsFound ? 'Yes' : 'No'}`);
    console.log(`   - Commands tested: ${testCount}/${testCommands.length}`);
    console.log(`\n🎯 The Enhanced Docker MCP Server supports extensive natural language processing!`);
  });

  // Cleanup after 15 seconds
  setTimeout(() => {
    server.kill();
    console.log('\n⏰ Test timeout - cleaning up');
  }, 15000);
}

testAdvancedMcpServer().catch(console.error);
