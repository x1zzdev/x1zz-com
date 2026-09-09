import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().default(''),
    tags: z.array(z.string()).default([]),
    status: z.enum(['draft', 'published']).default('published'),
    cover_image: z.string().optional(),
  }),
});

export const collections = { blog };