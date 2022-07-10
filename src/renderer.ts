import * as vscode from 'vscode';
import { CodeHighlighter } from './codeHighlighter';

export class Renderer {

	private readonly _disposables: vscode.Disposable[] = [];

	private readonly _highlighter: CodeHighlighter;

	public readonly needsRender: vscode.Event<void>;

	constructor() {
		this._highlighter = new CodeHighlighter();
		this._disposables.push(this._highlighter);

		this.needsRender = this._highlighter.needsRender;
	}

	dispose() {
		let item: vscode.Disposable | undefined;
		while ((item = this._disposables.pop())) {
			item.dispose();
		}
	}

	public async renderDefinitions(document: vscode.TextDocument, definitions: readonly vscode.Location[] | vscode.LocationLink[]): Promise<string> {
		let docs = [];

		for (const def of definitions) {
			if (def instanceof vscode.Location) {
				docs.push(await this.getFileContents(def.uri, def.range));
			} else {
				docs.push(await this.getFileContents(def.targetUri, def.targetRange));
			}

		}

		const parts = docs
			.filter(content => content.length > 0);

		if (!parts.length) {
			return '';
		}

		const code = parts.join('\n');

		const highlighter = await this._highlighter.getHighlighter(document);
		return highlighter(code, document.languageId);
	}

	private async getFileContents(uri: vscode.Uri, range: vscode.Range): Promise<string> {
		const doc = await vscode.workspace.openTextDocument(uri);

		// First, capture any preceding lines that may be important.
		const rangePre = new vscode.Range(range.start.line, 0, doc.lineCount, 0);
		let linesPre = doc.getText(rangePre).split(/\r?\n/);
		let firstLine = 0;
		for (let n = linesPre.length; n >= 0; n--) {
			if (linesPre[n - 1].length === 0) {
				firstLine = n;
				break;
			}
		}
		linesPre = linesPre.slice(firstLine);

		// Now capture any remaining lines until the end of the function.
		const r = new vscode.Range(range.start.line, 0, doc.lineCount, 0);
		let lines = doc.getText(r).split(/\r?\n/);
		let lastLine = 0;
		let indent = lines[0].search(/\S/);
		console.debug(`indent = ${indent}`);
		let insideBlock = false;
		for (let n = 1; n < lines.length; n++) {
			let lineIndent = lines[n].search(/\S/);
			console.debug(`line ${n} indent = ${lineIndent}: ${lines[n]}`);

			if (lineIndent > indent) {
				insideBlock = true;
			}

			if (lines[n].trim().length > 0) {
				console.debug(`line ${n} not empty`);
				// Keep searching until the next non-blank line that is 
				// at a shorter indent level.
				if (lineIndent < indent) {
					break;
				} else if (insideBlock && lineIndent === indent) {
					// Ignore {
					if (lines[n].charAt(lineIndent) === '{') {
						console.debug(`ignore { on line ${n}`);
						continue;
					}

					// If the character is }, include it.
					// Otherwise, exclude it (for languages like Python, 
					// this would be the start of the next function)
					if (lines[n].charAt(lineIndent) === '}') {
						console.debug(`found } on line ${n}`);
						lastLine = n;
					}

					break;
				}

				lastLine = n;
				console.debug(`lastLine = ${n}`);
			}
		}
		lines = lines.slice(0, lastLine + 1).map((x) => { return x.substring(indent) });

		return [...linesPre, ...lines].join("\n")
	}
}
