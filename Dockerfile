FROM node:20-alpine

WORKDIR /usr/app
RUN apk add --no-cache python3 make g++ tzdata

# Set the timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone 

# Copy package lists and install dependencies
COPY .yarn package.json yarn.lock .yarnrc.yml /usr/app
RUN yarn set version stable

# Install dependencies
RUN yarn install --immutable

# Copy Prisma configuration and generate the client
COPY prisma /usr/app
RUN yarn pnpify prisma generate

# Copy the rest of the files and build the app
COPY src tsconfig.json tsup.config.ts /usr/app
RUN yarn build

# Start the app
USER node
CMD ["yarn", "start"]
