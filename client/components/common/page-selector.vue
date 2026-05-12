<template lang="pug">
  v-dialog(
    v-model='isShown'
    max-width='900px'
    overlay-color='blue darken-4'
    overlay-opacity='.7'
    )
    v-card.page-selector
      .dialog-header.is-blue.page-selector-header
        v-icon.mr-3(color='white') mdi-page-next-outline
        .body-1(v-if='mode === `create`') {{$t('common:pageSelector.createTitle')}}
        .body-1(v-else-if='mode === `move`') {{$t('common:pageSelector.moveTitle')}}
        .body-1(v-else-if='mode === `select`') {{$t('common:pageSelector.selectTitle')}}
        v-spacer
        v-progress-circular(
          indeterminate
          color='white'
          :size='20'
          :width='2'
          v-show='searchLoading'
          )
      .page-selector-body.d-flex
        v-flex.page-selector-folders(:class='folderPaneFlex')
          v-toolbar.page-selector-toolbar(dense, flat)
            .body-2 {{$t('common:pageSelector.virtualFolders')}}
            v-spacer
            v-btn(icon, tile, href='https://docs.requarks.io/guide/pages#folders', target='_blank')
              v-icon mdi-help-box
          .page-selector-scroll(:style='foldersOnly ? `height:300px;` : `height:400px;`')
            vue-scroll(:ops='scrollStyle')
              v-treeview.page-selector-tree(
                :key='`pageTree-` + treeViewCacheId'
                :active='currentNode'
                @update:active='handleActiveUpdate'
                :open.sync='openNodes'
                :items='tree'
                :load-children='fetchFolders'
                dense
                expand-icon='mdi-menu-down-outline'
                item-key='id'
                item-text='title'
                activatable
                hoverable
                )
                template(slot='prepend', slot-scope='{ item, open, leaf }')
                  v-icon(size='18') mdi-{{ open ? 'folder-open' : 'folder' }}
          .page-selector-new-folder(v-if='!mustExist && !selectExistingPageOnly')
            v-text-field(
              dense
              outlined
              hide-details
              clearable
              label='文件夹显示名'
              v-model='newFolderTitle'
              @keyup.enter='addVirtualFolder'
              )
            v-text-field(
              dense
              outlined
              hide-details
              clearable
              label='路径名'
              hint='例如 case，真实 URL 会使用该路径名'
              persistent-hint
              v-model='newFolderName'
              @keyup.enter='addVirtualFolder'
              )
            v-btn(
              depressed
              color='#3248F2'
              dark
              :disabled='!compiledNewFolderName || newFolderLoading'
              :loading='newFolderLoading'
              @click='addVirtualFolder'
              ) 新建
        v-flex.page-selector-pages(v-if='!foldersOnly', :class='pagesPaneFlex')
          v-toolbar.page-selector-toolbar(dense, flat)
            .body-2 {{$t('common:pageSelector.pages')}}
          .page-selector-scroll(v-if='currentPages.length > 0', style='height:400px;')
            vue-scroll(:ops='scrollStyle')
              v-list.page-selector-page-list.py-0(dense)
                v-list-item-group(
                  v-model='currentPage'
                  color='primary'
                  )
                  template(v-for='(page, idx) of currentPages')
                    v-list-item(:key='`page-` + page.id', :value='page')
                      v-list-item-icon: v-icon(size='18') mdi-text-box
                      v-list-item-title {{page.title}}
                    v-divider(v-if='idx < currentPages.length - 1')
          v-alert.page-selector-empty.animated.fadeIn(
            v-else
            text
            color='orange'
            prominent
            icon='mdi-alert'
            )
            .body-2 {{$t('common:pageSelector.folderEmptyWarning')}}
      v-card-actions.page-selector-path-actions(v-if='!mustExist')
        v-select.page-selector-locale(
          solo
          flat
          hide-details
          single-line
          :items='namespaces'
          v-model='currentLocale'
          )
        .page-selector-path-inputs
          v-text-field(
            dense
            outlined
            hide-details
            readonly
            label='选择文件夹'
            :value='currentFolderDisplay'
            )
          template(v-if='!foldersOnly')
            v-text-field(
              ref='pathIpt'
              dense
              outlined
              hide-details='auto'
              clearable
              label='文章路径名'
              hint='不支持 /，输入后会自动转换为 -'
              persistent-hint
              v-model='currentSlug'
              )
            .page-selector-final-path
              span 最终路径：
              code /{{compiledPath}}
          template(v-else)
            .page-selector-folder-actions
              v-btn(text, @click='close') {{$t('common:actions.cancel')}}
              v-btn.px-4(color='primary', depressed, @click='open', :disabled='!isValidPath')
                v-icon(left) mdi-check
                span {{$t('common:actions.select')}}
            .page-selector-final-path
              span 目标目录：
              code {{currentFolderDisplay}}
      v-card-chin(v-if='!foldersOnly')
        v-spacer
        v-btn(text, @click='close') {{$t('common:actions.cancel')}}
        v-btn.px-4(color='primary', @click='open', :disabled='!isValidPath')
          v-icon(left) mdi-check
          span {{$t('common:actions.select')}}
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'
import { v4 as uuid } from 'uuid'

