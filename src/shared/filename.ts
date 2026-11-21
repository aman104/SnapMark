function padTwoDigits(num: number): string {
  return String(num).padStart(2, '0');
}

export function normalizeDomainForFilename(urlOrHostname: string): string {
  const trimmed = (urlOrHostname ?? '').trim();
  if (!trimmed) {
    return 'strona';
  }

  let hostname = trimmed;
  try {
    const parsed = new URL(
      trimmed.includes('://') ? trimmed : `https://${trimmed}`,
    );
    hostname = parsed.hostname || trimmed;
  } catch {
    hostname = trimmed.split('/')[0] ?? trimmed;
  }

  const withoutWww = hostname.toLowerCase().replace(/^www\./, '');
  const slug = withoutWww
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'strona';
}

export function formatCaptureFilename(
  sourceUrl: string,
  date: Date = new Date(),
): string {
  const domain = normalizeDomainForFilename(sourceUrl);
  const year = date.getFullYear();
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());
  const hours = padTwoDigits(date.getHours());
  const minutes = padTwoDigits(date.getMinutes());

  return `${domain}_${year}-${month}-${day}_${hours}-${minutes}.png`;
}
