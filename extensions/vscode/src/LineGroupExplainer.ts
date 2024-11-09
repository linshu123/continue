import { getParserForFile } from 'core/util/treeSitter';
import * as vscode from 'vscode';
import Parser from 'web-tree-sitter';
import { ILLM } from 'core';

const COLORS = [
    'rgba(65, 105, 225, 0.1)', // royal blue
    'rgba(220, 20, 60, 0.1)',  // crimson
    'rgba(46, 139, 87, 0.1)',  // sea green
    'rgba(218, 165, 32, 0.1)', // goldenrod
    'rgba(148, 0, 211, 0.1)',  // dark violet
];

export class LineGroupExplainer implements vscode.CodeLensProvider {
    private decorationTypes: vscode.TextEditorDecorationType[] = [];
    private llm: ILLM;

    constructor(context: vscode.ExtensionContext, llm: ILLM) {
        this.llm = llm;
        
        // Register the CodeLens provider
        context.subscriptions.push(
            vscode.languages.registerCodeLensProvider(
                { scheme: 'file' },
                this
            ),
            // Keep original decoration update subscriptions
            vscode.window.onDidChangeActiveTextEditor(() => {
                this.updateDecorations();
            }),
            vscode.workspace.onDidChangeTextDocument(() => {
                this.updateDecorations();
            })
        );

        // Initial decoration
        if (vscode.window.activeTextEditor) {
            this.updateDecorations();
        }
    }

    async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        const ranges = await this.generateLineGroupsForDocument(document);
        return ranges.map(range => new vscode.CodeLens(range));
    }

    async resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens> {
        const document = vscode.window.activeTextEditor?.document;
        if (!document) {
            return codeLens;
        }

        const comment = await this.getCommentForRange(document, codeLens.range);
        codeLens.command = {
            title: `$(comment) ${comment}`,
            command: '' // Empty command as we just want to show the text
        };
        return codeLens;
    }

    private async getCommentForRange(
        document: vscode.TextDocument,
        range: vscode.Range
    ): Promise<string> {
        const rangeText = document.getText(range);
        
        const prompt = `Write a very short (max 10 words) comment describing your best guess of what this code does. Focus only on the key functionality.
\`\`\`
${rangeText}
\`\`\`

Respond with only the short comment, nothing else.`;

        const comment = await this.llm.complete(prompt, {
            maxTokens: 30,
            temperature: 0.1
        });

        return comment?.trim() || "";
    }

    private clearDecorations(): void {
        this.decorationTypes.forEach(decoration => decoration.dispose());
        this.decorationTypes = [];
    }

    private isEmptyLine(line: string): boolean {
        return line.trim().length === 0;
    }

    private splitNodeByEmptyLines(
        node: Parser.SyntaxNode,
        document: vscode.TextDocument
    ): vscode.Range[] {
        const ranges: vscode.Range[] = [];
        const lines = document.getText(new vscode.Range(
            document.positionAt(node.startIndex),
            document.positionAt(node.endIndex)
        )).split('\n');
        // find the start of first children
        let firstChildStart = node.endPosition.row;
        let lastChildEnd = node.startPosition.row;
        for (const child of node.namedChildren) {
            if (child.startPosition.row < firstChildStart) {
                firstChildStart = child.startPosition.row;
            }
            if (child.endPosition.row > lastChildEnd) {
                lastChildEnd = child.endPosition.row;
            }
        }
        
        let blockStart = firstChildStart;
        let isBlockInProgress = false;
        // Adjust indices to be relative to the node's start position
        for (let i = firstChildStart; i < lastChildEnd; i++) {
            const lineIndex = i - node.startPosition.row;
            if (this.isEmptyLine(lines[lineIndex])) {
                if (isBlockInProgress) {
                    const blockEndLine = i - 1;
                    ranges.push(new vscode.Range(
                        blockStart, 0,
                        blockEndLine, document.lineAt(blockEndLine).text.length
                    ));
                }
                isBlockInProgress = false;
            } else {
                if (!isBlockInProgress) {
                    isBlockInProgress = true;
                    blockStart = i;
                }
            }
        }
        
        // Add the final block if there is one
        if (isBlockInProgress) {
            ranges.push(new vscode.Range(
                blockStart, 0,
                lastChildEnd, document.lineAt(lastChildEnd).text.length
            ));
        }
        
        return ranges;
    }

    async generateLineGroupsForDocument(document: vscode.TextDocument): Promise<vscode.Range[]> {
        // Get parser for the current file
        const parser = await getParserForFile(document.fileName);
        if (!parser) {
            return [];
        }

        // Parse the document content
        const tree = parser.parse(document.getText());
        const rootNode = tree.rootNode;

        // Find all block-like nodes that form logical groups
        const blockNodes = this.findChildren(
            rootNode,
            (node) => [
                'function_definition',
                'method_definition',
                'class_definition',
                'function_declaration',
                'method_declaration',
                'class_declaration',
                'block',
                'enum_declaration',
                'variable_declarator',
            ].includes(node.type)
        );

        // Convert nodes to VSCode ranges and split by empty lines
        const allRanges: vscode.Range[] = [];

        const nodeTypeWithStatementBlock = [
            'function_definition',
            'method_definition',
            'class_definition',
        ];
        
        for (const node of blockNodes) {
            if (!nodeTypeWithStatementBlock.includes(node.type)) {
                continue;
            }
            // If node range is smaller than 10 lines, skip it
            const nodeRange = new vscode.Range(
                document.positionAt(node.startIndex),
                document.positionAt(node.endIndex)
            );
            if (nodeRange.end.line - nodeRange.start.line < 10) {
                continue;
            }
            
            // Find the statement block
            let statementBlock: Parser.SyntaxNode | null = null;
            for (const child of node.namedChildren) {
                if (child.type === 'statement_block') {
                    statementBlock = child;
                    break;
                }
            }
            if (!statementBlock) {
                continue;
            }

            // Split each node into sub-ranges based on empty lines
            const subRanges = this.splitNodeByEmptyLines(statementBlock, document);
            allRanges.push(...subRanges);
        }

        return allRanges;
    }

    private async updateDecorations(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        this.clearDecorations();
        const document = editor.document;
        
        // Get groups of ranges
        const groups = await this.generateLineGroupsForDocument(document);

        // Create decorations for each group
        for (let i = 0; i < groups.length; i++) {
            const range = groups[i];
            
            // Create decoration type for this group (background only)
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: COLORS[i % COLORS.length],
                isWholeLine: true,
                rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
            });
            
            this.decorationTypes.push(decorationType);
            editor.setDecorations(decorationType, [range]);
        }
    }

    private findChildren(
        node: Parser.SyntaxNode,
        predicate: (n: Parser.SyntaxNode) => boolean,
    ): Parser.SyntaxNode[] {
        let matchingNodes: Parser.SyntaxNode[] = [];

        // Check if the current node's type matches the predicate
        if (predicate(node)) {
            // Only include nodes that span multiple lines
            const nodeLines = node.endPosition.row - node.startPosition.row;
            if (nodeLines > 0) {
                matchingNodes.push(node);
            }
        }

        // Recursively search for matching types in all children of the current node
        for (const child of node.children) {
            matchingNodes = matchingNodes.concat(
                this.findChildren(child, predicate)
            );
        }

        return matchingNodes;
    }
}
