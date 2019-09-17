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

package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coreos/go-oidc"
	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/any"
	errors2 "github.com/micro/go-micro/errors"
	"github.com/micro/go-micro/metadata"
	"go.uber.org/zap"
	"golang.org/x/oauth2"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/auth/claim"
	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/log"
	defaults "github.com/pydio/cells/common/micro"
	"github.com/pydio/cells/common/proto/auth"
	"github.com/pydio/cells/common/proto/idm"
	"github.com/pydio/cells/common/proto/rest"
	service "github.com/pydio/cells/common/service/proto"
	"github.com/pydio/cells/common/utils/permissions"
)

// type JWTVerifier interface {
// 	Exchange(ctx context.Context, code string) (token *oauth2.Token, err error)
// 	Verify(ctx context.Context, rawIDToken string) (context.Context, claim.Claims, error)
// 	PasswordCredentialsToken(ctx context.Context, userName string, password string) (context.Context, claim.Claims, error)
// }

type client struct {
	ID           string   `json:"id"`
	ClientID     string   `json:"client_id"`
	Secret       string   `json:"secret"`
	ClientSecret string   `json:"client_secret"`
	RedirectURIs []string `json:"redirectURIs"`
}

type provider struct {
	Issuer  string   `json:"issuer"`
	Clients []client `json:"staticClients"`

	oidcProvider  *oidc.Provider
	verifiers     []*oidc.IDTokenVerifier
	oauth2Configs []oauth2.Config
}

var (
	once      = &sync.Once{}
	providers []*provider
)

type JWTVerifier struct{}

func initProviders() {
	// Register dex configs
	configDex := config.Values("services", "pydio.grpc.auth", "dex")
	newProvider(configDex)

	// Register oauth configs
	configOAuth := config.Values("services", "pydio.web.oauth")
	newProvider(configOAuth)
}

func DefaultJWTVerifier() *JWTVerifier {
	return &JWTVerifier{}
}

func newProvider(c common.ConfigValues) {
	p := new(provider)

	err := c.Scan(&p)
	if err != nil {
		fmt.Println("Error scanning provider", err)
		return
	}

	providers = append(providers, p)

	externalURL := config.Get("defaults", "url").String("")

	ctx := oidc.ClientContext(context.Background(), &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: config.GetTLSClientConfig("proxy"),
		},
	})

	for {
		// Retrieve new provider
		oidcProvider, err := oidc.NewProvider(ctx, p.Issuer)
		if err != nil {
			fmt.Println(err)
			<-time.After(1 * time.Second)
			continue
		}

		p.oidcProvider = oidcProvider
		break
	}

	// retrieve verifiers for each client
	var verifiers []*oidc.IDTokenVerifier
	for _, client := range p.Clients {
		clientID := client.ID
		if clientID == "" {
			clientID = client.ClientID
		}
		verifiers = append(verifiers, p.oidcProvider.Verifier(&oidc.Config{ClientID: clientID, SkipNonceCheck: true}))
	}
	p.verifiers = verifiers

	// retrieve oauthConfigs for each client
	var oauth2Configs []oauth2.Config
	for _, client := range p.Clients {
		clientID := client.ID
		clientSecret := client.Secret
		if clientID == "" {
			clientID = client.ClientID
			clientSecret = client.ClientSecret
		}

		oauth2Configs = append(oauth2Configs, oauth2.Config{
			ClientID:     clientID,
			ClientSecret: clientSecret,
			Endpoint:     p.oidcProvider.Endpoint(),
			RedirectURL:  externalURL + "/login/callback",
			Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
		})
	}
	p.oauth2Configs = oauth2Configs
}

func (j *JWTVerifier) getProviders() []*provider {
	once.Do(initProviders)

	return providers
}

func (j *JWTVerifier) getVerifiers() []*oidc.IDTokenVerifier {
	var verifiers []*oidc.IDTokenVerifier

	for _, p := range j.getProviders() {
		verifiers = append(verifiers, p.verifiers...)
	}

	return verifiers
}

func (j *JWTVerifier) getDefaultOAuthConfig() (*provider, oauth2.Config, error) {

	for _, p := range j.getProviders() {
		if len(p.oauth2Configs) > 0 {
			return p, p.oauth2Configs[0], nil
		}
	}

	return nil, oauth2.Config{}, fmt.Errorf("Not found")
}

