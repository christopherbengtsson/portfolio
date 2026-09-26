export const ANALYTICS_ORIGIN = 'https://christopherbengtsson.dev';
export const CAPABILITY_IDS = ['build-extend', 'improve-maintain', 'reduce-manual-work', 'review-advise'];
export const EVENT_TARGETS = {
  section_view: ['services', 'experience', 'contact'],
  capability_expand: CAPABILITY_IDS,
  contact_click: ['hero', 'services', 'header'],
  email_click: ['contact'],
  form_start: ['contact'],
  profile_click: ['linkedin', 'github'],
};

/** Only fixed labels enter the dataset; never accept arbitrary visitor data. */
export function validBrowserEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).sort().join(',') !== 'event,locale,path,target') return false;
  if (!Object.values(value).every((field) => typeof field === 'string')) return false;
  if (value.locale !== 'en' && value.locale !== 'sv') return false;
  if (value.path !== (value.locale === 'sv' ? '/sv/' : '/')) return false;
  return Object.hasOwn(EVENT_TARGETS, value.event) && EVENT_TARGETS[value.event].includes(value.target);
}
