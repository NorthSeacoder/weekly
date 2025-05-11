<?xml version="1.0" encoding="utf-8"?>
<!--

# Pretty Feed

Styles an RSS/Atom feed, making it friendly for humans viewers, and adds a link
to aboutfeeds.com for new user onboarding. See it in action:

   https://interconnected.org/home/feed


## How to use

1. Download this XML stylesheet from the following URL and host it on your own
   domain (this is a limitation of XSL in browsers):

   https://github.com/genmon/aboutfeeds/blob/main/tools/pretty-feed-v3.xsl

2. Include the XSL at the top of the RSS/Atom feed, like:

```
<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/PATH-TO-YOUR-STYLES/pretty-feed-v3.xsl" type="text/xsl"?>
```

3. Serve the feed with the following HTTP headers:

```
Content-Type: application/xml; charset=utf-8  # not application/rss+xml
x-content-type-options: nosniff
```

(These headers are required to style feeds for users with Safari on iOS/Mac.)

-->
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> Web Feed</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <style type="text/css">
        /* 基础样式 */
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
          font-size: 16px;
        }
        
        /* 深色模式支持 */
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #222;
            color: #eee;
          }
          a {
            color: #6ab0ff;
          }
          a:hover {
            color: #8bc2ff;
          }
          .container-md, .markdown-body {
            background-color: #2d2d2d;
            color: #eee;
          }
          .bg-yellow-light {
            background-color: #4d4d00 !important;
            color: #fff !important;
          }
          .text-gray {
            color: #aaa !important;
          }
          .feed-item {
            border-bottom: 1px solid #444;
          }
          .feed-item:hover {
            background-color: #333;
          }
        }
        
        .container-md {
          max-width: 768px;
          margin: 0 auto;
          padding: 20px;
          background-color: #fff;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          border-radius: 8px;
        }
        
        @media (max-width: 768px) {
          .container-md {
            width: 100%;
            padding: 15px;
            border-radius: 0;
            box-shadow: none;
          }
        }
        
        header {
          border-bottom: 1px solid #eee;
          margin-bottom: 20px;
          padding-bottom: 20px;
        }
        
        h1 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #111;
        }
        
        h2 {
          font-size: 22px;
          font-weight: 600;
          margin: 25px 0 15px 0;
          color: #222;
        }
        
        h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 5px;
          color: #333;
        }
        
        a {
          color: #0366d6;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        
        a:hover {
          color: #0076ff;
          text-decoration: underline;
        }
        
        .head_link {
          display: inline-block;
          margin-top: 10px;
          font-weight: 500;
          padding: 8px 16px;
          background-color: #0366d6;
          color: white;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
        
        .head_link:hover {
          background-color: #0076ff;
          text-decoration: none;
          color: white;
        }
        
        .text-gray {
          color: #666;
        }
        
        .bg-yellow-light {
          background-color: #fff5b1;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .feed-item {
          padding: 15px 0;
          border-bottom: 1px solid #eee;
          transition: background-color 0.2s ease;
        }
        
        .feed-item:hover {
          background-color: #f5f5f5;
        }
        
        .feed-date {
          margin-top: 5px;
          font-size: 14px;
        }
        
        .feed-icon {
          display: inline-block;
          vertical-align: middle;
          margin-right: 8px;
        }
        
        .flex-container {
          display: flex;
          align-items: center;
        }
        
        .emoji {
          font-size: 1.2em;
          margin-right: 8px;
        }
        
        footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
        </style>
      </head>
      <body>
        <nav class="container-md">
          <p class="bg-yellow-light">
            <strong>这是一个网页订阅源，</strong>也称为RSS订阅。 <strong>订阅方法：</strong>复制地址栏中的URL到您的阅读器中。
          </p>
          <p class="text-gray">
            访问 <a href="https://aboutfeeds.com">About Feeds</a> 了解如何开始使用阅读器和订阅。完全免费。
          </p>
        </nav>
        <div class="container-md">
          <header>
            <div class="flex-container">
              <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="vertical-align: text-bottom; width: 1.2em; height: 1.2em;" class="feed-icon" id="RSSicon" viewBox="0 0 256 256">
                <defs>
                  <linearGradient x1="0.085" y1="0.085" x2="0.915" y2="0.915" id="RSSg">
                    <stop offset="0.0" stop-color="#E3702D"/><stop offset="0.1071" stop-color="#EA7D31"/>
                    <stop offset="0.3503" stop-color="#F69537"/><stop offset="0.5" stop-color="#FB9E3A"/>
                    <stop offset="0.7016" stop-color="#EA7C31"/><stop offset="0.8866" stop-color="#DE642B"/>
                    <stop offset="1.0" stop-color="#D95B29"/>
                  </linearGradient>
                </defs>
                <rect width="256" height="256" rx="55" ry="55" x="0" y="0" fill="#CC5D15"/>
                <rect width="246" height="246" rx="50" ry="50" x="5" y="5" fill="#F49C52"/>
                <rect width="236" height="236" rx="47" ry="47" x="10" y="10" fill="url(#RSSg)"/>
                <circle cx="68" cy="189" r="24" fill="#FFF"/>
                <path d="M160 213h-34a82 82 0 0 0 -82 -82v-34a116 116 0 0 1 116 116z" fill="#FFF"/>
                <path d="M184 213A140 140 0 0 0 44 73 V 38a175 175 0 0 1 175 175z" fill="#FFF"/>
              </svg>
              <h1><xsl:value-of select="/rss/channel/title"/></h1>
            </div>
            <p><xsl:value-of select="/rss/channel/description"/></p>
            <a class="head_link" target="_blank">
              <xsl:attribute name="href">
                <xsl:value-of select="/rss/channel/link"/>
              </xsl:attribute>
              访问网站 &#x2192;
            </a>
          </header>
          <h2>最新文章</h2>
          <xsl:for-each select="/rss/channel/item">
            <div class="feed-item">
              <h3>
                <a target="_blank">
                  <xsl:attribute name="href">
                    <xsl:value-of select="link"/>
                  </xsl:attribute>
                  <span class="emoji">📄</span>
                  <xsl:value-of select="title"/>
                </a>
              </h3>
              <div class="feed-date text-gray">
                发布于: <xsl:value-of select="pubDate" />
              </div>
              <!-- 添加文章描述的简短预览 -->
              <p>
                <xsl:value-of select="substring(description, 1, 150)"/>
                <xsl:if test="string-length(description) > 150">...</xsl:if>
              </p>
            </div>
          </xsl:for-each>
          <footer>
            <p>更新于 <xsl:value-of select="format-dateTime(current-dateTime(), '[Y]-[M]-[D]')" /></p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>