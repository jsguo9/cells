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
	"sort"
	"strings"

	errors2 "github.com/micro/go-micro/errors"
	"github.com/micro/go-micro/metadata"
	"go.uber.org/zap"
	"golang.org/x/oauth2"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/auth/claim"
	"github.com/pydio/cells/common/log"
	defaults "github.com/pydio/cells/common/micro"
	"github.com/pydio/cells/common/proto/auth"
	"github.com/pydio/cells/common/proto/idm"
	"github.com/pydio/cells/common/utils/permissions"
)

type ProviderType int

const (
	ProviderTypeDex ProviderType = iota
	ProviderTypeOry
	ProviderTypeGrpc
)

type Provider interface {
	GetType() ProviderType
}

type Verifier interface {
	Verify(context.Context, string) (IDToken, error)
}

type ContextVerifier interface {
	Verify(ctx context.Context, user *idm.User) error
}

type Exchanger interface {
	Exchange(context.Context, string) (*oauth2.Token, error)
}

type PasswordCredentialsTokenExchanger interface {
	PasswordCredentialsToken(context.Context, string, string) (*oauth2.Token, error)
	PasswordCredentialsTokenVerify(context.Context, string) (IDToken, error)
}

type IDToken interface {
	Claims(interface{}) error
}

var (
	providers        []Provider
	contextVerifiers []ContextVerifier
)

// AddContextVerifier registers an additional verifier
func AddContextVerifier(v ContextVerifier) {
	contextVerifiers = append(contextVerifiers, v)
}

func VerifyContext(ctx context.Context, user *idm.User) error {
	for _, v := range contextVerifiers {
		if err := v.Verify(ctx, user); err != nil {
			return err
		}
	}
	return nil
}

type JWTVerifier struct{}

// DefaultJWTVerifier creates a ready to use JWTVerifier
func DefaultJWTVerifier() *JWTVerifier {
	return &JWTVerifier{}
}

func (j *JWTVerifier) loadClaims(ctx context.Context, token IDToken, claims *claim.Claims) error {

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

	// Check if User is locked
	if e := VerifyContext(ctx, user); e != nil {
		return errors2.Unauthorized("user.context", e.Error())
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

func (j *JWTVerifier) verifyTokenWithRetry(ctx context.Context, rawIDToken string, isRetry bool) (IDToken, error) {

	var idToken IDToken
	var err error

	for _, provider := range providers {
		verifier, ok := provider.(Verifier)
		if !ok {
			continue
		}

		idToken, err = verifier.Verify(ctx, rawIDToken)
		if err == nil {
			break
		}

		log.Logger(ctx).Debug("jwt rawIdToken verify: failed", zap.Error(err))
	}

	if (idToken == nil || err != nil) && !isRetry {
		return j.verifyTokenWithRetry(ctx, rawIDToken, true)
	}

	if idToken == nil {
		return nil, errors.New("empty idToken")
	}

	return idToken, nil
}

// Exchange retrives a oauth2 Token from a code
func (j *JWTVerifier) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	var oauth2Token *oauth2.Token
	var err error

	for _, provider := range providers {
		exch, ok := provider.(Exchanger)
		if !ok {
			continue
		}

		// Verify state and errors.
		oauth2Token, err = exch.Exchange(ctx, code)
		if err == nil {
			break
		}
	}

	if err != nil {
		return nil, err
	}

	return oauth2Token, nil
}

// Verify validates an existing JWT token against the OIDC service that issued it
func (j *JWTVerifier) Verify(ctx context.Context, rawIDToken string) (context.Context, claim.Claims, error) {

	idToken, err := j.verifyTokenWithRetry(ctx, rawIDToken, false)
	if err != nil {
		log.Logger(ctx).Error("error retrieving token", zap.String("token", rawIDToken), zap.Error(err))
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

	var token *oauth2.Token
	var idToken IDToken
	var err error

	for _, provider := range providers {
		recl, ok := provider.(PasswordCredentialsTokenExchanger)
		if !ok {
			continue
		}

		token, err = recl.PasswordCredentialsToken(ctx, userName, password)
		if err == nil {
			idToken, err = recl.PasswordCredentialsTokenVerify(ctx, token.Extra("id_token").(string))

			break
		}
	}

	if err != nil {
		return ctx, claim.Claims{}, err
	}

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

func addProvider(p Provider) {
	providers = append(providers, p)
	sortProviders()
}

func delProviders(f func(p Provider) bool) {
	b := providers[:0]

	for _, p := range providers {
		if !f(p) {
			b = append(b, p)
		}
	}

	providers = b
	sortProviders()
}

func sortProviders() {
	sort.Slice(providers, func(i, j int) bool {
		return providers[i].GetType() < providers[j].GetType()
	})
}
