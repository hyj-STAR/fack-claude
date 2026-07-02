# Distribution Plan

## Current State

The project can build a web renderer and has electron-builder configuration for:

- macOS direct download: DMG + ZIP.
- Mac App Store: MAS target.
- Windows: NSIS installer + ZIP.

Local test artifacts have been generated under `release/`. The folder is git-ignored and should be distributed through GitHub Releases, object storage, or the website download backend.

## macOS Direct Download

Build:

```bash
npm run pack:mac
```

For public direct download, sign with Developer ID and notarize.

Required Apple credentials:

- Apple Developer Program membership.
- Developer ID Application certificate.
- Developer ID Installer certificate if building PKG later.
- App Store Connect API key or Apple ID notary credentials.

Current local certificate check found:

- `Developer ID Application: Yujiang Han (8RJDVUFRN5)`
- `Apple Distribution: Yujiang Han (8RJDVUFRN5)`
- `3rd Party Mac Developer Application: Yujiang Han (8RJDVUFRN5)`

Developer ID signing was detected, but the first full signing attempt was very slow because `codesign` processed Electron framework resource files one by one. Treat unsigned DMG/ZIP as internal test builds until signing optimization and notarization credentials are configured.

Apple's macOS distribution overview separates Mac App Store distribution from Developer ID/notarized direct distribution.

## Mac App Store

Build:

```bash
npm run pack:mas
```

Required Apple assets:

- App ID: `ai.voiceshell.aiworkspacedoctor`.
- Mac App Store distribution certificate.
- 3rd Party Mac Developer Installer certificate if packaging/upload flow requires installer signing.
- MAS provisioning profile copied to `build/embedded.provisionprofile`.
- App Store Connect app record.
- Screenshots, privacy answers, support URL, marketing URL, review notes.

Important product constraints:

- MAS builds use App Sandbox.
- The app should avoid hidden writes to arbitrary home-directory paths.
- The current desktop flow should keep repair files inside the app data directory or require explicit user-selected locations.

Upload options after signing:

- Xcode Organizer.
- Transporter app.
- `xcrun notarytool` is for direct distribution notarization, not App Store submission.

The official Apple docs describe Mac App Store distribution and Developer ID/notarized direct distribution as separate paths. electron-builder's MAS target also requires a provisioning profile tied to the app's entitlements and App ID.

## Windows

Build:

```bash
npm run pack:win
```

For public launch, use a code signing certificate:

- Standard or EV Windows code signing certificate.
- Configure `CSC_LINK` and `CSC_KEY_PASSWORD`, or electron-builder Windows signing settings.

Without signing, Windows builds are usable for internal testing but will trigger SmartScreen warnings.

## Build Outputs

```text
release/
```

## References

- Apple macOS distribution overview: https://developer.apple.com/macos/distribution/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- electron-builder MAS docs: https://www.electron.build/docs/mas
- electron-builder macOS docs: https://www.electron.build/docs/mac/
- electron-builder Windows target docs: https://www.electron.build/docs/targets/
