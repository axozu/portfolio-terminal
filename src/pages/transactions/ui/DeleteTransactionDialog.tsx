import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDeleteTransaction } from '@/entities/transaction';
import { isApiError } from '@/shared/api';
import { useFormat } from '@/shared/i18n';
import { cashEffect } from '@/shared/lib/finance';
import type { Transaction } from '@/shared/model';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { buttonVariants } from '@/shared/ui/button';

interface DeleteDialogProps {
  transaction: Transaction | null;
  onClose: () => void;
}

/**
 * Подтверждение удаления. Если удаление сломает более позднюю сделку, «сервер» ответит 422,
 * и пользователь увидит, какая сделка мешает.
 */
export function DeleteTransactionDialog({ transaction, onClose }: DeleteDialogProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const remove = useDeleteTransaction();

  const confirm = () => {
    if (!transaction) return;
    onClose();
    remove.mutate(transaction.id, {
      onSuccess: () => toast.success(t('transactionsPage.deleted')),
      onError: (error) => {
        const conflict = isApiError(error) ? error.body?.conflict : undefined;
        toast.error(t('transactionsPage.deleteFailed'), {
          description: conflict
            ? t('transactionForm.conflict', {
                date: format.date(conflict.date),
                reason: t(`ledgerReason.${conflict.reason}`),
              })
            : undefined,
        });
      },
    });
  };

  return (
    <AlertDialog
      open={transaction !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('transactionsPage.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction
              ? t('transactionsPage.deleteDescription', {
                  type: t(`transactionType.${transaction.type}`),
                  date: format.date(transaction.date),
                  amount: format.money(cashEffect(transaction), { signed: true }),
                })
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('transactionForm.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            onClick={confirm}
          >
            {t('transactionsPage.deleteConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
