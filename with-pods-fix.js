const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withPodsFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Inject selective modular headers for GoogleUtilities and RecaptchaInterop
      if (!podfileContent.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        const insertion = `\n  pod 'GoogleUtilities', :modular_headers => true\n  pod 'RecaptchaInterop', :modular_headers => true\n`;
        podfileContent = podfileContent.replace(
          /target 'Zien' do/,
          `target 'Zien' do${insertion}`
        );
        fs.writeFileSync(podfilePath, podfileContent);
      }
      
      return config;
    },
  ]);
};