func (j *JWTVerifier) loadClaims(ctx context.Context, token *oidc.IDToken, claims *claim.Claims) error {

	// Extract custom claims
	if err := token.Claims(claims); err != nil {
		log.Logger(ctx).Error("cannot extract custom claims from idToken", zap.Error(err))
		return err
	}

	// Search by name or by email
	var user *idm.User
	var uE error
	if claims.Name != "" {
		if u, err := permissions.SearchUniqueUser(ctx, claims.Name, ""); err == nil {
			user = u
		}
	}
	if user == nil {
		if u, err := permissions.SearchUniqueUser(ctx, claims.Email, ""); err == nil {
			user = u
			// Now replace claims.Name
			claims.Name = claims.Email
		} else {
			uE = err
		}
	}
	if user == nil {
		if uE != nil {
			return uE
		} else {
			return errors2.NotFound("user.not.found", "user not found neither by name or email")
		}
	}

	displayName, ok := user.Attributes["displayName"]
	if !ok {
		displayName = ""
	}

	profile, ok := user.Attributes["profile"]
	if !ok {
		profile = "standard"
	}

	var roles []string
	for _, role := range user.Roles {
		roles = append(roles, role.Uuid)
	}

	claims.DisplayName = displayName
	claims.Profile = profile
	claims.Roles = strings.Join(roles, ",")
	claims.GroupPath = user.GroupPath

	return nil
}

func (j *JWTVerifier) verifyTokenWithRetry(ctx context.Context, rawIDToken string, isRetry bool) (idToken *oidc.IDToken, e error) {
	for _, verifier := range j.getVerifiers() {
		testToken, err := verifier.Verify(ctx, rawIDToken)

		if err != nil {
			log.Logger(ctx).Debug("jwt rawIdToken verify: failed", zap.Error(err))
			e = err
		} else {
			idToken = testToken
			e = nil
			break
		}
	}

	if (idToken == nil || e != nil) && !isRetry {
		return j.verifyTokenWithRetry(ctx, rawIDToken, true)
	}

	if e == nil && idToken == nil {
		e = errors.New("empty idToken")
	}

	return
}

// Verify validates an existing JWT token against the OIDC service that issued it
func (j *JWTVerifier) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	_, oauth2Config, err := j.getDefaultOAuthConfig()
	if err != nil {
		return nil, err
	}

	// Verify state and errors.
	oauth2Token, err := oauth2Config.Exchange(ctx, code)
	if err != nil {
		return nil, err
	}

	return oauth2Token, nil
}

// Verify validates an existing JWT token against the OIDC service that issued it
func (j *JWTVerifier) Verify(ctx context.Context, rawIDToken string) (context.Context, claim.Claims, error) {

	idToken, err := j.verifyTokenWithRetry(ctx, rawIDToken, false)
	if err != nil {
		log.Logger(ctx).Error("error retrieving token", zap.Error(err))
		return ctx, claim.Claims{}, err
	}

	cli := auth.NewAuthTokenRevokerClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_AUTH, defaults.NewClient())
	rsp, err := cli.MatchInvalid(ctx, &auth.MatchInvalidTokenRequest{
		Token: rawIDToken,
	})

	if err != nil {
		log.Logger(ctx).Error("verify", zap.Error(err))
		return ctx, claim.Claims{}, err
	}

	if rsp.State == auth.State_REVOKED {
		log.Logger(ctx).Error("jwt is verified but it is revoked")
		return ctx, claim.Claims{}, errors.New("jwt was Revoked")
	}

	claims := &claim.Claims{}
	if err := j.loadClaims(ctx, idToken, claims); err != nil {
		log.Logger(ctx).Error("got a token but failed to load claims", zap.Error(err))
		return ctx, *claims, err
	}

	ctx = context.WithValue(ctx, claim.ContextKey, *claims)
	md := make(map[string]string)
	if existing, ok := metadata.FromContext(ctx); ok {
		for k, v := range existing {
			md[k] = v
		}
	}
	md[common.PYDIO_CONTEXT_USER_KEY] = claims.Name
	ctx = metadata.NewContext(ctx, md)
	ctx = ToMetadata(ctx, *claims)

	return ctx, *claims, nil
}

