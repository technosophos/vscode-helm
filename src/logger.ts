import * as vscode from 'vscode';

const HelmChannel = "Helm"

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
        this.chan.append("\n")
        this.chan.show()
    }
    dispose() {
        this.chan.dispose()
    }
}

// Create a single shared logger.
export var logger = new HelmConsole(HelmChannel)