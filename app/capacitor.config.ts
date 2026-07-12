import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.obsession.gachaer',
  appName: 'Obsession',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
