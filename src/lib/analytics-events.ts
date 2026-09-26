import { isAnalyticsPath } from './page-registry.ts';
import type { Locale } from './page-registry.ts';
export { isAnalyticsPath };
export const ANALYTICS_ORIGIN = 'https://christopherbengtsson.dev';
export const CAPABILITY_IDS = ['build-extend', 'improve-maintain', 'reduce-manual-work', 'review-advise'] as const;
export const EVENT_TARGETS = {
  section_view: ['services', 'experience', 'contact'],
  capability_expand: CAPABILITY_IDS,
  contact_click: ['hero', 'services', 'header'],
  email_click: ['contact'],
  form_start: ['contact'],
  profile_click: ['linkedin', 'github'],
} as const;

export type BrowserEvent = {
  [Event in keyof typeof EVENT_TARGETS]: {
    event: Event;
    target: (typeof EVENT_TARGETS)[Event][number];
    locale: Locale;
    path: string;
  }
}[keyof typeof EVENT_TARGETS];

export type AnalyticsEvent = BrowserEvent | {
  event: 'form_success';
  target: 'contact';
  locale: Locale;
  path: string;
};

/** Only fixed labels enter the dataset; never accept arbitrary visitor data. */
export function validBrowserEvent(value: unknown): value is BrowserEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(',') !== 'event,locale,path,target') return false;
  if (!Object.values(value).every((field) => typeof field === 'string')) return false;
  if (!('locale' in value) || (value.locale !== 'en' && value.locale !== 'sv')) return false;
  if (!('path' in value) || !isAnalyticsPath(value.path, value.locale)) return false;
  if (!('event' in value) || typeof value.event !== 'string' || !('target' in value)) return false;
  return Object.entries(EVENT_TARGETS).some(([event, targets]) =>
    event === value.event && targets.some((target) => target === value.target));
}
