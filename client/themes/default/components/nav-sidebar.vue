<template lang="pug">
  div
    .pa-3.d-flex(:class='$vuetify.theme.dark ? `grey darken-5` : `blue darken-3`')
      v-btn(
        depressed
        :color='$vuetify.theme.dark ? `grey darken-4` : `blue darken-2`'
        style='min-width:0;'
        @click='goHome'
        :aria-label='$t(`common:header.home`)'
        )
        v-icon(size='20') mdi-home
    v-divider
    v-treeview.py-2.nav-sidebar-tree(
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
      :class='color'
      :dark='dark'
    )
      template(slot='prepend', slot-scope='{ item, open }')
        v-icon(v-if='item.isFolder', size='20') mdi-{{ open ? 'folder-open' : 'folder' }}
        v-icon(v-else, size='20') mdi-text-box
      template(slot='label', slot-scope='{ item }')
        v-tooltip(bottom, open-delay='350', max-width='360')
          template(v-slot:activator='{ on }')
            a.nav-sidebar-tree-label(
              v-if='item.pageId > 0'
              :href='`/` + item.locale + `/` + item.path'
              :class='{ "is-active": path === item.path }'
              v-on='on'
            ) {{ item.title }}
            span.nav-sidebar-tree-label(v-else, v-on='on') {{ item.title }}
          span.nav-sidebar-title-tooltip {{ item.title }}
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
    color: {
      type: String,
      default: 'primary'
    },
    dark: {
      type: Boolean,
      default: true
    },
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

        const ancestors = this.buildAncestorChain(contextItems, currentItem)
        for (const ancestor of ancestors) {
          const node = this.findNodeById(ancestor.id)
          if (!node) {
            continue
          }
          const children = await this.queryTreeChildren(ancestor.id)
          this.setNodeChildren(node, children)
          this.loadedCache.push(ancestor.id)
          this.openNodes.push(ancestor.id)
        }

        this.activeNodes = [currentItem.id]
      } finally {
        this.$store.commit(`loadingStop`, 'browse-load')
      }
    },
    goHome () {
      window.location.assign(siteLangs.length > 0 ? `/${this.locale}/home` : '/')
    }
  },
  mounted () {
    this.loadAbsoluteTree()
  },
  watch: {
    path () {
      this.loadAbsoluteTree()
    },
    locale () {
      this.loadAbsoluteTree()
    }
  }
}
</script>

<style lang="scss">
.nav-sidebar-tree {
  .v-treeview-node__root {
    min-height: 40px;
  }

  .v-treeview-node__label {
    align-self: stretch;
    display: flex;
    align-items: stretch;
    flex: 1 1 auto;
    min-width: 0;
  }
}

.nav-sidebar-tree-label {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  color: inherit !important;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    text-decoration: none;
  }

  &.is-active {
    font-weight: 500;
  }
}

.nav-sidebar-title-tooltip {
  display: block;
  font-size: 0.72rem;
  line-height: 1.35;
}
</style>
