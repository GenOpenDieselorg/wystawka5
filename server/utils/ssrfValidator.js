const dns = require('dns');
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
 * Performs a safe HTTP request using axios, preventing SSRF by validating
 * the URL and all redirects against private IP ranges.
 * 
 * @param {object} config - Axios config object
 * @param {number} maxRedirects - Maximum number of redirects to follow (default: 5)
 * @returns {Promise<object>} - Axios response
 */
async function safeAxiosRequest(config, maxRedirects = 5) {
  let currentUrl = config.url;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // Validate current URL
    const validation = await validateUrl(currentUrl);
    if (!validation.safe) {
      throw new Error(`SSRF Prevention: URL blocked: ${currentUrl} (${validation.error})`);
    }

    // Prepare config for this request
    const requestConfig = {
      ...config,
      url: currentUrl,
      maxRedirects: 0, // Disable auto redirects
      validateStatus: status => status >= 200 && status < 400 // Accept 3xx to handle manually
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
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (max ${maxRedirects})`);
}

module.exports = { validateUrl, isPrivateIp, safeAxiosRequest };
