import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { useResetDemo } from '../api/useResetDemo';

export function ResetDemoButton() {
  const { t } = useTranslation();
  const reset = useResetDemo();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={reset.isPending}
      onClick={() => {
        reset.mutate(undefined, {
          onSuccess: () => toast.success(t('footer.resetDone')),
          onError: () => toast.error(t('footer.resetFailed')),
        });
      }}
    >
      <RotateCcw aria-hidden="true" />
      {t('footer.resetDemo')}
    </Button>
  );
}
