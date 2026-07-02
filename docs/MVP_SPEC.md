# AI Workspace Doctor - MVP Specification

## Goal

Build a concrete Windows/macOS MVP that can be shipped from the official website:

> Scan my AI work environment, explain what is inconsistent or risky, and generate a transparent profile that I can apply or roll back.

## Release Target

Version: `0.1.0`

Deliverables:

- CLI scanner.
- Desktop wrapper.
- Local report export.
- Profile generator.
- Documentation page for every check.

## Core Screens

### 1. Dashboard

Shows:

- Overall score: 0-100.
- Status: Healthy, Needs attention, High risk.
- Top 3 issues.
- Last scan time.
- Primary action: Rescan.
- Secondary action: Generate AI Work Profile.

### 2. Environment Report

Sections:

- System.
- Terminal.
- Network.
- Privacy.
- AI Providers.

Each issue includes:

- Severity.
- Detected value.
- Recommended value or recommended action.
- "Why this matters".
- Repair availability.

### 3. Repair Center

Shows proposed changes before writing anything:

- Files to create or update.
- Environment variables to set.
- Rollback file path.
- Admin permission requirement.

MVP only writes new files under app-owned config directory:

```text
~/.ai-workspace-doctor/
```

### 4. Providers

User can configure:

- API provider name.
- Base URL.
- API key.
- Model.
- Translation provider.

MVP stores a local redacted config file. Production should move secrets to Keychain/Credential Manager.

## Checks For MVP

### System Checks

| Check | macOS | Windows | Severity |
| --- | --- | --- | --- |
| OS version | yes | yes | info |
| Timezone | yes | yes | warning when missing |
| Locale env | yes | partial | warning |
| Shell | yes | yes | info |
| Hostname | yes | yes | warning if contains CJK |
| Username | yes | yes | warning if contains CJK or phone-like number |

### CLI Checks

| Check | Rule | Severity |
| --- | --- | --- |
| `LANG` | missing or non-UTF-8 | warning |
| `LC_ALL` | missing is info, non-UTF-8 is warning | info/warning |
| `TZ` | missing is info | info |
| `HTTP_PROXY` / `HTTPS_PROXY` | missing is info, mismatch is warning | info/warning |
| `NO_PROXY` | missing is info | info |

### Privacy Checks

| Check | Rule | Severity |
| --- | --- | --- |
| Git user.name | contains CJK or phone-like value | warning |
| Git user.email | QQ/163/personal domain flagged as privacy note | info |
| Current path | contains CJK or phone-like value | warning |
| Home path | contains CJK or phone-like value | warning |

### Network Checks

MVP should support optional network checks:

- Public IP lookup.
- Basic provider endpoint reachability.
- DNS resolver hint.
- Latency to configured endpoints.

Network checks must be opt-in from CLI and explicit in desktop UI.

## CLI Contract

```bash
ai-doctor scan
ai-doctor scan --json
ai-doctor scan --network
ai-doctor fix --dry-run
ai-doctor fix --write
```

Exit codes:

- `0`: scan completed.
- `1`: scan failed.
- `2`: invalid command.

## Repair Profile

Generated macOS/Linux profile:

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8
export TZ=America/Los_Angeles
```

Generated Windows PowerShell profile:

```powershell
$env:LANG = "en_US.UTF-8"
$env:LC_ALL = "en_US.UTF-8"
$env:LC_CTYPE = "en_US.UTF-8"
$env:TZ = "America/Los_Angeles"
```

Proxy variables are not generated unless the user provides a proxy host and port.

## Desktop Tech Choice

Recommended for MVP:

- Tauri v2 if we start fresh.
- Electron if we integrate into the existing VoiceShell desktop app.

Because `/Applications/voiceshell` already has Electron dependencies but no complete visible app skeleton in this folder, the first prototype is CLI-first and can later be wrapped by either stack.

## First Sprint

### Day 1

- Create compliant PRD.
- Create MVP spec.
- Build CLI scanner prototype.

### Day 2

- Add profile generator.
- Add JSON report export.
- Add network opt-in checks.

### Day 3

- Build desktop dashboard mock with real scanner output.
- Add provider config form.

### Day 4

- Add repair preview UI.
- Add rollback file generation.

### Day 5

- Package macOS build.
- Package Windows build on Windows runner.
- Prepare website copy.

## Website Positioning

Headline:

> AI work environment health checks, one-click profiles, and bilingual workflow tools.

Subheadline:

> VoiceShell AI Workspace helps developers and teams keep local AI tooling consistent, private, and easier to use across Windows and macOS.

Forbidden launch claims:

- Anti-ban.
- Bypass.
- Anti-detection.
- Guaranteed account safety.
- Platform-specific evasion.

