FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_EP_API_URL
ENV VITE_EP_API_URL=$VITE_EP_API_URL
ARG VITE_SURVEYS_API_URL
ENV VITE_SURVEYS_API_URL=$VITE_SURVEYS_API_URL
ARG VITE_HUB_URL
ENV VITE_HUB_URL=$VITE_HUB_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
