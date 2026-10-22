# How tarefe.de reaches the site (APPLIED 2026-10-22)

The stack in /opt/tarefe.de runs as three containers (web, db, backup). The web container listens on
127.0.0.1:3100 (for SSH tunnels) and is ALSO joined to the Docker network `tarefesite_frontend`, the one the
existing web server (OpenResty, /opt/tarefesite) uses. OpenResty owns ports 80 and 443 and forwards by
domain name:

- `tarefe.de`  -> this site (rule file: /opt/tarefesite/nginx/conf.d/tarefe-next.conf, copy in deploy/)
- `www.tarefe.de` -> redirects to https://tarefe.de (unchanged)
- `fa. ru. ar. en. tr.tarefe.de` -> WordPress (unchanged, but see below)
- `api.` `panel.` `cdn.tarefe.de` -> the CRM (untouched)

## What was changed outside /opt/tarefe.de (and how to undo it)
Backup of the whole conf.d folder: /opt/tarefe.de/openresty-backup-20261022-095426/conf.d
1. tarefe.conf: `tarefe.de` removed from the WordPress server_name line.
2. tarefe.conf: the WordPress `proxy_pass http://wordpress-web:8080;` now goes through Docker DNS at request
   time (`resolver 127.0.0.11` + a variable). The old form made the whole OpenResty configuration fail its test
   whenever the wordpress-web container does not exist (it does not exist on this server today), which would
   have blocked every reload. Behaviour is identical whenever WordPress is running.
3. New file tarefe-next.conf (the rule for tarefe.de).
To undo: delete tarefe-next.conf, copy tarefe.conf back from the backup folder, then
`docker exec openresty openresty -t` and `docker exec openresty openresty -s reload`.

## Still to do by the domain owner
- DNS: the A record of tarefe.de (and www) must point to 87.106.38.19.
- The HTTPS certificate for tarefe.de expires on 2026-11-17. Check that automatic renewal works.
