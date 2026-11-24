import { useTranslation } from 'react-i18next';
import { ErrorState } from '@/shared/ui/states';

/**
 * Ошибка роутера (например, не загрузился чанк страницы после деплоя).
 * Помогает только перезагрузка, поэтому кнопка перезагружает страницу.
 */
export function RouteErrorPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-lg p-6">
      <ErrorState
        title={t('states.errorPageTitle')}
        onRetry={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
