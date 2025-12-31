FROM golang:1.25

WORKDIR /backend

ENV GO111MODULE=on
ENV CGO_ENABLED=0
ENV GOOS=linux

COPY go.mod go.sum ./
RUN go mod download

RUN go install github.com/pressly/goose/v3/cmd/goose@latest

COPY . .
RUN go build -v -o /usr/local/bin/app .

CMD ["/usr/local/bin/app"]
