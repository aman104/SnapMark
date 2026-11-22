const RESTRICTED_PROTOCOLS: readonly string[] = [
  'chrome:',
  'chrome-extension:',
  'edge:',
  'brave:',
  'arc:',
  'vivaldi:',
  'opera:',
  'about:',
  'devtools:',
  'view-source:',
  'data:',
  'javascript:',
];

export function isRestrictedBrowserUrl(
  url: string | undefined | null,
): boolean {
  const trimmed = (url ?? '').trim();
  if (!trimmed) {
    return true;
  }

  const lower = trimmed.toLowerCase();
  if (RESTRICTED_PROTOCOLS.some((proto) => lower.startsWith(proto))) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return true;
    }

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (
      host === 'chromewebstore.google.com' ||
      (host === 'chrome.google.com' && path.startsWith('/webstore')) ||
      host === 'microsoftedge.microsoft.com'
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}
