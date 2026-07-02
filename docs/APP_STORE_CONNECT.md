# App Store Connect Submission Draft

## App Information

App name:

```text
AI Workspace Doctor
```

Subtitle:

```text
AI environment health checks
```

Bundle ID:

```text
ai.voiceshell.aiworkspacedoctor
```

SKU:

```text
ai-workspace-doctor-mac-001
```

Primary category:

```text
Developer Tools
```

Secondary category:

```text
Productivity
```

## Promotional Text

```text
Check your AI work environment, review privacy and consistency issues, and generate transparent repair profiles for local development workflows.
```

## Description

```text
AI Workspace Doctor helps developers and teams keep their local AI tooling consistent, private, and easier to use.

Run a local environment scan to review system language, timezone, terminal variables, proxy settings, Git identity, project paths, and other configuration details that may affect AI development workflows. The app explains each finding in plain language and can generate reviewable repair profiles for macOS, Linux, Windows PowerShell, and Git.

Reports are local-first. The app does not upload your environment report by default, does not modify shell startup files automatically, and keeps repair actions transparent and reversible.

Key features:
- Local AI work environment scan
- Environment score and prioritized findings
- Terminal locale and timezone checks
- Proxy variable consistency checks
- Git identity and path privacy reminders
- Reviewable one-click repair profile generation
- Windows and macOS workflow preparation

AI Workspace Doctor is a configuration and privacy hygiene tool. It does not guarantee access to third-party services, bypass platform policies, or make account-safety promises.
```

## Keywords

```text
AI,developer tools,environment,privacy,terminal,Git,workflow,configuration
```

## Support URL

```text
https://voiceshell.ai/support
```

## Marketing URL

```text
https://voiceshell.ai/ai-workspace-doctor
```

## Privacy Policy URL

```text
https://voiceshell.ai/privacy
```

## Review Notes

```text
AI Workspace Doctor performs local environment checks and generates user-reviewable profile files. It does not require an account for the current version.

To test:
1. Launch the app.
2. Click "重新检测" to run a local scan.
3. Click "检测网络" to run the optional public IP reachability check.
4. Click "生成修复 Profile" to generate profile templates inside the app data directory.

The app does not modify shell startup files automatically. Generated profiles are reviewable text files. Network checks are optional and used only to display connectivity status.
```

## Privacy Nutrition Label Draft

Data collected by the app developer in the current build:

```text
None
```

Data processed locally:

```text
System locale, timezone, terminal variables, proxy variable presence, Git identity values, hostname, username, and project path are inspected locally for the environment report.
```

Optional network activity:

```text
If the user clicks the network check button, the app performs a public IP reachability check. This is optional and is not tied to an account in the current build.
```

## Screenshots Needed

Mac App Store requires screenshots. Capture:

- Main dashboard with environment score.
- Issue list and recommendation panel.
- Repair profile generation result.

Use clean demo data and avoid showing personal paths, real hostnames, or personal email addresses.

## Before Upload

- Create App ID for `ai.voiceshell.aiworkspacedoctor`.
- Create MAS provisioning profile matching the app entitlements.
- Save it as `build/embedded.provisionprofile`.
- Confirm app icon exists at `build/store-icon-1024.png`.
- Build with `npm run pack:mas`.
- Upload with Transporter or Xcode.

