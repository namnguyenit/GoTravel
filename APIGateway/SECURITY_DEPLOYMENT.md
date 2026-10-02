# Gateway security deployment

The JWT key committed before this change is present in the public Git history. This commit removes it from the current tree, but Git history does not disappear. Treat every token signed by that key as compromised.

## Rotate signing credentials

1. Run `./setup-linux.sh keystore` as the account that runs Identity. It creates `Identity/.secrets/identity-signing.jks` and `Identity/.env` with a new random password and key ID. Both are ignored by Git and restricted to the provisioning and service accounts. If another account generates them, grant the service account read access to the files and directory without granting the whole project group access.
2. Build Identity with the new source. The keystore is loaded from `JWT_KEYSTORE_PATH`, an absolute file path; Identity now refuses to start without it. The key is never packaged into the JAR.
3. Start Identity with the variables from `Identity/.env`. `run-all.sh` loads this file for Identity. For a custom PM2 or systemd entrypoint, provide the same variables through its secret management mechanism.
4. Restart Gateway and all services that verify Identity JWTs so no verifier retains the old JWKS key. Existing sessions must log in again. Check the new `kid` in `/.well-known/jwks.json` and verify that old tokens are rejected.

Do not restore the old `keystore.jks` or reuse its password. Removing the old key from historical Git commits requires a coordinated history rewrite and force push because this is a shared repository; key rotation makes that exposed key unusable after rollout.

## Restrict network access

Gateway and backend services now default to `127.0.0.1`. Configure Cloudflare Tunnel to reach Gateway at `http://127.0.0.1:5555`. Keep backend ports blocked at the server firewall and verify from a separate machine that none are reachable directly. `TRUST_PROXY` defaults to `loopback`, so Gateway accepts forwarded client IPs only from the local tunnel. Other proxy topologies need an explicit trusted IP or subnet.

Rate limits currently use the process memory store. Before running multiple Gateway instances, use a shared store such as Redis so limits apply across instances.
