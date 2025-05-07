FROM node:18-alpine3.20 as build-stage

WORKDIR /app

# 先复制 package.json，利用分层docker layer的缓存机制
# 如果package.json没有发生变化，只是代码改变了，Docker 会使用缓存的镜像层来避免重复安装依赖项
COPY package.json .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:18-alpine3.20 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install --production

EXPOSE 3005

CMD ["node", "/app/main.js"]
