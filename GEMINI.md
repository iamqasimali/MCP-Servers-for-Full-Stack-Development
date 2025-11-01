# Gemini Project Instructions

This file provides specific instructions and context for the Gemini AI to use when working on this project. By providing clear and concise instructions, you can help Gemini understand the project's goals, conventions, and constraints.

## Project Overview

(A brief description of the project, its purpose, and its target audience.)

## Key Technologies

(List the key technologies, frameworks, and libraries used in this project. This helps Gemini to use the correct tools and APIs.)

## Coding Conventions

(Describe any coding conventions, style guides, or best practices that should be followed when writing code for this project.)

## Important Files

(List any important files or directories that Gemini should be aware of, such as configuration files, data models, or API definitions.)

## Development Workflow

(Describe the development workflow, including how to build, test, and deploy the project.)

## Additional Instructions

(Include any other instructions or context that might be helpful for Gemini.)

## MCP Servers

This project includes several MCP (Model Context Protocol) servers to aid in development. Each server provides a set of tools that can be used by a compatible client.

To run a server, use the following npm scripts:

*   **Database Server**: `npm run start:db`
    *   Provides tools for interacting with PostgreSQL and MySQL databases. You can execute queries, get schema information, and more.
*   **Git Server**: `npm run start:git`
    *   Offers tools for Git operations like checking status, viewing logs, and diffing files.
*   **API Testing Server**: `npm run start:api`
    *   A server for testing APIs. It includes tools for making HTTP requests, running performance tests, and validating responses.
*   **DevTools Server**: `npm run start:devtools`
    *   Contains tools for interacting with Docker, running shell commands, and monitoring logs.
