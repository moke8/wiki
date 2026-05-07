<template lang="pug">
  v-app.zidan-app(v-scroll='upBtnScroll', :dark='$vuetify.theme.dark', :class='$vuetify.rtl ? `is-rtl` : `is-ltr`')
    nav-header(v-if='!printView')
    v-navigation-drawer.zidan-nav-drawer(
      v-if='navMode !== `NONE` && !printView'
      app
      clipped
      mobile-breakpoint='960'
      :temporary='$vuetify.breakpoint.smAndDown'
      v-model='navShown'
      :right='$vuetify.rtl'
      width='260'
      )
      nav-sidebar(:items='sidebarDecoded', :nav-mode='navMode')

    v-fab-transition(v-if='navMode !== `NONE`')
      v-btn(
        fab
        color='primary'
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        @click='navShown = !navShown'
        v-if='$vuetify.breakpoint.smAndDown'
        v-show='!navShown'
        dark
        )
        v-icon mdi-menu

    v-main.zidan-main(ref='content')
      template(v-if='path !== `home`')
        v-toolbar.zidan-breadcrumb-bar(
          :color='$vuetify.theme.dark ? `grey darken-4-d3` : `white`'
          flat
          dense
          v-if='$vuetify.breakpoint.smAndUp'
          )
          v-breadcrumbs.breadcrumbs-nav.pl-0(
            :items='breadcrumbs'
            divider='/'
            )
            template(slot='item', slot-scope='props')
              v-icon(v-if='props.item.path === "/"', small, @click='goHome') mdi-home
              v-btn.ma-0(v-else, :href='props.item.path', small, text) {{ props.item.name }}
          template(v-if='!isPublished')
            v-spacer
            .caption.red--text {{ $t('common:page.unpublished') }}
            status-indicator.ml-3(negative, pulse)
        v-divider
      //- Main Content Area
      v-container.zidan-content-container(fluid, grid-list-xl)
        v-layout(row)
          //- Page Content (left)
          v-flex.page-col-content.zidan-content-col(
            xs12
            :lg9='tocPosition !== `off`'
            :xl10='tocPosition !== `off`'
            order-xs1
            )
            //- Page Header (inside content col, aligned with content)
            .zidan-page-header
              .zidan-page-header-content
                .zidan-page-title {{ title }}
                .zidan-page-desc(v-if='description') {{ description }}
              .page-edit-shortcuts(v-if='editShortcutsObj.editMenuBar')
                v-btn(
                  v-if='editShortcutsObj.editMenuBtn'
                  @click='pageEdit'
                  depressed
                  small
                  )
                  v-icon.mr-2(small) mdi-pencil
                  span.text-none {{ $t(`common:actions.edit`) }}
                v-btn(
                  v-if='editShortcutsObj.editMenuExternalBtn'
                  :href='editMenuExternalUrl'
                  target='_blank'
                  depressed
                  small
                  )
                  v-icon.mr-2(small) {{ editShortcutsObj.editMenuExternalIcon }}
                  span.text-none {{ $t(`common:page.editExternal`, { name: editShortcutsObj.editMenuExternalName }) }}
            //- Edit FAB
            v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasAnyPagePermissions && editShortcutsObj.editFab')
              template(v-slot:activator='{ on: onEditActivator }')
                v-speed-dial.zidan-edit-speed-dial(
                  v-model='pageEditFab'
                  direction='top'
                  open-on-hover
                  transition='scale-transition'
                  bottom
                  :right='!$vuetify.rtl'
                  :left='$vuetify.rtl'
                  fixed
                  dark
                  )
                  template(v-slot:activator)
                    v-btn.btn-animate-edit(
                      fab
                      color='primary'
                      v-model='pageEditFab'
                      @click='pageEdit'
                      v-on='onEditActivator'
                      :disabled='!hasWritePagesPermission'
                      :aria-label='$t(`common:page.editPage`)'
                      )
                      v-icon(color='white') mdi-pencil
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasReadHistoryPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(fab, small, color='white', light, v-on='on', @click='pageHistory')
                        v-icon(size='20') mdi-history
                    span {{ $t('common:header.history') }}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasReadSourcePermission')
                    template(v-slot:activator='{ on }')
                      v-btn(fab, small, color='white', light, v-on='on', @click='pageSource')
                        v-icon(size='20') mdi-code-tags
                    span {{ $t('common:header.viewSource') }}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasWritePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(fab, small, color='white', light, v-on='on', @click='pageDuplicate')
                        v-icon(size='20') mdi-content-duplicate
                    span {{ $t('common:header.duplicate') }}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasManagePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(fab, small, color='white', light, v-on='on', @click='pageMove')
                        v-icon(size='20') mdi-content-save-move-outline
                    span {{ $t('common:header.move') }}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasDeletePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(fab, dark, small, color='red', v-on='on', @click='pageDelete')
                        v-icon(size='20') mdi-trash-can-outline
                    span {{ $t('common:header.delete') }}
              span {{ $t('common:page.editPage') }}
            v-alert.mb-5(v-if='!isPublished', color='red', outlined, icon='mdi-minus-circle', dense)
              .caption {{ $t('common:page.unpublishedWarning') }}
            .contents(ref='container')
              slot(name='contents')
            .comments-container#discussion(v-if='commentsEnabled && commentsPerms.read && !printView')
              .comments-main
                slot(name='comments')
          //- Right Sidebar (TOC + meta)
          v-flex.page-col-sd.zidan-toc-col.zidan-right-sidebar(
            v-if='tocPosition !== `off` && $vuetify.breakpoint.lgAndUp'
            order-xs1
            lg3
            xl2
            )
            .zidan-right-sidebar-inner
              //- TOC tree
              .zidan-rs-section(v-if='tocDecoded.length')
                .zidan-rs-label {{ $t('common:page.toc') }}
                .zidan-rs-toc
                  .zidan-rs-toc-item(
                    v-for='(tocItem, tocIdx) in tocDecoded'
                    :key='`toc-` + tocIdx'
                    )
                    a.zidan-rs-toc-link(
                      :class='{ "is-active": isTocActive(tocItem.anchor) }'
                      @click.prevent='scrollToToc(tocItem.anchor)'
                      ) {{ tocItem.title }}
                    .zidan-rs-toc-children(v-if='tocItem.children && tocItem.children.length')
                      .zidan-rs-toc-subitem(
                        v-for='(tocSubItem, subIdx) in tocItem.children'
                        :key='`tocsub-` + subIdx'
                        )
                        a.zidan-rs-toc-link.zidan-rs-toc-link--sub(
                          :class='{ "is-active": isTocActive(tocSubItem.anchor) }'
                          @click.prevent='scrollToToc(tocSubItem.anchor)'
                          ) {{ tocSubItem.title }}
              //- Tags
              .zidan-rs-section(v-if='tags.length > 0')
                .zidan-rs-label {{ $t('common:page.tags') }}
                .zidan-rs-tags
                  v-chip.mr-1.mb-1(
                    label
                    x-small
                    outlined
                    color='primary'
                    v-for='(tag, idx) in tags'
                    :href='`/t/` + tag.tag'
                    :key='`tag-` + tag.tag'
                    ) {{ tag.title }}
              //- Last edited
              .zidan-rs-section
                .zidan-rs-label {{ $t('common:page.lastEditedBy') }}
                .zidan-rs-meta {{ authorName }}
                .zidan-rs-meta-sub {{ updatedAt | moment('calendar') }}
              //- Actions
              .zidan-rs-section.zidan-rs-actions
                v-btn(icon, small, @click='print', :aria-label='$t(`common:page.printFormat`)')
                  v-icon.zidan-action-icon(size='18', :class='{ "is-active": printView }') mdi-printer
                v-menu(offset-y, bottom, min-width='300')
                  template(v-slot:activator='{ on }')
                    v-btn(icon, small, v-on='on', :aria-label='$t(`common:page.share`)')
                      v-icon.zidan-action-icon(size='18') mdi-share-variant
                  social-sharing(:url='pageUrl', :title='title', :description='description')
    nav-footer.zidan-page-footer(v-if='!printView')
    notify
    search-results
    ai-chat(
      v-if='!printView'
      :page-id='pageId'
      :locale='locale'
      :path='path'
      color='primary'
      :small='true'
      :bottom-offset='24'
      :side-offset='$vuetify.breakpoint.mdAndUp ? 24 : 65'
    )
    v-fab-transition
      v-btn.zidan-up-btn(
        v-if='upBtnShown'
        fab
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        :depressed='$vuetify.breakpoint.mdAndUp'
        @click='$vuetify.goTo(0, scrollOpts)'
        color='primary'
        dark
        :style='upBtnPosition'
        :aria-label='$t(`common:actions.returnToTop`)'
        )
        v-icon mdi-arrow-up
