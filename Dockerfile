# This build stage installs dependencies used in production
# Two stages use this as a base - this should be cached
FROM oven/bun AS install-dependencies

WORKDIR /usr/app
ENV NODE_ENV production

# Copy package.json into container and install dependencies for transpilation
COPY package.json bun.lockb /usr/app
COPY prisma /usr/app/prisma

# Install dependencies
RUN bun install --frozen-lockfile
RUN bun x prisma generate

# Copy source code into container and run
COPY .env courses.json tsconfig.json /usr/app
COPY src /usr/app/src

# Run process as a new non-privileged user
USER bun

CMD ["bun", "run", "start"]