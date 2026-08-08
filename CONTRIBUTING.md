# Contributing

Contributions and device reports are welcome. Hubspace has no complete public API specification, so focused observations from real hardware are especially useful.

## Development

Use a Matterbridge-supported Node.js release. Node.js 24 is used by CI.

```bash
npm ci
npm run lint
npm run build
npm run package
```

Keep changes focused and consistent with the existing TypeScript style. Add or update documentation when behavior or configuration changes.

## Device reports

Include the device manufacturer, model number, Hubspace device class, expected behavior, actual behavior, plugin version, Matterbridge version, and relevant logs.

Before posting, remove Hubspace usernames, passwords, access or refresh tokens, account IDs, device IDs, network addresses, Matter setup codes, and other personal data. Do not submit credentials in an issue, pull request, or sample configuration.

## Pull requests

Describe the behavior being changed and how it was tested. Pull requests must pass lint, TypeScript compilation, and package creation. By submitting a contribution, you agree that it is licensed under the Apache License 2.0 used by this project.