// PasswordCredentialsToken will perform a call to the OIDC service with grantType "password"
// to get a valid token from a given user/pass credentials
func (j *JWTVerifier) PasswordCredentialsToken(ctx context.Context, userName string, password string) (context.Context, claim.Claims, error) {
	provider, oauth2Config, err := j.getDefaultOAuthConfig()
	if err != nil {
		return ctx, claim.Claims{}, err
	}

	if token, err := oauth2Config.PasswordCredentialsToken(ctx, userName, password); err == nil {
		idToken, _ := provider.oidcProvider.Verifier(&oidc.Config{SkipClientIDCheck: true, SkipNonceCheck: true}).Verify(ctx, token.Extra("id_token").(string))

		claims := &claim.Claims{}
		if err := j.loadClaims(ctx, idToken, claims); err != nil {
			return ctx, *claims, err
		}

		ctx = context.WithValue(ctx, claim.ContextKey, *claims)

		md := make(map[string]string)
		if existing, ok := metadata.FromContext(ctx); ok {
			for k, v := range existing {
				md[k] = v
			}
		}
		md[common.PYDIO_CONTEXT_USER_KEY] = claims.Name
		ctx = metadata.NewContext(ctx, md)

		return ctx, *claims, nil
	} else {
		return ctx, claim.Claims{}, err
	}

}

// Add a fake Claims in context to impersonate user
func WithImpersonate(ctx context.Context, user *idm.User) context.Context {
	roles := make([]string, len(user.Roles))
	for _, r := range user.Roles {
		roles = append(roles, r.Uuid)
	}
	// Build Fake Claims Now
	c := claim.Claims{
		Name:  user.Login,
		Email: "TODO@pydio.com",
		Roles: strings.Join(roles, ","),
	}
	return context.WithValue(ctx, claim.ContextKey, c)
}

// SubjectsForResourcePolicyQuery prepares a slice of strings that will be used to check for resource ownership.
// Can be extracted either from context or by loading a given user ID from database.
func SubjectsForResourcePolicyQuery(ctx context.Context, q *rest.ResourcePolicyQuery) (subjects []string, err error) {

	if q == nil {
		q = &rest.ResourcePolicyQuery{Type: rest.ResourcePolicyQuery_CONTEXT}
	}

	switch q.Type {
	case rest.ResourcePolicyQuery_ANY, rest.ResourcePolicyQuery_NONE:

		var value interface{}
		if value = ctx.Value(claim.ContextKey); value == nil {
			return subjects, errors2.BadRequest("resources", "Only admin profiles can list resources of other users")
		}
		claims := value.(claim.Claims)
		if claims.Profile != common.PYDIO_PROFILE_ADMIN {
			return subjects, errors2.Forbidden("resources", "Only admin profiles can list resources with ANY or NONE filter")
		}
		return subjects, nil

	case rest.ResourcePolicyQuery_CONTEXT:

		subjects = append(subjects, "*")
		if value := ctx.Value(claim.ContextKey); value != nil {
			claims := value.(claim.Claims)
			subjects = append(subjects, "user:"+claims.Name)
			// Add all profiles up to the current one (e.g admin will check for anon, shared, standard, admin)
			for _, p := range common.PydioUserProfiles {
				subjects = append(subjects, "profile:"+p)
				if p == claims.Profile {
					break
				}
			}
			//subjects = append(subjects, "profile:"+claims.Profile)
			for _, r := range strings.Split(claims.Roles, ",") {
				subjects = append(subjects, "role:"+r)
			}
		} else {
			log.Logger(ctx).Error("Cannot find claims in context", zap.Any("c", ctx))
			subjects = append(subjects, "profile:anon")
		}

	case rest.ResourcePolicyQuery_USER:

		if q.UserId == "" {
			return subjects, errors2.BadRequest("resources", "Please provide a non-empty user id")
		}
		var value interface{}
		if value = ctx.Value(claim.ContextKey); value == nil {
			return subjects, errors2.BadRequest("resources", "Only admin profiles can list resources of other users")
		}
		claims := value.(claim.Claims)
		if claims.Profile != common.PYDIO_PROFILE_ADMIN {
			return subjects, errors2.Forbidden("resources", "Only admin profiles can list resources of other users")
		}
		subjects = append(subjects, "*")
		subQ, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
			Uuid: q.UserId,
		})
		uClient := idm.NewUserServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_USER, defaults.NewClient())
		if stream, e := uClient.SearchUser(ctx, &idm.SearchUserRequest{
			Query: &service.Query{SubQueries: []*any.Any{subQ}},
		}); e == nil {
			var user *idm.User
			for {
				resp, err := stream.Recv()
				if err != nil {
					break
				}
				if resp == nil {
					continue
				}
				user = resp.User
				break
			}
			if user == nil {
				return subjects, errors2.BadRequest("resources", "Cannot find user with id "+q.UserId)
			}
			for _, role := range user.Roles {
				subjects = append(subjects, "role:"+role.Uuid)
			}
			subjects = append(subjects, "user:"+user.Login)
			subjects = append(subjects, "profile:"+user.Attributes["profile"])
		} else {
			err = e
		}
	}
	return
}
