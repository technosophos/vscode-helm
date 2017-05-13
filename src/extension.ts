'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as shell from 'shelljs';
import * as filepath from 'path';
import { FuncMap } from './funcmap';

// The helm console channel.
const HelmChannel = "Helm"
var logger;

// Hover provider
export const HELM_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file" }

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-helm" is now active!');
    logger = new HelmConsole(HelmChannel)
    context.subscriptions.push(logger)
    let previewProvider = new HelmTemplatePreviewDocumentProvider()
    let completionProvider = new HelmTemplateCompletionProvider()
    let completionFilter = [
        "helm", 
        {language: "yaml", pattern: "**/templates/*.yaml"},
        {pattern: "**/templates/NOTES.txt"}
    ]

    // Commands
    let disposable = [
        vscode.commands.registerCommand('extension.helmVersion', helmVersion),
        vscode.commands.registerCommand('extension.helmTemplate', helmTemplate),
        vscode.commands.registerCommand('extension.helmTemplatePreview', helmTemplatePreview),
        vscode.commands.registerCommand('extension.helmLint', helmLint),
        vscode.commands.registerCommand('extension.helmDryRun', helmDryRun),

        //vscode.commands.registerCommand("extension.showYamlPreview", showYamlPreview)

        vscode.languages.registerHoverProvider(HELM_MODE, new HelmTemplateHoverProvider()),

        // Register helm template preview
        vscode.workspace.registerTextDocumentContentProvider("helm-template-preview", previewProvider),

        vscode.languages.registerCompletionItemProvider(completionFilter, completionProvider)
    ]

    // On save, refresh the YAML preview.
    vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
		if (e === vscode.window.activeTextEditor.document) {
            pickChartForFile(vscode.window.activeTextEditor.document.fileName, chartPath => {
                let u = vscode.Uri.parse("helm-template-preview://" + chartPath);
                previewProvider.update(u);
            })
			
		}
	});
    // On editor change, refresh the YAML preview
    vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (e.document === vscode.window.activeTextEditor.document) {
            pickChartForFile(vscode.window.activeTextEditor.document.fileName, chartPath => {
                let u = vscode.Uri.parse("helm-template-preview://" + chartPath);
                previewProvider.update(u);
            })
		}
    })

    disposable.forEach(function(item){
        context.subscriptions.push(item);
    }, this)
}

// this method is called when your extension is deactivated
export function deactivate() {

}

function helmVersion() {
    helmExec("version -c", function(code, out, err){
    if (code != 0) {
        vscode.window.showErrorMessage(err)
        return
    }
    vscode.window.showInformationMessage(out)
    })
}

// Run a 'helm template' command.
// This looks for Chart.yaml files in the present project. If only one is found, it
// runs 'helm template' on it. If multiples are found, it prompts the user to select one.
function helmTemplate() {
    pickChart(path => {
        helmExec("template "+ path, (code, out, err) => {
            if (code != 0) {
                vscode.window.showErrorMessage(err)
                return
            }
            vscode.window.showInformationMessage("chart rendered successfully")
            logger.log(out)
        })
    })
}

function helmTemplatePreview() {
    let editor = vscode.window.activeTextEditor
    if (!editor) {
        vscode.window.showInformationMessage("No active editor.")
        return
    }

    let filePath = editor.document.fileName
    pickChartForFile(filePath, path => {
        let reltpl = filepath.relative(path, filePath)
        let u = vscode.Uri.parse("helm-template-preview://" + path)
        vscode.commands.executeCommand("vscode.previewHtml", u, vscode.ViewColumn.Two, "View YAML")
    })

}

// helmLint runs the Helm linter on a chart within your project.
function helmLint() {
    pickChart(path => {
        logger.log("⎈⎈⎈ Linting " + path)
        helmExec("lint "+ path, (code, out, err) => {
            logger.log(out)
            logger.log(err)
            if (code != 0) {
                logger.log("⎈⎈⎈ LINTING FAILED")
            }
        })
    })
}

// helmDryRun runs a helm install with --dry-run and --debug set.
function helmDryRun() {
    pickChart(path => {
        logger.log("⎈⎈⎈ Installing (dry-run) " + path)
        helmExec("install --dry-run --debug "+ path, (code, out, err) => {
            logger.log(out)
            logger.log(err)
            if (code != 0) {
                logger.log("⎈⎈⎈ INSTALL FAILED")
            }
        })
    })
}

// pickChart tries to find charts in this repo. If one is found, fn() is executed with that
// chart's path. If more than one are found, the user is prompted to choose one, and then
// the fn is executed with that chart.
//
// callback is fn(path)
function pickChart(fn) {
    vscode.workspace.findFiles("**/Chart.yaml", "", 10).then(matches => {
        switch(matches.length) {
            case 0:
                vscode.window.showErrorMessage("No charts found")
                return
            case 1:
                // Assume that if there is only one chart, that's the one to run.
                let p = filepath.dirname(matches[0].fsPath)
                fn(p)
                return
            default:
                var paths = []
                // TODO: This would be so much cooler if the QuickPick parsed the Chart.yaml
                // and showed the chart name instead of the path.
                matches.forEach(item => {
                    paths.push(
                        filepath.relative(vscode.workspace.rootPath, filepath.dirname(item.fsPath))
                    )
                })
                vscode.window.showQuickPick(paths).then( picked => {
                    fn(filepath.join(vscode.workspace.rootPath, picked))
                })
                return
        }
    })
}

