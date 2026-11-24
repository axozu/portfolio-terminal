import { useTranslation } from 'react-i18next';
import { PageHeader } from './PageHeader';

interface PagePlaceholderProps {
  pageId: 'overview' | 'positions' | 'transactions' | 'analytics' | 'asset';
}

/** Заготовка страницы до её реализации на этапах 4–7. */
export function PagePlaceholder({ pageId }: PagePlaceholderProps) {
  const { t } = useTranslation();
  return (
    <section data-testid={`page-${pageId}`}>
      <PageHeader title={t(`pages.${pageId}`)} />
    </section>
  );
}
