FROM node:14-stretch-slim
RUN apt-get update && \
    apt-get install -y git make musl-dev golang-go sqlite g++ tmux python netcat

RUN npm install -g @prisma/cli@2.7.1

ENV GOROOT /usr/lib/go
ENV GOPATH /go
ENV PATH /go/bin:$PATH

RUN mkdir -p ${GOPATH}/src ${GOPATH}/bin

# Install Gotty (it needs go >= 1.9)
RUN go get golang.org/dl/go1.10.7
RUN go1.10.7 download
RUN go1.10.7 get github.com/yudai/gotty

WORKDIR /
RUN git clone -b coordinator-auctions https://github.com/jchancehud/zkopru.git

WORKDIR /zkopru

RUN yarn

# zk-wizard needs to be built first
RUN cd packages/zk-wizard && yarn build

RUN yarn build

COPY ./coordinator/start.sh /start.sh

RUN mkdir /zkopru/data
WORKDIR /zkopru/data

ENTRYPOINT ["/bin/sh", "/start.sh"]
