/**
 * Text chunking utility for vector search
 *
 * Splits text into overlapping chunks suitable for embedding generation.
 */

/**
 * Split text into chunks with overlap
 *
 * @param {string} text - The text to split
 * @param {number} maxChunkSize - Maximum characters per chunk
 * @param {number} overlapSize - Overlap characters between adjacent chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText (text, maxChunkSize = 500, overlapSize = 50) {
  if (!text || text.trim().length === 0) {
    return []
  }

  const trimmed = text.trim()

  // If text fits in a single chunk, return as-is
  if (trimmed.length <= maxChunkSize) {
    return [trimmed]
  }

  // Step 1: Split by paragraphs
  const paragraphs = trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0)

  // Step 2: Merge short paragraphs / split long paragraphs into chunks
  const chunks = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const para = paragraph.trim()

    if (para.length > maxChunkSize) {
      // Flush current buffer first
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      // Split long paragraph by sentences
      const sentences = splitBySentences(para)
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length + 1 > maxChunkSize) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim())
          }
          // If a single sentence exceeds maxChunkSize, force-split it
          if (sentence.length > maxChunkSize) {
            const forceSplit = forceChunk(sentence, maxChunkSize)
            for (let i = 0; i < forceSplit.length - 1; i++) {
              chunks.push(forceSplit[i])
            }
            currentChunk = forceSplit[forceSplit.length - 1]
          } else {
            currentChunk = sentence
          }
        } else {
          currentChunk = currentChunk.length > 0
            ? currentChunk + ' ' + sentence
            : sentence
        }
      }
    } else if (currentChunk.length + para.length + 2 > maxChunkSize) {
      // Current chunk is full, start a new one
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = para
    } else {
      currentChunk = currentChunk.length > 0
        ? currentChunk + '\n\n' + para
        : para
    }
  }

  // Flush remaining
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  // Step 3: Add overlap between adjacent chunks
  if (overlapSize > 0 && chunks.length > 1) {
    return addOverlap(chunks, overlapSize)
  }

  return chunks
}

/**
 * Split text by sentence boundaries
 */
function splitBySentences (text) {
  // Split on Chinese/English sentence endings
  const parts = text.split(/(?<=[。！？.!?])\s*/)
  return parts.filter(s => s.trim().length > 0)
}

/**
 * Force-split a long string into chunks of maxSize
 */
function forceChunk (text, maxSize) {
  const result = []
  for (let i = 0; i < text.length; i += maxSize) {
    result.push(text.slice(i, i + maxSize))
  }
  return result
}

/**
 * Add overlap between adjacent chunks
 */
function addOverlap (chunks, overlapSize) {
  const result = [chunks[0]]
  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1]
    const overlapText = prevChunk.slice(-overlapSize)
    result.push(overlapText + ' ' + chunks[i])
  }
  return result
}

module.exports = {
  chunkText
}
