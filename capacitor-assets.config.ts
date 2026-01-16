import { CapacitorAssets } from '@capacitor/assets';

const assets = new CapacitorAssets({
  iconBackgroundColor: '#fefefe',
  iconBackgroundColorDark: '#f8f5f9',
  splashBackgroundColor: '#fefefe',
  splashBackgroundColorDark: '#f8f5f9',
  android: {
    icon: 'public/icon-192.png',
    adaptiveIcon: {
      foregroundImage: 'public/icon-512.png',
      backgroundColor: '#fefefe'
    }
  },
  ios: {
    icon: 'public/icon-192.png',
    splash: {
      image: 'public/icon-512.png'
    }
  }
});

// Generate assets
assets.generate();
