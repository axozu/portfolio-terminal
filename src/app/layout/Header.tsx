import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PortfolioValue } from '@/entities/portfolio/ui/PortfolioValue';
import { LiveIndicator } from '@/features/price-feed';
import { LocaleSwitch } from '@/features/locale-switch';
import { useUiStore } from '@/shared/store/ui';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { BrandMark } from './BrandMark';

export function Header() {
  const { t } = useTranslation();
  const openCreateForm = useUiStore((s) => s.openCreateForm);

  return (
    <header className="flex h-header items-center gap-3 border-b bg-card px-3 md:px-4">
      <BrandMark className="size-5 shrink-0 md:hidden" />
      <PortfolioValue />
      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="outline"
          title={t('app.demoBadgeHint')}
          className="border-primary/40 text-primary max-sm:hidden"
        >
          {t('app.demoBadge')}
        </Badge>
        <LiveIndicator />
        <LocaleSwitch />
        <Button
          size="sm"
          onClick={() => {
            openCreateForm();
          }}
          aria-label={t('header.newTransaction')}
        >
          <Plus aria-hidden="true" />
          <span className="max-lg:sr-only">{t('header.newTransaction')}</span>
        </Button>
      </div>
    </header>
  );
}
