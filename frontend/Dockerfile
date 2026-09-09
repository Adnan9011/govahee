FROM node:20-alpine AS builder

# Optional first registry. If unset, npmjs → Huawei → npmmirror are tried in order.
ARG NPM_REGISTRY=
ENV NODE_OPTIONS=--dns-result-order=ipv4first

WORKDIR /app

COPY package.json ./
RUN npm config set fetch-retries 4 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retry-maxtimeout 60000 \
    && npm config set fetch-timeout 60000 \
    && fail=1 \
    && for reg in ${NPM_REGISTRY} \
         https://registry.npmjs.org \
         https://repo.huaweicloud.com/repository/npm/ \
         https://registry.npmmirror.com; do \
         [ -z "$reg" ] && continue; \
         echo "=== npm registry: $reg ==="; \
         npm config set registry "$reg"; \
         if npm install --no-audit --no-fund --progress=true; then \
           fail=0; \
           break; \
         fi; \
       done \
    && [ "$fail" -eq 0 ]

COPY . .

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_SITE_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL

RUN npm run build

FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
