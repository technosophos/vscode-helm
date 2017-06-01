import * as vscode from 'vscode';
import * as shell from 'shelljs';
import * as path from 'path';
import {logger} from './logger';

/*
 * This file contains experimental support for Draft.
 */

export function draftVersion() {
    draftExec("version", function(code, out, err){
        if (code != 0) {
            vscode.window.showErrorMessage(err)
            return
        }
        vscode.window.showInformationMessage(out)
    })
}

export function draftExec(args: string, fn) {
    if (!shell.which("draft")) {
        vscode.window.showErrorMessage("Install Draft on your executable path")
        return
    }
    let cmd = "draft " + args
    shell.exec(cmd, fn)
}

export function draftCreate() {
    // This is a lame hack because draft does not take a path argument.
    //shell.cd(vscode.workspace.rootPath)

    vscode.window.showInputBox({prompt: "Project Name", placeHolder: "helloWorld"}).then(name => {
        selectPack(pack => {
            let cmd = "create -p " + pack + " -a " + name + " " + vscode.workspace.rootPath
            draftExec(cmd, (code, out, err) => {
                if (code != 0) {
                    vscode.window.showErrorMessage(err)
                    return
                }
                vscode.window.showInformationMessage("Created " + name)
            })
        })
    })
}

export function draftUp() {
    logger.log("===== Starting new Draft build ======")
    if (!shell.which("draft")) {
        vscode.window.showErrorMessage("Install Draft on your executable path")
        return
    }
    let cmd = "draft up " + vscode.workspace.rootPath
    let proc = shell.exec(cmd, { async:true }, (code) => {
        if (code != 0) {
            logger.log("ERROR: draft up exited with code " + code)
        }
        logger.log("===== Draft build is complete =====")
    })
    proc.stdout.on('data', data => {logger.log(data)})
    proc.stderr.on('data', data => {logger.log(data)})
}

function selectPack(fn) {
    draftExec("home", (code, out, err) => {
        if (code != 0 ) {
            vscode.window.showErrorMessage(err)
            return
        }
        let dir = path.join(out.slice(0, -1), "packs")
        let dirs = shell.ls(dir)
        vscode.window.showQuickPick(dirs).then(val => {
            fn(val)
        })
    })
}