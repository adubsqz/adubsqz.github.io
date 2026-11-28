export function mountCloudflareBeacon(token: string | undefined, doc: Document = document): void {
  const value = token?.trim();
  if (!value) return;
  if (doc.querySelector('script[data-cf-beacon]')) return;

  const inject = () => {
    if (doc.querySelector('script[data-cf-beacon]')) return;
    const script = doc.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token: value }));
    doc.head.appendChild(script);
  };

  // Prefer idle so horseshoe/LCP paint is not competing with Insights on mobile.
  const w = doc.defaultView as (Window & { requestIdleCallback?: (cb: () => void) => number }) | null;
  if (w && typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(inject);
    return;
  }
  if (w) {
    w.setTimeout(inject, 1);
    return;
  }
  inject();
}
