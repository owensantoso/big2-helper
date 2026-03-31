import * as en from './en'

export const supportedLocales = ['en'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const defaultLocale: SupportedLocale = 'en'

export const localizedContent = {
  en,
} as const

export function getContent(locale: SupportedLocale = defaultLocale) {
  return localizedContent[locale]
}
