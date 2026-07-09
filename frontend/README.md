# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Docker

Vite inlines `VITE_*` env vars into the JS bundle at **build time**, so
the API URL and key must be passed as `--build-arg`, not mounted as a
runtime `.env` (unlike the backend container):

```bash
docker build \
  --build-arg VITE_API_URL=http://134.185.94.34:8000 \
  --build-arg VITE_ARGUS_API_KEY=<dashboard-read-key> \
  -t argus-frontend:latest .

docker run -d -p 80:80 --restart unless-stopped argus-frontend:latest
```

If you build without `--build-arg`, the app ships with an empty API
URL/key baked in and every request will fail — rebuild the image to
change either value, restarting the container alone won't pick up new
values.

For the VPS (arm64), follow the same multi-arch pattern as the backend
(see `docs/deployment-guide.md`):

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_URL=http://134.185.94.34:8000 \
  --build-arg VITE_ARGUS_API_KEY=<dashboard-read-key> \
  -t <dockerhub-user>/argus-frontend:latest \
  --push .
```

The container serves the built static files via nginx on port 80 and
falls back to `index.html` for client-side routes (`nginx.conf`).