</template>

<script>
import { StatusIndicator } from 'vue-status-indicator'
import Tabset from '../../default/components/tabset.vue'
import NavSidebar from './nav-sidebar.vue'
import Prism from 'prismjs'
import mermaid from 'mermaid'
import { get, sync } from 'vuex-pathify'
import gql from 'graphql-tag'
import _ from 'lodash'
import ClipboardJS from 'clipboard'
import Vue from 'vue'

/* global siteLangs */

const treeContextQuery = gql`
  query ($path: String, $locale: String!) {
    pages {
      tree(path: $path, mode: ALL, locale: $locale, includeAncestors: true) {
        id
        path
        title
        isFolder
        pageId
        parent
        locale
      }
    }
  }
`

Vue.component('Tabset', Tabset)

Prism.plugins.autoloader.languages_path = '/_assets/js/prism/'
Prism.plugins.NormalizeWhitespace.setDefaults({
  'remove-trailing': true,
  'remove-indent': true,
  'left-trim': true,
  'right-trim': true,
  'remove-initial-line-feed': true,
  'tabs-to-spaces': 2
})
Prism.plugins.toolbar.registerButton('copy-to-clipboard', (env) => {
  let linkCopy = document.createElement('button')
  linkCopy.textContent = 'Copy'
  const clip = new ClipboardJS(linkCopy, {
    text: () => { return env.code }
  })
  clip.on('success', () => {
    linkCopy.textContent = 'Copied!'
    resetClipboardText()
  })
  clip.on('error', () => {
    linkCopy.textContent = 'Press Ctrl+C to copy'
    resetClipboardText()
  })
  return linkCopy
  function resetClipboardText() {
    setTimeout(() => { linkCopy.textContent = 'Copy' }, 5000)
  }
})

