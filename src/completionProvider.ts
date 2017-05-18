import * as vscode from 'vscode';
import { FuncMap } from './funcmap';

export class HelmTemplateCompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(doc: vscode.TextDocument, pos: vscode.Position) {
        console.log("called helmTemplateCompletionProvider")
        return new vscode.CompletionList((new FuncMap).all());
    }
}