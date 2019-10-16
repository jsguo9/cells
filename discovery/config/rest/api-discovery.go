/*
 * Copyright (c) 2018. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package rest

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/go-openapi/spec"

	"github.com/emicklei/go-restful"
	"github.com/micro/go-micro/errors"
	"github.com/micro/go-micro/registry"
	"github.com/spf13/viper"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/auth/claim"
	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/proto/rest"
	"github.com/pydio/cells/common/service"
	"github.com/pydio/cells/common/utils/i18n"
)

/*****************************
PUBLIC ENDPOINTS FOR DISCOVERY
******************************/
// Publish a list of available endpoints
func (s *Handler) EndpointsDiscovery(req *restful.Request, resp *restful.Response) {
	var t time.Time
	var e error
	if t, e = time.Parse("2006-01-02T15:04:05", common.BuildStamp); e != nil {
		t = time.Now()
	}

	endpointResponse := &rest.DiscoveryResponse{
		Endpoints: make(map[string]string),
	}
	if _, ok := req.Request.Context().Value(claim.ContextKey).(claim.Claims); ok {
		endpointResponse.PackageType = common.PackageType
		endpointResponse.PackageLabel = common.PackageLabel
		endpointResponse.Version = common.Version().String()
		endpointResponse.BuildStamp = int32(t.Unix())
		endpointResponse.BuildRevision = common.BuildRevision
	}

	cfg := config.Default()
	httpProtocol := "http"
	wsProtocol := "ws"

	mainUrl := cfg.Get("defaults", "url").String("")
	if !strings.HasPrefix(mainUrl, "http") {
		mainUrl = "http://" + mainUrl
	}
	urlParsed, _ := url.Parse(mainUrl)

	ssl := cfg.Get("cert", "proxy", "ssl").Bool(false)
	if ssl {
		httpProtocol = "https"
		wsProtocol = "wss"
	}

	endpointResponse.Endpoints["rest"] = fmt.Sprintf("%s://%s/a", httpProtocol, urlParsed.Host)
	endpointResponse.Endpoints["openapi"] = fmt.Sprintf("%s://%s/a/config/discovery/openapi", httpProtocol, urlParsed.Host)
	endpointResponse.Endpoints["forms"] = fmt.Sprintf("%s://%s/a/config/discovery/forms/{serviceName}", httpProtocol, urlParsed.Host)
	endpointResponse.Endpoints["oidc"] = fmt.Sprintf("%s://%s/auth", httpProtocol, urlParsed.Host)
	endpointResponse.Endpoints["s3"] = fmt.Sprintf("%s://%s/io", httpProtocol, urlParsed.Host)
	endpointResponse.Endpoints["chats"] = fmt.Sprintf("%s://%s/ws/chat", wsProtocol, urlParsed.Host)
	endpointResponse.Endpoints["websocket"] = fmt.Sprintf("%s://%s/ws/event", wsProtocol, urlParsed.Host)
	endpointResponse.Endpoints["frontend"] = fmt.Sprintf("%s://%s", httpProtocol, urlParsed.Host)

	external := viper.Get("grpc_external")
	externalSet := external != nil && external.(string) != ""
	if !ssl || externalSet {
		// Detect GRPC Service Ports
		var grpcPorts []string
		if ss, e := registry.GetService(common.SERVICE_GATEWAY_GRPC); e == nil {
			for _, s := range ss {
				for _, n := range s.Nodes {
					grpcPorts = append(grpcPorts, fmt.Sprintf("%d", n.Port))
				}
			}
		}
		if len(grpcPorts) > 0 {
			endpointResponse.Endpoints["grpc"] = strings.Join(grpcPorts, ",")
		}
	}

	resp.WriteEntity(endpointResponse)

}

func (s *Handler) OpenApiDiscovery(req *restful.Request, resp *restful.Response) {

	cfg := config.Default()
	u := cfg.Get("defaults", "url").String("")
	p, _ := url.Parse(u)

	jsonSpec := service.SwaggerSpec()
	jsonSpec.Spec().Host = p.Host
	jsonSpec.Spec().Schemes = []string{p.Scheme}
	jsonSpec.Spec().Info.Title = "Pydio Cells API"
	jsonSpec.Spec().Info.Version = "2.0"
	jsonSpec.Spec().Info.Description = "OAuth2-based REST API (automatically generated from protobufs)"
	scheme := &spec.SecurityScheme{
		VendorExtensible: spec.VendorExtensible{},
		SecuritySchemeProps: spec.SecuritySchemeProps{
			Type:             "oauth2",
			Description:      "Login using OAuth2 code flow",
			Flow:             "accessCode",
			AuthorizationURL: u + "/oidc/oauth2/auth",
			TokenURL:         u + "/oidc/oauth2/token",
		},
	}
	jsonSpec.Spec().SecurityDefinitions = map[string]*spec.SecurityScheme{"oauth2": scheme}
	jsonSpec.Spec().Security = append(jsonSpec.Spec().Security, map[string][]string{"oauth2": []string{}})
	for path, ops := range jsonSpec.Spec().Paths.Paths {
		if strings.HasPrefix(path, "/a/") {
			continue
		}
		outPath := "/a" + path
		delete(jsonSpec.Spec().Paths.Paths, path)
		jsonSpec.Spec().Paths.Paths[outPath] = ops
	}
	resp.WriteAsJson(jsonSpec.Spec())

}

func (s *Handler) ConfigFormsDiscovery(req *restful.Request, rsp *restful.Response) {
	serviceName := req.PathParameter("ServiceName")
	if serviceName == "" {
		service.RestError500(req, rsp, errors.BadRequest("configs", "Please provide a service name"))
	}

	form := config.ExposedConfigsForService(serviceName)
	if form == nil {
		service.RestError404(req, rsp, errors.NotFound("configs", "Cannot find service "+serviceName))
		return
	}
	rsp.WriteAsXml(form.Serialize(i18n.UserLanguagesFromRestRequest(req, config.Default())...))
	return

}
