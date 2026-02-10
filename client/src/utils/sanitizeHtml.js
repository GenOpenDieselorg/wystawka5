import DOMPurify from 'dompurify';

const sanitizeHtml = (html) => {
  if (!html) {
    return '';
  }

  return DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
};

export default sanitizeHtml;

