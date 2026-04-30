/**
 * Embedding client for vector search
 *
 * Calls OpenAI-compatible embedding API to generate vectors from text.
 */

const { OpenAI } = require('openai')

let _client = null

/**
 * Get or create the OpenAI client singleton
 */
function getClient (config) {
  if (!_client) {
    _client = new OpenAI({
      baseURL: config.embeddingBaseUrl,
      apiKey: config.embeddingApiKey
    })
  }
  return _client
}

/**
 * Reset client (e.g. when config changes)
 */
function resetClient () {
  _client = null
}

/**
 * Generate embeddings for an array of text chunks
 *
 * @param {string[]} texts - Array of text strings to embed
 * @param {Object} config - Engine config from definition.yml props
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateEmbeddings (texts, config) {
  if (!texts || texts.length === 0) {
    return []
  }

  const client = getClient(config)
  const batchSize = parseInt(config.embeddingBatchSize, 10) || 10
  const allEmbeddings = []

  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const response = await client.embeddings.create({
      model: config.embeddingModel,
      input: batch,
      dimensions: parseInt(config.embeddingDimensions, 10) || 1024
    })

    // Sort by index to ensure correct order
    const sorted = response.data.sort((a, b) => a.index - b.index)
    for (const item of sorted) {
      allEmbeddings.push(item.embedding)
    }
  }

  return allEmbeddings
}

/**
 * Generate embedding for a single text
 *
 * @param {string} text - Text to embed
 * @param {Object} config - Engine config
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding (text, config) {
  const results = await generateEmbeddings([text], config)
  return results[0]
}

module.exports = {
  generateEmbeddings,
  generateEmbedding,
  resetClient
}
