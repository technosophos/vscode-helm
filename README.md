# vscode-helm README

This Visual Studio Code extension provides [Kubernetes Helm](http://helm.sh) chart developers with a set of tools for creating and testing charts.

![screenshot of Helm extension](./screenshot.png)

## Features

- Syntax highlighting for YAML + Helm Templates
- Autocomplete for Helm, Sprig, and Go Tpl functions5
- Help text (on hover) for Helm, Sprig, and Go Tpl functions
- Snippets for quickly scaffolding new chart templates
- Commands for..
  - **Helm: Lint**: Lint your chart
  - **Helm: Preview**: Open a preview window and preview how your template will render
  - **Helm: Template**: Run your chart through the template engine
  - **Helm: DryRun**: Run a `helm install --dry-run --debug` on a remote cluster and get the results
  - **Helm: Version**: Get the Helm version
  - **Helm: Dependency Update**: Update a chart's dependencies.
- Code lenses for:
  - requirements.yaml

## Requirements

You must have [Helm](http://helm.sh) installed and configured. From there, you should install `helm-template`:

```console
$ helm plugin install https://github.com/technosophos/helm-template
```

It is recommended that you also install `kubectl`, though this extension does not directly use it yet.

To use **Helm: DryRun** you must have your Kubernetes cluster running Tiller, and `$KUBECONFIG` pointing to that cluster. 

## Extension Settings

* `vscode-helm.exclude`: Do not search the given paths when trying to find a chart.

## Known Issues

- This extension has not been thoroughly tested on Windows.
- For deeply nested charts, template previews are generated against highest (umbrella) chart values (though for Helm Template calls you can pick your chart)

## Release Notes

### 0.1.0

Experimental build.