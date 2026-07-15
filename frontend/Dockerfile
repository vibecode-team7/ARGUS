FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* vars into the JS bundle at build time, so they
# must be passed as build args (not runtime env) - see README for the
# exact `docker build --build-arg` invocation.
ARG VITE_API_URL
ARG VITE_ARGUS_API_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ARGUS_API_KEY=$VITE_ARGUS_API_KEY

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# ADDED: Non-root user for container security (semgrep: missing-user)
RUN adduser --disabled-password --no-create-home appuser
USER appuser

CMD ["nginx", "-g", "daemon off;"]
