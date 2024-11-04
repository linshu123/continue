import {ContextItemWithId, IDE, OneLineRange} from "core/index";
import {EmbeddingsProvider} from "core/index";
import {chunkDocument, shouldChunk} from "core/indexing/chunk/chunk";
import {Chunk, Range} from "core/index";
import { LanceDbIndex } from "core/indexing/LanceDbIndex";

interface EmbeddedChunk extends Chunk {
    vector: number[];
}

export class FilePredictor {
    private recentFiles : string[] = [];
    private maxRecentFiles = 20;
    private ide : IDE;
    private embeddedChunks : Map < string,
    EmbeddedChunk [] > = new Map();
    private lanceDbIndex: LanceDbIndex;

    constructor(ide : IDE, private readonly embeddingsProvider : EmbeddingsProvider, private readonly pathSep : string) {
        this.ide = ide;
        this.lanceDbIndex = new LanceDbIndex(embeddingsProvider, (path) => ide.readFile(path), pathSep);
    }

    async addRecentFile(filepath : string) { // Remove if already exists
        this.recentFiles = this.recentFiles.filter(f => f !== filepath);

        // Add to front
        this.recentFiles.unshift(filepath);

        // Maintain max size
        if (this.recentFiles.length > this.maxRecentFiles) {
            this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
        }

        // Index the new file
        await this.indexFile(filepath);
    }

    private async indexFile(filepath : string) {
        try {
            const content = await this.ide.readFile(filepath);

                if (!shouldChunk(this.pathSep, filepath, content)) {
                    return;
                }

                const chunks: Chunk[] = [];
                for await(const chunk of chunkDocument({
                    filepath, contents: content, maxChunkSize: this.embeddingsProvider.maxChunkSize, digest: filepath // Using filepath as digest since we don't need caching
                })) {
                    chunks.push(chunk);
                }
            


            // Get embeddings for all chunks
            const embeddings = await this.embeddingsProvider.embed(chunks.map(c => c.content));

            // Combine chunks with their embeddings
            const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, i) => ( {
                ... chunk,
                vector : embeddings[i]
            })
        ) 
        ;

        this.embeddedChunks.set(filepath, embeddedChunks);
    } catch (err) {
        console.error(`Failed to index file ${filepath}:`, err);
    }
}

async predictRelevantSnippets(currentContent : string, currentFilepath : string) : Promise < ContextItemWithId[] > { // Get embedding for current content
    

    const lanceDbChunks = await this.lanceDbIndex.retrieve(currentContent, 30, [{
      branch: "main",
      directory: "/Users/linshu/Projects/test_repos/continue"
    }], undefined);

    return lanceDbChunks.map(chunk => ({
      id: {
        providerTitle: `Distance: ${chunk.distance?.toFixed(2)}`,
        itemId: `${chunk.filepath.split(this.pathSep).pop()}:${chunk.startLine}-${chunk.endLine}`
      },
      name: chunk.filepath.split(this.pathSep).pop()!,
      description: chunk.filepath,
      filepath: chunk.filepath.split(this.pathSep).pop()!,
      content: chunk.content,
      distance: chunk.distance,
      highlightRanges: []
    }));





    // const [currentVector] = await this.embeddingsProvider.embed([currentContent]);
    // Calculate similarities with all chunk
    // const results: Array<{chunk: EmbeddedChunk, similarity: number, highlightRanges?: OneLineRange[]}> = [];

    // for (const [filepath, chunks] of this.embeddedChunks.entries()) {
    //     for (const chunk of chunks) { // Skip chunks that contain the current content as a substring
    //         if (chunk.content.includes(currentContent)) {
    //             continue;
    //         }

    //         const currentFileName = currentFilepath.split(this.pathSep).pop()!;

    //         if (chunk.filepath.split(this.pathSep).pop()! === currentFileName) {
    //             continue;
    //         }

    //         const similarity = this.cosineSimilarity(currentVector, chunk.vector);

    //         // Find longest common subsequence matches
    //         const matches = this.findLCSMatches(currentContent, chunk.content);

    //         // Convert word positions to character positions in original string
    //         const highlightRanges: OneLineRange[] = matches.map(match => {
    //             return {start: match.start, end: match.end};
    //         });

    //         results.push({chunk, similarity, highlightRanges});
    //     }
    // }


    // Sort by similarity and return top 5 chunks as context items
    // return results.sort(
    //     (a, b) => b.similarity - a.similarity
    // ).slice(0, 5).map(r => ({
    //     id: {
    //         providerTitle: `Similarity: ${
    //             r.similarity.toFixed(2)
    //         }`,
    //         itemId: `${
    //             r.chunk.filepath.split(this.pathSep).pop()
    //         }:${
    //             r.chunk.startLine
    //         }-${
    //             r.chunk.endLine
    //         }`
    //     },
    //     filepath: r.chunk.filepath.split(this.pathSep).pop()!,
    //     content: r.chunk.content,
    //     similarity: r.similarity,
    //     highlightRanges: r.highlightRanges,
    //     range: {
    //         startLine: r.chunk.startLine,
    //         endLine: r.chunk.endLine,
    //         startCharacter: 0,
    //         endCharacter: 0
    //     },
    //     name: r.chunk.filepath.split(this.pathSep).pop()!,
    //     description: `Similarity: ${
    //         r.similarity.toFixed(2)
    //     }`
    // }));
}

private cosineSimilarity(a : number[], b : number[]) : number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
}
