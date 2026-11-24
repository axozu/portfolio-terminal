import { useTranslation } from 'react-i18next';
import { ChaosToggle } from '@/features/chaos-mode';
import { ResetDemoButton } from '@/features/demo-reset';
import { LINKS } from '@/shared/config/links';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-3 text-xs text-muted-foreground md:px-4">
      <span>{t('app.demoBadgeHint')}</span>
      <a
        className="underline-offset-4 hover:text-foreground hover:underline"
        href={LINKS.github}
        target="_blank"
        rel="noreferrer"
      >
        {t('footer.source')}
      </a>
      <span>
        {t('footer.chartsBy')}{' '}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href={LINKS.tradingView}
          target="_blank"
          rel="noreferrer"
        >
          TradingView
        </a>
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-4">
        <ChaosToggle />
        <ResetDemoButton />
      </div>
    </footer>
  );
}
