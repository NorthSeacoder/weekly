import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getWeeklyPosts } from '~/utils/contents/unified-content';
import { parseCover } from '~/utils/contents/cover';

const FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@latest/chinese-simplified-700-normal.ttf';

let fontData: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
    if (fontData) return fontData;
    const res = await fetch(FONT_URL);
    fontData = await res.arrayBuffer();
    return fontData;
}

const GRADIENTS: Record<string, { from: string; to: string; accent: string }> = {
    default: { from: '#667eea', to: '#764ba2', accent: '#a78bfa' },
    'gradient-blue': { from: '#2563eb', to: '#0ea5e9', accent: '#7dd3fc' },
    'gradient-purple': { from: '#7c3aed', to: '#c026d3', accent: '#e879f9' },
    'gradient-orange': { from: '#ea580c', to: '#f59e0b', accent: '#fbbf24' },
};

export const getStaticPaths: GetStaticPaths = async () => {
    const posts = await getWeeklyPosts();
    return posts
        .filter((p) => p.issueNumber)
        .map((p) => ({
            params: { issueNumber: String(p.issueNumber) },
            props: { post: p },
        }));
};

export const GET: APIRoute = async ({ props }) => {
    const { post } = props as { post: Awaited<ReturnType<typeof getWeeklyPosts>>[number] };
    const config = parseCover(post.cover, {
        issueNumber: post.issueNumber || 0,
        startDate: post.startDate,
    });

    const colors = GRADIENTS[config.template] || GRADIENTS.default;
    const W = 1200;
    const H = 630;
    const font = await loadFont();

    const svg = await satori(
        {
            type: 'div',
            props: {
                style: {
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                    fontFamily: 'sans-serif',
                },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: {
                                fontSize: '120px',
                                fontWeight: 900,
                                color: 'rgba(255,255,255,0.12)',
                                position: 'absolute',
                                top: '60px',
                            },
                            children: `#${config.issueNumber}`,
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: {
                                fontSize: '56px',
                                fontWeight: 700,
                                color: 'white',
                                textAlign: 'center',
                                maxWidth: '80%',
                            },
                            children: config.title,
                        },
                    },
                    ...(config.subtitle
                        ? [
                              {
                                  type: 'div',
                                  props: {
                                      style: {
                                          fontSize: '24px',
                                          color: 'rgba(255,255,255,0.8)',
                                          marginTop: '16px',
                                      },
                                      children: config.subtitle,
                                  },
                              },
                          ]
                        : []),
                ],
            },
        },
        {
            width: W,
            height: H,
            fonts: [
                {
                    name: 'Noto Sans SC',
                    data: font,
                    weight: 700,
                    style: 'normal',
                },
            ],
        },
    );

    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: W },
    });
    const png = resvg.render().asPng();

    return new Response(new Uint8Array(png), {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
};
