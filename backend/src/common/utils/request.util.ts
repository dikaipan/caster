import { Request } from 'express';

/**
 * Extract client IP address from Express request
 * Handles proxy/load balancer scenarios with X-Forwarded-For header
 * @param req Express request object
 * @returns Client IP address or 'unknown' if not found
 */
export function getClientIp(req: Request): string {
  // Check X-Forwarded-For header (for proxies, load balancers, etc.)
  // Format: X-Forwarded-For: client, proxy1, proxy2
  // We want the first (original client) IP
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // Can be a string or array of strings
    const ips = typeof xForwardedFor === 'string' 
      ? xForwardedFor.split(',').map(ip => ip.trim())
      : xForwardedFor;
    
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // Check X-Real-IP header (common in nginx)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }

  // Check CF-Connecting-IP header (Cloudflare)
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.trim();
  }

  // Fallback to connection remote address
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Last fallback
  return req.ip || 'unknown';
}

/**
 * Extract user agent from Express request
 * @param req Express request object
 * @returns User agent string or undefined
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

