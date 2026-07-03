# US Environment Profile

This product slice implements the stronger workflow requested after reviewing the referenced X article and related repost snippets.

## Product Behavior

The app now has two explicit surfaces:

- United States one-click deployment.
- IP operation console.

The app keeps the workflow transparent:

- Preview what will change.
- Ask the user for confirmation.
- Apply local changes that do not require admin privileges.
- Generate backups, rollback script, and a deployment report.
- Show system-level or external-service steps separately.

## One-Click Deployment

After confirmation, the app automatically:

- Writes the AI work profile.
- Backs up the active shell rc file.
- Adds a source block to the shell rc file.
- Cleans old npm `proxy` and `https-proxy` values when present.
- Sets npm registry to `https://registry.npmjs.org/`.
- Cleans old Git `http.proxy` and `https.proxy` values when present.
- Generates `rollback.sh`.
- Generates `deployment-report.json`.

Target profile:

```text
Language: en-US
Locale: en_US.UTF-8
Timezone: America/Los_Angeles
NO_PROXY: localhost,127.0.0.1,::1
```

Items requiring user/admin action:

- macOS system timezone: `sudo systemsetup -settimezone America/Los_Angeles`
- Full-device routing: enable TUN/System Proxy inside the user's own network tool.
- System region/language UI changes.
- External account, phone, and payment information.

## IP Operation Console

The app now shows a concrete checklist:

- Choose a US endpoint.
- Enable TUN/System Proxy.
- Verify IPv4 and IPv6 separately.
- Check DNS consistency.
- Clean CLI residue.
- Handle system timezone.
- Align device region/language.
- Consider a remote US workspace if the local network is not controllable.
- Keep account/payment information user-owned and legal.

## IPv4 / IPv6 Split

The scanner checks both paths because a machine can have:

- IPv4 exiting through a US endpoint.
- IPv6 still going through the local network.

That condition is shown as `ipv6-country-not-us`.

