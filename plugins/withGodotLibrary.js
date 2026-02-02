const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

const withGodotLibrary = (config) => {
  // Add Godot AAR repository to project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.indexOf('flatDir') === -1) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{[\s\S]*?repositories\s*\{/,
        (match) => {
          return `${match}
        flatDir {
            dirs '../../ritmo_godot1/app/libs'
        }`;
        }
      );
    }
    return config;
  });

  // Add Godot AAR dependency to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.indexOf('godot-lib') === -1) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*\{/,
        (match) => {
          return `${match}
    implementation(name: 'godot-lib.4.6.stable.template_release', ext: 'aar')`;
        }
      );
    }
    return config;
  });

  return config;
};

module.exports = withGodotLibrary;
