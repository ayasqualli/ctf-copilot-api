# APK Analysis Workflow

Use this note as sample data when you do not want to point the app at your real vault.

## Static triage

Start with jadx for Java/Kotlin decompilation and apktool for manifest/resources extraction. Check permissions, exported components, hardcoded URLs, and suspicious native libraries.

## Dynamic analysis

Use an emulator, Frida, objection, and network proxying. Capture logs with adb logcat and compare behavior before and after authentication.

## Reporting

Keep evidence grounded: file hashes, package name, permissions, network indicators, and screenshots.
