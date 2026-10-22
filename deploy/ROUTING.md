# Putting tarefe.de in front of the new site (NOT applied yet)

The stack in /opt/tarefe.de is running and answers only on the server's own 127.0.0.1:3100.
Nothing outside this folder was changed. Today OpenResty (in /opt/tarefesite) sends
tarefe.de / www.tarefe.de to WordPress, so visitors still get WordPress.

## Look at it first (no change anywhere): an SSH tunnel
    ssh -i C:\Users\HoldCo\.ssh\Tarefe\tarefe-privatekey.pem -L 3100:127.0.0.1:3100 root@87.106.38.19
then open http://localhost:3100/fa on your own computer.

## To switch tarefe.de to the new site (needs the owner's approval; it edits /opt/tarefesite/nginx)
1. Back up the OpenResty config folder and the file tarefe.conf.
2. Let OpenResty reach the new container: add the `tarefesite_frontend` network to the `web`
   service in /opt/tarefe.de/docker-compose.yml (marked `external: true`) and `docker compose up -d`.
3. In tarefe.conf remove `tarefe.de` and `www.tarefe.de` from the WordPress server blocks
   (fa. ru. ar. en. tr. stay on WordPress) and add the block in openresty-tarefe-next.conf.example.
4. `docker exec openresty openresty -t` and, only if it says ok, `docker exec openresty openresty -s reload`.
5. To undo: restore the backed-up tarefe.conf and reload.
