# This build stage installs dependencies used in production
# Two stages use this as a base - this should be cached
FROM node:20-alpine AS install-dependencies

WORKDIR /usr/app
ENV NODE_ENV PRODUCTION

RUN apk add --no-cache python3 make g++

# Copy package.json into container and install dependencies for transpilation
COPY package.json yarn.lock .yarnrc.yml /usr/app
COPY .yarn /usr/app/.yarn

RUN yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)"

# Copy prisma schema and generate client
COPY prisma /usr/app/prisma
RUN yarn prisma generate




# This build stage stores the dependencies that are used in production - this should be cached
FROM node:20-alpine as production-dependencies

WORKDIR /usr/app
ENV NODE_ENV PRODUCTION

COPY --from=install-dependencies /usr/app/package.json /usr/app/yarn.lock /usr/app/.yarnrc.yml /usr/app
COPY --from=install-dependencies /usr/app/node_modules /usr/app/node_modules





# Switch to build stage with previously installed production dependencies from install-dependencies
# This build stage takes install-dependencies and installs devDependencies used to transpile TypeScript
FROM install-dependencies AS build-environment

RUN yarn add tsup && rm -rf "$(yarn cache clean)"

# Copy Typescript transpile configuration and source into container
COPY tsconfig.json tsup.config.ts feeds.ts /usr/app
COPY src /usr/app/src

# Transpile Typescript - this will not be cached
RUN ["yarn", "build"]





# Final production image
FROM production-dependencies
COPY --from=build-environment /usr/app/dist /usr/app/dist
COPY .env /usr/app

# Run process as a new non-privileged user
USER node

CMD ["dist/index.js"]