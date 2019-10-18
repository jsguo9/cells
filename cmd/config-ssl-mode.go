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

package cmd

import (
	"fmt"
	"log"
	"net/url"

	"github.com/manifoldco/promptui"
	"github.com/spf13/cobra"

	"github.com/pydio/cells/common/config"
)

// SslModeCmd permits configuration of used SSL mode.
var SslModeCmd = &cobra.Command{
	Use:   "mode",
	Short: "Manage TLS configuration of the application internal proxy",
	Long: `
This command lets you enable/disabled SSL on application main access point.

Four modes are currently supported:
- TLS mode : provide the paths to certificate and key (as you would on an apache server)
- Let's Encrypt: certificate is automagically generated during installation process, and later managed (e.g. renewed) by the embedded Caddy server
- Self-Signed : a self-signed certificate will be generated at each application start
- Disabled : application will be served on HTTP

`,
	Run: func(cmd *cobra.Command, args []string) {

		// Retrieve already defined conf
		extURL, _ := url.Parse(config.Get("defaults", "url").String(""))
		intURL, _ := url.Parse(config.Get("defaults", "urlInternal").String(""))

		// Get SSL info from end user
		enabled, certData, e := promptSslMode()
		if e != nil {
			log.Fatal(e)
		}

		// Replace Main URLS
		if enabled {
			extURL.Scheme = "https"
			intURL.Scheme = "https"
		} else {
			extURL.Scheme = "http"
			intURL.Scheme = "http"
		}
		config.Set(extURL.String(), "defaults", "url")
		config.Set(intURL.String(), "defaults", "urlInternal")
		config.Set(certData, "cert")
		if e := config.Save("cli", "Update SSL mode"); e != nil {
			cmd.Println("Error while saving config: " + e.Error())
		}

		cmd.Println("*************************************************************")
		cmd.Println(" Config has been updated, please restart now!")
		cmd.Println("**************************************************************")

	},
}

func promptSslMode() (enabled bool, certData map[string]interface{}, e error) {

	proxyData := make(map[string]interface{})
	certData = map[string]interface{}{
		"proxy": proxyData,
	}

	// Load defaults
	certFile := config.Get("cert", "proxy", "certFile").String("")
	keyFile := config.Get("cert", "proxy", "keyFile").String("")
	certEmail := config.Get("cert", "proxy", "email").String("")
	caURL := config.Get("cert", "proxy", "caUrl").String(config.DefaultCaUrl)

	selector := promptui.Select{
		Label: "Choose SSL activation mode",
		Items: []string{
			"Provide paths to certificate/key files",
			"Use Let's Encrypt to automagically generate certificate during installation process",
			"Generate a self-signed certificate (for staging environments only!)",
			"Disable SSL (not recommended)",
		},
	}
	var i int
	i, _, e = selector.Run()
	if e != nil {
		return
	}

	switch i {
	case 0:
		certPrompt := promptui.Prompt{Label: "Provide absolute path to the HTTP certificate", Default: certFile}
		keyPrompt := promptui.Prompt{Label: "Provide absolute path to the HTTP private key", Default: keyFile}
		if certFile, e = certPrompt.Run(); e != nil {
			return
		}
		if keyFile, e = keyPrompt.Run(); e != nil {
			return
		}
		enabled = true
		proxyData["ssl"] = true
		proxyData["self"] = false
		proxyData["certFile"] = certFile
		proxyData["keyFile"] = keyFile

	case 1:
		mailPrompt := promptui.Prompt{Label: "Please enter the mail address for certificate generation", Validate: validateMailFormat, Default: certEmail}
		acceptLeSa := promptui.Prompt{Label: "Do you agree to the Let's Encrypt SA? [Y/n] ", Default: ""}

		if certEmail, e = mailPrompt.Run(); e != nil {
			return
		}

		val, e1 := acceptLeSa.Run()
		if e1 != nil {
			e = e1
			return
		}
		if !(val == "Y" || val == "y" || val == "") {
			e = fmt.Errorf("You must agree to Let's Encrypt SA to use automated certificate generation feature.")
			return
		}
		enabled = true
		proxyData["ssl"] = true
		proxyData["self"] = false
		proxyData["email"] = certEmail
		proxyData["caUrl"] = caURL

	case 2:
		enabled = true
		proxyData["ssl"] = true
		proxyData["self"] = true
	case 3:
		proxyData["ssl"] = false
	}

	if enabled {
		redirPrompt := promptui.Select{
			Label: "Do you want to automatically redirect HTTP (80) to HTTPS? Warning: this requires the right to bind to port 80 on this machine.",
			Items: []string{
				"Yes",
				"No",
			}}
		if i, _, e = redirPrompt.Run(); e == nil && i == 0 {
			proxyData["httpRedir"] = true
		}
	}

	return
}

func init() {
	SslCmd.AddCommand(SslModeCmd)
}
