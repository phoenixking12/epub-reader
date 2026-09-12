import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.epubreader.app',
  appName: 'LoreGuard',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    adjustMarginsForEdgeToEdge: 'disable',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'none',
    },
  },
}

export default config
