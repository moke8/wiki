<template lang="pug">
  .zidan-sidebar
    .zidan-sidebar-home
      v-btn.zidan-sidebar-home-btn(
        text
        block
        @click='goHome'
        :aria-label='$t(`common:header.home`)'
      )
        v-icon(size='18', left) mdi-home
        span {{ $t('common:header.home') }}
    v-divider.mx-3
    .zidan-dir-tree
      v-treeview.zidan-dir-tree-view(
        :items='treeItems'
        :active.sync='activeNodes'
        :open.sync='openNodes'
        :load-children='fetchTreeChildren'
        item-key='id'
        item-text='title'
        dense
        activatable
        hoverable
        open-on-click
        transition
        @click.native='handleTreeClick'
      )
        template(slot='prepend', slot-scope='{ item, open }')
          v-icon.zidan-dir-item-icon(v-if='item.isFolder', size='16') mdi-{{ open ? 'folder-open' : 'folder' }}
          v-icon.zidan-dir-item-icon(v-else, size='16') mdi-file-document-outline
        template(slot='label', slot-scope='{ item }')
          v-tooltip(bottom, open-delay='350', max-width='360')
            template(v-slot:activator='{ on }')
              a.zidan-dir-item-label(
                v-if='item.pageId > 0'
                :href='`/` + item.locale + `/` + item.path'
                :class='{ "is-active": path === item.path }'
                @click='navigateArticle($event, item)'
                v-on='on'
              ) {{ item.title }}
              span.zidan-dir-item-label(v-else, v-on='on') {{ item.title }}
            span.zidan-dir-title-tooltip {{ item.title }}
</template>

<script>
import gql from 'graphql-tag'
import { get } from 'vuex-pathify'

/* global siteLangs */

const treeQuery = gql`
  query ($parent: Int, $locale: String!) {
    pages {
      tree(parent: $parent, mode: ALL, locale: $locale) {
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

export default {
  props: {
    items: {
      type: Array,
      default: () => []
    },
    navMode: {
      type: String,
      default: 'MIXED'
    }
  },
  data() {
    return {
      tree: [
        {
          id: 0,
          title: '/ (root)',
          path: '',
          children: []
        }
      ],
      activeNodes: [],
      openNodes: [],
      loadedCache: []
    }
  },
  computed: {
    pageId: get('page/id'),
    path: get('page/path'),
    locale: get('page/locale'),
    treeItems () {
      return this.tree[0].children || []
    }
  },
  methods: {
    normalizeItems (items) {
      return items.map(item => ({
        ...item,
        children: item.isFolder ? [] : undefined
      }))
    },
    findNodeById (id, nodes = this.tree) {
      for (const node of nodes) {
        if (node.id === id) {
          return node
        }
        if (node.children) {
          const child = this.findNodeById(id, node.children)
          if (child) {
            return child
          }
        }
      }
      return null
    },
    setNodeChildren (node, children) {
      this.$set(node, 'children', this.normalizeItems(children))
    },
    async queryTreeChildren (parentId) {
      const resp = await this.$apollo.query({
        query: treeQuery,
        fetchPolicy: 'cache-first',
        variables: {
          parent: parentId,
          locale: this.locale
        }
      })
      return (((resp || {}).data || {}).pages || {}).tree || []
    },
    async fetchTreeChildren (item) {
      if (!item || !item.isFolder || this.loadedCache.indexOf(item.id) >= 0) {
        return
      }
      this.$store.commit(`loadingStart`, 'browse-load')
      try {
        const children = await this.queryTreeChildren(item.id)
        this.setNodeChildren(item, children)
        this.loadedCache.push(item.id)
      } finally {
        this.$store.commit(`loadingStop`, 'browse-load')
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
    async loadAbsoluteTree () {
      this.$store.commit(`loadingStart`, 'browse-load')
      try {
        this.loadedCache = []
        this.openNodes = []
        this.activeNodes = []

        const rootChildren = await this.queryTreeChildren(0)
        this.setNodeChildren(this.tree[0], rootChildren)
        this.loadedCache.push(0)

        await this.updateActivePage({ expandAncestors: true })
      } finally {
        this.$store.commit(`loadingStop`, 'browse-load')
      }
    },
    async updateActivePage ({ expandAncestors = false } = {}) {
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

      if (expandAncestors) {
        const ancestors = this.buildAncestorChain(contextItems, currentItem)
        for (const ancestor of ancestors) {
          const node = this.findNodeById(ancestor.id)
          if (!node) {
            continue
          }
          const children = await this.queryTreeChildren(ancestor.id)
          this.setNodeChildren(node, children)
          if (this.loadedCache.indexOf(ancestor.id) < 0) {
            this.loadedCache.push(ancestor.id)
          }
          if (this.openNodes.indexOf(ancestor.id) < 0) {
            this.openNodes.push(ancestor.id)
          }
        }
      }

      this.activeNodes = [currentItem.id]
    },
    navigateArticle (event, item) {
      this.$helpers.navigateArticle(`/${item.locale}/${item.path}`, this, event, { source: 'nav-sidebar' })
    },
    handleTreeClick (event) {
      if (event.target.closest('a, button, .v-treeview-node__toggle')) { return }
      const nodeRoot = event.target.closest('.v-treeview-node__root')
      if (!nodeRoot) { return }
      const label = nodeRoot.querySelector('.zidan-dir-item-label[href]')
      if (!label) { return }
      label.click()
    },
    goHome () {
      if (siteLangs.length > 0) {
        this.$helpers.navigateArticle(`/${this.locale}/home`, this, null, { source: 'nav-sidebar-home' })
      } else {
        window.location.assign('/')
      }
    }
  },
  mounted () {
    this.loadAbsoluteTree()
  },
  watch: {
    path () {
      this.updateActivePage()
    },
    pageId () {
      this.updateActivePage()
    },
    locale () {
      this.loadAbsoluteTree()
    }
  }
}
</script>
