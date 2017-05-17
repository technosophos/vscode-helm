
import * as vscode from 'vscode';
import * as v1 from './v1';
import * as _ from 'lodash';

// Resources describes Kubernetes resource keywords.
export class Resources {
    public all(): vscode.CompletionItem[] {
        //return this.metadata().concat(this.secret())
        return this.v1()
    }

    v1(): vscode.CompletionItem[] {
        let res = []
        _.each(v1.default.models, (v, k) => {
            let i = k.lastIndexOf(".")
            //let version = k.substr(0, i)
            let kind = k.substr(i+1)
            res.push(val(kind, `kind: ${ kind }`, v.description))
            _.each(v.properties, (spec, label) => {
                res.push(d(label, `${ label }: ${ spec.type }`, spec.description))
            })
        })
        return res
    }    
}

function d(name: string, use: string, doc: string): vscode.CompletionItem {
    let i = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable)
    i.detail = use
    i.documentation = doc
    return i
}
function val(name: string, use: string, doc: string): vscode.CompletionItem {
    let i = new vscode.CompletionItem(name, vscode.CompletionItemKind.Value)
    i.detail = use
    i.documentation = doc
    return i
}