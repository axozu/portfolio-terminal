import { useTranslation } from 'react-i18next';
import { useLocale } from '@/shared/i18n';
import { LOCALES } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

/** Переключатель RU/EN: меняет тексты, форматы чисел, валют и дат мгновенно. */
export function LocaleSwitch() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();

  return (
    <div role="group" aria-label={t('header.language')} className="flex h-8 rounded-sm border">
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={locale === option}
          onClick={() => {
            setLocale(option);
          }}
          className={cn(
            'num px-2 text-xs uppercase transition-colors',
            locale === option
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
