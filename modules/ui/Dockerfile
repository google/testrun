#stage 1
FROM node:16-alpine as node
WORKDIR /test-run-ui
COPY . .
RUN NODE_ENV=development npm i
RUN npm run build --prod
#stage 2
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=node /test-run-ui/dist/test-run-ui /usr/share/nginx/html
