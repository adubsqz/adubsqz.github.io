import { test, expect } from '@playwright/test';
import {
  anyPairOverlaps,
  aspectKind,
  displayedMatchesNatural,
} from '../src/makers-space-fidelity';

test.describe('makers space horseshoe', () => {
  test('shows seven seats on grain paper without tarot role labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('makers-space')).toBeVisible();
    await expect(page.getByTestId('makers-space')).toHaveAttribute('data-ground', 'grain-paper');
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
    await expect(page.getByText(/hidden obstacles|people's attitudes|the advice/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /open photo/i })).toHaveCount(7);

    // CSS diagonal overlay; JPEG © burn-in is in the published file itself
    const imgs = page.locator('.makers-space__img');
    await expect(imgs).toHaveCount(7);
    for (let i = 0; i < 7; i += 1) {
      await imgs.nth(i).evaluate((img: HTMLImageElement) => {
        if (img.complete) img.dispatchEvent(new Event('load'));
      });
    }
    await expect(page.getByText(/^adubsqz$/i)).toHaveCount(7);
  });

  test('mobile smash keeps seven seats in three arc rows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('makers-space-mobile')).toBeVisible();
    await expect(page.getByTestId('makers-seat')).toHaveCount(7);
    await expect(page.locator('[data-testid=makers-seat][data-row="1"]')).toHaveCount(2);
    await expect(page.locator('[data-testid=makers-seat][data-row="2"]')).toHaveCount(3);
    await expect(page.locator('[data-testid=makers-seat][data-row="3"]')).toHaveCount(2);
  });

  test('shows all seven seats large enough to read (no tiny crumbs)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const seats = page.getByTestId('makers-seat');
    await expect(seats).toHaveCount(7);
    await page.locator('.makers-space__img').evaluateAll(async (nodes) => {
      await Promise.all(
        nodes.map(
          (node) =>
            new Promise<void>((resolve, reject) => {
              const img = node as HTMLImageElement;
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => reject(new Error(img.src)), { once: true });
            }),
        ),
      );
    });

    const viewport = page.viewportSize()!;
    const sizes = await seats.evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return {
          seat: node.getAttribute('data-seat'),
          width: r.width,
          height: r.height,
          top: r.top,
          bottom: r.bottom,
          left: r.left,
          right: r.right,
        };
      }),
    );
    expect(sizes).toHaveLength(7);
    for (const s of sizes) {
      expect(s.width, `seat ${s.seat} width`).toBeGreaterThanOrEqual(140);
      expect(s.height, `seat ${s.seat} height`).toBeGreaterThanOrEqual(100);
      // Fully on-screen horizontally; vertically at least mostly in the first viewport
      expect(s.left, `seat ${s.seat} left`).toBeGreaterThanOrEqual(0);
      expect(s.right, `seat ${s.seat} right`).toBeLessThanOrEqual(viewport.width + 1);
      expect(s.top, `seat ${s.seat} top`).toBeLessThan(viewport.height);
      expect(s.bottom, `seat ${s.seat} bottom`).toBeGreaterThan(0);
      const visible = Math.min(s.bottom, viewport.height) - Math.max(s.top, 0);
      expect(visible / s.height, `seat ${s.seat} visible fraction`).toBeGreaterThanOrEqual(0.85);
    }
  });

  test('no seat picture overlaps another', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const seats = page.getByTestId('makers-seat');
    await expect(seats).toHaveCount(7);
    await page.locator('.makers-space__img').evaluateAll(async (nodes) => {
      await Promise.all(
        nodes.map(
          (node) =>
            new Promise<void>((resolve) => {
              const img = node as HTMLImageElement;
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            }),
        ),
      );
    });

    const boxes = await seats.evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }),
    );
    expect(anyPairOverlaps(boxes)).toBe(false);
  });

  test('landscape stays landscape and portrait stays portrait (no crop / stretch)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const imgs = page.locator('.makers-space__img');
    await expect(imgs).toHaveCount(7);
    await imgs.evaluateAll(async (nodes) => {
      await Promise.all(
        nodes.map(
          (node) =>
            new Promise<void>((resolve, reject) => {
              const img = node as HTMLImageElement;
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => reject(new Error(img.src)), { once: true });
            }),
        ),
      );
    });

    const metrics = await imgs.evaluateAll((nodes) =>
      nodes.map((node) => {
        const img = node as HTMLImageElement;
        const r = img.getBoundingClientRect();
        return {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: r.width,
          displayHeight: r.height,
        };
      }),
    );

    for (const m of metrics) {
      expect(m.naturalWidth).toBeGreaterThan(0);
      expect(m.naturalHeight).toBeGreaterThan(0);
      expect(m.displayWidth).toBeGreaterThan(0);
      expect(m.displayHeight).toBeGreaterThan(0);
      expect(displayedMatchesNatural(
        m.naturalWidth,
        m.naturalHeight,
        m.displayWidth,
        m.displayHeight,
      )).toBe(true);
      expect(aspectKind(m.displayWidth, m.displayHeight)).toBe(
        aspectKind(m.naturalWidth, m.naturalHeight),
      );
    }
  });

  test('mobile also keeps natural aspect and no overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const seats = page.getByTestId('makers-seat');
    await expect(seats).toHaveCount(7);
    await page.locator('.makers-space__img').evaluateAll(async (nodes) => {
      await Promise.all(
        nodes.map(
          (node) =>
            new Promise<void>((resolve) => {
              const img = node as HTMLImageElement;
              if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
              }
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            }),
        ),
      );
    });

    const boxes = await seats.evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }),
    );
    expect(anyPairOverlaps(boxes)).toBe(false);

    const metrics = await page.locator('.makers-space__img').evaluateAll((nodes) =>
      nodes.map((node) => {
        const img = node as HTMLImageElement;
        const r = img.getBoundingClientRect();
        return {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: r.width,
          displayHeight: r.height,
        };
      }),
    );
    for (const m of metrics) {
      expect(displayedMatchesNatural(
        m.naturalWidth,
        m.naturalHeight,
        m.displayWidth,
        m.displayHeight,
      )).toBe(true);
    }
  });
});
