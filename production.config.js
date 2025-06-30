// Production configuration for custom domain deployment
module.exports = {
  // Force production mode
  NODE_ENV: 'production',
  
  // Custom domain configuration
  CUSTOM_DOMAINS: ['backstageos.com', 'www.backstageos.com', 'join.backstageos.com'],
  
  // Server configuration
  HOST: '0.0.0.0',
  PORT: process.env.PORT || 5000,
  
  // Domain routing rules
  DOMAIN_ROUTES: {
    'backstageos.com': '/landing',
    'www.backstageos.com': '/landing',
    'join.backstageos.com': '/landing'
  },
  
  // SSL and security headers
  FORCE_HTTPS: true,
  TRUST_PROXY: true
};