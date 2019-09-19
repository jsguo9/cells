package cmd

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"

	"github.com/spf13/cobra"
)

// completionCmd represents the completion command
var completionCmd = &cobra.Command{
	Use:   "completion",
	Short: "Auto completion for Pydio Cells",
	Long: `Completion for Pydio Cells binary


	# Add to current session
	source <(./cells completion)
	
	# Add bashcompletion file (might require root)
	./cells completion > /etc/bash_completion.d/cells`,

	Run: func(cmd *cobra.Command, args []string) {
		bashAutocomplete()
	},
}

func init() {
	RootCmd.AddCommand(completionCmd)
}

func bashAutocomplete() {
	wd, _ := os.Getwd()
	file, err := ioutil.ReadFile(path.Join(wd, "tools", "bash_autocompletion", "cells_autocompletion.bash"))
	if err != nil {
		fmt.Println("Could not read file")
		return
	}
	fmt.Fprint(os.Stdout, string(file))
}
