FROM node:14-stretch-slim
RUN apt-get update && \
    apt-get install -y git make musl-dev golang-go sqlite g++ tmux python netcat

RUN npm install -g @prisma/cli@2.7.1

#ENV GOROOT /usr/lib/go
#ENV GOPATH /go
#ENV PATH /go/bin:$PATH

#RUN mkdir -p ${GOPATH}/src ${GOPATH}/bin

# Install Gotty (it needs go >= 1.9)
#RUN go get golang.org/dl/go1.10.7
#RUN go1.10.7 download
#RUN go1.10.7 get github.com/yudai/gotty

WORKDIR /
RUN git clone --depth 1 -b client-api https://github.com/jchancehud/zkopru.git

WORKDIR /zkopru

RUN yarn

#RUN yarn build
RUN yarn build:contract && yarn build:prisma && yarn build:ts:serial

# COPY ./coordinator/start.sh /start.sh

RUN mkdir /zkopru/data
WORKDIR /zkopru/data

ENTRYPOINT ["node", "/zkopru/packages/cli/dist/apps/coordinator/cli.js"]
