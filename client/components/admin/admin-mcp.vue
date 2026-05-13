<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          v-icon.animated.fadeInUp(size='80', color='primary') mdi-robot-outline
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft MCP API Keys
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s Manage MCP keys for agent access to published wiki pages
          v-spacer
          v-btn.mr-3.animated.fadeInDown.wait-p2s(icon, outlined, color='grey', @click='refresh')
            v-icon mdi-refresh
          v-btn.animated.fadeInDown(color='primary', depressed, large, dark, @click='openCreate')
            v-icon(left) mdi-plus
            span New MCP Key

      v-flex(xs12)
        v-card.animated.fadeInUp
          v-simple-table(v-if='keys && keys.length > 0')
            template(v-slot:default)
              thead
                tr.grey(:class='$vuetify.theme.dark ? `darken-4-d5` : `lighten-5`')
                  th Name
                  th Key Prefix
                  th IP Restriction
                  th Last Used
                  th Created
                  th Status
                  th(width='100') Revoke
              tbody
                tr(v-for='key of keys', :key='`mcp-key-` + key.id')
                  td
                    strong(:class='key.isRevoked ? `red--text` : ``') {{ key.name }}
                  td.caption {{ key.keyPrefix }}
                  td
                    span(v-if='key.ipAllowlist && key.ipAllowlist.length') {{ key.ipAllowlist.join(', ') }}
                    em.grey--text(v-else) No restriction
                  td
                    span(v-if='key.lastUsedAt') {{ key.lastUsedAt | moment('calendar') }}
                    em.grey--text(v-else) Never
                  td {{ key.createdAt | moment('calendar') }}
                  td
                    v-chip(x-small, dark, :color='key.isRevoked ? `red` : `success`') {{ key.isRevoked ? 'Revoked' : 'Active' }}
                  td: v-btn(icon, @click='revoke(key)', :disabled='key.isRevoked'): v-icon(color='error') mdi-cancel
          v-card-text(v-else)
            v-alert.mb-0(icon='mdi-information', :value='true', outlined, color='info') No MCP API keys have been created yet.

    v-dialog(v-model='createDialog', max-width='560', persistent)
      v-card
        .dialog-header New MCP API Key
        v-card-text.pa-4
          v-text-field(v-model='form.name', label='Name', outlined, dense, persistent-hint, hint='A human-readable name for this key')
          v-textarea.mt-3(v-model='form.ipAllowlist', label='IP Restriction', outlined, dense, auto-grow, rows='3', persistent-hint, hint='Optional. Leave empty for no restriction. Use one IP per line or comma-separated values.')
        v-card-actions
          v-spacer
          v-btn(text, @click='createDialog = false', :disabled='createLoading') Cancel
          v-btn(color='primary', dark, @click='createKey', :loading='createLoading', :disabled='!form.name') Create

    v-dialog(v-model='createdKeyDialog', max-width='720', persistent)
      v-card
        .dialog-header.is-green MCP API Key Created
        v-card-text.pa-4
          v-alert(type='warning', outlined) Copy this key now. It will only be shown once.
          v-textarea(:value='createdKey', readonly, outlined, auto-grow, rows='3')
        v-card-actions
          v-spacer
          v-btn(color='primary', dark, @click='closeCreatedKeyDialog') Done

    v-dialog(v-model='revokeDialog', max-width='500', persistent)
      v-card
        .dialog-header.is-red Revoke MCP API Key
        v-card-text.pa-4
          span Revoke MCP API key
          strong {{ current.name }}
          span ? This cannot be undone.
        v-card-actions
          v-spacer
          v-btn(text, @click='revokeDialog = false', :disabled='revokeLoading') Cancel
          v-btn(color='red', dark, @click='revokeConfirm', :loading='revokeLoading') Revoke
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'

export default {
  data() {
    return {
      keys: [],
      createDialog: false,
      createLoading: false,
      createdKeyDialog: false,
      createdKey: '',
      revokeDialog: false,
      revokeLoading: false,
      current: {},
      form: {
        name: '',
        ipAllowlist: ''
      }
    }
  },
  methods: {
    async refresh(notify = true) {
      await this.$apollo.queries.keys.refetch()
      if (notify) {
        this.$store.commit('showNotification', {
          message: 'MCP API keys refreshed.',
          style: 'success',
          icon: 'cached'
        })
      }
    },
    openCreate() {
      this.form = {
        name: '',
        ipAllowlist: ''
      }
      this.createDialog = true
    },
    parseIpAllowlist() {
      if (!this.form.ipAllowlist) {
        return []
      }
      return _.uniq(this.form.ipAllowlist.split(/[\n,]/).map(ip => _.trim(ip)).filter(Boolean))
    },
    async createKey() {
      this.createLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($name: String!, $ipAllowlist: [String]) {
              mcp {
                createApiKey(name: $name, ipAllowlist: $ipAllowlist) {
                  key
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                }
              }
            }
          `,
          variables: {
            name: this.form.name,
            ipAllowlist: this.parseIpAllowlist()
          },
          watchLoading: isLoading => {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-mcp-create')
          }
        })
        if (_.get(resp, 'data.mcp.createApiKey.responseResult.succeeded', false)) {
          this.createdKey = _.get(resp, 'data.mcp.createApiKey.key', '')
          this.createDialog = false
          this.createdKeyDialog = true
          await this.refresh(false)
        } else {
          this.$store.commit('showNotification', {
            style: 'red',
            message: _.get(resp, 'data.mcp.createApiKey.responseResult.message', 'An unexpected error occurred.'),
            icon: 'alert'
          })
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.createLoading = false
    },
    closeCreatedKeyDialog() {
      this.createdKey = ''
      this.createdKeyDialog = false
    },
    revoke(key) {
      this.current = key
      this.revokeDialog = true
    },
    async revokeConfirm() {
      this.revokeLoading = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($id: Int!) {
              mcp {
                revokeApiKey(id: $id) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                }
              }
            }
          `,
          variables: {
            id: this.current.id
          },
          watchLoading: isLoading => {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-mcp-revoke')
          }
        })
        if (_.get(resp, 'data.mcp.revokeApiKey.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: 'MCP API key revoked.',
            icon: 'check'
          })
          await this.refresh(false)
        } else {
          this.$store.commit('showNotification', {
            style: 'red',
            message: _.get(resp, 'data.mcp.revokeApiKey.responseResult.message', 'An unexpected error occurred.'),
            icon: 'alert'
          })
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.revokeDialog = false
      this.revokeLoading = false
    }
  },
  apollo: {
    keys: {
      query: gql`
        {
          mcp {
            apiKeys {
              id
              name
              keyPrefix
              ipAllowlist
              lastUsedAt
              isRevoked
              createdAt
              updatedAt
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: data => data.mcp.apiKeys,
      watchLoading(isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-mcp-keys-refresh')
      }
    }
  }
}
</script>
