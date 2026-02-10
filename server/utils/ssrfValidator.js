const dns = require('dns');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const axios = require('axios');

/**
 * Validates if a URL is safe to request (SSRF protection).
 * - Checks protocol (http/https)
 * - Resolves hostname
 * - Checks if IP is private/reserved/loopback
 */
function validateUrl(urlString) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);

      if (!['http:', 'https:'].includes(url.protocol)) {
        return resolve({ safe: false, error: 'Invalid protocol (must be http or https)' });
      }

      // Resolve hostname to IP addresses
      dns.lookup(url.hostname, { all: true }, (err, addresses) => {
        if (err) {
          return resolve({ safe: false, error: `DNS lookup failed: ${err.message}` });
        }

        // addresses is an array of objects: [{ address: '...', family: 4 }, ...]
        for (const addr of addresses) {
          if (isPrivateIp(addr.address)) {
            return resolve({ safe: false, error: `Host resolves to private/restricted IP: ${addr.address}` });
          }
        }

        resolve({ safe: true });
      });
    } catch (error) {
      resolve({ safe: false, error: error.message });
    }
  });
}

function isPrivateIp(ip) {
  // IPv4 checks
  if (ip.includes('.')) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false; // Not a valid IPv4

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;

    // 100.64.0.0/10 (Shared Address Space)
    if (parts[0] === 100 && (parts[1] >= 64 && parts[1] <= 127)) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 169.254.0.0/16 (Link-local / AWS metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 172.16.0.0/12 (Private network)
    if (parts[0] === 172 && (parts[1] >= 16 && parts[1] <= 31)) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;

    // 192.88.99.0/24 (6to4 Relay Anycast)
    if (parts[0] === 192 && parts[1] === 88 && parts[2] === 99) return true;

    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 198.18.0.0/15 (Network Benchmark)
    if (parts[0] === 198 && (parts[1] >= 18 && parts[1] <= 19)) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;

    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (parts[0] >= 240) return true;

    return false;
  }

  // IPv6 checks
  if (ip.includes(':')) {
    const lowerIp = ip.toLowerCase();
    
    // ::1 (Loopback)
    if (lowerIp === '::1') return true;
    
    // :: (Unspecified)
    if (lowerIp === '::') return true;

    // fc00::/7 (Unique Local)
    if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;

    // fe80::/10 (Link-local)
    if (lowerIp.startsWith('fe80')) return true;

    // IPv4 mapped IPv6 (::ffff:127.0.0.1)
    if (lowerIp.startsWith('::ffff:')) {
        const ipv4Part = ip.substring(7);
        return isPrivateIp(ipv4Part);
    }
  }

  return false;
}

/**
 * Creates a custom DNS lookup function that validates resolved IPs
 * against private/reserved ranges at connection time (prevents TOCTOU/DNS rebinding).
 */
function createSafeLookup() {
  return (hostname, options, callback) => {
    dns.lookup(hostname, options, (err, address, family) => {
      if (err) return callback(err);

      // dns.lookup with { all: true } returns an array; without it returns a single address
      if (Array.isArray(address)) {
        for (const addr of address) {
          if (isPrivateIp(addr.address)) {
            return callback(new Error(`SSRF Prevention: Host resolves to private/restricted IP: ${addr.address}`));
          }
        }
      } else {
        if (isPrivateIp(address)) {
          return callback(new Error(`SSRF Prevention: Host resolves to private/restricted IP: ${address}`));
        }
      }

      callback(null, address, family);
    });
  };
}

/**
 * Performs a safe HTTP request using axios, preventing SSRF by:
 * - Validating the URL protocol
 * - Using a custom DNS lookup that checks resolved IPs at connection time
 *   (prevents TOCTOU / DNS rebinding attacks)
 * - Manually following redirects with validation
 * 
 * @param {object} config - Axios config object
 * @param {number} maxRedirects - Maximum number of redirects to follow (default: 5)
 * @returns {Promise<object>} - Axios response
 */
/**
 * SECURITY: Blocklist of hostnames commonly used in SSRF attacks
 * (cloud metadata endpoints, internal services, etc.)
 */