export default {
  components: {
    NavSidebar,
    StatusIndicator
  },
  props: {
    pageId: { type: Number, default: 0 },
    locale: { type: String, default: 'en' },
    path: { type: String, default: 'home' },
    title: { type: String, default: 'Untitled Page' },
    description: { type: String, default: '' },
    createdAt: { type: String, default: '' },
    updatedAt: { type: String, default: '' },
    tags: { type: Array, default: () => ([]) },
    authorName: { type: String, default: 'Unknown' },
    authorId: { type: Number, default: 0 },
    editor: { type: String, default: '' },
    isPublished: { type: Boolean, default: false },
    toc: { type: String, default: '' },
    sidebar: { type: String, default: '' },
    navMode: { type: String, default: 'MIXED' },
    commentsEnabled: { type: Boolean, default: false },
    effectivePermissions: { type: String, default: '' },
    commentsExternal: { type: Boolean, default: false },
    editShortcuts: { type: String, default: '' },
    filename: { type: String, default: '' }
  },
  data() {
    return {
      locales: siteLangs,
      navShown: false,
      upBtnShown: false,
      pageEditFab: false,
      scrollOpts: {
        duration: 1500,
        offset: 0,
        easing: 'easeInOutCubic'
      },
      winWidth: 0,
      activeTocAnchor: '',
      breadcrumbItems: []
    }
  },
  computed: {
    isAuthenticated: get('user/authenticated'),
    commentsCount: get('page/commentsCount'),
    commentsPerms: get('page/effectivePermissions@comments'),
    editShortcutsObj: get('page/editShortcuts'),
    breadcrumbs() {
      if (this.breadcrumbItems.length > 0) {
        return this.breadcrumbItems
      }
      const parts = this.path.split('/').filter(value => value)
      return [{ path: '/', name: 'Home' }].concat(
        _.reduce(parts, (result, value, idx) => {
          result.push({
            path: _.get(_.last(result), 'path', this.locales.length > 0 ? `/${this.locale}` : '') + `/${value}`,
            name: idx === parts.length - 1 ? this.title : value
          })
          return result
        }, []))
    },
    pageUrl () { return window.location.href },
    upBtnPosition () {
      if (this.$vuetify.breakpoint.mdAndUp) {
        return this.$vuetify.rtl ? `right: 275px;` : `left: 275px;`
      } else {
        return this.$vuetify.rtl ? `right: 65px;` : `left: 65px;`
      }
    },
    sidebarDecoded () {
      return JSON.parse(Buffer.from(this.sidebar, 'base64').toString())
    },
    tocDecoded () {
      return JSON.parse(Buffer.from(this.toc, 'base64').toString())
    },
    tocPosition: get('site/tocPosition'),
    hasAdminPermission: get('page/effectivePermissions@system.manage'),
    hasWritePagesPermission: get('page/effectivePermissions@pages.write'),
    hasManagePagesPermission: get('page/effectivePermissions@pages.manage'),
    hasDeletePagesPermission: get('page/effectivePermissions@pages.delete'),
    hasReadSourcePermission: get('page/effectivePermissions@source.read'),
    hasReadHistoryPermission: get('page/effectivePermissions@history.read'),
    hasAnyPagePermissions () {
      return this.hasAdminPermission || this.hasWritePagesPermission || this.hasManagePagesPermission ||
        this.hasDeletePagesPermission || this.hasReadSourcePermission || this.hasReadHistoryPermission
    },
    printView: sync('site/printView'),
    editMenuExternalUrl () {
      if (this.editShortcutsObj.editMenuBar && this.editShortcutsObj.editMenuExternalBtn) {
        return this.editShortcutsObj.editMenuExternalUrl.replace('{filename}', this.filename)
      } else {
        return ''
      }
    }
  },
  created() {
    this.$store.set('page/authorId', this.authorId)
    this.$store.set('page/authorName', this.authorName)
    this.$store.set('page/createdAt', this.createdAt)
    this.$store.set('page/description', this.description)
    this.$store.set('page/isPublished', this.isPublished)
    this.$store.set('page/id', this.pageId)
    this.$store.set('page/locale', this.locale)
    this.$store.set('page/path', this.path)
    this.$store.set('page/tags', this.tags)
    this.$store.set('page/title', this.title)
    this.$store.set('page/editor', this.editor)
    this.$store.set('page/updatedAt', this.updatedAt)
    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
    if (this.editShortcuts) {
      this.$store.set('page/editShortcuts', JSON.parse(Buffer.from(this.editShortcuts, 'base64').toString()))
    }
    this.$store.set('page/mode', 'view')
  },
  mounted () {
    this.handleSideNavVisibility()
    this.loadBreadcrumbs()
    window.addEventListener('resize', _.debounce(() => {
      this.handleSideNavVisibility()
    }, 500))
    Prism.highlightAllUnder(this.$refs.container)
    mermaid.mermaidAPI.initialize({
      startOnLoad: true,
      theme: this.$vuetify.theme.dark ? `dark` : `default`
    })
    if (window.location.hash && window.location.hash.length > 1) {
      if (document.readyState === 'complete') {
        this.$nextTick(() => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      } else {
        window.addEventListener('load', () => {
          this.$vuetify.goTo(decodeURIComponent(window.location.hash), this.scrollOpts)
        })
      }
    }
    this.$nextTick(() => {
      this.$refs.container.querySelectorAll(`a[href^="#"], a[href^="${window.location.href.replace(window.location.hash, '')}#"]`).forEach(el => {
        el.onclick = ev => {
          ev.preventDefault()
          ev.stopPropagation()
          this.$vuetify.goTo(decodeURIComponent(ev.currentTarget.hash), this.scrollOpts)
        }
      })
      if (window.location.hash) {
        this.activeTocAnchor = decodeURIComponent(window.location.hash)
      } else if (this.tocDecoded.length) {
        this.activeTocAnchor = this.tocDecoded[0].anchor
      }
      window.boot.notify('page-ready')
    })
  },
  methods: {
    goHome () {
      if (this.locales && this.locales.length > 0) {
        window.location.assign(`/${this.locale}/home`)
      } else {
        window.location.assign('/')
      }
    },
    buildAncestorChain (items, currentItem) {
      const chain = []
      let parentId = currentItem ? currentItem.parent : 0
      while (parentId) {
        const parent = items.find(item => item.id === parentId)
        if (!parent) {
          break
        }
        chain.unshift(parent)
        parentId = parent.parent
      }
      return chain
    },
    async loadBreadcrumbs () {
      try {
        const resp = await this.$apollo.query({
          query: treeContextQuery,
          fetchPolicy: 'cache-first',
          variables: {
            path: this.path,
            locale: this.locale
          }
        })
        const contextItems = (((resp || {}).data || {}).pages || {}).tree || []
        const currentItem = contextItems.find(item => item.pageId === this.pageId) || contextItems.find(item => item.path === this.path)
        if (!currentItem) {
          return
        }
        const items = this.buildAncestorChain(contextItems, currentItem).concat([currentItem])
        this.breadcrumbItems = [{ path: '/', name: 'Home' }].concat(items.map(item => ({
          path: this.locales.length > 0 ? `/${item.locale}/${item.path}` : `/${item.path}`,
          name: item.title
        })))
      } catch (err) {
        this.breadcrumbItems = []
      }
    },
    toggleNavigation () { this.navOpen = !this.navOpen },
    upBtnScroll () {
      const scrollOffset = window.pageYOffset || document.documentElement.scrollTop
      this.upBtnShown = scrollOffset > window.innerHeight * 0.33
    },
    print () {
      if (this.printView) {
        this.printView = false
      } else {
        this.printView = true
        this.$nextTick(() => { window.print() })
      }
    },
    pageEdit () { this.$root.$emit('pageEdit') },
    pageHistory () { this.$root.$emit('pageHistory') },
    pageSource () { this.$root.$emit('pageSource') },
    pageConvert () { this.$root.$emit('pageConvert') },
    pageDuplicate () { this.$root.$emit('pageDuplicate') },
    pageMove () { this.$root.$emit('pageMove') },
    pageDelete () { this.$root.$emit('pageDelete') },
    handleSideNavVisibility () {
      if (window.innerWidth === this.winWidth) { return }
      this.winWidth = window.innerWidth
      if (this.$vuetify.breakpoint.mdAndUp) {
        this.navShown = true
      } else {
        this.navShown = false
      }
    },
    scrollToToc (anchor) {
      this.activeTocAnchor = anchor
      this.$vuetify.goTo(anchor, this.scrollOpts)
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', anchor)
      }
    },
    isTocActive (anchor) {
      return this.activeTocAnchor === anchor
    },
    goToComments (focusNewComment = false) {
      this.$vuetify.goTo('#discussion', this.scrollOpts)
      if (focusNewComment) {
        document.querySelector('#discussion-new').focus()
      }
    }
  }
}
</script>
