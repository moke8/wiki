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

<style lang="scss">
.zidan-footer {
  background-color: #FFF;
  color: #637381;
  padding: 44px 0 28px;
  border-top: 1px solid #ECEEF1;

  &-inner {
    max-width: none;
    margin: 0;
    padding: 0 32px;
    display: grid;
    grid-template-columns: minmax(240px, 1.15fr) minmax(0, 2fr);
    gap: 64px;
    align-items: start;
  }

  &-brand {
    min-width: 0;
  }

  &-logo {
    display: flex;
    align-items: center;
    color: #171c19;
    font-size: 1.15rem;
    font-weight: 600;
    line-height: 1.4;
  }

  &-logo-img {
    flex: 0 0 auto;
    width: 104px;
    max-width: 104px !important;
    height: 36px;
    margin-right: 12px;
  }

  &-desc {
    max-width: 360px;
    margin-top: 14px;
    font-size: 0.9rem;
    color: #637381;
    line-height: 1.8;
  }

  &-nav {
    display: grid;
    grid-template-columns: repeat(3, minmax(120px, 1fr));
    gap: 36px;
  }

  &-col-title {
    color: #171c19;
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 14px;
  }

  &-link {
    display: block;
    width: fit-content;
    color: #637381 !important;
    font-size: 0.9rem;
    line-height: 1.6;
    text-decoration: none;
    padding: 4px 0;
    transition: color 0.18s ease;

    &:hover {
      color: #0063ff !important;
      text-decoration: none;
    }
  }

  &-copy {
    grid-column: 1 / -1;
    padding-top: 24px;
    border-top: 1px solid #ECEEF1;
    font-size: 0.8rem;
    color: #919EAB;
    text-align: left;

    a {
      color: #637381 !important;
      text-decoration: none;

      &:hover {
        color: #0063ff !important;
        text-decoration: none;
      }
    }
  }

  @media (max-width: 900px) {
    &-inner {
      grid-template-columns: 1fr;
      gap: 32px;
      padding: 0 24px;
    }

    &-nav {
      grid-template-columns: repeat(2, minmax(120px, 1fr));
      gap: 28px;
    }
  }

  @media (max-width: 600px) {
    padding: 32px 0 24px;

    &-nav {
      grid-template-columns: 1fr;
      gap: 22px;
    }
  }
}
</style>
