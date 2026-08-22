#!/usr/bin/env bash
#
# Builds the demo APK in one command.
#
#   ./scripts/build-demo-apk.sh
#
# Checks the toolchain first and fails with a specific, fixable message rather
# than a 300-line Gradle stack trace.

set -euo pipefail

cd "$(dirname "$0")/.."
APP_DIR="$PWD"

green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
info()  { printf '\033[0;36m→ %s\033[0m\n' "$1"; }

# ----------------------------------------------------------- prerequisites

fail=0

if ! command -v node >/dev/null 2>&1; then
  red "Node is not installed. Install Node 22 LTS: https://nodejs.org"
  fail=1
else
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$major" -lt 20 ]; then
    red "Node $major found; this project needs Node 20 or newer (22 LTS recommended)."
    fail=1
  fi
fi

if ! command -v java >/dev/null 2>&1; then
  red "Java is not installed. The Android Gradle Plugin needs JDK 17."
  red "  macOS:  brew install --cask temurin@17"
  red "  Ubuntu: sudo apt install openjdk-17-jdk"
  fail=1
fi

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
if [ ! -d "$SDK" ]; then
  SDK="$HOME/Android/Sdk"
fi
if [ ! -d "$SDK" ]; then
  red "No Android SDK found."
  red "  Install Android Studio, then in Settings → SDK Manager add:"
  red "    • Android SDK Platform 36"
  red "    • Android SDK Build-Tools 36"
  red "  Then: export ANDROID_HOME=\$HOME/Android/Sdk   (macOS: ~/Library/Android/sdk)"
  red ""
  red "  No SDK and no time? Push to GitHub and run the"
  red "  'Build demo APK' workflow instead — it needs nothing installed."
  fail=1
else
  export ANDROID_HOME="$SDK"
  export ANDROID_SDK_ROOT="$SDK"
  green "Android SDK: $SDK"
fi

[ "$fail" -eq 0 ] || exit 1

# ------------------------------------------------------------------ build

info "Installing dependencies"
npm install --no-audit --no-fund

info "Switching to demo configuration"
cp .env.demo .env
cp google-services.demo.json google-services.json

info "Generating the native Android project"
npx expo prebuild --platform android --clean --no-install

info "Assembling the release APK (first run downloads Gradle deps — a few minutes)"
cd "$APP_DIR/android"
./gradlew assembleRelease --no-daemon

APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  red "Build finished but no APK was produced at:"
  red "  $APK"
  exit 1
fi

OUT="$APP_DIR/fxpulse-demo.apk"
cp "$APK" "$OUT"

green ""
green "APK built: $OUT"
green "Size: $(du -h "$OUT" | cut -f1)"
green ""
green "Install on a connected device:"
green "  adb install -r \"$OUT\""
green ""
green "No account or network needed. Switch tiers in Profile → Demo build."
