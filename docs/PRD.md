# VoiceShell AI Workspace - Product Requirements Document

## 1. Product Positioning

**One-line description:** A cross-platform AI work environment manager for Chinese users, providing environment health checks, privacy risk detection, one-click repair profiles, translation, model routing, and optional remote workspaces.

**Slogan:** Work with AI clearly, privately, and consistently.

**Target users:**

- Developers using AI coding tools on Windows/macOS.
- Creators, students, and researchers who often work across Chinese and English AI workflows.
- Small teams that need unified AI environment configuration, usage visibility, and privacy hygiene.

**Core value:**

Users should not need to understand system locale, terminal variables, proxy settings, DNS behavior, API endpoints, or translation pipelines. The product detects the current environment, explains risks in plain language, and gives transparent, reversible repair actions.

**Compliance boundary:**

The product does not promise account safety, platform bypassing, evasion of access controls, or anti-detection guarantees. It only manages user-owned local settings, user-provided network/API configuration, and optional remote workspace recommendations.

## 2. Product Name

Working name: **VoiceShell AI Workspace**

Module name for MVP: **AI Workspace Doctor**

Alternative names for later branding:

- WorkShell
- PromptEnv
- AI Env Doctor
- ShellGuard

## 3. Product Modules

### 3.1 Environment Detection Center

The detection center scores the user's current AI work environment across five dimensions:

| Dimension | Examples | Output |
| --- | --- | --- |
| System consistency | OS, language, region, timezone | Healthy / Warning / Needs attention |
| CLI readiness | `LANG`, `LC_ALL`, `TZ`, proxy env vars, shell | Suggested profile |
| Network readiness | proxy presence, DNS hints, public IP visibility, latency | Connection report |
| Privacy hygiene | Git name/email, project path, hostname, local username exposure | Privacy report |
| AI service readiness | user-configured Anthropic/OpenAI/Gemini/OpenRouter/custom endpoints | Availability report |

### 3.2 One-Click Repair Center

The repair center gives every issue:

- What was detected.
- Why it may matter.
- What will change.
- Whether admin permission is required.
- How to roll back.

MVP repair actions:

- Generate an AI work shell profile for macOS/Linux.
- Generate an AI work PowerShell profile for Windows.
- Generate a safe Git identity template.
- Generate proxy environment templates from user-provided host/port.
- Generate a clean project workspace path suggestion.

The app must ask for confirmation before applying persistent changes. The first MVP only writes reviewable scripts and does not mutate shell startup files automatically.

### 3.3 Translation And Prompt Layer

The product supports bilingual AI work without pretending to be another user or location:

- Chinese prompt polishing.
- Chinese-to-English prompt translation.
- English-to-Chinese response translation.
- Team glossary.
- Prompt templates for coding, research, writing, and customer support.

Engines:

- DeepL.
- OpenAI-compatible API.
- Local Ollama model.

### 3.4 Model And API Routing

Users can configure:

- Anthropic API.
- OpenAI API.
- Gemini API.
- OpenRouter.
- Self-hosted OpenAI-compatible endpoints.

The app stores secrets locally in the OS keychain where possible.

### 3.5 Service Recommendation Marketplace

The product can recommend legitimate infrastructure services for AI work:

- Cloud servers.
- Remote desktop providers.
- Developer workstations.
- Business VPN or Zero Trust providers.
- API gateway providers.
- Translation providers.

Recommendation copy must be framed as stability, privacy, remote development, and compliance support. It must not claim to bypass regional restrictions or platform risk systems.

### 3.6 Remote AI Workspace

Longer-term paid module:

- One-click remote Windows/Linux development workspace.
- Preinstalled browser, terminal, Git, Node.js, Python, and AI tools.
- Local client remote connection.
- Secret management.
- Session isolation.
- Destroy/rebuild workflow.

This module sells a stable work environment, not an evasion identity.

## 4. MVP Scope

MVP is a desktop-first product with a CLI prototype:

- Windows/macOS environment scanner.
- Environment score.
- Issue list with severity.
- One-click profile generation.
- Manual rollback instructions.
- Basic service recommendation slots.
- Local-only report export.

Out of MVP:

- Browser extension.
- Automatic browser fingerprint changes.
- Hidden network tunneling.
- Any platform-specific anti-detection claims.
- Team management.
- Payment.
- Remote workspace provisioning.

## 5. User Journey

1. User installs the desktop app.
2. App runs a local environment scan.
3. User sees score, issues, and explanations.
4. User chooses "Generate AI Work Profile".
5. App writes a reviewable shell/PowerShell profile.
6. User applies it manually or through a confirmed app action.
7. App rescans and shows improvements.
8. User optionally configures translation and model providers.

## 6. Business Model

| Plan | Price idea | Features |
| --- | --- | --- |
| Free | $0 | Environment scan, basic report, limited profile generation |
| Pro | $9.9/month | One-click profiles, translation, model routing, glossary |
| Team | $29.9/month/user or team bundle | Shared policy, team glossary, usage view, workspace templates |
| Business | Custom | Remote workspace, compliance logs, private deployment |

## 7. Safety And Trust Requirements

- Never modify persistent system settings without explicit confirmation.
- Every repair must be reversible.
- Exported reports must redact secrets by default.
- Do not store AI conversations unless the user opts in.
- Do not upload environment reports by default.
- Clearly separate "detected facts" from "recommendations".

## 8. Success Metrics

- First scan success rate > 95%.
- Report generation time < 5 seconds.
- Profile generation success rate > 95%.
- User understands top issue without reading docs: qualitative target.
- Less than 1% support tickets caused by irreversible configuration changes.

## 9. Launch Plan

1. CLI prototype for macOS/Windows.
2. Desktop UI around the same scanner.
3. Translation and model configuration.
4. Paid Pro unlock.
5. Remote workspace beta.

