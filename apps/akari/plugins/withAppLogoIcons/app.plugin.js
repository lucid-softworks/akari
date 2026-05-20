/* eslint-disable @typescript-eslint/no-var-requires */
const {
  IOSConfig,
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
  withMainApplication,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin for switchable home-screen app icons. Bakes a
 * single alternate icon variant into the native bundles ("classic")
 * plus the JS bridge needed to swap it at runtime.
 *
 * Pieces this plugin installs:
 *
 *   iOS:
 *     - Adds `CFBundleIcons.CFBundleAlternateIcons.classic` and the
 *       iPad equivalent to Info.plist.
 *     - Copies icon-classic@2x.png / @3x.png / ~ipad@2x.png from
 *       apps/akari/assets/ios-alt-icons/ into the iOS project root
 *       (alternate icons MUST live as flat files, not in .xcassets).
 *     - Drops AppLogoIconBridge.m into the iOS project root and adds
 *       it to the build target via pbxproj.
 *
 *   Android:
 *     - Adds <activity-alias name=".MainActivityClassic"> to
 *       AndroidManifest, pointing at MainActivity with the classic
 *       launcher icon.
 *     - Copies ic_launcher_classic.png variants into the matching
 *       mipmap-* drawable dirs.
 *     - Drops AppLogoIconModule.kt + AppLogoIconPackage.kt into the
 *       Android source tree and registers the package via
 *       MainApplication.kt edits.
 *
 * Runtime usage: see utils/appLogoIcon.ts.
 *
 * This file is CommonJS by convention — Expo CLI loads the plugin via
 * `require()`, and using TS here forces ts-node setup that the
 * project doesn't have. The matching `index.ts` is kept solely as
 * documentation / typechecking — Expo uses THIS file because
 * `app.plugin.js` takes precedence inside a plugin folder.
 */
const PLUGIN_ROOT = __dirname;
const NATIVE_DIR = path.join(PLUGIN_ROOT, 'native');
const APP_ROOT = path.join(PLUGIN_ROOT, '..', '..');
const IOS_ICON_SRC_DIR = path.join(APP_ROOT, 'assets', 'ios-alt-icons');
const ANDROID_ICON_SRC_DIR = path.join(APP_ROOT, 'assets', 'android-alt-icons');

const IOS_PNG_RENAMES = [
  ['icon-classic-120.png', 'icon-classic@2x.png'],
  ['icon-classic-180.png', 'icon-classic@3x.png'],
  ['icon-classic-76.png', 'icon-classic~ipad.png'],
  ['icon-classic-152.png', 'icon-classic~ipad@2x.png'],
];

const ANDROID_DPI_BUCKETS = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

const IOS_BRIDGE_SOURCE = 'AppLogoIconBridge.m';
const ANDROID_MODULE_SOURCE = 'AppLogoIconModule.kt';
const ANDROID_PACKAGE_SOURCE = 'AppLogoIconPackage.kt';
const ANDROID_KT_PACKAGE = 'works.lucidsoft.akari.applogoicon';

function ensureCopy(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function withIosAlternateIcons(config) {
  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    const primaryIcons = plist.CFBundleIcons || {};
    plist.CFBundleIcons = Object.assign({}, primaryIcons, {
      CFBundleAlternateIcons: Object.assign({}, primaryIcons.CFBundleAlternateIcons, {
        classic: {
          CFBundleIconFiles: ['icon-classic'],
          UIPrerenderedIcon: false,
        },
      }),
    });

    const ipadIcons = plist['CFBundleIcons~ipad'] || {};
    plist['CFBundleIcons~ipad'] = Object.assign({}, ipadIcons, {
      CFBundleAlternateIcons: Object.assign({}, ipadIcons.CFBundleAlternateIcons, {
        classic: {
          CFBundleIconFiles: ['icon-classic'],
          UIPrerenderedIcon: false,
        },
      }),
    });
    return cfg;
  });

  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const projectName = cfg.modRequest.projectName;
      if (!projectName) throw new Error('withAppLogoIcons: no iOS projectName');
      const targetDir = path.join(iosRoot, projectName);
      for (const [src, dst] of IOS_PNG_RENAMES) {
        ensureCopy(path.join(IOS_ICON_SRC_DIR, src), path.join(targetDir, dst));
      }
      ensureCopy(
        path.join(NATIVE_DIR, 'ios-template', IOS_BRIDGE_SOURCE),
        path.join(targetDir, IOS_BRIDGE_SOURCE),
      );
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;
    if (!projectName) throw new Error('withAppLogoIcons: no iOS projectName for pbxproj');
    const targetUuid = project.getFirstTarget().uuid;
    const groupKey =
      project.findPBXGroupKey({ name: projectName }) ||
      project.findPBXGroupKey({ path: projectName });
    if (!groupKey) return cfg;

    // Register the ObjC bridge in the "Sources" build phase. Without
    // this, the .m file lives on disk but the linker has no symbols
    // and RN can't find the native module at runtime.
    const bridgePath = `${projectName}/${IOS_BRIDGE_SOURCE}`;
    if (!(project.hasFile && project.hasFile(bridgePath))) {
      project.addSourceFile(bridgePath, { target: targetUuid }, groupKey);
    }

    // Register each PNG as a bundle Resource. Alternate icons MUST be
    // copied into the .app at build time — Info.plist's
    // CFBundleAlternateIcons entry points to filenames Apple expects
    // to find at the bundle root. Without this step the PNGs sit
    // beside the .xcodeproj but never make it into the installed
    // app, so iOS just shows blank.
    //
    // We use Expo's IOSConfig.XcodeUtils.addResourceFileToGroup
    // helper rather than xcode-lib's raw addResourceFile, because
    // the latter calls correctForResourcesPath which assumes a
    // PBXGroup literally named "Resources" exists. Expo's iOS
    // projects don't have that group (the modern template inlines
    // resources into the app's main group), so the raw API crashes
    // with "Cannot read properties of null (reading 'path')". The
    // wrapper helper goes through addToPbxResourcesBuildPhase
    // directly and doesn't need the named group.
    for (const [, dst] of IOS_PNG_RENAMES) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: path.join(projectName, dst),
        groupName: projectName,
        isBuildFile: true,
        project,
        targetUuid,
      });
    }
    return cfg;
  });

  return config;
}

