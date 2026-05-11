<template lang='pug'>
  .ai-chat(v-if='isEnabled')
    v-card.ai-chat-panel(:class='panelClass', v-if='isOpen', elevation='8')
      v-toolbar(:color='color', dense, dark, flat)
        v-icon.mr-2 mdi-robot-outline
        .subtitle-1 AI Assistant
        v-spacer
        v-btn(icon, dark, @click='close')
          v-icon mdi-close
      .ai-chat-messages(ref='messages')
        .ai-chat-empty(v-if='messages.length < 1') Ask a question about this wiki.
        .ai-chat-message(v-for='(msg, idx) in messages', :key='idx', :class='`ai-chat-message-` + msg.role')
          .ai-chat-bubble
            .ai-chat-content(v-html='renderMessage(msg.content)')
            .ai-chat-sources(v-if='msg.sources && msg.sources.length')
              .caption.mt-2 Sources:
              a.caption.mr-2(v-for='(source, sidx) in msg.sources', :key='sidx', :href='`/${source.locale}/${source.path}`', target='_blank') {{ source.title || source.path }}
      v-divider
      v-form.ai-chat-input(@submit.prevent='send')
        v-text-field(
          v-model='draft'
          :loading='isSending'
          :disabled='isSending'
          placeholder='Ask AI...'
          single-line
          hide-details
          outlined
          dense
          @keyup.enter='send'
        )
        v-btn.ml-2(:color='color', depressed, :disabled='!draft || isSending', @click='send')
          v-icon mdi-send
    v-fab-transition
      v-btn.ai-chat-fab(
        v-if='!isOpen'
        :class='buttonClass'
        fab
        fixed
        bottom
        :right='!$vuetify.rtl'
        :left='$vuetify.rtl'
        :small='small'
        :color='color'
        dark
        :depressed='$vuetify.breakpoint.mdAndUp'
        :style='buttonPosition'
        @click='open'
        aria-label='AI Assistant'
        )
        v-icon(color='white') mdi-robot-outline
</template>

<script>
import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import chatMutation from 'gql/common/common-ai-mutation-chat.gql'
import statusQuery from 'gql/common/common-ai-query-status.gql'

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true
})

export default {
  props: {
    pageId: { type: Number, default: 0 },
    locale: { type: String, default: '' },
    path: { type: String, default: '' },
    color: { type: String, default: 'primary' },
    small: { type: Boolean, default: false },
    buttonClass: { type: String, default: '' },
    panelClass: { type: String, default: '' },
    bottomOffset: { type: Number, default: 24 },
    sideOffset: { type: Number, default: 24 }
  },
  data() {
    return {
      isOpen: false,
      isSending: false,
      draft: '',
      messages: [],
      isEnabled: false
    }
  },
  computed: {
    buttonPosition() {
      const side = this.$vuetify.rtl ? 'left' : 'right'
      return `${side}: ${this.sideOffset}px; bottom: ${this.bottomOffset}px;`
    }
  },
  methods: {
    open() {
      this.messages = []
      this.draft = ''
      this.isOpen = true
    },
    close() {
      this.isOpen = false
      this.messages = []
      this.draft = ''
    },
    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.messages) {
          this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight
        }
      })
    },
    renderMessage(content) {
      return DOMPurify.sanitize(md.render(content || ''))
    },
    async send() {
      const question = (this.draft || '').trim()
      if (!question || this.isSending) { return }
      this.messages.push({ role: 'user', content: question })
      this.draft = ''
      this.isSending = true
      this.scrollToBottom()
      try {
        const resp = await this.$apollo.mutate({
          mutation: chatMutation,
          variables: {
            question,
            locale: this.locale,
            path: this.path,
            pageId: this.pageId
          }
        })
        const result = resp.data.ai.chat
        if (result.responseResult.succeeded) {
          this.messages.push({
            role: 'assistant',
            content: result.answer || '',
            sources: result.sources || []
          })
        } else {
          throw new Error(result.responseResult.message)
        }
      } catch (err) {
        this.messages.push({
          role: 'assistant',
          content: err.message || 'AI assistant is unavailable.'
        })
      }
      this.isSending = false
      this.scrollToBottom()
    }
  },
  apollo: {
    aiStatus: {
      query: statusQuery,
      fetchPolicy: 'network-only',
      update(data) {
        this.isEnabled = !!data.ai.status.isEnabled
        if (!this.isEnabled) {
          this.close()
        }
        return data.ai.status
      },
      error() {
        this.isEnabled = false
        this.close()
      }
    }
  }
}
</script>

<style lang='scss' scoped>
.ai-chat {
  &-fab {
    z-index: 12;
  }

  &-panel {
    position: fixed;
    right: 24px;
    bottom: 96px;
    width: 380px;
    max-width: calc(100vw - 32px);
    z-index: 12;
    overflow: hidden;
  }

  &-messages {
    height: 420px;
    max-height: calc(100vh - 220px);
    overflow-y: auto;
    padding: 16px;
  }

  &-empty {
    text-align: center;
    margin-top: 120px;
  }

  &-message {
    display: flex;
    margin-bottom: 12px;

    &-user {
      justify-content: flex-end;
    }

    &-assistant {
      justify-content: flex-start;
    }
  }

  &-bubble {
    max-width: 82%;
    padding: 10px 12px;
  }

  &-content::v-deep {
    p:last-child {
      margin-bottom: 0;
    }

    pre {
      margin: 8px 0;
      padding: 8px;
      overflow-x: auto;
      white-space: pre;
    }

    code {
      white-space: pre-wrap;
    }
  }

  &-sources a {
    text-decoration: underline;
  }

  &-input {
    display: flex;
    padding: 12px;
  }
}

.v-application--is-rtl {
  .ai-chat-panel {
    right: auto;
    left: 24px;
  }
}
</style>
