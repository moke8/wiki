# ====================
# --- Build Assets ---
# ====================
FROM node:24-alpine AS assets

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add g++ make cmake python3 --no-cache


WORKDIR /wiki

COPY ./client ./client
COPY ./dev ./dev
COPY ./patches ./patches
COPY ./package.json ./package.json
COPY ./.babelrc ./.babelrc
COPY ./.eslintignore ./.eslintignore
COPY ./.eslintrc.yml ./.eslintrc.yml

# RUN yarn cache clean
RUN yarn --non-interactive --ignore-scripts
RUN yarn build
# RUN rm -rf /wiki/node_modules
RUN yarn --production --non-interactive --ignore-scripts
RUN yarn patch-package

# ===============
# --- Release ---
# ===============
FROM node:24-alpine
LABEL maintainer="requarks.io"

RUN apk add bash curl git openssh gnupg sqlite --no-cache && \
    mkdir -p /wiki && \
    mkdir -p /logs && \
    mkdir -p /wiki/data/content && \
    chown -R node:node /wiki /logs

WORKDIR /wiki

COPY --chown=node:node --from=assets /wiki/assets ./assets
COPY --chown=node:node --from=assets /wiki/node_modules ./node_modules
COPY --chown=node:node ./server ./server
COPY --chown=node:node --from=assets /wiki/server/views ./server/views
COPY --chown=node:node ./dev/build/config.yml ./config.yml
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./LICENSE ./LICENSE

USER node

VOLUME ["/wiki/data/content"]

EXPOSE 3000
EXPOSE 3443

# HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 CMD curl -f http://localhost:3000/healthz

CMD ["node", "--no-deprecation", "server"]
