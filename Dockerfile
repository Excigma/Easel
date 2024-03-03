FROM node:20-alpine

WORKDIR /usr/app
RUN apk add --no-cache python3 make g++

COPY .yarn /usr/app/.yarn
COPY package.json yarn.lock .yarnrc.yml .pnp.cjs /usr/app
RUN yarn set version stable

RUN yarn install --immutable

ENV NODE_ENV production

COPY . /usr/app
RUN yarn pnpify prisma generate
RUN yarn build

USER node
CMD ["yarn", "start"]
