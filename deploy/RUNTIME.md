# GoTravel runtime on this server

The only active application checkout is `/home/DoANLienNganh`, on branch
`devserver`. All GoTravel and GoCar apps, including the GoTravel Cloudflare
tunnel, run under the `nhan` PM2 home (`/home/nhan/.pm2`). The app definitions
are in [`ecosystem.config.cjs`](./ecosystem.config.cjs).

PM2 restores its saved process list at login/boot through the `nhan` user unit
[`pm2-gotravel.service`](./pm2-gotravel.service). The installed copy lives at
`/home/nhan/.config/systemd/user/pm2-gotravel.service`; user lingering is
enabled. Run PM2 commands and `pm2 save` **as `nhan`** so the saved process list
matches the running one. `pm2 startOrRestart` does not reliably update an
existing app's working directory or script path; when those change, replace the
affected app from the ecosystem file, check its health, then save PM2.

The source checkout alone is not enough to restart the services. Keep the
ignored runtime files and build outputs in the primary checkout: Java JARs in
each module's `target/`, frontend `dist/` and `.next/`, installed Node modules,
service `.env` files, `Identity/.secrets/`, `PaymentandWallet/.secrets/`, and
`APIGateway/.data/`. The tunnel token is stored outside Git at
`/home/nhan/.config/gotravel-cloudflared/tunnel-token`. Do not commit these
files or copy them into another worktree.

Before another deployment, check `git worktree list`, the active branch, PM2's
`cwd`/script paths, and the saved PM2 process list. Keep one app checkout and
one PM2 owner so future restarts cannot return to an obsolete worktree.
