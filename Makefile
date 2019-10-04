GOBUILD=go build
ENV=env GOOS=linux
TODAY:=$(shell date -u +%Y-%m-%dT%H:%M:%S)
GITREV:=$(shell git rev-parse HEAD)
CELLS_VERSION?=0.2.0
XGO_TARGETS?="linux/amd64,darwin/amd64,windows/amd64"

.PHONY: all clean build front main client static

all: clean build

build: generate main

generate:
	# Removing existing packr files and running packr
	find . -name *-packr.go | xargs rm -f
	# manually filtering out ory/x/dbal package
	grep -ri -l "packr.NewBox" */* | while read -r line; do if ! [ "$$line" = "vendor/github.com/ory/x/dbal/migrate.go" ]; then cd `dirname "$$line"`; echo "Run packr for $$line"; ${GOPATH}/bin/packr --compress --input=. ; cd -;  fi; done;

main:
	go build -a\
	 -ldflags "-X github.com/pydio/cells/common.version=${CELLS_VERSION}\
	 -X github.com/pydio/cells/common.BuildStamp=${TODAY}\
	 -X github.com/pydio/cells/common.BuildRevision=${GITREV}\
	 -X github.com/pydio/cells/vendor/github.com/pydio/minio-srv/cmd.Version=${GITREV}\
	 -X github.com/pydio/cells/vendor/github.com/pydio/minio-srv/cmd.ReleaseTag=${GITREV}"\
	 -o cells\
	 .

xgo:
	${GOPATH}/bin/xgo -go 1.12 \
	 --image pydio/xgo:latest \
	 --targets ${XGO_TARGETS} \
	 -ldflags "-X github.com/pydio/cells/common.version=${CELLS_VERSION}\
	 -X github.com/pydio/cells/common.BuildStamp=${TODAY}\
	 -X github.com/pydio/cells/common.BuildRevision=${GITREV}\
	 -X github.com/pydio/cells/vendor/github.com/pydio/minio-srv/cmd.Version=${GITREV}\
	 -X github.com/pydio/cells/vendor/github.com/pydio/minio-srv/cmd.ReleaseTag=${GITREV}"\
	 ${GOPATH}/src/github.com/pydio/cells

dev:
	go build\
	 -tags dev\
	 -ldflags "-X github.com/pydio/cells/common.version=${CELLS_VERSION}\
	 -X github.com/pydio/cells/common.BuildStamp=2018-01-01T00:00:00\
	 -X github.com/pydio/cells/common.BuildRevision=dev"\
	 -o cells\
	 .

ctl:
	go build\
	 -ldflags "-X github.com/pydio/cells/common.version=${CELLS_VERSION}\
	 -X github.com/pydio/cells/common.BuildStamp=${TODAY}\
	 -X github.com/pydio/cells/common.BuildRevision=${GITREV}"\
	 -o cells-ctl\
	 cmd/ctl/main.go

xgo-ctl:
	${GOPATH}/bin/xgo -go 1.12 \
	 --image pydio/xgo:latest \
	 --targets ${XGO_TARGETS} \
	 -ldflags "-X github.com/pydio/cells/common.version=${CELLS_VERSION}\
	 -X github.com/pydio/cells/common.BuildStamp=${TODAY}\
	 -X github.com/pydio/cells/common.BuildRevision=${GITREV}"\
	 ${GOPATH}/src/github.com/pydio/cells/cmd/ctl


start:
	./cells start

ds: dev start

clean:
	rm -f cells cells-*
	${GOPATH}/bin/packr clean

vdrminio:
	${GOPATH}/bin/govendor update github.com/pydio/minio-srv
	rm -rf vendor/github.com/pydio/minio-srv/vendor/golang.org/x/net/trace