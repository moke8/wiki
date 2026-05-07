<template lang="pug">
  .zidan-footer
    .zidan-footer-inner
      .zidan-footer-brand
        .zidan-footer-logo
          v-img.zidan-footer-logo-img(:src='logoUrl', contain)
          span {{ siteName }}
        .zidan-footer-desc {{ footerDescription }}
      .zidan-footer-nav
        .zidan-footer-col(v-for='group in footerGroups', :key='group.title')
          .zidan-footer-col-title {{ group.title }}
          a.zidan-footer-link(
            v-for='item in group.items'
            :key='item.title'
            :href='item.href'
            target='_blank'
            rel='noopener'
            ) {{ item.title }}
      .zidan-footer-copy
        span(v-if='footerOverride', v-html='footerOverrideRender')
        template(v-else)
          span &copy; {{ currentYear }} {{ company || siteName }}
</template>

<script>
import { get } from 'vuex-pathify'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: true
})

export default {
  data() {
    return {
      currentYear: (new Date()).getFullYear(),
      footerGroups: [
        {
          title: '产品功能',
          items: [
            { title: '无卡发薪', href: 'https://www.51zidan.com/payrollcardless.html' },
            { title: '日结保险', href: 'https://www.51zidan.com/insurancedaily.html' },
            { title: '电子合同', href: 'https://www.51zidan.com/electroniccontract.html' },
            { title: '智能考勤', href: 'https://www.51zidan.com/smartattendance.html' },
            { title: '预支薪资', href: 'https://www.51zidan.com/advancewage.html' }
          ]
        },
        {
          title: '了解子弹云',
          items: [
            { title: '关于我们', href: 'https://www.51zidan.com/knowzidan.html' },
            { title: '加入我们', href: 'https://www.51zidan.com/joinzidan.html' },
            { title: '最新资讯', href: 'https://www.51zidan.com/newscenter.html' }
          ]
        },
        {
          title: '支持与服务',
          items: [
            { title: '视频教学', href: 'https://www.51zidan.com/videoteaching.html' },
            { title: '常见问题', href: 'https://www.51zidan.com/commonproblem.html' }
          ]
        }
      ]
    }
  },
  computed: {
    company: get('site/company'),
    footerOverride: get('site/footerOverride'),
    logoUrl: get('site/logoUrl'),
    siteName: get('site/title'),
    footerDescription () {
      return this.company || '子弹云SaaS集无卡发薪、考勤排班、商业保险、电子合同、薪资垫付等功能于一体。'
    },
    footerOverrideRender () {
      if (!this.footerOverride) { return '' }
      return md.renderInline(this.footerOverride)
    }
  }
}
</script>
