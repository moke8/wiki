const express = require('express')
const router = express.Router()
const _ = require('lodash')
const multer = require('multer')
const path = require('path')
const sanitize = require('sanitize-filename')
const fs = require('fs-extra')
const yauzl = require('yauzl')
const { v4: uuid } = require('uuid')


const bulkImportUpload = multer({
  dest: path.resolve(WIKI.ROOTPATH, WIKI.config.dataPath, 'uploads'),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname || !file.originalname.toLowerCase().endsWith('.zip')) {
      return cb(new Error('Only .zip files are supported.'))
    }
    cb(null, true)
  }
})

const readZipEntries = (zipPath) => {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err) { return reject(err) }

      const entries = []
      zipfile.readEntry()
      zipfile.on('entry', entry => {
        const fileName = entry.fileName.replace(/\\/g, '/')
        if (/\/$/.test(fileName)) {
          return reject(new Error('ZIP package cannot contain directories.'))
        }
        if (fileName.includes('/') || path.posix.isAbsolute(fileName) || fileName.split('/').includes('..')) {
          return reject(new Error('ZIP package cannot contain subdirectories or unsafe paths.'))
        }
        if (!fileName.toLowerCase().endsWith('.md') && !fileName.toLowerCase().endsWith('.markdown')) {
          return reject(new Error(`Unsupported file type: ${fileName}`))
        }
        if (entry.uncompressedSize > 5 * 1024 * 1024) {
          return reject(new Error(`Markdown file is too large: ${fileName}`))
        }
        if (entries.length >= 100) {
          return reject(new Error('ZIP package cannot contain more than 100 markdown files.'))
        }

        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr) { return reject(streamErr) }
          const chunks = []
          let size = 0
          stream.on('data', chunk => {
            size += chunk.length
            if (size > 5 * 1024 * 1024) {
              stream.destroy(new Error(`Markdown file is too large: ${fileName}`))
            } else {
              chunks.push(chunk)
            }
          })
          stream.on('error', reject)
          stream.on('end', () => {
            entries.push({
              fileName,
              content: Buffer.concat(chunks).toString('utf8')
            })
            zipfile.readEntry()
          })
        })
      })
      zipfile.on('end', () => resolve(entries))
      zipfile.on('error', reject)
    })
  })
}

const getTitleFromFileName = (fileName) => {
  return path.basename(fileName).replace(/\.(md|markdown)$/i, '').trim() || 'Untitled'
}

const buildImportPath = (targetPath) => {
  return _.compact([targetPath, uuid()]).join('/')
}

