FROM node:20-alpine AS builder

ARG NPM_REGISTRY=
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV NPM_REGISTRY=$NPM_REGISTRY

WORKDIR /app

COPY package.json docker-npm-install.sh ./
RUN chmod +x docker-npm-install.sh && ./docker-npm-install.sh

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
