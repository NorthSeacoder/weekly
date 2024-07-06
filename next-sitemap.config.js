/** @type {import('next-sitemap').IConfig} */

module.exports = {
  siteUrl: process.env.SITE_URL || "https://weekly.mengpeng.tech",
  generateRobotsTxt: true,
  sitemapSize: 7000,
};
