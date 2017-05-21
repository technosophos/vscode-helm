'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as shell from 'shelljs';
import * as filepath from 'path';
import * as YAML from 'yamljs';

import * as exec from './exec'; 
import { logger } from './logger';
import { HelmTemplateHoverProvider } from './hoverProvider';
import { RequirementsCodeLenseProvider } from './requirementsCodeLense';
import { HelmTemplatePreviewDocumentProvider } from './documentProvider';
import { HelmTemplateCompletionProvider } from './completionProvider';

// Filters for different Helm file types.
// TODO: Consistently apply these to the provders registered.
export const HELM_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file" }
export const HELM_REQ_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file", pattern: "**/requirements.yaml"}
export const HELM_CHART_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file", pattern: "**/Chart.yaml" }
export const HELM_TPL_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file", pattern: "**/templates/*.*" }

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-helm" is now active!');
    console.log("HELM_HOME is " + exec.helmHome())
    
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
        vscode.commands.registerCommand('extension.helmVersion', exec.helmVersion),
        vscode.commands.registerCommand('extension.helmTemplate', exec.helmTemplate),
        vscode.commands.registerCommand('extension.helmTemplatePreview', exec.helmTemplatePreview),
        vscode.commands.registerCommand('extension.helmLint', exec.helmLint),
        vscode.commands.registerCommand('extension.helmInspectValues', exec.helmInspectValues),
        vscode.commands.registerCommand('extension.helmDryRun', exec.helmDryRun),
        vscode.commands.registerCommand('extension.helmDepUp', exec.helmDepUp),
        vscode.commands.registerCommand('extension.helmInsertReq', exec.insertRequirement),

        //vscode.commands.registerCommand("extension.showYamlPreview", showYamlPreview)

        vscode.languages.registerHoverProvider(HELM_MODE, new HelmTemplateHoverProvider()),

        // Register helm template preview
        vscode.workspace.registerTextDocumentContentProvider("helm-template-preview", previewProvider),

        vscode.languages.registerCompletionItemProvider(completionFilter, completionProvider),

        // Code lenses
        vscode.languages.registerCodeLensProvider(HELM_REQ_MODE, new RequirementsCodeLenseProvider())
    ]

    // On save, refresh the YAML preview.
    vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
		if (e === vscode.window.activeTextEditor.document) {
            let doc = vscode.window.activeTextEditor.document
            if (doc.uri.scheme != "file") {
                return
            }

            exec.pickChartForFile(vscode.window.activeTextEditor.document.fileName, chartPath => {
                let u = vscode.Uri.parse("helm-template-preview://" + chartPath);
                previewProvider.update(u);
            })
			
		}
	});
    // On editor change, refresh the YAML preview
    vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (e.document === vscode.window.activeTextEditor.document) {
            let doc = vscode.window.activeTextEditor.document
            if (doc.uri.scheme != "file") {
                return
            }
            exec.pickChartForFile(vscode.window.activeTextEditor.document.fileName, chartPath => {
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