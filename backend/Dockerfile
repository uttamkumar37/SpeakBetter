FROM golang:1.27.2-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

FROM alpine:3.24
RUN apk add --no-cache ca-certificates \
    && mkdir -p /app /data/recordings /data/tmp \
    && chown -R 10001:0 /app /data \
    && chmod -R g=u /app /data
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/migrate /app/migrate
ENV HOST=0.0.0.0 PORT=8081 GIN_MODE=release RECORDING_STORAGE_PATH=/data/recordings TMPDIR=/data/tmp
USER 10001:0
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8081/api/v2/health/ready || exit 1
ENTRYPOINT ["/app/api"]
