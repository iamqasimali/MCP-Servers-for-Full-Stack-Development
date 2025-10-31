// api-testing-server.js - MCP server for API testing
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "api-testing-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "http_request",
        description: "Make an HTTP request to test APIs",
        inputSchema: {
          type: "object",
          properties: {
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
              description: "HTTP method",
            },
            url: {
              type: "string",
              description: "Full URL including protocol",
            },
            headers: {
              type: "object",
              description: "Request headers (optional)",
            },
            body: {
              type: "string",
              description: "Request body as JSON string (optional)",
            },
            timeout: {
              type: "number",
              description: "Request timeout in milliseconds (default: 30000)",
            },
          },
          required: ["method", "url"],
        },
      },
      {
        name: "test_endpoint",
        description: "Test an API endpoint with multiple scenarios",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Base URL of the API",
            },
            endpoint: {
              type: "string",
              description: "Endpoint path (e.g., /api/users)",
            },
            tests: {
              type: "array",
              description: "Array of test scenarios",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Test name",
                  },
                  method: {
                    type: "string",
                    description: "HTTP method",
                  },
                  body: {
                    type: "object",
                    description: "Request body",
                  },
                  expectedStatus: {
                    type: "number",
                    description: "Expected status code",
                  },
                },
              },
            },
          },
          required: ["baseUrl", "endpoint", "tests"],
        },
      },
      {
        name: "generate_test_cases",
        description: "Generate test cases for an API endpoint based on OpenAPI/Swagger spec",
        inputSchema: {
          type: "object",
          properties: {
            method: {
              type: "string",
              description: "HTTP method",
            },
            endpoint: {
              type: "string",
              description: "Endpoint path",
            },
            requestSchema: {
              type: "object",
              description: "Request body JSON schema",
            },
            responseSchema: {
              type: "object",
              description: "Response body JSON schema",
            },
          },
          required: ["method", "endpoint"],
        },
      },
      {
        name: "performance_test",
        description: "Run a simple performance test on an endpoint",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Full URL to test",
            },
            method: {
              type: "string",
              enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
              description: "HTTP method",
            },
            requests: {
              type: "number",
              description: "Number of requests to make (default: 10)",
            },
            body: {
              type: "string",
              description: "Request body (optional)",
            },
          },
          required: ["url", "method"],
        },
      },
      {
        name: "validate_response",
        description: "Validate API response against expected schema",
        inputSchema: {
          type: "object",
          properties: {
            response: {
              type: "object",
              description: "API response to validate",
            },
            schema: {
              type: "object",
              description: "JSON schema to validate against",
            },
          },
          required: ["response", "schema"],
        },
      },
    ],
  };
});

async function makeRequest(method, url, headers = {}, body = null, timeout = 30000) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const duration = Date.now() - startTime;

    let responseBody;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      duration,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "http_request": {
        const result = await makeRequest(
          args.method,
          args.url,
          args.headers,
          args.body,
          args.timeout
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "test_endpoint": {
        const results = [];
        
        for (const test of args.tests) {
          try {
            const url = `${args.baseUrl}${args.endpoint}`;
            const result = await makeRequest(
              test.method,
              url,
              {},
              test.body
            );
            
            const passed = result.status === test.expectedStatus;
            results.push({
              name: test.name,
              passed,
              expected: test.expectedStatus,
              actual: result.status,
              duration: result.duration,
              response: result.body,
            });
          } catch (error) {
            results.push({
              name: test.name,
              passed: false,
              error: error.message,
            });
          }
        }

        const summary = {
          total: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length,
          results,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "generate_test_cases": {
        const testCases = [];

        // Happy path test
        testCases.push({
          name: `${args.method} ${args.endpoint} - Success`,
          description: "Test successful request with valid data",
          method: args.method,
          endpoint: args.endpoint,
          expectedStatus: args.method === "POST" ? 201 : 200,
          body: args.requestSchema ? "// Valid request body based on schema" : null,
        });

        // Error cases
        if (args.method !== "GET") {
          testCases.push({
            name: `${args.method} ${args.endpoint} - Invalid Body`,
            description: "Test with invalid request body",
            method: args.method,
            endpoint: args.endpoint,
            expectedStatus: 400,
            body: "{}",
          });
        }

        testCases.push({
          name: `${args.method} ${args.endpoint} - Not Found`,
          description: "Test with non-existent resource",
          method: args.method,
          endpoint: args.endpoint.replace(/\/\d+/, "/999999"),
          expectedStatus: 404,
        });

        testCases.push({
          name: `${args.method} ${args.endpoint} - Unauthorized`,
          description: "Test without authentication",
          method: args.method,
          endpoint: args.endpoint,
          expectedStatus: 401,
          headers: {},
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ testCases }, null, 2),
            },
          ],
        };
      }

      case "performance_test": {
        const requests = args.requests || 10;
        const times = [];
        const errors = [];

        for (let i = 0; i < requests; i++) {
          try {
            const result = await makeRequest(
              args.method,
              args.url,
              {},
              args.body
            );
            times.push(result.duration);
          } catch (error) {
            errors.push(error.message);
          }
        }

        const stats = {
          totalRequests: requests,
          successfulRequests: times.length,
          failedRequests: errors.length,
          averageTime: times.reduce((a, b) => a + b, 0) / times.length,
          minTime: Math.min(...times),
          maxTime: Math.max(...times),
          times,
          errors,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      case "validate_response": {
        // Simple JSON schema validation
        const errors = [];
        
        function validateObject(obj, schema, path = "") {
          if (schema.type === "object" && schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
              const value = obj[key];
              const currentPath = path ? `${path}.${key}` : key;
              
              if (schema.required && schema.required.includes(key) && value === undefined) {
                errors.push(`Missing required field: ${currentPath}`);
                continue;
              }
              
              if (value !== undefined) {
                const expectedType = propSchema.type;
                const actualType = Array.isArray(value) ? "array" : typeof value;
                
                if (actualType !== expectedType) {
                  errors.push(`Type mismatch at ${currentPath}: expected ${expectedType}, got ${actualType}`);
                }
              }
            }
          }
        }

        validateObject(args.response, args.schema);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                valid: errors.length === 0,
                errors,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("API Testing MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});