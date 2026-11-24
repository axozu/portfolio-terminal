import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/shared/ui/button';

export function AssetNotFound({ ticker }: { ticker: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl py-12">
      <pre className="num mb-6 text-xs text-muted-foreground">
        <span className="text-primary">$</span> quote {ticker}
        {'\n'}
        <span className="text-loss">ERR</span> UNKNOWN_SYMBOL
      </pre>
      <h1 className="text-lg font-semibold text-foreground">{t('asset.notFoundTitle')}</h1>
      <p className="mt-1 text-muted-foreground">{t('asset.notFoundDescription', { ticker })}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/positions">{t('asset.backToPositions')}</Link>
      </Button>
    </div>
  );
}
