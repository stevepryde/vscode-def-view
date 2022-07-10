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
		console.debug(`uri = ${uri}`);
		console.debug(`range = ${range.start.line} - ${range.end.line}`);

		// Read entire file.
		const rangeText = new vscode.Range(0, 0, doc.lineCount, 0);
		let lines = doc.getText(rangeText).split(/\r?\n/);
		let indent = lines[range.start.line].search(/\S/);

		// First, capture any preceding lines that may be important.
		// Typically only comments and attributes.
		const prefixes = ['@', '/', '#', '[', ';', '-'];
		let firstLine = range.start.line;
		for (let n = range.start.line - 1; n >= 0; n--) {
			let lineIndent = lines[n].search(/\S/);
			if (lineIndent < indent) {
				break;
			}

			console.debug(`line ${n}: ${lines[n]}`);
			if (lines[n].length === 0) {
				break;
			}

			// Only allow lines starting with specific chars.
			// Typically comments.
			if (!prefixes.includes(lines[n].trim().charAt(0))) {
				let c = lines[n].trim().charAt(0);
				console.debug(`first char is ${c}`);
				break;
			}

			firstLine = n;
		}
		console.debug(`firstLine = ${firstLine}`);

		// Now capture any remaining lines until the end of the function.
		let lastLine = range.end.line;

		let insideBlock = false;
		// Hack for C#/Godot definitions with no function body.
		// Also for variable defs.
		let trimmedStart = lines[range.start.line].trim();
		if (trimmedStart.search(/;$/) >= 0) {
			console.debug(`start inside block - line ${range.start.line}`);
			insideBlock = true;
		}

		for (let n = range.start.line; n < lines.length; n++) {
			let lineIndent = lines[n].search(/\S/);
			let trimmedLine = lines[n].trim();

			let firstChar = trimmedLine.charAt(0);
			let lastChar = trimmedLine.charAt(trimmedLine.length - 1);

			if (trimmedLine.length > 0) {
				// Keep searching until the next non-blank line that is 
				// at a shorter indent level.
				if (lineIndent < indent) {
					console.debug("BREAK: indent less");
					break;
				} else if (insideBlock && lineIndent === indent) {
					// Ignore {
					// For C#/C/C++ where the { is on the next line.
					if (firstChar === '{') {
						if (n > lastLine) {
							lastLine = n;
						}
						continue;
					}

					// If the character is ), include it and keep going.
					// This catches things like this:
					// ```
					// fn some_func(
					//     a: String	
					// ) {
					// ```
					if (firstChar === ')') {
						if (n > lastLine) {
							lastLine = n;
						}
						continue;
					}

					// If the character is }, include it.
					// Otherwise, exclude it (for languages like Python, 
					// this would be the start of the next function)
					if (firstChar === '}') {
						if (n > lastLine) {
							lastLine = n;
						}
					}

					console.debug("BREAK: inside block & indent same");
					break;
				}

				// Nasty hacks :P
				let inBlockFirstChars = ['{'];
				let inBlockLastChars = [':', '{', ';', '}'];
				if (lineIndent > indent || inBlockFirstChars.includes(firstChar) || inBlockLastChars.includes(lastChar)) {
					console.debug(`inside block now (line ${n}`);
					insideBlock = true;
				}

				if (n > lastLine) {
					lastLine = n;
				}
			}
		}
		console.debug(`lastLine = ${lastLine}`);
		lines = lines.slice(firstLine, lastLine + 1).map((x) => { return x.substring(indent) });
		return lines.join("\n") + "\n";
	}
}
