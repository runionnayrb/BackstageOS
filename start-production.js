#!/usr/bin/env node

// Production server startup script for custom domain deployment
process.env.NODE_ENV = 'production';

// Import the production config
const config = require('./production.config.js');

// Set environment variables
process.env.HOST = config.HOST;
process.env.PORT = config.PORT;
process.env.TRUST_PROXY = config.TRUST_PROXY;

console.log('🚀 Starting production server with custom domain support...');
console.log(`📡 Custom domains: ${config.CUSTOM_DOMAINS.join(', ')}`);
console.log(`🌐 Host: ${config.HOST}:${config.PORT}`);

// Start the main server
require('./server/index.ts');