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
import _ from 'lodash'
import ClipboardJS from 'clipboard'
import Vue from 'vue'

/* global siteLangs */

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
      activeTocAnchor: ''
    }
  },
  computed: {
    isAuthenticated: get('user/authenticated'),
    commentsCount: get('page/commentsCount'),
    commentsPerms: get('page/effectivePermissions@comments'),
    editShortcutsObj: get('page/editShortcuts'),
    breadcrumbs() {
      return [{ path: '/', name: 'Home' }].concat(
        _.reduce(this.path.split('/'), (result, value) => {
          result.push({
            path: _.get(_.last(result), 'path', this.locales.length > 0 ? `/${this.locale}` : '') + `/${value}`,
            name: value
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

<style lang="scss">
.zidan-app {
  font-family: 'Gilroy', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.zidan-app .nav-header {
  overflow: hidden;
  background-color: #FFF !important;
  color: #171c19 !important;
  border-bottom: 1px solid #ECEEF1 !important;

  .v-toolbar,
  .v-toolbar__content,
  .v-toolbar__extension {
    background-color: #FFF !important;
    color: #171c19 !important;
  }

  .nav-header-inner {
    background-color: #FFF !important;
  }

  .v-toolbar__title,
  .v-toolbar__title .subheading,
  .v-btn,
  .v-icon {
    color: #637381 !important;
  }

  .v-toolbar__title .subheading {
    color: #171c19 !important;
  }

  .v-text-field {
    .v-label,
    input,
    .v-input__icon .v-icon {
      color: #637381 !important;
    }

    input::placeholder {
      color: #637381 !important;
      opacity: 1;
    }

    .v-input__slot {
      background-color: #F6F7F9 !important;
      color: #171c19 !important;
    }
  }
}

.zidan-app .v-navigation-drawer__border {
  display: none !important;
}

.zidan-nav-drawer {
  box-shadow: none !important;

  .v-navigation-drawer__content {
    background-color: #FFF;
  }

  @at-root .theme--dark & {
    .v-navigation-drawer__content {
      background-color: #1a1a2e;
    }
  }
}

.zidan-main {
  background-color: #FFF;

  @at-root .theme--dark & {
    background-color: #14141B;
  }
}

.zidan-breadcrumb-bar {
  border-bottom: none !important;

  .breadcrumbs-nav {
    .v-btn {
      min-width: 0;
      &__content {
        text-transform: none;
      }
    }
    .v-breadcrumbs__divider:nth-child(2n) {
      padding: 0 6px;
    }
    .v-breadcrumbs__divider:nth-child(2) {
      padding: 0 6px 0 12px;
    }
  }
}

.zidan-page-header {
  background-color: transparent;
  padding: 0 0 16px 0;
  margin-bottom: 0;
  text-align: left;

  &-content {
    min-height: 48px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex-direction: column;
  }
}

.zidan-page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111111;
  line-height: 1.4;

  @at-root .theme--dark & {
    color: #FFFFFF;
  }
}

.zidan-page-desc {
  font-size: 0.875rem;
  color: #637381;
  margin-top: 4px;

  @at-root .theme--dark & {
    color: #919EAB;
  }
}

// Right sidebar
.zidan-right-sidebar {
  align-self: flex-start;
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  -ms-overflow-style: none;
  padding-left: 24px !important;

  &::-webkit-scrollbar {
    display: none;
  }

  &-inner {
    padding: 16px;
    color: #111111;
    background-color: #FFF;
    border: 1px solid #ECEEF1;
    border-radius: 10px;
    box-shadow: none;

    @at-root .theme--dark & {
      color: #FFFFFF;
      background-color: #181820;
      border-color: #2f2f3a;
    }
  }
}

.zidan-rs-section {
  margin-bottom: 18px;

  &:last-child {
    margin-bottom: 0;
  }
}

.zidan-rs-label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: normal;
  color: #637381;
  margin-bottom: 8px;

  @at-root .theme--dark & {
    color: #919EAB;
  }
}

.zidan-rs-toc {
  &-item {
    margin-bottom: 2px;
  }

  &-link {
    display: block;
    font-size: 0.82rem;
    color: #717572 !important;
    text-decoration: none;
    padding: 4px 6px;
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s;
    line-height: 1.55;
    border-radius: 6px;

    &:hover {
      color: #171c19 !important;
      background-color: #F6F7F9;
      text-decoration: none;
    }

    &.is-active {
      color: #3248F2 !important;
      font-weight: 500;
    }

    &--sub {
      padding-left: 18px;
      font-size: 0.78rem;
      color: #717572 !important;

      &:hover {
        color: #171c19 !important;
      }

      &.is-active {
        color: #3248F2 !important;
      }
    }

    @at-root .theme--dark & {
      color: #919EAB !important;

      &:hover {
        color: #FFFFFF !important;
        background-color: #202027;
      }

      &.is-active {
        color: #7986FF !important;
      }

      &--sub {
        color: #919EAB !important;

        &:hover {
          color: #FFFFFF !important;
        }

        &.is-active {
          color: #7986FF !important;
        }
      }
    }
  }

  &-children {
    margin-top: 0;
  }
}

.zidan-rs-tags {
  display: flex;
  flex-wrap: wrap;

  .v-chip {
    border-color: #ECEEF1 !important;
    border-radius: 6px !important;
    color: #111111 !important;
    background-color: #F6F7F9 !important;

    @at-root .theme--dark & {
      border-color: #2f2f3a !important;
      color: #FFFFFF !important;
      background-color: #202027 !important;
    }
  }
}

.zidan-rs-meta {
  font-size: 0.82rem;
  color: #111111;

  @at-root .theme--dark & {
    color: #FFFFFF;
  }

  &-sub {
    font-size: 0.75rem;
    color: #637381;
    margin-top: 2px;

    @at-root .theme--dark & {
      color: #919EAB;
    }
  }
}

.zidan-rs-actions {
  display: flex;
  gap: 6px;

  .v-btn {
    width: 28px;
    height: 28px;
    color: #637381;
    background-color: #F6F7F9;
    border-radius: 6px;

    &:hover {
      color: #111111;
      background-color: #ECEEF1;
    }

    @at-root .theme--dark & {
      color: #919EAB;
      background-color: #202027;

      &:hover {
        color: #FFFFFF;
        background-color: #2a2a33;
      }
    }
  }
}

.zidan-content-container {
  padding-left: 24px !important;
  padding-right: 24px !important;
  padding-top: 16px !important;

  @media (min-width: 1264px) {
    padding-left: 32px !important;
    padding-right: 32px !important;
  }

  @media (max-width: 600px) {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
}

.zidan-content-col,
.zidan-content-col .contents {
  text-align: left;
}

.page-edit-shortcuts {
  margin-top: 8px;

  .v-btn {
    border: 1px solid #DDD !important;
    border-radius: 4px;
    color: #777;
    background-color: #FFF !important;
    margin-right: 4px;

    @at-root .theme--dark & {
      background-color: #222 !important;
      border-color: #444 !important;
      color: #CCC;
    }

    .v-icon {
      color: #3248F2;
    }
  }
}

.zidan-edit-speed-dial {
  .btn-animate-edit .v-icon {
    color: #FFF !important;
  }
}

// Comments
.comments {
  &-container {
    border: 1px solid #ECEEF1;
    border-radius: 10px;
    margin-top: 2rem;
    overflow: auto;
    background-color: #FFF;

    @at-root .theme--dark & {
      background-color: #181820;
      border-color: #2f2f3a;
    }

    .pt-5.text-center.body-2.blue-grey--text,
    > .comments-main > div > .text-center.body-2.blue-grey--text,
    hr.separator,
    .separator {
      display: none !important;
    }

    #discussion-new,
    .comments-post-editcontent textarea,
    .v-text-field input {
      color: #171c19 !important;
    }

    .v-input__slot {
      background-color: #FFF !important;
      border-color: #ECEEF1 !important;
      box-shadow: none !important;
    }

    .v-text-field--outlined fieldset {
      border-color: #ECEEF1 !important;
    }

    .v-text-field--outlined:hover fieldset,
    .v-input--is-focused fieldset {
      border-color: #0063ff !important;
    }

    .v-label,
    input::placeholder,
    textarea::placeholder,
    .caption,
    .blue-grey--text,
    .grey--text {
      color: #637381 !important;
    }

    .v-icon {
      color: #637381 !important;
    }

    .d-flex.align-center.pt-3 {
      color: #637381;
    }

    .d-flex.align-center.pt-3 .v-btn,
    .comments-post-editcontent .v-btn:last-child {
      background-color: #0063ff !important;
      color: #FFF !important;
      border-radius: 6px;
      box-shadow: none !important;

      .v-icon {
        color: #FFF !important;
      }
    }

    .comments-post-editcontent .v-btn.mr-3 {
      background-color: #FFF !important;
      color: #637381 !important;
      border: 1px solid #ECEEF1 !important;

      .v-icon {
        color: #637381 !important;
      }
    }

    .v-divider {
      border-color: #ECEEF1 !important;
    }

    .v-progress-circular {
      color: #0063ff !important;
    }

    .v-timeline::before {
      background: #ECEEF1 !important;
    }

    .v-timeline-item__dot {
      box-shadow: none !important;
      background-color: #FFF !important;
      border: 1px solid #ECEEF1 !important;
    }

    .v-timeline-item__inner-dot,
    .v-avatar,
    .d-flex.align-center.pt-3 .v-btn,
    .comments-post-editcontent .v-btn:last-child {
      background-color: #0063ff !important;
      color: #FFF !important;
    }

    .d-flex.align-center.pt-3 .v-btn .v-icon,
    .comments-post-editcontent .v-btn:last-child .v-icon,
    .v-avatar .white--text {
      color: #FFF !important;
    }

    .v-timeline-item__inner-dot {
      background-color: #0063ff !important;
    }

    .v-avatar {
      background-color: #0063ff !important;
      color: #FFF !important;
    }

    .comments-post {
      .v-card {
        background-color: #FFF !important;
        border: 1px solid #ECEEF1;
        border-radius: 10px;
        box-shadow: none !important;
      }

      .v-card__text {
        color: #171c19 !important;
      }

      &-name {
        color: #171c19 !important;
        font-size: .86rem !important;
      }

      &-date {
        color: #919EAB !important;
        letter-spacing: normal !important;
        text-transform: none !important;
      }

      &-actions {
        .v-icon {
          color: #637381 !important;

          &:hover {
            color: #0063ff !important;
          }
        }
      }

      &-content {
        color: #171c19;
        font-size: .95rem;
        line-height: 1.75;

        p {
          padding-top: .7rem;
        }

        a {
          color: #0063ff !important;
          text-decoration: none;

          &:hover {
            text-decoration: none;
          }
        }

        code {
          color: #171c19;
          background-color: #F6F7F9;
          border-radius: 4px;
        }

        pre > code {
          color: #FFF;
          background-color: #171c19;
          border-radius: 6px;
        }
      }
    }

    @at-root .theme--dark & {
      #discussion-new,
      .comments-post-editcontent textarea,
      .v-text-field input {
        color: #FFF !important;
      }

      .v-input__slot {
        background-color: #181820 !important;
        border-color: #2f2f3a !important;
      }

      .v-text-field--outlined fieldset,
      .v-divider,
      .v-timeline-item__dot,
      .comments-post .v-card,
      .comments-post-editcontent .v-btn.mr-3 {
        border-color: #2f2f3a !important;
      }

      .v-label,
      input::placeholder,
      textarea::placeholder,
      .caption,
      .blue-grey--text,
      .grey--text,
      .v-icon {
        color: #919EAB !important;
      }

      .v-timeline::before {
        background: #2f2f3a !important;
      }

      .v-timeline-item__dot,
      .comments-post-editcontent .v-btn.mr-3 {
        background-color: #181820 !important;
      }

      .comments-post {
        .v-card {
          background-color: #181820 !important;
        }

        .v-card__text,
        &-name,
        &-content {
          color: #FFF !important;
        }

        &-content code {
          color: #FFF;
          background-color: #202027;
        }
      }
    }
  }

  &-main {
    background-color: transparent;
    border-radius: 10px;
    padding: 20px;
  }
}

.zidan-page-footer {
  display: block;

  @media (min-width: 960px) {
    margin-left: 260px;
  }

  @at-root .v-application--is-rtl & {
    @media (min-width: 960px) {
      margin-left: 0;
      margin-right: 260px;
    }
  }
}

// Print overrides
@media print {
  .nav-header,
  .v-navigation-drawer,
  .v-btn--fab,
  .page-col-sd,
  .v-tooltip__content,
  .zidan-footer {
    display: none !important;
  }

  .layout {
    display: block !important;
  }

  .page-col-content {
    flex-basis: 100% !important;
    flex-grow: 1 !important;
    max-width: 100% !important;
    margin-left: 0 !important;
  }

  .v-main {
    padding: 0 !important;
    font-size: 14px;
    background-color: #FFF;
  }
}
</style>
