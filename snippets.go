package main

import(
	"fmt"
	"encoding/json"
	"os"
	"bufio"
	"path/filepath"
)

type Snippet struct {
	Prefix string `json:"prefix"`
	Body []string `json:"body"`
	Description string `json:"description"`
}

var snippets = map[string]Snippet{
	"Secret": {
		Prefix: "kindSecret",
		Body: load("secret.yaml"),
		Description: "Create a Secret manifest",
	},
	"Pod": {
		Prefix: "kindPod",
		Description: "Create a Pod manifest",
		Body: load("pod.yaml"),
	},
}

func load(loc string) []string {
	loc = filepath.Join("rawsnippets", loc)
	f, err := os.Open(loc)
	if err != nil {
		panic(err)
	}
	defer f.Close()

	r := bufio.NewScanner(f)
	lines := []string{}
	for r.Scan() {
		l := r.Text()
		if err := r.Err(); err != nil {
			panic(err)
		}
		lines = append(lines, l)
	}

	return lines
}

func main(){
	out, err := json.MarshalIndent(snippets, "", "  ")
	if err != nil {
		panic(err)
	}
	fmt.Printf("%s", out)
}