#!/bin/sh
# KAN-1342: the replay image ships the Alpine Linux userland of its nginx base image, which includes GPL software
# (busybox, GPL-2.0-only). This writes, at build time and from the image's own package database, which packages and
# licenses are inside and where their exact corresponding sources are, so whoever pulls the public image gets both.
set -eu
out="$1"
alpine="$(cat /etc/alpine-release)"
branch="$(echo "$alpine" | cut -d. -f1,2)-stable"
mkdir -p "$(dirname "$out")"
{
  echo "CryptoBot public replay — third-party notices"
  echo
  echo "The application in /usr/share/nginx/html/cryptobot/ is licensed under Apache-2.0"
  echo "(https://github.com/sebdev89/life-engine-cryptobot-ui, LICENSE and NOTICE)."
  echo
  echo "This image is built on nginxinc/nginx-unprivileged (Alpine Linux ${alpine}). The packages below come from"
  echo "that base image unmodified, each under its own license. Some are GPL (for example busybox, GPL-2.0-only)."
  echo
  echo "Corresponding source code for every package, at the exact version listed:"
  echo "  - Alpine aports, branch ${branch}: https://gitlab.alpinelinux.org/alpine/aports/-/tree/${branch}"
  echo "    (each package's APKBUILD names its upstream source tarball and the patches applied)"
  echo "  - Alpine source mirrors: https://dl-cdn.alpinelinux.org/alpine/v$(echo "$alpine" | cut -d. -f1,2)/"
  echo "  - nginx packages: https://github.com/nginxinc/docker-nginx-unprivileged and https://nginx.org/en/download.html"
  echo "If any of these is unreachable, ask for the sources at https://github.com/sebdev89/life-engine-cryptobot-ui/issues"
  echo "and they will be provided for the version in this image."
  echo
  echo "Installed packages (name-version arch {origin} (license)):"
  apk list -I 2>/dev/null | sed 's/ \[installed\]$//' | sort
} > "$out"
grep -q 'GPL' "$out"
