# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-08

### Added

- Native Matterbridge dynamic-platform implementation.
- Matter endpoints for Hubspace lights, ceiling fans, outlets, and switches.
- Periodic state polling and device reconciliation.
- Matterbridge configuration schema and production-safe package builder.

### Changed

- Replaced the Homebridge accessory layer with Matterbridge endpoints.
- Migrated the project to NodeNext ESM and Node.js versions supported by Matterbridge 3.10.4.
- Hardened account loading, token lifecycle, API response handling, and scheduled jobs.

### Removed

- Homebridge-specific accessories, schema, metadata, and development tooling.

[Unreleased]: https://github.com/kirchmeyer/matterbridge-hubspace/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kirchmeyer/matterbridge-hubspace/releases/tag/v0.1.0