function withAndroidAlternateIcons(config) {
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const application = manifest.application && manifest.application[0];
    if (!application) return cfg;
    application['activity-alias'] = application['activity-alias'] || [];
    const aliases = application['activity-alias'];
    const alreadyDeclared = aliases.some((a) => a.$ && a.$['android:name'] === '.MainActivityClassic');
    if (!alreadyDeclared) {
      aliases.push({
        $: {
          'android:name': '.MainActivityClassic',
          'android:enabled': 'false',
          'android:exported': 'true',
          'android:icon': '@mipmap/ic_launcher_classic',
          'android:roundIcon': '@mipmap/ic_launcher_classic',
          'android:label': '@string/app_name',
          'android:targetActivity': '.MainActivity',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
      });
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const resRoot = path.join(androidRoot, 'app', 'src', 'main', 'res');
      for (const dpi of ANDROID_DPI_BUCKETS) {
        const src = path.join(ANDROID_ICON_SRC_DIR, dpi, 'ic_launcher_classic.png');
        const dst = path.join(resRoot, `mipmap-${dpi}`, 'ic_launcher_classic.png');
        ensureCopy(src, dst);
      }
      const ktTargetDir = path.join(
        androidRoot,
        'app',
        'src',
        'main',
        'java',
        ...ANDROID_KT_PACKAGE.split('.'),
      );
      ensureCopy(
        path.join(NATIVE_DIR, 'android-template', ANDROID_MODULE_SOURCE),
        path.join(ktTargetDir, ANDROID_MODULE_SOURCE),
      );
      ensureCopy(
        path.join(NATIVE_DIR, 'android-template', ANDROID_PACKAGE_SOURCE),
        path.join(ktTargetDir, ANDROID_PACKAGE_SOURCE),
      );
      return cfg;
    },
  ]);

  config = withMainApplication(config, (cfg) => {
    const importLine = `import ${ANDROID_KT_PACKAGE}.AppLogoIconPackage`;
    const registerLine = 'add(AppLogoIconPackage())';

    let src = cfg.modResults.contents;

    if (!src.includes(importLine)) {
      // Inject the import right after the existing package declaration
      // (the first `package ...` line is always present).
      src = src.replace(/^(package [^\n]+\n)/m, `$1\n${importLine}\n`);
    }

    if (!src.includes(registerLine)) {
      // Expo SDK 54's MainApplication exposes packages through:
      //
      //   override fun getPackages(): List<ReactPackage> =
      //       PackageList(this).packages.apply {
      //         // (autolinking gaps go here)
      //       }
      //
      // Inject `add(AppLogoIconPackage())` inside that `.apply { ... }`
      // block, preserving the existing indentation.
      const applyOpen = /(PackageList\(this\)\.packages\.apply\s*\{)\n/;
      if (applyOpen.test(src)) {
        src = src.replace(applyOpen, `$1\n              ${registerLine}\n`);
      } else if (src.includes('PackageList(this).packages')) {
        // Fallback for the bare expression form without `.apply { }`.
        src = src.replace(
          /(PackageList\(this\)\.packages)(?!\.apply)/,
          `PackageList(this).packages.apply { ${registerLine} }`,
        );
      }
    }

    cfg.modResults.contents = src;
    return cfg;
  });

  return config;
}

module.exports = function withAppLogoIcons(config) {
  config = withIosAlternateIcons(config);
  config = withAndroidAlternateIcons(config);
  return config;
};
