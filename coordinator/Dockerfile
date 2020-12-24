FROM node:12-alpine
RUN apk add --no-cache --virtual .gyp \
        python \
        make \
        g++ \
    && npm install -g node-gyp-build @prisma/cli@2.7.1 \
    && apk del .gyp
RUN apk add --no-cache git bash

WORKDIR /
RUN git clone -b tx-forwarding https://github.com/jchancehud/zkopru.git

WORKDIR /zkopru

COPY ./keys /zkopru/keys

RUN yarn

# zk-wizard needs to be built first
RUN cd packages/zk-wizard && yarn build

RUN yarn build

COPY ./coordinator.rinkeby.json /
COPY ./coordinator/start.sh /start.sh

ENTRYPOINT ["/bin/sh", "/start.sh"]
