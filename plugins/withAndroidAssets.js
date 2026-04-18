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

      console.log(`[withAndroidAssets] Target path: ${androidAssetsPath}`);

      // Ensure the directory exists
      if (!fs.existsSync(androidAssetsPath)) {
        console.log(`[withAndroidAssets] Creating directory: ${androidAssetsPath}`);
        fs.mkdirSync(androidAssetsPath, { recursive: true });
      }

      // Source and Target for Google verification file
      const sourceFile = path.join(config.modRequest.projectRoot, 'assets/adi-registration.properties');
      const targetFile = path.join(androidAssetsPath, 'adi-registration.properties');

      if (fs.existsSync(sourceFile)) {
        console.log(`[withAndroidAssets] Copying ${sourceFile} to ${targetFile}`);
        fs.copyFileSync(sourceFile, targetFile);
        
        // Final verification check within the build process
        if (fs.existsSync(targetFile)) {
          const stats = fs.statSync(targetFile);
          console.log(`[withAndroidAssets] SUCCESS: File exists at target. Size: ${stats.size} bytes.`);
        } else {
          console.error(`[withAndroidAssets] FAILURE: File was copied but does not exist at target!`);
        }
      } else {
        console.error(`[withAndroidAssets] Source file not found at: ${sourceFile}`);
      }

      return config;
    },
  ]);
};

module.exports = withAndroidAssets;
