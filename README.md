# AI Workspace Doctor

AI Workspace Doctor is the first concrete product slice for VoiceShell AI Workspace: a Windows/macOS environment scanner and desktop prototype that checks AI work readiness, highlights privacy and consistency issues, and generates user-reviewed one-click repair profiles.

It does not promise bypassing platform controls. It helps users understand and manage their own local AI work environment.

## Current Prototype

```bash
npm install
npm run scan
npm run scan:json
npm run fix:preview
npm run fix:write
npm run dev
npm run build:web
```

`fix --write` creates reviewable profile scripts under:

```text
~/.ai-workspace-doctor/profiles/
```

Nothing is added to shell startup files automatically.

`npm run dev` starts the Vite renderer and the Electron shell. `npm run dev:web` starts only the web preview.

## Product Documents

- [PRD](./docs/PRD.md)
- [MVP Spec](./docs/MVP_SPEC.md)
- [China Launch Checklist](./docs/CHINA_LAUNCH.md)
