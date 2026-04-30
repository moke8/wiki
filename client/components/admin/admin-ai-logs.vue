<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-chat-bubble.svg', alt='AI Chat Logs', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft AI Chat Logs
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s View AI question / answer conversations
          v-spacer
          v-btn.animated.fadeInDown.wait-p2s(icon, outlined, color='grey', @click='refresh')
            v-icon mdi-refresh

      v-flex(xs12)
        v-card.animated.fadeInUp
          v-toolbar(color='primary', dense, flat, dark)
            .subtitle-1 Conversations
            v-spacer
            .caption {{ total }} total
          v-data-table(
            :headers='headers'
            :items='logs'
            :loading='$apollo.queries.logs.loading'
            :items-per-page='pagination.rowsPerPage'
            :page.sync='pagination.page'
            :server-items-length='total'
            item-key='id'
            class='elevation-0'
            @update:page='refresh'
            @update:items-per-page='refresh'
          )
            template(v-slot:item.createdAt='{ item }')
              span {{ item.createdAt | moment('YYYY-MM-DD HH:mm:ss') }}
            template(v-slot:item.userName='{ item }')
              div
                .body-2 {{ item.userName || 'Guest' }}
                .caption.grey--text {{ item.userEmail || item.ip || '' }}
            template(v-slot:item.question='{ item }')
              .ai-log-cell {{ item.question }}
            template(v-slot:item.answer='{ item }')
              .ai-log-cell {{ item.answer || item.error }}
            template(v-slot:item.status='{ item }')
              v-chip(x-small, dark, :color='item.status === `success` ? `success` : `red`') {{ item.status }}
            template(v-slot:item.sources='{ item }')
              v-btn(text, small, color='primary', :disabled='!parseSources(item).length', @click='openSources(item)') {{ parseSources(item).length }} sources

    v-dialog(v-model='sourcesDialog', max-width='720')
      v-card
        v-toolbar(color='primary', dense, flat, dark)
          .subtitle-1 Sources
          v-spacer
          v-btn(icon, dark, @click='sourcesDialog = false')
            v-icon mdi-close
        v-list(two-line)
          v-list-item(v-for='(source, idx) in selectedSources', :key='idx', :href='source.locale && source.path ? `/${source.locale}/${source.path}` : null', target='_blank')
            v-list-item-content
              v-list-item-title {{ source.title || source.path }}
              v-list-item-subtitle /{{ source.locale }}/{{ source.path }} · chunk {{ source.chunkIndex }} · score {{ formatScore(source.score) }}
</template>

<script>
import _ from 'lodash'

import logsQuery from 'gql/admin/ai/ai-query-logs.gql'

export default {
  data() {
    return {
      logs: [],
      total: 0,
      pagination: {
        page: 1,
        rowsPerPage: 25
      },
      sourcesDialog: false,
      selectedSources: [],
      headers: [
        { text: 'Time', value: 'createdAt', width: 170 },
        { text: 'User', value: 'userName', width: 180 },
        { text: 'Question', value: 'question' },
        { text: 'Answer', value: 'answer' },
        { text: 'Status', value: 'status', width: 90 },
        { text: 'Duration', value: 'duration', width: 100 },
        { text: 'Sources', value: 'sources', width: 120, sortable: false }
      ]
    }
  },
  methods: {
    async refresh() {
      await this.$apollo.queries.logs.refetch()
    },
    parseSources(item) {
      try {
        return item.sources ? JSON.parse(item.sources) : []
      } catch (err) {
        return []
      }
    },
    openSources(item) {
      this.selectedSources = this.parseSources(item)
      this.sourcesDialog = true
    },
    formatScore(score) {
      return _.isNumber(score) ? score.toFixed(3) : score
    }
  },
  apollo: {
    logs: {
      query: logsQuery,
      fetchPolicy: 'network-only',
      variables() {
        return {
          limit: this.pagination.rowsPerPage,
          offset: (this.pagination.page - 1) * this.pagination.rowsPerPage
        }
      },
      update(data) {
        this.total = _.get(data, 'ai.logs.total', 0)
        return _.get(data, 'ai.logs.items', [])
      },
      watchLoading(isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-ai-logs-refresh')
      }
    }
  }
}
</script>

<style lang='scss' scoped>
.ai-log-cell {
  max-width: 420px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
