# Deploy the project service

The static editor still works on GitHub Pages. The optional authenticated project service needs persistent disk and an HTTPS host.

1. Install Docker Engine + Compose on your chosen host; point a domain at it.
2. Copy `deployment/env.example` to `deployment/.env`; set `ARCHCAD_DOMAIN`, exact allowed browser origins.
3. Provision an owner: `node server/create-user.cjs owner deployment/users.json`. The generated token is stored only in the private JSON file. Read it securely and use it in **Pro → Cloud connection & offline queue**; do not commit the file.
4. From `deployment`, run `docker compose up -d --build`. Caddy requests certificates and forwards HTTPS to the service. `/api/health` is public; project/account/review operations require a scoped token.
5. Connect the HTTPS service URL and owner token, upload/open a remote project, then add independent editor/viewer identities as needed. Share links have separate expiry and comment permissions.

The container bootstrap reads the mounted private user secret, prepares the persistent data directory and drops privileges before starting the server. `project_data`, `caddy_data` and `caddy_config` are persistent volumes. Keep one service replica: the JSON backend and object leases are single-instance.

## Backups

Stop writes before snapshot/restore. With the service stopped, run `node server/backup.cjs backup <data-directory> <backup.json>` against the mounted project-data directory; move the checksum-protected backup to your private backup destination. Test restore to an empty temporary directory with `node server/backup.cjs restore <backup.json> <restore-directory>` before relying on it. Restore saves the current database as a recovery copy before replacing it. Back up the user-token file separately and restrict access to both datasets.

No external deployment is performed by repository changes. Domain, TLS reachability, host sizing and private backup storage must be configured on the selected host.
