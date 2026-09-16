const fs = require('fs');
const path = require('path');

try {
  const rootDir = path.resolve(__dirname, '..');
  const src = path.join(rootDir, 'node_modules', 'react-native-skia-apple-ios', 'libs');
  const dest = path.join(rootDir, 'node_modules', '@shopify', 'react-native-skia', 'libs', 'ios');

  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    fs.writeFileSync(path.join(dest, '.version'), '2.6.9');
    console.log('✅ [Skia Setup] iOS prebuilt xcframeworks copied to @shopify/react-native-skia/libs/ios successfully.');
  }
} catch (error) {
  console.warn('⚠️ [Skia Setup] Warning:', error);
}
