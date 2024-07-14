import {SiteConfig} from '@/types/siteConfig';
import {BsGithub, BsTwitterX, BsWechat} from 'react-icons/bs';
import {MdEmail} from 'react-icons/md';
import {SiJuejin} from 'react-icons/si';

const baseSiteConfig = {
    name: "'What I Don't Know' Weekly",
    description: '每周记录一下在各个地方遇到的我不知道的知识',
    url: 'https://weekly.mengpeng.tech',
    metadataBase: '/',
    keywords: ['weekly'],
    authors: [
        {
            name: 'mengpeng',
            url: 'https://www.mengpeng.tech',
            // twitter: 'https://x.com/noethseacoder'
        }
    ],
    creator: '@northseacoder',
    defaultNextTheme: 'dark', // next-theme option: system | dark | light
    icons: {
        icon: '/favicon.ico',
        shortcut: '/logo.png',
        apple: '/logo.png'
    },
    headerLinks: [
        {name: 'repo', href: 'https://github.com/northseacoder/weekly', icon: BsGithub},
        // {name: 'twitter', href: 'https://x.com/noethseacoder', icon: BsTwitterX},
    ],
    footerLinks: [
        {name: 'email', href: 'mailto:mengpeng_bj@foxmail.com', icon: MdEmail},
        // {name: 'twitter', href: 'https://x.com/noethseacoder', icon: BsTwitterX},
        {name: 'github', href: 'https://github.com/weijunext/', icon: BsGithub},
        {name: 'juejin', href: 'https://juejin.cn/user/2101921962025421', icon: SiJuejin},
    ],
    footerProducts: [
    ]
};

export const siteConfig: SiteConfig = {
    ...baseSiteConfig,
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: baseSiteConfig.url,
        title: baseSiteConfig.name,
        description: baseSiteConfig.description,
        siteName: baseSiteConfig.name,
        images: [`${baseSiteConfig.url}/og.jpg`]
    },
    twitter: {
        card: 'summary_large_image',
        title: baseSiteConfig.name,
        description: baseSiteConfig.description,
        images: [`${baseSiteConfig.url}/og.jpg`],
        creator: baseSiteConfig.creator
    }
};
