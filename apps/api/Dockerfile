FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package*.json apps/api/

RUN npm ci --omit=dev --workspace apps/api --include-workspace-root=false

COPY apps/api apps/api
COPY apps/web/src/content/companyIdentity.json apps/web/src/content/companyIdentity.json

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["npm", "start"]
