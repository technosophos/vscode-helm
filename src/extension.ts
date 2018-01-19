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
import { HelmTemplatePreviewDocumentProvider, HelmInspectDocumentProvider } from './documentProvider';
import { HelmTemplateCompletionProvider } from './completionProvider';

import * as draft from "./draft";

// Filters for different Helm file types.
// TODO: Consistently apply these to the provders registered.
export const HELM_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file" }
export const HELM_REQ_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file", pattern: "**/requirements.yaml"}
export const HELM_CHART_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file", pattern: "**/Chart.yaml" }
export const HELM_TPL_MODE: vscode.DocumentFilter = { language: "helm", scheme: "file", pattern: "**/templates/*.*" }


export const HELM_INSPECT_SCHEME = 'helm-inspect-values'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-helm" is now active!');
    console.log("HELM_HOME is " + exec.helmHome())
    
    context.subscriptions.push(logger)
    let previewProvider = new HelmTemplatePreviewDocumentProvider()
    let inspectProvider = new HelmInspectDocumentProvider()
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
        vscode.commands.registerCommand('extension.helmCreate', exec.helmCreate),

        // EXPERIMENTAL draft support
        vscode.commands.registerCommand('extension.draftVersion', draft.draftVersion),
        vscode.commands.registerCommand('extension.draftCreate', draft.draftCreate),
        vscode.commands.registerCommand('extension.draftCreateManual', draft.draftCreateManual),
        vscode.commands.registerCommand('extension.draftUp', draft.draftUp),

        //vscode.commands.registerCommand("extension.showYamlPreview", showYamlPreview)

        vscode.languages.registerHoverProvider(HELM_MODE, new HelmTemplateHoverProvider()),

        // Register preview providers
        vscode.workspace.registerTextDocumentContentProvider(exec.HELM_PREVIEW_SCHEME, previewProvider),
        vscode.workspace.registerTextDocumentContentProvider(HELM_INSPECT_SCHEME, inspectProvider),

        vscode.languages.registerCompletionItemProvider(completionFilter, completionProvider),

        // Code lenses
        vscode.languages.registerCodeLensProvider(HELM_REQ_MODE, new RequirementsCodeLenseProvider())
    ]

    // On save, refresh the YAML preview.
    vscode.workspace.onDidSaveTextDocument((e: vscode.TextDocument) => {
        if (!editorIsActive()) {
            logger.log("WARNING: No active editor during save. Nothing saved.")
            return
        }
        if (e === vscode.window.activeTextEditor.document) {
            let doc = vscode.window.activeTextEditor.document
            if (doc.uri.scheme != "file") {
                return
            }
            let u = vscode.Uri.parse(exec.HELM_PREVIEW_URI)
            previewProvider.update(u)
        }
	});
    // On editor change, refresh the YAML preview
    vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (!editorIsActive()) {
            return
        }
        let doc = vscode.window.activeTextEditor.document
        if (doc.uri.scheme != "file") {
            return
        }
        let u = vscode.Uri.parse(exec.HELM_PREVIEW_URI)
        previewProvider.update(u)
    })

    disposable.forEach(function(item){
        context.subscriptions.push(item);
    }, this)
}

// this method is called when your extension is deactivated
export function deactivate() {

}

function editorIsActive(): boolean {
    // force type coercion
    return (vscode.window.activeTextEditor) ? true : false
}