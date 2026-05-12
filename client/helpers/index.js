import filesize from 'filesize.js'
import _ from 'lodash'

/* global siteConfig */

const helpers = {
  /**
   * Convert bytes to humanized form
   * @param {number} rawSize Size in bytes
   * @returns {string} Humanized file size
   */
  filesize (rawSize) {
    return _.toUpper(filesize(rawSize))
  },
  /**
   * Convert raw path to safe path
   * @param {string} rawPath Raw path
   * @returns {string} Safe path
   */
  makeSafePath (rawPath) {
    let rawParts = _.split(_.trim(rawPath), '/')
    rawParts = _.map(rawParts, (r) => {
      return _.kebabCase(_.deburr(_.trim(r)))
    })

    return _.join(_.filter(rawParts, (r) => { return !_.isEmpty(r) }), '/')
  },
  resolvePath (path) {
    if (_.startsWith(path, '/')) { path = path.substring(1) }
    return `${siteConfig.path}${path}`
  },
  getArticleTarget (rawUrl) {
    if (!rawUrl || typeof window === 'undefined') {
      return { ok: false, reason: 'invalid' }
    }

    let url
    try {
      url = new URL(rawUrl, window.location.origin)
    } catch (err) {
      return { ok: false, reason: 'invalid' }
    }

    if (url.origin !== window.location.origin) {
      return { ok: false, reason: 'external' }
    }

    const pathName = _.trimEnd(url.pathname, '/') || '/'
    if (pathName === window.location.pathname && url.hash) {
      return { ok: false, reason: 'hash-only' }
    }

    const blocked = ['/a', '/e/', '/h/', '/s/', '/d/', '/t', '/p', '/i/', '/login', '/logout', '/register', '/verify', '/_assets', '/_userav', '/graphql']
    if (_.some(blocked, prefix => pathName === prefix || _.startsWith(pathName, prefix))) {
      return { ok: false, reason: 'special-route' }
    }

    if (/\.[^/.]+$/.test(pathName)) {
      return { ok: false, reason: 'asset' }
    }

    const parts = _.compact(pathName.split('/'))
    if (parts.length < 1) {
      return { ok: false, reason: 'root' }
    }

    const localeCodes = _.map(window.siteLangs || [], 'code')
    let locale = _.get(siteConfig, 'lang')
    let articlePath = parts.join('/')
    if (localeCodes.length > 0) {
      if (localeCodes.indexOf(parts[0]) < 0) {
        return { ok: false, reason: 'missing-locale' }
      }
      locale = parts[0]
      articlePath = parts.slice(1).join('/') || 'home'
    }

    return {
      ok: true,
      url,
      locale,
      path: articlePath,
      href: `${pathName}${url.search}${url.hash}`,
      apiPath: `/_page/${localeCodes.length > 0 ? `${locale}/` : ''}${articlePath}${url.search}`,
      hash: url.hash
    }
  },
  canNavigateArticle (rawUrl, vm, event) {
    if (event) {
      const link = event.currentTarget
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) {
        return { ok: false, reason: 'modified-click' }
      }
      if (link && link.getAttribute) {
        const target = link.getAttribute('target')
        if (target && target !== '_self') {
          return { ok: false, reason: 'target' }
        }
        if (link.hasAttribute('download')) {
          return { ok: false, reason: 'download' }
        }
      }
    }

    if (vm && vm.$store && vm.$store.get('page/mode') !== 'view') {
      return { ok: false, reason: 'not-view-mode' }
    }

    return this.getArticleTarget(rawUrl)
  },
  navigateArticle (rawUrl, vm, event, opts = {}) {
    const target = this.canNavigateArticle(rawUrl, vm, event)
    if (!target.ok) {
      if (!event && opts.fallback !== false) {
        window.location.assign(rawUrl)
      }
      return false
    }

    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    window.dispatchEvent(new CustomEvent('wiki:navigate-article', {
      detail: {
        locale: target.locale,
        path: target.path,
        href: target.href,
        apiPath: target.apiPath,
        hash: target.hash,
        replace: opts.replace === true,
        source: opts.source || ''
      }
    }))
    return true
  },
  /**
   * Set Input Selection
   * @param {DOMElement} input The input element
   * @param {number} startPos The starting position
   * @param {nunber} endPos The ending position
   */
  setInputSelection (input, startPos, endPos) {
    input.focus()
    if (typeof input.selectionStart !== 'undefined') {
      input.selectionStart = startPos
      input.selectionEnd = endPos
    } else if (document.selection && document.selection.createRange) {
      // IE branch
      input.select()
      var range = document.selection.createRange()
      range.collapse(true)
      range.moveEnd('character', endPos)
      range.moveStart('character', startPos)
      range.select()
    }
  }
}

export default {
  install(Vue) {
    Vue.$helpers = helpers
    Object.defineProperties(Vue.prototype, {
      $helpers: {
        get() {
          return helpers
        }
      }
    })
  }
}
