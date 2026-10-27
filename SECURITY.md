# Security

Report vulnerabilities privately through GitHub Security Advisories for `acoyfellow/tuiport`.

## Security model

- SSH encrypts and authenticates the application session end to end.
- Public SSH reaches the Worker only through its `connect()` handler, which only a Spectrum application or service binding in the same account can invoke. No hop between Spectrum and the Container parses the stream.
- The sample accepts any verified public key. This identifies users but does not authorize them for private capabilities.
- The embedded browser demo never starts a shell or connects to SSH. It exposes only a constrained OpenTUI application through an exact-origin WebSocket route.
- Browser sessions have bounded input and dimensions, a global concurrency cap, an idle timeout, and an absolute lifetime.

Before production use, replace the sample SSH policy with an allowlist, and apply connection limits or IP access rules at Spectrum.

Use `SSH_HOST_KEY_B64` so clients see a stable server identity across Container restarts. Never commit `.dev.vars`, host private keys, or user private keys.