const BLOCKED_HOSTNAMES = [
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
  'kubernetes.default',
  'kubernetes.default.svc',
];

/**
 * SECURITY: Validates and sanitizes a URL, returning safe components.
 * Rejects dangerous URLs (private IPs, metadata endpoints, non-standard ports, etc.)
 * 
 * @param {string} urlString - The URL to validate
 * @returns {Promise<{protocol: string, hostname: string, port: string, pathname: string, search: string}>}
 * @throws {Error} if the URL is unsafe
 */
async function validateAndSanitizeUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (e) {
    throw new Error(`SSRF Prevention: Invalid URL`);
  }

  // SECURITY: Only allow http/https protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`SSRF Prevention: Invalid protocol: ${parsed.protocol}`);
  }

  // SECURITY: Block credentials in URL (prevents authentication-based SSRF bypass)
  if (parsed.username || parsed.password) {
    throw new Error('SSRF Prevention: Credentials in URL are not allowed');
  }

  // SECURITY: Block non-standard ports (only allow 80, 443, or default)
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error(`SSRF Prevention: Non-standard port not allowed: ${parsed.port}`);
  }

  // SECURITY: Block known dangerous hostnames (cloud metadata, internal services)
  const lowerHostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(lowerHostname)) {
    throw new Error(`SSRF Prevention: Blocked hostname: ${parsed.hostname}`);
  }

  // SECURITY: Block IP addresses used directly in URL to prevent DNS bypass
  // 169.254.169.254 is the most common cloud metadata endpoint
  if (lowerHostname === '169.254.169.254' || lowerHostname === '[fd00::169:254:169:254]') {
    throw new Error('SSRF Prevention: Direct IP access to metadata endpoint blocked');
  }

  // SECURITY: DNS validation - resolve hostname and check for private IPs
  const dnsValidation = await validateUrl(urlString);
  if (!dnsValidation.safe) {
    throw new Error(`SSRF Prevention: ${dnsValidation.error}`);
  }

  // Return validated, reconstructed URL components
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    search: parsed.search,
    // Reconstruct a clean URL from validated components only
    href: `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}${parsed.search}`
  };
}

async function safeAxiosRequest(config, maxRedirects = 5) {
  let currentUrl = config.url;
  let redirectCount = 0;

  // Create agents with safe DNS lookup that validates IPs at connection time
  const safeLookup = createSafeLookup();
  const httpAgent = new http.Agent({ lookup: safeLookup });
  const httpsAgent = new https.Agent({ lookup: safeLookup });

  while (redirectCount <= maxRedirects) {
    // SECURITY: Validate URL and extract safe components
    // This performs protocol, port, hostname, credentials, and DNS validation
    const validatedUrl = await validateAndSanitizeUrl(currentUrl);

    // Prepare config for this request - agents enforce IP validation at connection time
    // SECURITY: Explicitly reconstruct config to prevent property pollution (e.g. proxy, socketPath)
    const { method, headers, data, timeout, params, responseType, auth, signal } = config;
    
    const requestConfig = {
      method,
      // SECURITY: Use reconstructed URL from validated components, not the raw user input
      url: validatedUrl.href,
      headers,
      data,
      timeout,
      params,
      responseType,
      auth,
      signal,
      maxRedirects: 0, // Disable auto redirects
      validateStatus: status => status >= 200 && status < 400, // Accept 3xx to handle manually
      httpAgent,
      httpsAgent,
      // SECURITY: Explicitly disable proxy to prevent bypassing the custom agent
      proxy: false,
      // SECURITY: Ensure no custom adapter is used
      adapter: undefined
    };

    const response = await axios(requestConfig);

    // Handle redirects
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      redirectCount++;
      const location = response.headers.location;
      
      // Destroy stream if applicable to prevent leaks
      if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy();
      }

      // Resolve relative URLs against current (validated) URL
      currentUrl = new URL(location, validatedUrl.href).toString();
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (max ${maxRedirects})`);
}

module.exports = { validateUrl, isPrivateIp, safeAxiosRequest };
