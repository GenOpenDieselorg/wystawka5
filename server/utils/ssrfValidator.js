const dns = require('dns');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const axios = require('axios');

// SECURITY: Allowed hostnames / base domains for outbound requests.
// This can be customized via environment variable, for example:
// SSRF_ALLOWED_HOSTS=example.com,api.example.com
const rawAllowedHosts = process.env.SSRF_ALLOWED_HOSTS
  ? process.env.SSRF_ALLOWED_HOSTS.split(',').map(h => h.trim().toLowerCase()).filter(Boolean)
  : [];

// Helper to check if a hostname is in the allowed list, supporting subdomains.
function isAllowedHost(hostname) {
  if (!hostname) return false;
  const lowerHost = hostname.toLowerCase();

  // If no explicit allow-list is configured, deny by default to avoid SSRF.
  if (rawAllowedHosts.length === 0) {
    return false;
  }

  return rawAllowedHosts.some(allowed => {
    if (lowerHost === allowed) return true;
    // Allow subdomains: *.allowed
    return lowerHost.endsWith('.' + allowed);
  });
}

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
async function safeAxiosRequest(config, maxRedirects = 5) {
  let currentUrl = config.url;
  let redirectCount = 0;

  // Create agents with safe DNS lookup that validates IPs at connection time
  const safeLookup = createSafeLookup();
  const httpAgent = new http.Agent({ lookup: safeLookup });
  const httpsAgent = new https.Agent({ lookup: safeLookup });

  while (redirectCount <= maxRedirects) {
    // Validate URL protocol
    let parsedUrl;
    try {
      parsedUrl = new URL(currentUrl);
    } catch (e) {
      throw new Error(`SSRF Prevention: Invalid URL: ${currentUrl}`);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`SSRF Prevention: Invalid protocol: ${parsedUrl.protocol}`);
    }

    // SECURITY: Host allow-list check to prevent SSRF to arbitrary domains
    if (!isAllowedHost(parsedUrl.hostname)) {
      throw new Error(`SSRF Prevention: Disallowed host: ${parsedUrl.hostname}`);
    }

    // SECURITY: Pre-request DNS validation (defense-in-depth alongside connection-time safeLookup)
    // This explicitly validates the resolved IP before initiating the request,
    // preventing SSRF even if the HTTP agent lookup is somehow bypassed.
    const preValidation = await validateUrl(currentUrl);
    if (!preValidation.safe) {
      throw new Error(`SSRF Prevention: ${preValidation.error}`);
    }

    // Prepare config for this request - agents enforce IP validation at connection time
    // SECURITY: Explicitly reconstruct config to prevent property pollution (e.g. proxy, socketPath)
    const { method, headers, data, timeout, params, responseType, auth, signal } = config;
    
    const requestConfig = {
      method,
      url: currentUrl,
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

      // Resolve relative URLs
      const nextUrl = new URL(location, currentUrl).toString();

      // SECURITY: Re-validate host on redirect target to prevent SSRF via redirects
      let nextParsed;
      try {
        nextParsed = new URL(nextUrl);
      } catch (e) {
        throw new Error(`SSRF Prevention: Invalid redirect URL: ${nextUrl}`);
      }
      if (!isAllowedHost(nextParsed.hostname)) {
        throw new Error(`SSRF Prevention: Disallowed redirect host: ${nextParsed.hostname}`);
      }

      currentUrl = nextUrl;
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (max ${maxRedirects})`);
}

module.exports = { validateUrl, isPrivateIp, safeAxiosRequest };
