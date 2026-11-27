import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountCloudflareBeacon } from './cloudflareBeacon';

describe('mountCloudflareBeacon', () => {
  afterEach(() => {
    document.querySelectorAll('script[data-cf-beacon]').forEach((node) => node.remove());
    vi.unstubAllGlobals();
  });

  it('does nothing without a token', () => {
    mountCloudflareBeacon(undefined);
    mountCloudflareBeacon('  ');
    expect(document.querySelector('script[data-cf-beacon]')).toBeNull();
  });

  it('injects the Cloudflare insights beacon once (idle)', async () => {
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      cb();
      return 1;
    });
    mountCloudflareBeacon('test-token');
    mountCloudflareBeacon('test-token');
    const scripts = document.querySelectorAll('script[data-cf-beacon]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute('src', 'https://static.cloudflareinsights.com/beacon.min.js');
    expect(scripts[0]).toHaveAttribute('data-cf-beacon', JSON.stringify({ token: 'test-token' }));
  });
});
