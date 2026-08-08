# Matterbridge Hubspace

Matterbridge dynamic-platform plugin for Hubspace devices sold by Home Depot. It uses the Hubspace cloud API and exposes discovered devices as Matter endpoints.

[Matterbridge](https://github.com/Luligu/matterbridge) provides the Matter bridge runtime. This project is a Matterbridge port derived from the Homebridge implementations listed in [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).

## Supported devices

| Hubspace device | Matter support |
| --- | --- |
| Lights | On/off, brightness, RGB color when provided by the device |
| Ceiling fans | On/off and speed |
| Outlets | On/off |
| Switches | On/off |

Hubspace devices vary by model. The plugin only exposes functions reported by both the device and the plugin's device definitions.

## Requirements

- Matterbridge 3.10.4 or newer
- Node.js 20.19+, 22.13+, 24, or 26 in the ranges supported by Matterbridge
- A Hubspace account

## Install

Install a published release from npm:

```bash
sudo npm install -g matterbridge-hubspace --omit=dev
matterbridge --add matterbridge-hubspace
```

To test a release tarball instead, download it from the GitHub release and run:

```bash
sudo npm install -g ./matterbridge-hubspace-0.1.0.tgz --omit=dev
matterbridge --add matterbridge-hubspace
```

### Build from source

Build the installable tarball:

```bash
npm install
npm run package
```

Install and register the generated package:

```bash
sudo npm install -g ./matterbridge-hubspace-0.1.0.tgz --omit=dev
matterbridge --add matterbridge-hubspace
```

Start Matterbridge and configure `matterbridge-hubspace` in the Matterbridge frontend. Enter the same username and password used by the Hubspace app, then restart the plugin.

For local development without a global install, use `npm run add` from this checkout.

Once the plugin is running, commission the Matterbridge bridge into Apple Home, Google Home, Alexa, SmartThings, or another Matter controller using the QR code or pairing code shown by Matterbridge.

## Configuration

| Setting | Default | Description |
| --- | ---: | --- |
| `username` | Required | Hubspace account username |
| `password` | Required | Hubspace account password |
| `loginBuffer` | `300` | Token refresh buffer in seconds |
| `pollInterval` | `30` | Device state polling interval in seconds, minimum 5 |
| `discoveryInterval` | `300` | Device reconciliation interval in seconds, minimum 60 |
| `debug` | `false` | Enable Matterbridge endpoint debug logging |
| `unregisterOnShutdown` | `false` | Remove endpoints when the plugin stops; intended for development |

Matter requires maintained attributes rather than HomeKit-style reads on demand. The plugin therefore polls Hubspace for current state and updates Matter attributes. Discovery runs separately so newly added and removed Hubspace devices are reconciled without restarting the plugin.

## Development

```bash
npm install
npm run lint
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes. Never include Hubspace credentials, access tokens, account IDs, or device IDs in issues or logs.

There is no complete official Hubspace API reference. Hubspace uses Afero cloud APIs and Keycloak authentication, so device support is based on the functions reported by each device.

## Disclaimer

This project is not affiliated with or endorsed by Home Depot, Hubspace, or Afero. Cloud API behavior may change without notice.

## License

Licensed under the [Apache License 2.0](LICENSE). See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for project lineage and credits.