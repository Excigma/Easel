FROM node:18

WORKDIR /usr/app
ENV NODE_ENV production

# Copy package.json and yarn cache into container and install dependencies for transpilation
COPY package.json yarn.lock .yarnrc.yml /usr/app
COPY .yarn /usr/app/.yarn
COPY prisma /usr/app/prisma

RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"
RUN yarn prisma generate

COPY .env feeds.json /usr/app
COPY src /usr/app/src

# Run process as a new non-privileged user
USER node

CMD ["node", "src/index.js"]