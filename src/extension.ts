'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as shell from 'shelljs';
import * as filepath from 'path';

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
    public provideHover(doc: vscode.TextDocument, pos: vscode.Position, tok: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        let wordRange = doc.getWordRangeAtPosition(pos)
        let lineText = doc.lineAt(pos.line).text
        return new vscode.Hover(lineText)
    }

    inAction(doc: vscode.TextDocument, pos: vscode.Position): boolean {
        let lineText = doc.lineAt(pos.line).text
        // TODO: Scan whether we are inside of a {{...}} action
        return false
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
        return new vscode.CompletionList(this.sprigFuncs().concat([
            new vscode.CompletionItem("template", vscode.CompletionItemKind.Function),
            new vscode.CompletionItem("include")
        ]));
    }

    sprigFuncs():vscode.CompletionItem[] {
        return [
            // String
            this.f("trim", "trim $str", "remove space from either side of string"),
            this.f("trimAll", "trimAll $trim $str", "remove $trim from either side of $str"),
            this.f("trimSuffix", "trimSuffix $pre $str", "trim suffix from string"),
            this.f("upper", "upper $str", "convert string to uppercase"),
            this.f("lower", "lower $str", "convert string to lowercase"),
            this.f("title", "title $str", "convert string to title case"),
            this.f("untitle", "untitle $str", "convert string from title case"),
            this.f("substr", "substr $start $len $string", "get a substring of $string, starting at $start and reading $len characters"),
            this.f("repeat", "repeat $count $str", "repeat $str $count times"),
            this.f("nospace", "nospace $str", "remove space from inside a string"),
            this.f("upper", "upper $str", "convert string to uppercase"),
            this.f("trunc", "trunc $max $str", "truncate $str at $max characters"),
            this.f("abbrev", "abbrev $max $str", "truncate $str with elipses at max length $max"),
            this.f("abbrevboth", "abbrevboth $left $right $str", "abbreviate both $left and $right sides of $string"),
            this.f("initials", "initials $str", "create a string of first characters of each word in $str"),
            this.f("randAscii", "randAscii", "generate a random string of ASCII characters"),
            this.f("randNumeric", "randNumeric", "generate a random string of numeric characters"),
            this.f("randAlpha", "randAlpha", "generate a random string of alphabetic ASCII characters"),
            this.f("randAlphaNum", "randAlphaNum", "generate a random string of ASCII alphabetic and numeric characters"),
            this.f("wrap", "wrap $col $str", "wrap $str text at $col columns"),
            this.f("wrapWith", "wrapWith $col $wrap $str", "wrap $str with $wrap ending each line at $col columns"),
            this.f("contains", "contains $needle $haystack", "returns true if string $needle is present in $haystack"),
            this.f("hasPrefix", "hasPrefix $pre $str", "returns true if $str begins with $pre"),
            this.f("hasSuffix", "hasSuffix $suf $str", "returns true if $str ends with $suf"),
            this.f("quote", "quote $str", "surround $str with double quotes (\")"),
            this.f("squote", "squote $str", "surround $str with single quotes (')"),
            this.f("cat", "cat $str1 $str2 ...", "concatenate all given strings into one, separated by spaces"),
            this.f("indent", "indent $count $str", "indent $str with $count space chars on the left"),
            this.f("replace", "replace $find $replace $str", "find $find and replace with $replace"),
            // String list
            this.f("plural", "plural $singular $plural $count", "if $count is 1, return $singular, else return $plural"),
            this.f("join", "join $sep $str1 $str2 ...", "concatenate all given strings into one, separated by $sep"),
            this.f("splitList", "splitList $sep $str", "split $str into a list of strings, separating at $sep"),
            this.f("split", "split $sep $str", "split $str on $sep and store results in a dictionary"),
            this.f("sortAlpha", "sortAlpha $strings", "sort a list of strings into alphabetical order"),
            // Math
            this.f("add", "add $a $b $c", "add two or more numbers"),
            this.f("add1", "add1 $a", "increment $a by 1"),
            this.f("sub", "sub $a $b", "subtract $a from $b"),
            this.f("div", "div $a $b", "divide $b by $a"),
            this.f("mod", "mod $a $b", "modulo $b by $a"),
            this.f("mul", "mult $a $b", "multiply $b by $a"),
            this.f("max", "max $a $b ...", "return max integer"),
            this.f("min", "min $a $b ...", "return min integer"),
            // Integer list
            this.f("until", "until $count", "return a list of integers beginning with 0 and ending with $until - 1"),
            this.f("untilStep", "untilStep $start $max $step", "start with $start, and add $step until reaching $max"),
            // Date
            // Defaults
            // Encoding
            // Lists
            // Dictionaries
            // Type Conversion
            // File Path
            // UUID
            // OS
            // SemVer
            // Reflection
            // Crypto
        ]
    }

    f(name: string, args: string, doc: string): vscode.CompletionItem {
        let i = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function)
        i.detail = args
        i.documentation = doc
        return i
    }
}