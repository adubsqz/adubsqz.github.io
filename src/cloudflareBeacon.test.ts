import { afterEach, describe, expect, it } from 'vitest';
import { mountCloudflareBeacon } from './cloudflareBeacon';

describe('mountCloudflareBeacon', () => {
  afterEach(() => {
    document.querySelectorAll('script[data-cf-beacon]').forEach((node) => node.remove());
  });
  it('does nothing without a token', () => {
    mountCloudflareBeacon(undefined);
    mountCloudflareBeacon('  ');
    expect(document.querySelector('script[data-cf-beacon]')).toBeNull();
  });

  it('injects the Cloudflare insights beacon once', () => {
    mountCloudflareBeacon('test-token');
    mountCloudflareBeacon('test-token');
    const scripts = document.querySelectorAll('script[data-cf-beacon]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute('src', 'https://static.cloudflareinsights.com/beacon.min.js');
    expect(scripts[0]).toHaveAttribute('data-cf-beacon', JSON.stringify({ token: 'test-token' }));
  });
});
