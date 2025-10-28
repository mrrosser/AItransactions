FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json /app/
RUN npm i --omit=dev || true
COPY . /app
EXPOSE 8787
VOLUME ["/app/sqlite.db"]
CMD ["node","dist/integrations/rest.js"]
