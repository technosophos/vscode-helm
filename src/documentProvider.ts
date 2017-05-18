import * as vscode from 'vscode';
import * as filepath from 'path';
import * as exec from './exec';
import * as YAML from 'yamljs';

function previewBody(title: string, data: string, err?: boolean): string {
    return `<body>
      <h1>${ title }</h1>
      <pre>${ data }</pre>
    </body>`;
}

// Provide an HTML-formatted preview window.
export class HelmTemplatePreviewDocumentProvider implements vscode.TextDocumentContentProvider {
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
            exec.helmExec("template " + chartPath + " --execute " + reltpl, (code, out, err) => {
                if (code != 0) {
                    resolve(previewBody("Chart Preview", "Failed template call." + err, true))
                    return
                }
                var res
                try {
                    res = YAML.parse(out)
                } catch (e) {
                    // TODO: Figure out the best way to display this message, but have it go away when the
                    // file parses correctly.
                    //resolve(previewBody("Chart Preview", "Invalid YAML: " + err.message, true))
                    vscode.window.showErrorMessage(`YAML failed to parse: ${ e.message }`)
                }
                resolve(previewBody(reltpl, out))
            })
            return
        })
        
    }
}