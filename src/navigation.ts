import { getPermalink, getAsset } from './utils/permalinks';

export const footerData = {
  links: [
    {
      title: '订阅',
      links: [
        { text: '邮件订阅(施工中)', href: '' },
        { text: 'RSS 订阅', href: getAsset('/rss.xml') },
      ],
    },
    {
      title: '工具',
      links: [
        { text: 'Franky', href: 'https://marketplace.visualstudio.com/items?itemName=NorthSeacoder.franky' },
        { text: 'xmind 筛选器', href: 'https://www.npmjs.com/package/@nsea/xmind-handler' },
      ],
    },
    {
      title: 'Links',
      links: [
        { text: 'Cloud;Blog', href: 'https://www.cloudofficial.top' },
      ],
    }
  ],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'north-sea-coder', icon: 'tabler:brand-wechat', href: '#' },
    
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/NorthSeacoder' },
  ],
};
