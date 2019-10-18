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
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/manifoldco/promptui"
	"github.com/spf13/cobra"

	"github.com/pydio/cells/common/config"
)

// configDatabaseSetCmd assigns a database connection to a service.
var configDatabaseSetCmd = &cobra.Command{
	Use:   "set",
	Short: "Assign a database connection to a service",
	Long: `
This command lets you assign a different database connection to a service. Use default to change to the default database.

` + promptui.IconWarn + `  Note that the database data will not be transferred to the new database.`,
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) < 1 {
			return errors.New("Requires at least an argument, please see 'pydio config database set --help'")
		}

		// IsValidService ?
		return nil
	},
	Run: func(cmd *cobra.Command, args []string) {
		id := args[0]

		cfg := config.Default().(*config.Config)

		var m map[string]interface{}
		if err := cfg.UnmarshalKey("databases", &m); err != nil {
			cmd.Println(err)
			os.Exit(1)
		}

		var ids []string
		var items []string
		for id, v := range m {
			db, ok := v.(map[string]interface{})
			if !ok {
				continue
			}

			ids = append(ids, id)
			items = append(items, db["driver"].(string)+" - "+db["dsn"].(string))
		}

		selector := promptui.Select{
			Label: "Choose database connection",
			Items: items,
		}

		i, _, err := selector.Run()
		if err != nil {
			cmd.Println("Wrong database connection")
			os.Exit(1)
		}

		config.Set(ids[i], "databases", id)

		if id == "default" {
			config.Set(ids[i], "defaults", "database")
		}

		if err := config.Save("cli", fmt.Sprintf("Set database for service %s : %s", id, ids[i])); err == nil {
			cmd.Println("Config set")
		} else {
			log.Fatal(err)
		}
	},
}

func init() {
	configDatabaseCmd.AddCommand(configDatabaseSetCmd)
}
