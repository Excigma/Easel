# This build stage installs dependencies used in production
# Two stages use this as a base - this should be cached
FROM node:18 AS install-dependencies

WORKDIR /usr/app
ENV NODE_ENV production

# Copy package.json and yarn cache into container and install dependencies for transpilation
COPY package.json /usr/app
COPY yarn.lock /usr/app
COPY .yarnrc.yml /usr/app
COPY .yarn /usr/app/.yarn
COPY prisma /usr/app/prisma

RUN yarn workspaces focus --production --all
RUN yarn prisma generate

# Switch to Distroless Docker image for production images
FROM node:18 as production

WORKDIR /usr/app
ENV NODE_ENV production
ENV DATABASE_URL=postgres://postgres:postgres@easel_postgres/postgres

COPY --from=install-dependencies /usr/app /usr/app
COPY .env /usr/app
COPY prisma /usr/app/prisma
COPY src /usr/app/src

# Run process as a new non-privileged user
USER node

CMD ["node", "src/index.js"]