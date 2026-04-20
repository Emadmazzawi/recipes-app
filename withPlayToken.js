const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Local Config Plugin to force inject the adi-registration.properties file
 * into the native Android assets directory during EAS build.
 */
const withPlayToken = (config, token) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Find the native Android assets directory
      const assetsPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets');

      // Create the directory if it doesn't exist
      if (!fs.existsSync(assetsPath)) {
        console.log(`[withPlayToken] Creating native assets directory: ${assetsPath}`);
        fs.mkdirSync(assetsPath, { recursive: true });
      }

      // Write the Google Play token file into the directory
      const targetFile = path.join(assetsPath, 'adi-registration.properties');
      console.log(`[withPlayToken] Writing token to: ${targetFile}`);
      
      // Ensure NO EXTRA NEWLINES or SPACES are written.
      fs.writeFileSync(targetFile, token.trim());
      
      const stats = fs.statSync(targetFile);
      console.log(`[withPlayToken] SUCCESS: File written. Size: ${stats.size} bytes.`);

      return config;
    },
  ]);
};

module.exports = withPlayToken;
