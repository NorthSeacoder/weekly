import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders';

const weeklyCollection = defineCollection({
  // type: 'content',
  loader: glob({ pattern: ['**/*.mdx'], base: 'sections' }),
  schema: () =>
    z.object({
      title: z.string(),
      content: z.string().optional(),
      tags: z.array(z.string()).default([]),
      category: z.string(),
      source: z.string(),
      date: z.date(),
      // 自动注入字段（不需要在 frontmatter 中手动填写）
      // lastUpdated: z.date().optional(),
      wordCount: z.number().optional()
    })
})

const blogCollection = defineCollection({
  loader: glob({ pattern: ['**/*.mdx'], base: 'blogs' }),
  schema: () =>
    z.object({
      title: z.string(),
      content: z.string().optional(),
      tags: z.array(z.string()).default([]),
      category: z.string(),
      date: z.date(),
      desc: z.string(),
      slug: z.string(),
      // 自动注入字段（不需要在 frontmatter 中手动填写）
      // lastUpdated: z.date().optional(),
      wordCount: z.number().optional(),
      hidden: z.boolean().default(false).optional()
    })
})

export const collections = {
    weekly: weeklyCollection,
    blog: blogCollection,
  }