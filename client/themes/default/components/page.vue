<template lang="pug">
  v-app(v-scroll='upBtnScroll', :dark='$vuetify.theme.dark', :class='$vuetify.rtl ? `is-rtl` : `is-ltr`')
    nav-header(v-if='!printView')
    v-navigation-drawer(
      v-if='currentPage.navMode !== `NONE` && !printView'
      :class='$vuetify.theme.dark ? `grey darken-4-d4` : `primary`'
      dark
      app
      clipped
      mobile-breakpoint='600'
      :temporary='$vuetify.breakpoint.smAndDown'
      v-model='navShown'
      :right='$vuetify.rtl'
      )
      vue-scroll(:ops='scrollStyle')
        nav-sidebar(:color='$vuetify.theme.dark ? `grey darken-4-d4` : `primary`', :items='sidebarDecoded', :nav-mode='currentPage.navMode')

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
        v-if='$vuetify.breakpoint.mdAndDown'
        v-show='!navShown'
        )
        v-icon mdi-menu

    v-main(ref='content')
      template(v-if='currentPath !== `home`')
        v-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-3`', flat, dense, v-if='$vuetify.breakpoint.smAndUp')
          //- v-btn.pl-0(v-if='$vuetify.breakpoint.xsOnly', flat, @click='toggleNavigation')
          //-   v-icon(color='grey darken-2', left) menu
          //-   span Navigation
          v-breadcrumbs.breadcrumbs-nav.pl-0(
            :items='breadcrumbs'
            divider='/'
            )
            template(slot='item', slot-scope='props')
              v-icon(v-if='props.item.path === "/"', small) mdi-home
              span.breadcrumbs-nav-item(v-else) {{props.item.name}}
          template(v-if='!currentIsPublished')
            v-spacer
            .caption.red--text {{$t('common:page.unpublished')}}
            status-indicator.ml-3(negative, pulse)
        v-divider
      v-container.grey.pa-0(fluid, :class='$vuetify.theme.dark ? `darken-4-l3` : `lighten-4`')
        v-row.page-header-section(no-gutters, align-content='center', style='height: 90px;')
          v-col.page-col-content.is-page-header(
            :offset-xl='tocPosition === `left` ? 2 : 0'
            :offset-lg='tocPosition === `left` ? 3 : 0'
            :xl='tocPosition === `right` ? 10 : false'
            :lg='tocPosition === `right` ? 9 : false'
            style='margin-top: auto; margin-bottom: auto;'
            :class='$vuetify.rtl ? `pr-4` : `pl-4`'
            )
            .page-header-headings
              .headline.grey--text(:class='$vuetify.theme.dark ? `text--lighten-2` : `text--darken-3`') {{currentTitle}}
              .caption.grey--text.text--darken-1 {{currentDescription}}
            .page-edit-shortcuts(
              v-if='editShortcutsObj.editMenuBar'
              :class='tocPosition === `right` ? `is-right` : ``'
              )
              v-btn(
                v-if='editShortcutsObj.editMenuBtn'
                @click='pageEdit'
                depressed
                small
                )
                v-icon.mr-2(small) mdi-pencil
                span.text-none {{$t(`common:actions.edit`)}}
              v-btn(
                v-if='editShortcutsObj.editMenuExternalBtn'
                :href='editMenuExternalUrl'
                target='_blank'
                depressed
                small
                )
                v-icon.mr-2(small) {{ editShortcutsObj.editMenuExternalIcon }}
                span.text-none {{$t(`common:page.editExternal`, { name: editShortcutsObj.editMenuExternalName })}}
      v-divider
      v-container.pl-5.pt-4(fluid, grid-list-xl)
        v-layout(row)
          v-flex.page-col-sd(
            v-if='tocPosition !== `off` && $vuetify.breakpoint.lgAndUp'
            :order-xs1='tocPosition !== `right`'
            :order-xs2='tocPosition === `right`'
            lg3
            xl2
            )
            v-card.page-toc-card.mb-5(v-if='tocDecoded.length')
              .overline.pa-5.pb-0(:class='$vuetify.theme.dark ? `blue--text text--lighten-2` : `primary--text`') {{$t('common:page.toc')}}
              v-list.pb-3(dense, nav, :class='$vuetify.theme.dark ? `darken-3-d3` : ``')
                template(v-for='(tocItem, tocIdx) in tocDecoded')
                  v-list-item(@click='scrollToToc(tocItem.anchor)', :class='{ "v-list-item--active": isTocActive(tocItem.anchor) }')
                    v-icon(color='grey', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                    v-list-item-title.px-3 {{tocItem.title}}
                  //- v-divider(v-if='tocIdx < toc.length - 1 || tocItem.children.length')
                  template(v-for='tocSubItem in tocItem.children')
                    v-list-item(@click='scrollToToc(tocSubItem.anchor)', :class='{ "v-list-item--active": isTocActive(tocSubItem.anchor) }')
                      v-icon.px-3(color='grey lighten-1', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                      v-list-item-title.px-3.caption.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-1`') {{tocSubItem.title}}
                    //- v-divider(inset, v-if='tocIdx < toc.length - 1')

            v-card.page-tags-card.mb-5(v-if='currentTags.length > 0')
              .pa-5
                .overline.teal--text.pb-2(:class='$vuetify.theme.dark ? `text--lighten-3` : ``') {{$t('common:page.tags')}}
                v-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  v-for='(tag, idx) in currentTags'
                  :href='`/t/` + tag.tag'
                  :key='`tag-` + tag.tag'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', left, small) mdi-tag
                  span(:class='$vuetify.theme.dark ? `teal--text text--lighten-5` : `teal--text text--darken-2`') {{tag.title}}
                v-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  :href='`/t/` + currentTags.map(t => t.tag).join(`/`)'
                  :aria-label='$t(`common:page.tagsMatching`)'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', size='20') mdi-tag-multiple

            v-card.page-comments-card.mb-5(v-if='currentCommentsEnabled && commentsPerms.read')
              .pa-5
                .overline.pb-2.blue-grey--text.d-flex.align-center(:class='$vuetify.theme.dark ? `text--lighten-3` : `text--darken-2`')
                  span {{$t('common:comments.sdTitle')}}
                  //- v-spacer
                  //- v-chip.text-center(
                  //-   v-if='!commentsExternal'
                  //-   label
                  //-   x-small
                  //-   :color='$vuetify.theme.dark ? `blue-grey darken-3` : `blue-grey darken-2`'
                  //-   dark
                  //-   style='min-width: 50px; justify-content: center;'
                  //-   )
                  //-   span {{commentsCount}}
                .d-flex
                  v-btn.text-none(
                    @click='goToComments()'
                    :color='$vuetify.theme.dark ? `blue-grey` : `blue-grey darken-2`'
                    outlined
                    style='flex: 1 1 100%;'
                    small
                    )
                    span.blue-grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`') {{$t('common:comments.viewDiscussion')}}
                  v-tooltip(right, v-if='commentsPerms.write')
                    template(v-slot:activator='{ on }')
                      v-btn.ml-2(
                        @click='goToComments(true)'
                        v-on='on'
                        outlined
                        small
                        :color='$vuetify.theme.dark ? `blue-grey` : `blue-grey darken-2`'
                        :aria-label='$t(`common:comments.newComment`)'
                        )
                        v-icon(:color='$vuetify.theme.dark ? `blue-grey lighten-1` : `blue-grey darken-2`', dense) mdi-comment-plus
                    span {{$t('common:comments.newComment')}}

            v-card.page-author-card.mb-5
              .pa-5
                .overline.indigo--text.d-flex(:class='$vuetify.theme.dark ? `text--lighten-3` : ``')
                  span {{$t('common:page.lastEditedBy')}}
                  v-spacer
                  v-tooltip(right, v-if='isAuthenticated')
                    template(v-slot:activator='{ on }')
                      v-btn.btn-animate-edit(
                        icon
                        :href='"/h/" + currentLocale + "/" + currentPath'
                        v-on='on'
                        x-small
                        v-if='hasReadHistoryPermission'
                        :aria-label='$t(`common:header.history`)'
                        )
                        v-icon(color='indigo', dense) mdi-history
                    span {{$t('common:header.history')}}
                .page-author-card-name.body-2.grey--text(:class='$vuetify.theme.dark ? `` : `text--darken-3`') {{ currentAuthorName }}
                .page-author-card-date.caption.grey--text.text--darken-1 {{ currentUpdatedAt | moment('calendar') }}

            //- v-card.mb-5
            //-   .pa-5
            //-     .overline.pb-2.yellow--text(:class='$vuetify.theme.dark ? `text--darken-3` : `text--darken-4`') Rating
            //-     .text-center
            //-       v-rating(
            //-         v-model='rating'
            //-         color='yellow darken-3'
            //-         background-color='grey lighten-1'
            //-         half-increments
            //-         hover
            //-       )
            //-       .caption.grey--text 5 votes

            v-card.page-shortcuts-card(flat)
              v-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-3`', flat, dense)
                v-spacer
                //- v-tooltip(bottom)
                //-   template(v-slot:activator='{ on }')
                //-     v-btn(icon, tile, v-on='on', :aria-label='$t(`common:page.bookmark`)'): v-icon(color='grey') mdi-bookmark
                //-   span {{$t('common:page.bookmark')}}
                v-menu(offset-y, bottom, min-width='300')
                  template(v-slot:activator='{ on: menu }')
                    v-tooltip(bottom)
                      template(v-slot:activator='{ on: tooltip }')
                        v-btn(icon, tile, v-on='{ ...menu, ...tooltip }', :aria-label='$t(`common:page.share`)'): v-icon(color='grey') mdi-share-variant
                      span {{$t('common:page.share')}}
                  social-sharing(
                    :url='pageUrl'
                    :title='currentTitle'
                    :description='currentDescription'
                  )
                v-tooltip(bottom)
                  template(v-slot:activator='{ on }')
                    v-btn(icon, tile, v-on='on', @click='print', :aria-label='$t(`common:page.printFormat`)')
                      v-icon(:color='printView ? `primary` : `grey`') mdi-printer
                  span {{$t('common:page.printFormat')}}
                v-spacer

          v-flex.page-col-content(
            xs12
            :lg9='tocPosition !== `off`'
            :xl10='tocPosition !== `off`'
            :order-xs1='tocPosition === `right`'
            :order-xs2='tocPosition !== `right`'
            )
            v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasAnyPagePermissions && editShortcutsObj.editFab')
              template(v-slot:activator='{ on: onEditActivator }')
                v-speed-dial(
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
                      v-icon mdi-pencil
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasReadHistoryPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageHistory'
                        )
                        v-icon(size='20') mdi-history
                    span {{$t('common:header.history')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasReadSourcePermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageSource'
                        )
                        v-icon(size='20') mdi-code-tags
                    span {{$t('common:header.viewSource')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasWritePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageConvert'
                        )
                        v-icon(size='20') mdi-lightning-bolt
                    span {{$t('common:header.convert')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasWritePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageDuplicate'
                        )
                        v-icon(size='20') mdi-content-duplicate
                    span {{$t('common:header.duplicate')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasManagePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageMove'
                        )
                        v-icon(size='20') mdi-content-save-move-outline
                    span {{$t('common:header.move')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasDeletePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        dark
                        small
                        color='red'
                        v-on='on'
                        @click='pageDelete'
                        )
                        v-icon(size='20') mdi-trash-can-outline
                    span {{$t('common:header.delete')}}
              span {{$t('common:page.editPage')}}
            v-alert.mb-5(v-if='!currentIsPublished', color='red', outlined, icon='mdi-minus-circle', dense)
              .caption {{$t('common:page.unpublishedWarning')}}
            .contents(v-if='hasDynamicContent', ref='container', v-html='pageHtml')
            .contents(v-else, ref='container')
              slot(name='contents')
            .comments-container#discussion(v-if='currentCommentsEnabled && commentsPerms.read && !printView')
              .comments-header
                v-icon.mr-2(dark) mdi-comment-text-outline
                span {{$t('common:comments.title')}}
              .comments-main(v-if='hasDynamicContent', v-html='pageCommentsHtml')
              .comments-main(v-else)
                slot(name='comments')
    nav-footer
    notify
    search-results
    ai-chat(
      v-if='!printView'
      :key='`ai-chat-` + currentId'
      :page-id='currentId'
      :locale='currentLocale'
      :path='currentPath'
      color='primary'
      :small='true'
      button-class='btn-animate-edit'
      :bottom-offset='24'
      :side-offset='$vuetify.breakpoint.mdAndUp ? 82 : 65'
    )
    v-fab-transition
      v-btn(
        v-if='upBtnShown'
        fab
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        :depressed='this.$vuetify.breakpoint.mdAndUp'
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
import Tabset from './tabset.vue'
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
    setTimeout(() => {
      linkCopy.textContent = 'Copy'
    }, 5000)
  }
})

export default {
  components: {
    NavSidebar,
    StatusIndicator
  },
  props: {
    pageId: {
      type: Number,
      default: 0
    },
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: 'home'
    },
    title: {
      type: String,
      default: 'Untitled Page'
    },
    description: {
      type: String,
      default: ''
    },
    createdAt: {
      type: String,
      default: ''
    },
    updatedAt: {
      type: String,
      default: ''
    },
    tags: {
      type: Array,
      default: () => ([])
    },
    authorName: {
      type: String,
      default: 'Unknown'
    },
    authorId: {
      type: Number,
      default: 0
    },
    editor: {
      type: String,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    toc: {
      type: String,
      default: ''
    },
    sidebar: {
      type: String,
      default: ''
    },
    navMode: {
      type: String,
      default: 'MIXED'
    },
    commentsEnabled: {
      type: Boolean,
      default: false
    },
    effectivePermissions: {
      type: String,
      default: ''
    },
    commentsExternal: {
      type: Boolean,
      default: false
    },
    editShortcuts: {
      type: String,
      default: ''
    },
    filename: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      locales: siteLangs,
      navShown: false,
      navExpanded: false,
      upBtnShown: false,
      pageEditFab: false,
      scrollOpts: {
        duration: 1500,
        offset: 0,
        easing: 'easeInOutCubic'
      },
      scrollStyle: {
        vuescroll: {},
        scrollPanel: {
          initialScrollX: 0.01, // fix scrollbar not disappearing on load
          scrollingX: false,
          speed: 50
        },
        rail: {
          gutterOfEnds: '2px'
        },
        bar: {
          onlyShowBarOnScroll: false,
          background: '#42A5F5',
          hoverStyle: {
            background: '#64B5F6'
          }
        }
      },
      winWidth: 0,
      activeTocAnchor: '',
      breadcrumbItems: [],
      currentPage: this.getInitialPageData(),
      pageHtml: '',
      pageCommentsHtml: '',
      hasDynamicContent: false,
      resizeHandler: null,
      articleNavigateHandler: null,
      popstateHandler: null
    }
  },
  computed: {
    isAuthenticated: get('user/authenticated'),
    commentsCount: get('page/commentsCount'),
    commentsPerms: get('page/effectivePermissions@comments'),
    editShortcutsObj: get('page/editShortcuts'),
    rating: {
      get () {
        return 3.5
      },
      set (val) {

      }
    },
    breadcrumbs() {
      if (this.breadcrumbItems.length > 0) {
        return this.breadcrumbItems
      }
      const parts = this.currentPath.split('/').filter(value => value)
      return [{ path: '/', name: 'Home' }].concat(
        _.reduce(parts, (result, value, idx) => {
          result.push({
            path: _.get(_.last(result), 'path', this.locales.length > 0 ? `/${this.currentLocale}` : '') + `/${value}`,
            name: idx === parts.length - 1 ? this.currentTitle : value
          })
          return result
        }, []))
    },
    pageUrl () { return window.location.href },
    upBtnPosition () {
      if (this.$vuetify.breakpoint.mdAndUp) {
        return this.$vuetify.rtl ? `right: 235px;` : `left: 235px;`
      } else {
        return this.$vuetify.rtl ? `right: 65px;` : `left: 65px;`
      }
    },
    currentId () { return this.currentPage.pageId },
    currentLocale () { return this.currentPage.locale },
    currentPath () { return this.currentPage.path },
    currentTitle () { return this.currentPage.title },
    currentDescription () { return this.currentPage.description },
    currentTags () { return this.currentPage.tags || [] },
    currentAuthorName () { return this.currentPage.authorName },
    currentUpdatedAt () { return this.currentPage.updatedAt },
    currentIsPublished () { return this.currentPage.isPublished },
    currentCommentsEnabled () { return this.currentPage.commentsEnabled },
    currentFilename () { return this.currentPage.filename },
    sidebarDecoded () {
      return this.decodeBase64Json(this.currentPage.sidebar, [])
    },
    tocDecoded () {
      return this.decodeBase64Json(this.currentPage.toc, [])
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
        return this.editShortcutsObj.editMenuExternalUrl.replace('{filename}', this.currentFilename)
      } else {
        return ''
      }
    }
  },
  created() {
    this.syncPageStore(this.currentPage)
  },
  mounted () {
    if (this.$vuetify.theme.dark) {
      this.scrollStyle.bar.background = '#424242'
    }

    // -> Check side navigation visibility
    this.handleSideNavVisibility()
    this.loadBreadcrumbs()
    this.resizeHandler = _.debounce(() => {
      this.handleSideNavVisibility()
    }, 500)
    window.addEventListener('resize', this.resizeHandler)
    this.articleNavigateHandler = ev => this.navigateArticle(ev.detail)
    this.popstateHandler = () => this.navigateArticleFromLocation(true)
    window.addEventListener('wiki:navigate-article', this.articleNavigateHandler)
    window.addEventListener('popstate', this.popstateHandler)

    this.afterPageContentUpdated()
  },
  beforeDestroy () {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
    }
    if (this.articleNavigateHandler) {
      window.removeEventListener('wiki:navigate-article', this.articleNavigateHandler)
    }
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler)
    }
  },
  methods: {
    getInitialPageData () {
      return {
        pageId: this.pageId,
        locale: this.locale,
        path: this.path,
        title: this.title,
        description: this.description,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        tags: this.tags,
        authorName: this.authorName,
        authorId: this.authorId,
        editor: this.editor,
        isPublished: this.isPublished,
        toc: this.toc,
        sidebar: this.sidebar,
        navMode: this.navMode,
        commentsEnabled: this.commentsEnabled,
        commentsExternal: this.commentsExternal,
        effectivePermissions: this.effectivePermissions,
        editShortcuts: this.editShortcuts,
        filename: this.filename
      }
    },
    decodeBase64Json (value, fallback) {
      if (!value) { return fallback }
      try {
        return JSON.parse(Buffer.from(value, 'base64').toString())
      } catch (err) {
        return fallback
      }
    },
    syncPageStore (page) {
      this.$store.set('page/authorId', page.authorId)
      this.$store.set('page/authorName', page.authorName)
      this.$store.set('page/createdAt', page.createdAt)
      this.$store.set('page/description', page.description)
      this.$store.set('page/isPublished', page.isPublished)
      this.$store.set('page/id', page.pageId)
      this.$store.set('page/locale', page.locale)
      this.$store.set('page/path', page.path)
      this.$store.set('page/tags', page.tags || [])
      this.$store.set('page/title', page.title)
      this.$store.set('page/editor', page.editor)
      this.$store.set('page/updatedAt', page.updatedAt)
      this.$store.set('page/effectivePermissions', this.decodeBase64Json(page.effectivePermissions, {}))
      this.$store.set('page/editShortcuts', this.decodeBase64Json(page.editShortcuts, {}))
      this.$store.set('page/mode', 'view')
    },
    updatePageMeta (payload) {
      const title = _.get(payload, 'meta.title', this.currentTitle)
      const description = _.get(payload, 'meta.description', this.currentDescription) || ''
      document.title = `${title} | ${this.$store.get('site/title')}`
      const updateMeta = (selector, attr, value) => {
        const el = document.querySelector(selector)
        if (el) { el.setAttribute(attr, value) }
      }
      updateMeta('meta[name="description"]', 'content', description)
      updateMeta('meta[property="og:title"]', 'content', title)
      updateMeta('meta[property="og:description"]', 'content', description)
      updateMeta('meta[property="og:url"]', 'content', window.location.href)
    },
    applyPagePayload (payload) {
      const page = payload.page || {}
      this.currentPage = {
        pageId: page.id,
        locale: page.localeCode,
        path: page.path,
        title: page.title,
        description: page.description,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        tags: page.tags || [],
        authorName: page.authorName,
        authorId: page.authorId,
        editor: page.editorKey,
        isPublished: page.isPublished,
        toc: _.get(payload, 'encoded.toc', ''),
        sidebar: _.get(payload, 'encoded.sidebar', ''),
        navMode: _.get(payload, 'config.navMode', this.currentPage.navMode),
        commentsEnabled: _.get(payload, 'config.commentsEnabled', false),
        commentsExternal: _.get(payload, 'comments.codeTemplate', false),
        effectivePermissions: _.get(payload, 'encoded.effectivePermissions', ''),
        editShortcuts: _.get(payload, 'encoded.editShortcuts', ''),
        filename: payload.pageFilename
      }
      this.pageHtml = page.render || ''
      this.pageCommentsHtml = _.get(payload, 'comments.main', '')
      this.hasDynamicContent = true
      this.breadcrumbItems = []
      this.syncPageStore(this.currentPage)
      this.updatePageMeta(payload)
      this.loadBreadcrumbs()
      this.$nextTick(() => this.afterPageContentUpdated())
    },
    async navigateArticle (detail = {}) {
      if (!detail.apiPath) { return }
      this.$store.commit('loadingStart', 'article-spa')
      try {
        const resp = await fetch(detail.apiPath, { credentials: 'same-origin' })
        const payload = await resp.json()
        if (payload.kind === 'redirect' && payload.location) {
          window.location.assign(payload.location)
          return
        }
        if (!resp.ok || payload.kind !== 'page') {
          window.location.assign(detail.href || `/${detail.locale}/${detail.path}`)
          return
        }
        if (window.history) {
          window.history[detail.replace ? 'replaceState' : 'pushState']({ wikiArticle: true }, '', detail.href)
        }
        this.applyPagePayload(payload)
        this.$nextTick(() => {
          if (detail.hash) {
            this.$vuetify.goTo(decodeURIComponent(detail.hash), this.scrollOpts)
          } else {
            this.$vuetify.goTo(0, { duration: 300 })
          }
        })
      } catch (err) {
        window.location.assign(detail.href || `/${detail.locale}/${detail.path}`)
      } finally {
        this.$store.commit('loadingStop', 'article-spa')
      }
    },
    navigateArticleFromLocation (replace = false) {
      const target = this.$helpers.getArticleTarget(window.location.href)
      if (target.ok) {
        this.navigateArticle({ ...target, replace })
      }
    },
    afterPageContentUpdated () {
      this.$nextTick(() => {
        if (!this.$refs.container) { return }
        Prism.highlightAllUnder(this.$refs.container)
        mermaid.mermaidAPI.initialize({
          startOnLoad: true,
          theme: this.$vuetify.theme.dark ? `dark` : `default`
        })
        this.bindContentLinks()
        if (window.location.hash) {
          this.activeTocAnchor = decodeURIComponent(window.location.hash)
        } else if (this.tocDecoded.length) {
          this.activeTocAnchor = this.tocDecoded[0].anchor
        } else {
          this.activeTocAnchor = ''
        }
        this.updateActiveTocAnchor()
        window.boot.notify('page-ready')
      })
    },
    bindContentLinks () {
      this.$refs.container.querySelectorAll('a[href]').forEach(el => {
        el.onclick = ev => {
          const href = el.getAttribute('href')
          const target = this.$helpers.getArticleTarget(href)
          if (href && (_.startsWith(href, '#') || target.reason === 'hash-only')) {
            ev.preventDefault()
            ev.stopPropagation()
            this.$vuetify.goTo(decodeURIComponent(el.hash), this.scrollOpts)
          } else {
            this.$helpers.navigateArticle(el.href || href, this, ev, { source: 'content' })
          }
        }
      })
    },
    goHome () {
      if (this.locales && this.locales.length > 0) {
        this.$helpers.navigateArticle(`/${this.currentLocale}/home`, this, null, { source: 'page-home' })
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
            path: this.currentPath,
            locale: this.currentLocale
          }
        })
        const contextItems = (((resp || {}).data || {}).pages || {}).tree || []
        const currentItem = contextItems.find(item => item.pageId === this.currentId) || contextItems.find(item => item.path === this.currentPath)
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
    toggleNavigation () {
      this.navOpen = !this.navOpen
    },
    upBtnScroll () {
      const scrollOffset = window.pageYOffset || document.documentElement.scrollTop
      this.upBtnShown = scrollOffset > window.innerHeight * 0.33
      this.updateActiveTocAnchor(scrollOffset)
    },
    print () {
      if (this.printView) {
        this.printView = false
      } else {
        this.printView = true
        this.$nextTick(() => {
          window.print()
        })
      }
    },
    pageEdit () {
      this.$root.$emit('pageEdit')
    },
    pageHistory () {
      this.$root.$emit('pageHistory')
    },
    pageSource () {
      this.$root.$emit('pageSource')
    },
    pageConvert () {
      this.$root.$emit('pageConvert')
    },
    pageDuplicate () {
      this.$root.$emit('pageDuplicate')
    },
    pageMove () {
      this.$root.$emit('pageMove')
    },
    pageDelete () {
      this.$root.$emit('pageDelete')
    },
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
    getFlatTocItems () {
      return _.flatMap(this.tocDecoded, item => [item].concat(item.children || []))
    },
    updateActiveTocAnchor (scrollOffset = window.pageYOffset || document.documentElement.scrollTop) {
      const tocItems = this.getFlatTocItems()
      if (!tocItems.length) {
        return
      }
      const activationOffset = scrollOffset + 96
      let activeAnchor = tocItems[0].anchor
      tocItems.forEach(item => {
        const el = document.querySelector(item.anchor)
        if (el && el.offsetTop <= activationOffset) {
          activeAnchor = item.anchor
        }
      })
      this.activeTocAnchor = activeAnchor
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

.page-col-sd {
  margin-top: -90px;
  align-self: flex-start;
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  -ms-overflow-style: none;
}

.page-col-sd::-webkit-scrollbar {
  display: none;
}

.page-header-section {
  position: relative;

  > .is-page-header {
    position: relative;
  }

  .page-header-headings {
    min-height: 52px;
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .page-edit-shortcuts {
    position: absolute;
    bottom: -33px;
    right: 10px;

    .v-btn {
      border-right: 1px solid #DDD !important;
      border-bottom: 1px solid #DDD !important;
      border-radius: 0;
      color: #777;
      background-color: #FFF !important;

      @at-root .theme--dark & {
        background-color: #222 !important;
        border-right-color: #444 !important;
        border-bottom-color: #444 !important;
        color: #CCC;
      }

      .v-icon {
        color: mc('blue', '700');
      }

      &:first-child {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
      }

      &:last-child {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
      }
    }
  }
}

</style>
