import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: [
        'src/App.test.tsx',
        'src/components/ContactFlow.test.tsx',
        'src/components/InquiryFlow.test.tsx',
        'tests/inquire.env-contract.test.ts',
      ],
      coverage: {
        reportsDirectory: './coverage/integration',
        include: ['src/App.tsx', 'src/components/AboutView.tsx', 'src/components/ContactModal.tsx', 'src/components/GraffitiLabel.tsx', 'src/components/BrandMark.tsx'],
      },
    },
  }),
);
