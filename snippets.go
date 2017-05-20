package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Snippet represents a VS Code snippet.
type Snippet struct {
	Prefix      string   `json:"prefix"`
	Body        []string `json:"body"`
	Description string   `json:"description"`
}

var snippets = map[string]Snippet{
	"Secret": {
		Prefix:      "kindSecret",
		Body:        load("secret.yaml"),
		Description: "Create a Secret manifest",
	},
	"Pod": {
		Prefix:      "kindPod",
		Description: "Create a Pod manifest",
		Body:        load("pod.yaml"),
	},
	"ConfigMap": {
		Prefix:      "kindConfigMap",
		Description: "Create a ConfigMap manifest",
		Body:        load("configmap.yaml"),
	},
	"Deployment": {
		Prefix:      "kindDeployment",
		Description: "Create a Deployment manifest",
		Body:        load("deployment.yaml"),
	},
	"Service": {
		Prefix:      "kindSerice",
		Description: "Create a Service manifest",
		Body:        load("service.yaml"),
	},
	"Ingress": {
		Prefix:      "kindIngress",
		Description: "Create a Ingress manifest",
		Body:        load("ingress.yaml"),
	},
	"Chart.yaml": {
		Prefix:      "Chart.yaml",
		Description: "Create a Chart.yaml file",
		Body:        load("Chart.yaml"),
	},
	"requirements.yaml": {
		Prefix:      "requirements.yaml",
		Description: "Create a Helm requirements.yaml",
		Body:        load("requirements.yaml"),
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

func main() {
	out, err := json.MarshalIndent(snippets, "", "  ")
	if err != nil {
		panic(err)
	}
	fmt.Printf("%s", out)
}
