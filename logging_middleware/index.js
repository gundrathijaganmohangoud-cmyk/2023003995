/**
 * A simple logger.
 * 
 * Usage:
 * const { Log } = require('./logging_middleware');
 * Log('backend', 'info', 'db', 'Database connected');
 */
function Log(stack, level, pkg, message) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [${level.toUpperCase()}] [${stack}/${pkg}] ${message}`);
}

module.exports = { Log };
