import en from '../locales/en.json';

type Translations = typeof en;
type NestedKeys<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeys<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

type TranslationKey = NestedKeys<Translations>;

export function useTranslation(namespace?: string) {
  const t = (key: string, vars?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    const parts = fullKey.split('.');
    
    let current: any = en;
    for (const part of parts) {
      if (current[part] === undefined) {
        return fullKey; // fallback to key
      }
      current = current[part];
    }
    
    if (typeof current !== 'string') {
      return fullKey; // fallback
    }

    let result = current;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
      }
    }
    return result;
  };

  return { t };
}
