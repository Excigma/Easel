FROM node:20-alpine

ARG TZ
ARG NODE_ENV
ARG POSTGRESQL_URL

ENV TZ $TZ
ENV NODE_ENV $NODE_ENV
ENV POSTGRESQL_URL $POSTGRESQL_URL

WORKDIR /usr/app

RUN apk add --no-cache python3 make g++ tzdata

# Set the timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone 

# Copy package lists and install dependencies
COPY package.json yarn.lock .yarnrc.yml /usr/app
COPY .yarn /usr/app/.yarn
RUN yarn set version stable

# Install dependencies
RUN yarn install --immutable

# Copy Prisma configuration and generate the client
COPY prisma /usr/app/prisma
RUN yarn pnpify prisma generate

# Copy the rest of the files and build the app
COPY tsconfig.json tsup.config.ts /usr/app
COPY src /usr/app/src
RUN yarn build

# Start the app
# TODO: Find out why yarn is putting a cache into /root/.yarn which cannot be accessed by this user
# and why disabling global cache causes esbuild to never finish
# USER node
CMD yarn start
