import * as en from './en'
import * as ja from './ja'

export const supportedLocales = ['en', 'ja'] as const

export type SupportedLocale = (typeof supportedLocales)[number]

export const defaultLocale: SupportedLocale = 'en'

export const localizedContent = {
  en,
  ja,
} as const

export function getContent(locale: SupportedLocale = defaultLocale) {
  return localizedContent[locale]
}
