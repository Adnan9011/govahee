FROM node:20-alpine AS builder

ARG NPM_REGISTRY=https://registry.npmjs.org

WORKDIR /app

COPY package.json ./
RUN npm config set registry "${NPM_REGISTRY}" \
    && npm install --no-audit --no-fund --fetch-retries=10 --fetch-timeout=120000

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