import setPageFolderMetaMutation from 'gql/common/common-pages-mutation-folder-meta.gql'

const localeSegmentRegex = /^[A-Z]{2}(-[A-Z]{2})?$/i

/* global siteLangs, siteConfig */

export default {
  props: {
    value: {
      type: Boolean,
      default: false
    },
    path: {
      type: String,
      default: () => uuid()
    },
    locale: {
      type: String,
      default: 'en'
    },
    mode: {
      type: String,
      default: 'create'
    },
    openHandler: {
      type: Function,
      default: () => {}
    },
    mustExist: {
      type: Boolean,
      default: false
    },
    foldersOnly: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      treeViewCacheId: 0,
      searchLoading: false,
      currentLocale: siteConfig.lang,
      currentFolderPath: '',
      currentSlug: '',
      currentPath: '',
      newFolderTitle: '',
      newFolderName: '',
      virtualFolderId: -1,
      currentPage: null,
      currentNode: [0],
      openNodes: [0],
      loadedFolderIds: [],
      loadingFolderIds: [],
      newFolderLoading: false,
      tree: [
        {
          id: 0,
          path: '',
          title: '/ (root)',
          children: []
        }
      ],
      pages: [],
      all: [],
      namespaces: siteLangs.length ? siteLangs.map(ns => ns.code) : [siteConfig.lang],
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
          background: '#999',
          hoverStyle: {
            background: '#64B5F6'
          }
        }
      }
    }
  },
  computed: {
    isShown: {
      get() { return this.value },
      set(val) { this.$emit('input', val) }
    },
    currentPages () {
      return _.sortBy(_.filter(this.pages, ['parent', _.head(this.currentNode) || 0]), ['title', 'path'])
    },
    selectExistingPageOnly () {
      return this.mode === 'select' && !this.foldersOnly
    },
    folderPaneFlex () {
      if (this.foldersOnly) {
        return 'xs12'
      }
      return this.$vuetify.breakpoint.xsOnly ? 'xs12' : 'xs5'
    },
    pagesPaneFlex () {
      return this.$vuetify.breakpoint.xsOnly ? 'xs12' : 'xs7'
    },
    currentSlugCompiled () {
      return this.compilePathSegment(this.currentSlug)
    },
    compiledNewFolderName () {
      return this.compilePathSegment(this.newFolderName)
    },
    compiledPath () {
      return _.compact([this.currentFolderPath, this.currentSlugCompiled]).join('/')
    },
    currentFolderDisplay () {
      return this.currentFolderPath ? `/${this.currentFolderPath}` : '/'
    },
    isValidPath () {
      const targetPath = this.foldersOnly ? (this.currentFolderPath || 'home') : ((this.mustExist || this.selectExistingPageOnly) ? this.currentPath : this.compiledPath)
      if (!targetPath) {
        return false
      }
      if (!this.mustExist && !this.foldersOnly && !this.selectExistingPageOnly && !this.currentSlugCompiled) {
        return false
      }
      if ((this.mustExist || this.selectExistingPageOnly) && !this.currentPage) {
        return false
      }
      const firstSection = _.head(targetPath.split('/'))
      if (this.foldersOnly && targetPath === 'home') {
        return true
      }
      if (!firstSection) {
        return this.foldersOnly
      }
      if (firstSection.length <= 1) {
        return false
      } else if (localeSegmentRegex.test(firstSection)) {
        return false
      } else if (
        _.some(['login', 'logout', 'register', 'verify', 'favicons', 'fonts', 'img', 'js', 'svg'], p => {
          return p === firstSection
        })) {
        return false
      } else {
        return true
      }
    }
  },
  watch: {
    isShown (newValue, oldValue) {
      if (newValue && !oldValue) {
        this.currentLocale = this.locale
        _.delay(() => {
          this.setPathParts(this.path)
          if (this.$refs.pathIpt) {
            this.$refs.pathIpt.focus()
          }
        })
      }
    },
    currentSlug (newValue) {
      const compiled = this.compilePathSegment(newValue)
      if (newValue !== compiled) {
        this.$nextTick(() => {
          this.currentSlug = compiled
        })
      } else {
        this.updateCurrentPath()
      }
    },
    currentNode (newValue, oldValue) {
      if (newValue.length < 1) {
        return
      }
      const current = this.getCurrentFolderById(newValue[0])

      if (!this.mustExist && this.currentPage) {
        this.currentPage = null
      }

      if (current && current.parent !== undefined && this.openNodes.indexOf(current.parent) < 0) {
        this.openNodes = _.uniq([...this.openNodes, current.parent])
      }

      this.currentFolderPath = _.get(current, 'path', '')
      this.updateCurrentPath()
    },
    currentPage (newValue, oldValue) {
      if (!_.isEmpty(newValue)) {
        if (this.mustExist) {
          this.currentPath = newValue.path
        } else {
          this.setPathParts(newValue.path)
        }
      }
    },
    currentLocale (newValue, oldValue) {
      this.$nextTick(() => {
        this.tree = [
          {
            id: 0,
            path: '',
            title: '/ (root)',
            children: []
          }
        ]
        this.currentNode = [0]
        this.openNodes = [0]
        this.currentFolderPath = ''
        this.currentPage = null
        this.pages = []
        this.all = []
        this.loadedFolderIds = []
        this.loadingFolderIds = []
        this.treeViewCacheId += 1
        this.updateCurrentPath()
      })
    }
  },
  methods: {
    handleActiveUpdate (value) {
      if (!value || value.length < 1 || _.isEqual(value, this.currentNode)) {
        return
      }
      this.currentNode = value
    },
    close() {
      this.isShown = false
    },
    open() {
      this.updateCurrentPath()
      const currentFolder = this.getCurrentFolderById(_.head(this.currentNode) || 0)
      const targetPath = this.foldersOnly ? this.currentFolderPath : ((this.mustExist || this.selectExistingPageOnly) ? this.currentPath : this.compiledPath)
      const exit = this.openHandler({
        locale: this.currentLocale,
        path: targetPath,
        id: ((this.mustExist || this.selectExistingPageOnly) && this.currentPage) ? this.currentPage.pageId : 0,
        title: _.get(currentFolder, 'title', '')
      })
      if (exit !== false) {
        this.close()
      }
    },
    compilePathSegment (value) {
      return String(value || '')
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    },
    setPathParts (path) {
      if (this.foldersOnly) {
        const folderPath = _.trim(String(path || ''), '/')
        this.currentFolderPath = folderPath === 'home' ? '' : folderPath
        this.currentSlug = ''
        const folder = _.find(this.all, item => item.isFolder && item.path === this.currentFolderPath)
        if (folder) {
          this.currentNode = [folder.id]
        } else if (!this.currentFolderPath) {
          this.currentNode = [0]
        }
        this.updateCurrentPath()
        return
      }
      const defaultPath = uuid()
      const parts = _.compact(String(path || defaultPath).split('/'))
      const folderPath = _.initial(parts).join('/')
      this.currentFolderPath = folderPath
      this.currentSlug = this.compilePathSegment(_.last(parts) || defaultPath)
      const folder = _.find(this.all, item => item.isFolder && item.path === folderPath)
      if (folder) {
        this.currentNode = [folder.id]
      } else if (!folderPath) {
        this.currentNode = [0]
      }
      this.updateCurrentPath()
    },
    updateCurrentPath () {
      this.currentPath = this.foldersOnly ? this.currentFolderPath : this.compiledPath
    },
    getCurrentFolderById (id) {
      if (id === 0) {
        return this.tree[0]
      }
      return _.find(this.all, ['id', id]) || this.tree[0]
    },
    getTreeFolderById (id, nodes = this.tree) {
      for (const node of nodes) {
        if (node.id === id) {
          return node
        }
        if (node.children) {
          const child = this.getTreeFolderById(id, node.children)
          if (child) {
            return child
          }
        }
      }
      return null
    },
    async addVirtualFolder () {
      const folderSlug = this.compiledNewFolderName
      if (!folderSlug || this.newFolderLoading) { return }
      const folderTitle = _.trim(this.newFolderTitle) || folderSlug

      const currentNodeId = _.head(this.currentNode) || 0
      const parent = this.getCurrentFolderById(currentNodeId)
      const parentTreeNode = this.getTreeFolderById(currentNodeId) || parent
      const parentId = _.get(parent, 'id', 0)
      const parentPath = _.get(parent, 'path', '')
      const folderPath = _.compact([parentPath, folderSlug]).join('/')
      const existingFolder = _.find(this.all, item => item.isFolder && item.path === folderPath)

      if (existingFolder) {
        this.currentNode = [existingFolder.id]
        this.newFolderTitle = ''
        this.newFolderName = ''
        return
      }

      const newFolder = {
        id: this.virtualFolderId,
        path: folderPath,
        title: folderTitle,
        isFolder: true,
        pageId: 0,
        parent: parentId,
        virtual: true,
        children: []
      }
      this.virtualFolderId -= 1
      this.newFolderLoading = true
      try {
        await this.saveFolderMeta(folderPath, folderTitle)

        if (!parentTreeNode.children) {
          this.$set(parentTreeNode, 'children', [])
        }
        parentTreeNode.children = _.sortBy(_.unionBy(parentTreeNode.children, [newFolder], 'id'), ['title', 'path'])
        this.all = _.unionBy(this.all, [newFolder], 'id')
        this.loadedFolderIds.push(newFolder.id)
        if (this.openNodes.indexOf(parentId) < 0) {
          this.openNodes = _.uniq([...this.openNodes, parentId])
        }
        this.currentNode = [newFolder.id]
        this.treeViewCacheId += 1
        this.newFolderTitle = ''
        this.newFolderName = ''
      } finally {
        this.newFolderLoading = false
      }
    },
    async saveFolderMeta (path, title) {
      if (!path || !title) { return }
      try {
        await this.$apollo.mutate({
          mutation: setPageFolderMetaMutation,
          variables: {
            locale: this.currentLocale,
            path,
            title
          }
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
        throw err
      }
    },
    async fetchFolders (item) {
      if (!item) {
        return
      }
      const skipReason = item.virtual ? 'virtual' : (this.loadedFolderIds.indexOf(item.id) >= 0 ? 'loaded' : (this.loadingFolderIds.indexOf(item.id) >= 0 ? 'loading' : ''))
      if (skipReason) {
        return
      }
      this.loadingFolderIds.push(item.id)
      this.searchLoading = true
      try {
        const resp = await this.$apollo.query({
          query: gql`
            query ($parent: Int!, $mode: PageTreeMode!, $locale: String!) {
              pages {
                tree(parent: $parent, mode: $mode, locale: $locale) {
                  id
                  path
                  title
                  isFolder
                  pageId
                  parent
                }
              }
            }
          `,
          fetchPolicy: 'network-only',
          variables: {
            parent: item.id,
            mode: 'ALL',
            locale: this.currentLocale
          }
        })
        const items = _.get(resp, 'data.pages.tree', [])
        const virtualFolders = _.filter(_.get(item, 'children', []), 'virtual')
        const itemFolders = _.unionBy(_.filter(items, ['isFolder', true]).map(f => ({...f, children: []})), virtualFolders, 'path')
        const itemPages = _.filter(items, i => i.pageId > 0)
        if (itemFolders.length > 0) {
          item.children = itemFolders
        } else {
          item.children = undefined
        }
        this.pages = _.unionBy(this.pages, itemPages, 'id')
        this.all = _.unionBy(this.all, items, virtualFolders, 'id')
        this.loadedFolderIds.push(item.id)
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      } finally {
        this.loadingFolderIds = this.loadingFolderIds.filter(id => id !== item.id)
        this.searchLoading = this.loadingFolderIds.length > 0
      }
    }
  }
}
</script>

<style lang='scss'>

.page-selector {
  overflow: hidden;
  background-color: #FFF !important;
  border-radius: 10px !important;
  color: #171c19;

  .page-selector-header {
    background-color: #3248F2 !important;
    box-shadow: none !important;
  }

  .page-selector-body {
    border-bottom: 1px solid #ECEEF1;
  }

  .page-selector-folders,
  .page-selector-pages {
    background-color: #FFF;
  }

  .page-selector-folders {
    border-right: 1px solid #ECEEF1;
  }

  .page-selector-toolbar {
    background-color: #FFF !important;
    border-bottom: 1px solid #ECEEF1 !important;
    color: #171c19 !important;

    .v-icon {
      color: #637381 !important;
    }
  }

  .page-selector-scroll {
    background-color: #FFF;
  }

  .page-selector-tree {
    padding: 8px;
  }

  .v-treeview-node__label {
    color: #171c19;
    font-size: 13px;
  }

  .v-treeview-node__content {
    cursor: pointer;
    border-radius: 6px;

    &:hover {
      background-color: #F6F7F9;
    }
  }

  .v-treeview-node--active .v-treeview-node__content {
    background-color: #F6F7F9;

    .v-treeview-node__label,
    .v-icon {
      color: #3248F2 !important;
      font-weight: 500;
    }
  }

  .page-selector-new-folder {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) minmax(160px, 1fr) auto;
    gap: 8px;
    padding: 12px;
    border-top: 1px solid #ECEEF1;
    background-color: #FFF;

    .v-btn {
      min-width: 64px;
      height: 40px;
      box-shadow: none !important;
    }
  }

  .page-selector-page-list {
    .v-list-item {
      min-height: 40px;
      color: #171c19;

      &:hover {
        background-color: #F6F7F9;
      }
    }

    .v-list-item--active {
      background-color: #F6F7F9;

      .v-list-item__title,
      .v-icon {
        color: #3248F2 !important;
      }
    }
  }

  .page-selector-empty {
    margin: 16px;
    border: 1px solid #ECEEF1;
    border-radius: 8px;
  }

  .page-selector-path-actions {
    align-items: flex-start;
    gap: 12px;
    padding: 10px 14px !important;
    background-color: #F6F7F9 !important;
    border-bottom: 1px solid #ECEEF1;
  }

  .page-selector-locale {
    flex: 0 0 104px;

    .v-input__slot {
      background-color: #FFF !important;
      border: 1px solid #ECEEF1;
      box-shadow: none !important;
    }
  }

  .page-selector-path-inputs {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(180px, .9fr) minmax(220px, 1.1fr);
    gap: 8px 12px;

    .v-input__slot {
      background-color: #FFF !important;
      box-shadow: none !important;
    }

    fieldset {
      border-color: #ECEEF1 !important;
    }

    .v-input--is-focused fieldset {
      border-color: #3248F2 !important;
    }
  }

  .page-selector-final-path {
    grid-column: 1 / -1;
    color: #637381;
    font-size: 12px;

    code {
      padding: 2px 6px;
      color: #171c19;
      background-color: #FFF;
      border: 1px solid #ECEEF1;
      border-radius: 4px;
      box-shadow: none;
    }
  }

  .page-selector-folder-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    .v-btn {
      height: 40px;
    }
  }

  .v-card__actions,
  .v-card-chin {
    background-color: #FFF;
  }

  @at-root .theme--dark & {
    background-color: #181820 !important;
    color: #FFF;

    .page-selector-body,
    .page-selector-folders,
    .page-selector-toolbar,
    .page-selector-new-folder,
    .page-selector-path-actions,
    .page-selector-empty {
      border-color: #2f2f3a !important;
    }

    .page-selector-folders,
    .page-selector-pages,
    .page-selector-toolbar,
    .page-selector-scroll,
    .page-selector-new-folder,
    .v-card__actions,
    .v-card-chin {
      background-color: #181820 !important;
      color: #FFF !important;
    }

    .page-selector-path-actions {
      background-color: #202027 !important;
    }

    .v-treeview-node__label,
    .page-selector-page-list .v-list-item,
    .page-selector-final-path code {
      color: #FFF;
    }

    .v-treeview-node__content:hover,
    .v-treeview-node--active .v-treeview-node__content,
    .page-selector-page-list .v-list-item:hover,
    .page-selector-page-list .v-list-item--active {
      background-color: #202027;
    }

    .page-selector-locale .v-input__slot,
    .page-selector-path-inputs .v-input__slot,
    .page-selector-final-path code {
      background-color: #181820 !important;
      border-color: #2f2f3a;
    }

    .page-selector-path-inputs fieldset {
      border-color: #2f2f3a !important;
    }
  }
}

@media (max-width: 720px) {
  .page-selector {
    .page-selector-body {
      display: block !important;
    }

    .page-selector-folders {
      border-right: none;
      border-bottom: 1px solid #ECEEF1;
    }

    .page-selector-path-actions {
      display: block;
    }

    .page-selector-locale {
      margin-bottom: 10px;
    }

    .page-selector-path-inputs {
      grid-template-columns: 1fr;
    }
  }
}

</style>
