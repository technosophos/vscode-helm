# vscode-helm README

This Visual Studio Code extension provides [Kubernetes Helm](http://helm.sh) chart developers with a set of tools for creating and testing charts.

## Features

- Syntax highlighting for YAML + Helm Templates
- Snippets for quickly scaffolding new chart templates
- Commands for..
  - **Helm: Lint**: Lint your chart
  - **Helm: Preview**: Open a preview window and preview how your template will render
  - **Helm: Template**: Run your chart through the template engine
  - **Helm: DryRun**: Run a `helm install --dry-run --debug` on a remote cluster and get the results
  - **Helm: Version**: Get the Helm version

## Requirements

You must have [Helm](http://helm.sh) installed and configured. From there, you should install `helm-template`:

```console
$ helm plugin install https://github.com/technosophos/helm-template
```


## Extension Settings

* `vscode-helm.exclude`: Do not search the given paths when trying to find a chart.

## Known Issues

This extension has not been thoroughly tested on Windows.

## Release Notes

### 0.1.0

Experimental build.