# Cabeceras de la réplica pública (included en cada location que agrega las suyas: nginx no hereda
# add_header del server en un location que declara add_header propio).
# CSP: sólo este origen. connect-src 'self' es la segunda barrera de "la página no habla con ningún
# backend": aunque un bug intentara un fetch a otra API, el navegador lo corta.
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