const runWithConcurrency = async (items, limit, iterator) => {
  const results = new Array(items.length)
  let cursor = 0
  const workers = _.times(Math.min(limit, items.length), async () => {
    while (cursor < items.length) {
      const idx = cursor++
      results[idx] = await iterator(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return results
}

const finalizeImportedPagesInBackground = pages => {
  if (!pages.length) {
    return
  }
  setImmediate(async () => {
    await runWithConcurrency(pages, 2, async pageInfo => {
      try {
        await WIKI.models.pages.renderPage({ id: pageInfo.id })
        const page = await WIKI.models.pages.getPageFromDb(pageInfo.id)
        if (!page) { return }
        if (WIKI.data.searchEngine && WIKI.data.searchEngine.created) {
          page.safeContent = WIKI.models.pages.cleanHTML(page.render)
          await WIKI.data.searchEngine.created(page)
        }
        await WIKI.models.storage.pageEvent({
          event: 'created',
          page
        })
      } catch (err) {
        WIKI.logger.warn(`Failed to finalize imported page ${pageInfo.path}: ${err.message}`)
      }
    })
  })
}

/**
 * Upload files
 */
router.post('/u', (req, res, next) => {
  multer({
    dest: path.resolve(WIKI.ROOTPATH, WIKI.config.dataPath, 'uploads'),
    limits: {
      fileSize: WIKI.config.uploads.maxFileSize,
      files: WIKI.config.uploads.maxFiles
    }
  }).array('mediaUpload')(req, res, next)
}, async (req, res, next) => {
  if (!_.some(req.user.permissions, pm => _.includes(['write:assets', 'manage:system'], pm))) {
    return res.status(403).json({
      succeeded: false,
      message: 'You are not authorized to upload files.'
    })
  } else if (req.files.length < 1) {
    return res.status(400).json({
      succeeded: false,
      message: 'Missing upload payload.'
    })
  } else if (req.files.length > 1) {
    return res.status(400).json({
      succeeded: false,
      message: 'You cannot upload multiple files within the same request.'
    })
  }
  const fileMeta = _.get(req, 'files[0]', false)
  if (!fileMeta) {
    return res.status(500).json({
      succeeded: false,
      message: 'Missing upload file metadata.'
    })
  }

  // Get folder Id
  let folderId = null
  try {
    const folderRaw = _.get(req, 'body.mediaUpload', false)
    if (folderRaw) {
      folderId = _.get(JSON.parse(folderRaw), 'folderId', null)
      if (folderId === 0) {
        folderId = null
      }
    } else {
      throw new Error('Missing File Metadata')
    }
  } catch (err) {
    return res.status(400).json({
      succeeded: false,
      message: 'Missing upload folder metadata.'
    })
  }

  // Build folder hierarchy
  let hierarchy = []
  if (folderId) {
    try {
      hierarchy = await WIKI.models.assetFolders.getHierarchy(folderId)
    } catch (err) {
      return res.status(400).json({
        succeeded: false,
        message: 'Failed to fetch folder hierarchy.'
      })
    }
  }

  // Sanitize filename
  fileMeta.originalname = sanitize(fileMeta.originalname.toLowerCase().replace(/[\s,;#]+/g, '_'))

  // Check if user can upload at path
  const assetPath = (folderId) ? hierarchy.map(h => h.slug).join('/') + `/${fileMeta.originalname}` : fileMeta.originalname
  if (!WIKI.auth.checkAccess(req.user, ['write:assets'], { path: assetPath })) {
    return res.status(403).json({
      succeeded: false,
      message: 'You are not authorized to upload files to this folder.'
    })
  }

  // Process upload file
  await WIKI.models.assets.upload({
    ...fileMeta,
    mode: 'upload',
    folderId: folderId,
    assetPath,
    user: req.user
  })
  res.send('ok')
})

router.post('/a/pages/import', (req, res, next) => {
  bulkImportUpload.single('pageImport')(req, res, next)
}, async (req, res, next) => {
  const fileMeta = _.get(req, 'file', false)
  const cleanup = async () => {
    if (fileMeta && fileMeta.path) {
      await fs.remove(fileMeta.path).catch(() => {})
    }
  }

  try {
    if (!WIKI.auth.checkAccess(req.user, ['write:pages', 'manage:pages'])) {
      await cleanup()
      return res.status(403).json({
        succeeded: false,
        message: 'You are not authorized to import pages.'
      })
    }

    if (!fileMeta) {
      await cleanup()
      return res.status(400).json({
        succeeded: false,
        message: 'Missing ZIP upload payload.'
      })
    }

    const locale = String(_.get(req, 'body.locale', WIKI.config.lang.code) || WIKI.config.lang.code).trim()
    const targetPath = String(_.get(req, 'body.path', '') || '')
      .trim()
      .replace(/^\/+|\/+$/g, '')
    const folderTitle = String(_.get(req, 'body.folderTitle', '') || '').trim()

    if (targetPath.includes('.') || targetPath.includes(' ') || targetPath.includes('\\') || targetPath.includes('//')) {
      await cleanup()
      return res.status(400).json({
        succeeded: false,
        message: 'Invalid target directory path.'
      })
    }

    if (folderTitle.length > 255) {
      await cleanup()
      return res.status(400).json({
        succeeded: false,
        message: 'Directory alias is too long.'
      })
    }

    if (!WIKI.auth.checkAccess(req.user, ['write:pages'], { locale, path: targetPath || 'home' })) {
      await cleanup()
      return res.status(403).json({
        succeeded: false,
        message: 'You are not authorized to import pages to this directory.'
      })
    }

    const entries = await readZipEntries(fileMeta.path)
    if (entries.length < 1) {
      await cleanup()
      return res.status(400).json({
        succeeded: false,
        message: 'ZIP package does not contain markdown files.'
      })
    }

    if (targetPath && folderTitle) {
      await WIKI.models.pageFolderMeta.upsertMeta({
        locale,
        path: targetPath,
        title: folderTitle
      })
    }

    const importResults = await runWithConcurrency(entries, 4, async entry => {
      const title = getTitleFromFileName(entry.fileName)
      const pagePath = buildImportPath(targetPath)
      try {
        const pageData = WIKI.models.pages.parseMetadata(entry.content, 'markdown')
        const page = await WIKI.models.pages.createPage({
          path: pagePath,
          locale,
          title,
          description: _.get(pageData, 'description', '') || '',
          tags: [],
          isPublished: true,
          isPrivate: false,
          content: pageData.content,
          user: req.user,
          editor: 'markdown',
          skipRender: true,
          skipTree: true,
          skipSearch: true,
          skipStorage: true,
          skipReconnectLinks: true
        })
        return {
          imported: {
            fileName: entry.fileName,
            title,
            path: pagePath,
            id: page.id
          }
        }
      } catch (err) {
        return {
          failed: {
            fileName: entry.fileName,
            title,
            path: pagePath,
            message: err.message
          }
        }
      }
    })
    const imported = importResults.filter(r => r.imported).map(r => r.imported)
    const failed = importResults.filter(r => r.failed).map(r => r.failed)

    if (imported.length > 0) {
      await WIKI.models.pages.rebuildTree()
      finalizeImportedPagesInBackground(imported)
    }

    await cleanup()
    return res.json({
      succeeded: failed.length < 1,
      message: failed.length < 1 ? 'Pages imported successfully.' : 'Some pages failed to import.',
      imported,
      failed
    })
  } catch (err) {
    await cleanup()
    return res.status(400).json({
      succeeded: false,
      message: err.message
    })
  }
})

router.get('/u', async (req, res, next) => {
  res.json({
    ok: true
  })
})

module.exports = router



