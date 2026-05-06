/* ZIDAN THEME */

/* global siteConfig */

const zidanDefaultFavicon = '/favicon.ico'

const resolveZidanFavicon = () => {
  const logoUrl = siteConfig && typeof siteConfig.logoUrl === 'string' ? siteConfig.logoUrl.trim() : ''
  return logoUrl || zidanDefaultFavicon
}

const removeExistingFavicons = () => {
  document.head.querySelectorAll([
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
    'link[rel="mask-icon"]'
  ].join(',')).forEach(link => link.parentNode.removeChild(link))
}

const appendFaviconLink = attrs => {
  const link = document.createElement('link')

  Object.keys(attrs).forEach(key => {
    link.setAttribute(key, attrs[key])
  })

  document.head.appendChild(link)
}

const appendFaviconWithCacheBust = (rel, href, attrs = {}) => {
  const separator = href.includes('?') ? '&' : '?'
  const cacheBustedHref = `${href}${separator}zidan-favicon=${Date.now()}`

  appendFaviconLink({
    rel,
    href: cacheBustedHref,
    'data-zidan-favicon': 'true',
    ...attrs
  })
}

const applyZidanFavicon = () => {
  const favicon = resolveZidanFavicon()

  removeExistingFavicons()
  appendFaviconWithCacheBust('icon', favicon)
  appendFaviconWithCacheBust('shortcut icon', favicon)
  appendFaviconWithCacheBust('apple-touch-icon', favicon)
}

const scheduleZidanFavicon = () => {
  applyZidanFavicon()
  window.setTimeout(applyZidanFavicon, 250)
  window.setTimeout(applyZidanFavicon, 1000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleZidanFavicon)
} else {
  scheduleZidanFavicon()
}
