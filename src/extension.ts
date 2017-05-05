'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as shell from 'shelljs';
import * as filepath from 'path';

// The helm console channel.
const HelmChannel = "Helm"
var logger;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-helm" is now active!');
    logger = new HelmConsole(HelmChannel)
    context.subscriptions.push(logger)

    // Commands
    let disposable = [
        vscode.commands.registerCommand('extension.helmVersion', helmVersion),
        vscode.commands.registerCommand('extension.helmTemplate', helmTemplate),
        vscode.commands.registerCommand('extension.helmLint', helmLint),
        vscode.commands.registerCommand('extension.helmDryRun', helmDryRun),
        //vscode.commands.registerCommand("extension.showYamlPreview", showYamlPreview)
    ]    

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

// helmExec appends 'args' to a Helm command (helm args...), executes it, and then sends the result to te callback.
// fn should take the signature function(code, stdout, stderr)
//
// This will abort and send an error message if Helm is not installed.
function helmExec(args, fn) {
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
function isHelmChart(path) {
    return shell.test("-e", path + "/Chart.yaml")
}

function ensureHelm() {
    if (!shell.which("helm")) {
        throw "helm not installed"
    }
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