import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CAPABILITY_IDS } from './lib/analytics-events.ts';

const pair = z.tuple([z.string(), z.string()]);
const capability = z.object({
  id: z.string().refine((id) => CAPABILITY_IDS.some((capability) => capability === id)),
  number: z.string(),
  title: z.string(),
  description: z.string(),
  details: z.array(z.string()).min(1),
  serviceId: z.string().optional(),
  linkLabel: z.string().optional(),
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
  location: z.string(),
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

const pageContent = z.object({
  locale: z.enum(['en', 'sv']),
  translationKey: z.string(),
  draft: z.boolean().default(false),
  title: z.string().min(1),
  description: z.string().min(1),
  headline: z.string().min(1),
  introduction: z.string().min(1),
});
const section = z.object({ title: z.string(), paragraphs: z.array(z.string()).min(1) });
const serviceSchema = pageContent.extend({
  examples: z.array(z.object({ title: z.string(), description: z.string() })).min(1),
  sections: z.array(section).min(1),
  steps: z.array(z.object({ title: z.string(), description: z.string() })).length(4),
  questions: z.array(z.object({ question: z.string(), answer: z.string() })).min(1),
  experience: z.string(),
  contactIntro: z.string(),
  contactPlaceholder: z.string(),
});
export type ServiceContent = z.infer<typeof serviceSchema>;
const services = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/services' }),
  schema: serviceSchema,
});
export const collections = { web, services };
