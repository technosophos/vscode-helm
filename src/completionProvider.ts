import * as vscode from 'vscode';
import { FuncMap } from './funcmap';
import {logger} from './logger';
import * as YAML from 'yamljs';
import * as exec from './exec';
import * as path from 'path';
import * as _ from 'lodash';
import {existsSync} from 'fs';

export class HelmTemplateCompletionProvider implements vscode.CompletionItemProvider {
    
    private valuesMatcher = new RegExp('\\s+\\.Values\\.([a-zA-Z0-9\\._-]+)?$')
    private funcmap = new FuncMap()

    // TODO: On focus, rebuild the values.yaml cache
    private valuesCache

    public constructor(){
        this.refreshValues()
    }

    public refreshValues() {
        let ed = vscode.window.activeTextEditor
        if (!ed) {
            return
        }

        let self = this
        exec.pickChartForFile(ed.document.fileName, f => {
            let valsYaml = path.join(f, "values.yaml")
            if (!existsSync(valsYaml)) {
                return
            }
            try {
                self.valuesCache = YAML.load(valsYaml)
            } catch (err) {
                logger.log(err.message)
                return
            }
        })
    }

    public provideCompletionItems(doc: vscode.TextDocument, pos: vscode.Position) {

        // If the preceding character is a '.', we kick it into dot resolution mode.
        // Otherwise, we go with function completion.
        let wordPos = doc.getWordRangeAtPosition(pos)
        let word = doc.getText(wordPos)
        let line = doc.lineAt(pos.line).text
        let lineUntil = line.substr(0, wordPos.start.character)

        logger.log(lineUntil)
        if (lineUntil.endsWith(".")) {
            logger.log("sending to dotCompletionItems ")
            return this.dotCompletionItems(doc, pos, word, lineUntil)
        }

        return new vscode.CompletionList((new FuncMap).all());
    }

    dotCompletionItems(doc: vscode.TextDocument, pos: vscode.Position, word: string, lineUntil: string): vscode.CompletionItem[] {
        if (lineUntil.endsWith(" .")) {
            return this.funcmap.helmVals()
        } else if (lineUntil.endsWith(".Release.")) {
            return this.funcmap.releaseVals()
        } else if (lineUntil.endsWith(".Chart.")) {
            return this.funcmap.chartVals()
        } else if (lineUntil.endsWith(".Files.")) {
            return this.funcmap.filesVals()
        } else if (lineUntil.endsWith(".Capabilities.")) {
            return this.funcmap.capabilitiesVals()
        } else if (lineUntil.endsWith(".Values.")) {
            if (!_.isPlainObject(this.valuesCache)) {
                return
            }
            let keys = _.keys(this.valuesCache)
            let res = []
            keys.forEach(key => {
                res.push(this.funcmap.v(key, ".Values."+key, "" + this.valuesCache[key]))
            });
            return res

        } else {
            
            logger.log("in else block")
            let res
            try {
                res = this.valuesMatcher.exec(lineUntil)
            } catch (err) {
                logger.log(err.message)
            }
            
            if (!res || res.length == 0) {
                logger.log("no matches for line " + lineUntil)
                return []
            }
            logger.log("Match: " + res[0] + " ("+res[1]+" matches)")
            let parts = res[1].substr(1).split(".")
            if (!res[1]) {
                return []
            }

            let words = []
            parts.forEach(part => {
                // Get the map for that part
            });
            /*
            let doc = vscode.window.activeTextEditor.document
            exec.pickChartForFile(doc.fileName, f => {
                let valsYaml = path.join(f, "values.yaml")
                var vals
                try {
                    vals = YAML.load(valsYaml)
                } catch (err) {
                    logger.log(err.message)
                    return []
                }
                var target = vals
                
                for (var i = 0; i < parts.length; i++) {
                    let key = parts[i]
                    if (target[key]) {
                        target = target[key]
                    } else if (key == "") {
                        continue
                    } else {
                        // Not found
                        return []
                    }
                }

                let res = []
                let v = this.v
                _.forEach(target, (key, val) => {
                    res.push(v(key, res[1], "values.yaml: " + val))
                })
                return res
            })
            */
            return []
            

        }
        //return []
    }
    v(name: string, use: string, doc: string): vscode.CompletionItem {
        let i = new vscode.CompletionItem(name, vscode.CompletionItemKind.Constant)
        i.detail = use
        i.documentation = doc
        return i
    }
    f(name: string, args: string, doc: string): vscode.CompletionItem {
        let i = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function)
        i.detail = args
        i.documentation = doc
        return i
    }
    withValues(fn) {
        let doc = vscode.window.activeTextEditor.document
        exec.pickChartForFile(doc.fileName, f => {
            let valsYaml = path.join(f, "values.yaml")
            var vals
            try {
                vals = YAML.load(valsYaml)
            } catch (err) {
                logger.log(err.message)
                fn({})
            }
            fn(vals)
        })
    }
}