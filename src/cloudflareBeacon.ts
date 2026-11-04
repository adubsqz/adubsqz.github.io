export function mountCloudflareBeacon(token: string | undefined, doc: Document = document): void {
  const value = token?.trim();
  if (!value) return;
  if (doc.querySelector('script[data-cf-beacon]')) return;
  const script = doc.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-cf-beacon', JSON.stringify({ token: value }));
  doc.head.appendChild(script);
}
