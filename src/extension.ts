import * as vscode from 'vscode';
import { DefViewViewProvider } from './defView';

export function activate(context: vscode.ExtensionContext) {

	const provider = new DefViewViewProvider(context.extensionUri);
	context.subscriptions.push(provider);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DefViewViewProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('defView.definitionView.pin', () => {
			provider.pin();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('defView.definitionView.unpin', () => {
			provider.unpin();
		}));
}
