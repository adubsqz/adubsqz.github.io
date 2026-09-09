import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: [
        'src/**/*.test.{ts,tsx}',
        'tests/photo-budget.test.ts',
        'tests/share-card.test.ts',
        'tests/chrome-css.test.ts',
      ],
      exclude: [
        'src/App.test.tsx',
        'src/components/**/*Flow.test.tsx',
        'e2e/**',
        'tests/inquire*.test.ts',
      ],
      coverage: {
        reportsDirectory: './coverage/unit',
        include: [
          'src/data.ts',
          'src/site.ts',
          'src/gallery-reel.ts',
          'src/gallery-layout.ts',
          'src/gallery-shuffle.ts',
          'src/gallery-constants.ts',
          'src/galleryJwt.ts',
          'src/inquireStatic.ts',
          'src/lib/utils.ts',
          'src/utils/security.ts',
          'src/components/AboutView.tsx',
          'src/components/BrandMark.tsx',
          'src/components/GraffitiLabel.tsx',
          'src/components/ContactModal.tsx',
          'src/components/GalleryView.tsx',
          'src/components/InquiryModal.tsx',
          'src/components/LicensingDetails.tsx',
          'src/components/PasswordGate.tsx',
          'src/components/WatermarkedImage.tsx',
          'src/components/ui/**',
        ],
      },
    },
  }),
);
