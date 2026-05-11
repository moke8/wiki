<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-file.svg', alt='Page', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft Pages
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s Manage pages
          v-spacer
          v-btn.animated.fadeInDown.wait-p1s(icon, color='grey', outlined, @click='refresh')
            v-icon.grey--text mdi-refresh
          //- v-btn.animated.fadeInDown.mx-3(color='primary', outlined, @click='recyclebin', disabled)
          //-   v-icon(left) mdi-delete-outline
          //-   span Recycle Bin
          v-btn.animated.fadeInDown.wait-p1s.ml-3(color='primary', depressed, large, to='/pages/import')
            v-icon(left) mdi-archive-arrow-up-outline
            span Import
          v-btn.animated.fadeInDown.ml-3(color='primary', outlined, large, to='/pages/visualize')
            v-icon(left) mdi-graph
            span Visualize
        v-card.mt-3.animated.fadeInUp
          .pa-2.d-flex.align-center(:class='$vuetify.theme.dark ? `grey darken-3-d5` : `grey lighten-3`')
            v-text-field(
              solo
              flat
              v-model='search'
              prepend-inner-icon='mdi-file-search-outline'
              label='Search Pages...'
              hide-details
              dense
              style='max-width: 400px;'
              )
            v-spacer
            v-select.ml-2(
              solo
              flat
              hide-details
              dense
              label='Locale'
              :items='langs'
              v-model='selectedLang'
              style='max-width: 250px;'
            )
            v-select.ml-2(
              solo
              flat
              hide-details
              dense
              label='Publish State'
              :items='states'
              v-model='selectedState'
              style='max-width: 250px;'
            )
          v-divider
          v-data-table(
            :items='filteredPages'
            :headers='headers'
            :search='search'
            :page.sync='pagination'
            :items-per-page='15'
            :loading='loading'
            must-sort,
            sort-by='updatedAt',
            sort-desc,
            hide-default-footer
            @page-count="pageTotal = $event"
          )
            template(slot='item', slot-scope='props')
              tr.is-clickable(:active='props.selected', @click='$router.push(`/pages/` + props.item.id)')
                td.text-xs-right {{ props.item.id }}
                td
                  .body-2: strong {{ props.item.title }}
                  .caption {{ props.item.description }}
                td.admin-pages-path
                  v-chip(label, small, :color='$vuetify.theme.dark ? `grey darken-4` : `grey lighten-4`') {{ props.item.locale }}
                  span.ml-2.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-2`') / {{ props.item.path }}
                td {{ props.item.createdAt | moment('calendar') }}
                td {{ props.item.updatedAt | moment('calendar') }}
                td.text-center
                  v-tooltip(bottom)
                    template(v-slot:activator='{ on, attrs }')
                      v-icon.is-clickable(
                        v-if='props.item.isVectorized'
                        color='green'
                        small
                        v-bind='attrs'
                        v-on='on'
                        @click.stop='confirmVectorize(props.item)'
                      ) mdi-check-circle
                      v-icon.is-clickable(
                        v-else
                        color='grey lighten-1'
                        small
                        v-bind='attrs'
                        v-on='on'
                        @click.stop='confirmVectorize(props.item)'
                      ) mdi-circle-outline
                    span {{ props.item.isVectorized ? 'Click to re-vectorize' : 'Click to vectorize' }}
            template(slot='no-data')
              v-alert.ma-3(icon='mdi-alert', :value='true', outlined) No pages to display.
          .text-center.py-2.animated.fadeInDown(v-if='this.pageTotal > 1')
            v-pagination(v-model='pagination', :length='pageTotal')
    v-dialog(v-model='vectorizeDialog', max-width='450', persistent)
      v-card
        v-card-title.headline {{ vectorizeTarget && vectorizeTarget.isVectorized ? 'Re-vectorize Page?' : 'Vectorize Page?' }}
        v-card-text
          span Are you sure you want to {{ vectorizeTarget && vectorizeTarget.isVectorized ? 're-vectorize' : 'vectorize' }} page
          strong  "{{ vectorizeTarget ? vectorizeTarget.title : '' }}"
          span ?
        v-card-actions
          v-spacer
          v-btn(text, @click='vectorizeDialog = false', :disabled='vectorizeLoading') Cancel
          v-btn(color='primary', @click='doVectorize', :loading='vectorizeLoading') Confirm
</template>

<script>
import _ from 'lodash'
import pagesQuery from 'gql/admin/pages/pages-query-list.gql'
import vectorizeMutation from 'gql/admin/pages/pages-mutation-vectorize.gql'

export default {
  data() {
    return {
      selectedPage: {},
      pagination: 1,
      pages: [],
      pageTotal: 0,
      headers: [
        { text: 'ID', value: 'id', width: 80, sortable: true },
        { text: 'Title', value: 'title' },
        { text: 'Path', value: 'path' },
        { text: 'Created', value: 'createdAt', width: 250 },
        { text: 'Last Updated', value: 'updatedAt', width: 250 },
        { text: 'Vectorized', value: 'isVectorized', width: 120, align: 'center' }
      ],
      search: '',
      selectedLang: null,
      selectedState: null,
      states: [
        { text: 'All Publishing States', value: null },
        { text: 'Published', value: true },
        { text: 'Not Published', value: false }
      ],
      loading: false,
      vectorizeDialog: false,
      vectorizeTarget: null,
      vectorizeLoading: false
    }
  },
  computed: {
    filteredPages () {
      return _.filter(this.pages, pg => {
        if (this.selectedLang !== null && this.selectedLang !== pg.locale) {
          return false
        }
        if (this.selectedState !== null && this.selectedState !== pg.isPublished) {
          return false
        }
        return true
      })
    },
    langs () {
      return _.concat({
        text: 'All Locales',
        value: null
      }, _.uniqBy(this.pages, 'locale').map(pg => ({
        text: pg.locale,
        value: pg.locale
      })))
    }
  },
  methods: {
    async refresh() {
      await this.$apollo.queries.pages.refetch()
      this.$store.commit('showNotification', {
        message: 'Page list has been refreshed.',
        style: 'success',
        icon: 'cached'
      })
    },
    newpage() {
      this.pageSelectorShown = true
    },
    recyclebin () { },
    confirmVectorize (page) {
      this.vectorizeTarget = page
      this.vectorizeDialog = true
    },
    async doVectorize () {
      this.vectorizeLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: vectorizeMutation,
          variables: { id: this.vectorizeTarget.id }
        })
        const result = resp.data.pages.vectorize.responseResult
        if (result.succeeded) {
          this.$store.commit('showNotification', {
            message: 'Page vectorized successfully.',
            style: 'success',
            icon: 'check'
          })
          await this.$apollo.queries.pages.refetch()
        } else {
          this.$store.commit('showNotification', {
            message: result.message,
            style: 'error',
            icon: 'warning'
          })
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          message: err.message,
          style: 'error',
          icon: 'warning'
        })
      }
      this.vectorizeLoading = false
      this.vectorizeDialog = false
    }
  },
  apollo: {
    pages: {
      query: pagesQuery,
      fetchPolicy: 'network-only',
      update: (data) => data.pages.list,
      watchLoading (isLoading) {
        this.loading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-pages-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.admin-pages-path {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-family: 'Roboto Mono', monospace;
}
</style>
