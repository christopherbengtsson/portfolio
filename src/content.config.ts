import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CAPABILITY_IDS } from './lib/analytics-events.js';

const pair = z.tuple([z.string(), z.string()]);
const capability = z.object({
  id: z.string().refine((id) => CAPABILITY_IDS.includes(id)),
  number: z.string(),
  title: z.string(),
  description: z.string(),
  details: z.array(z.string()).min(1),
});
const job = z.object({
  period: z.string(),
  project: z.string(),
  company: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
});

const webSchema = z.object({
  skip: z.string(),
  title: z.string(),
  description: z.string(),
  availability: z.string(),
  themeToggleLabel: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  introduction: z.string(),
  projectCta: z.string(),
  servicesCta: z.string(),
  facts: z.array(pair),
  services: z.object({
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    contactCta: z.string(),
  }),
  capabilities: z.array(capability),
  experience: z.object({
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    note: z.string(),
  }),
  jobs: z.array(job),
  contact: z.object({
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    name: z.string(),
    email: z.string(),
    message: z.string(),
    placeholder: z.string(),
    send: z.string(),
    success: z.string(),
    privacyPrompt: z.string(),
  }),
  privacy: z.object({
    eyebrow: z.string(),
    title: z.string(),
    controller: z.string(),
    purpose: z.string(),
    basis: z.string(),
    providers: z.string(),
    retention: z.string(),
    analytics: z.string(),
    rights: z.string(),
    complaint: z.string(),
  }),
  footer: z.string(),
});

export type WebHome = z.infer<typeof webSchema>;

const web = defineCollection({
  loader: glob({ pattern: '**/home.json', base: './src/content/web' }),
  schema: webSchema,
});

export const collections = { web };
