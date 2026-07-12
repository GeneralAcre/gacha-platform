import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.obsession.gachaer',
  appName: 'Obsession',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    // wallet-standard-mobile refuses to register MWA in a WebView unless the
    // UA marks it as a trusted mobile web shell (see isSolanaMobileWebShell).
    appendUserAgent: 'Solana Mobile Web Shell',
  },
};

export default config;
