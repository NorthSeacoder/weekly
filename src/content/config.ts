import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders';

const weeklyCollection = defineCollection({
  loader: glob({ pattern: ['**/*.mdx'], base: 'sections' }),
  schema: () =>
    z.object({
      title: z.string(),
      content: z.string().optional(),
      tags: z.array(z.string()).default([]),
      category: z.string(),
      source: z.string(),
      date: z.date(),
      wordCount: z.number().optional()
    })
})

export const collections = {
    weekly: weeklyCollection,
}
