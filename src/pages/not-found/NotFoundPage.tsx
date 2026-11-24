import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { Button } from '@/shared/ui/button';

/** 404 в стиле терминала: «ответ сервера» моноширинным шрифтом и путь, которого нет. */
export function NotFoundPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <section data-testid="page-not-found" className="mx-auto max-w-xl py-12">
      <pre className="num mb-6 overflow-x-auto text-xs leading-relaxed text-muted-foreground">
        <span className="text-primary">$</span> GET {pathname}
        {'\n'}
        <span className="text-loss">404</span> NOT_FOUND
      </pre>
      <h1 className="text-lg font-semibold text-foreground">{t('notFound.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('notFound.description', { path: pathname })}</p>
      <Button asChild className="mt-6" variant="outline">
        <Link to="/">{t('notFound.home')}</Link>
      </Button>
    </section>
  );
}
