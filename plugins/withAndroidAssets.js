const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to copy files to the Android native assets folder.
 * This is required for Google Play Console verification files like 'adi-registration.properties'.
 */
const withAndroidAssets = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidAssetsPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/assets'
      );

      // Ensure the directory exists
      if (!fs.existsSync(androidAssetsPath)) {
        fs.mkdirSync(androidAssetsPath, { recursive: true });
      }

      // Source and Target for Google verification file
      const sourceFile = path.join(config.modRequest.projectRoot, 'assets/adi-registration.properties');
      const targetFile = path.join(androidAssetsPath, 'adi-registration.properties');

      if (fs.existsSync(sourceFile)) {
        console.log(`[withAndroidAssets] Copying ${sourceFile} to ${targetFile}`);
        fs.copyFileSync(sourceFile, targetFile);
      } else {
        console.warn(`[withAndroidAssets] Source file not found: ${sourceFile}`);
      }

      return config;
    },
  ]);
};

module.exports = withAndroidAssets;
