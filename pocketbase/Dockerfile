FROM alpine:3.22

ARG TARGETARCH
ARG PB_VERSION=0.25.9

RUN apk add --no-cache ca-certificates wget unzip \
    && ARCH=$(case "${TARGETARCH}" in \
        "amd64") echo "amd64" ;; \
        "arm64") echo "arm64" ;; \
        *) echo "arm64" ;; \
       esac) \
    && wget -q -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${ARCH}.zip" \
    && unzip -q /tmp/pb.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/pocketbase \
    && rm -f /tmp/pb.zip

EXPOSE 8090

CMD ["/usr/local/bin/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data"]