// Given a file, show any charts that this file belongs to.
function pickChartForFile(file: string, fn) {
    vscode.workspace.findFiles("**/Chart.yaml", "", 10).then(matches => {
        switch(matches.length) {
            case 0:
                vscode.window.showErrorMessage("No charts found")
                return
            case 1:
                // Assume that if there is only one chart, that's the one to run.
                let p = filepath.dirname(matches[0].fsPath)
                fn(p)
                return
            default:
                var paths = []

                matches.forEach(item => {
                    let dirname = filepath.dirname(item.fsPath)
                    let rel = filepath.relative(dirname, file)

                    // If the present file is not in a subdirectory of the parent chart, skip the chart.
                    if (rel.indexOf("..") >= 0) {
                        return
                    }

                    paths.push(
                        filepath.relative(vscode.workspace.rootPath, filepath.dirname(item.fsPath))
                    )
                })

                if (paths.length == 0) {
                    vscode.window.showErrorMessage("No charts found containing " + file)
                    return
                }

                // For now, let's go with the top-most path (umbrella chart)
                if (paths.length >= 1) {
                    fn(filepath.join(vscode.workspace.rootPath, paths[0]))
                    return
                }

                /*
                vscode.window.showQuickPick(paths).then( picked => {
                    fn(filepath.join(vscode.workspace.rootPath, picked))
                })
                */
                return
        }
    })
}

// helmExec appends 'args' to a Helm command (helm args...), executes it, and then sends the result to te callback.
// fn should take the signature function(code, stdout, stderr)
//
// This will abort and send an error message if Helm is not installed.
function helmExec(args: string, fn) {
    try {
        ensureHelm()
    } catch (e) {
        vscode.window.showErrorMessage("You must install Helm on your executable path")
        return
    }
    let cmd = "helm " + args
    shell.exec(cmd, fn)
}

// isHelmChart tests whether the given path has a Chart.yaml file
function isHelmChart(path: string): boolean {
    return shell.test("-e", path + "/Chart.yaml")
}

function ensureHelm() {
    if (!shell.which("helm")) {
        throw "helm not installed"
    }
}

function previewBody(title: string, data: string, err?: boolean): string {
    return `<body>
      <h1>${ title }</h1>
      <pre>${ data }</pre>
    </body>`;
}

// HelmConsole provides a log-like facility for sending messages to the Helm output channel.
//
// A console is disposable, since it allocates a channel.
class HelmConsole implements vscode.Disposable {
    chan: vscode.OutputChannel
    constructor(chanName: string){
        this.chan = vscode.window.createOutputChannel(chanName)
    }
    log(msg: string) {
        this.chan.append(msg)
        this.chan.show()
    }
    dispose() {
        this.chan.dispose()
    }
}

// Provide hover support
export class HelmTemplateHoverProvider implements vscode.HoverProvider {
    private funcmap = (new FuncMap()).all();

    public provideHover(doc: vscode.TextDocument, pos: vscode.Position, tok: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let wordRange = doc.getWordRangeAtPosition(pos)
        let word = wordRange ? doc.getText(wordRange) : ""
        if (word == "") {
            return Promise.resolve(null)
        }

        if (this.inAction(doc, pos, word)) {
            let found = this.findFunc(word)
            if (found == "") {
                return Promise.resolve(null)
            }
            return new vscode.Hover(found, wordRange)
        }

        return Promise.resolve(null)
    }

    inAction(doc: vscode.TextDocument, pos: vscode.Position, word: string): boolean {
        let lineText = doc.lineAt(pos.line).text
        let r = new RegExp("{{[^}]*\\s("+word+")\\s[^{]*}}")
        return r.test(lineText)
    }

    private findFunc(word: string): vscode.MarkedString[] | string{
        for (var i = 0; i < this.funcmap.length; i++) {
            let item = this.funcmap[i]
            if (item.label == word) {
                return [{language: "helm", value:`${ item.detail }`}, `${ item.documentation }`]
            }
        }
    }
}

// Provide an HTML-formatted preview window.
class HelmTemplatePreviewDocumentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event
    }

    public update(uri: vscode.Uri) {
		this._onDidChange.fire(uri);
	}

    public provideTextDocumentContent(uri: vscode.Uri, tok: vscode.CancellationToken): vscode.ProviderResult<string> {
        return new Promise<string>((resolve, reject) => {
            console.log("provideTextDocumentContent called with uri " + uri.toString())
            let editor = vscode.window.activeTextEditor
            if (!editor) {
                reject("No active editor")
                return
            }

            let filePath = editor.document.fileName
            let chartPath = uri.fsPath
            let prevWin = this
            let reltpl = filepath.relative(filepath.dirname(chartPath), filePath)
            console.log("templating " + reltpl)
            helmExec("template " + chartPath + " --execute " + reltpl, (code, out, err) => {
                if (code != 0) {
                    resolve(previewBody("Chart Preview", "Failed template call." + err, true))
                    return
                }
                resolve(previewBody(reltpl, out))
            })
            return
        })
        
    }
}

export class HelmTemplateCompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(doc: vscode.TextDocument, pos: vscode.Position) {
        console.log("called helmTemplateCOmpletionProvider")
        return new vscode.CompletionList((new FuncMap).all());
    }
}