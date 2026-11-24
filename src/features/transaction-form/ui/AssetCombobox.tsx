import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssets } from '@/entities/asset';
import { cn } from '@/shared/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { inputClass } from './FormField';

interface AssetComboboxProps {
  id: string;
  value: string;
  onChange: (ticker: string) => void;
  onBlur: () => void;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

/** Выбор актива с поиском по тикеру и названию. */
export function AssetCombobox({ value, onChange, onBlur, ...aria }: AssetComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: assets = [] } = useAssets();
  const selected = assets.find((a) => a.ticker === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          {...aria}
          className={cn(inputClass, 'flex items-center justify-between gap-2 text-left')}
        >
          {selected ? (
            <span className="truncate">
              <span className="num font-medium">{selected.ticker}</span>{' '}
              <span className="text-muted-foreground">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{t('transactionForm.assetPlaceholder')}</span>
          )}
          <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={t('transactionForm.assetSearch')} />
          <CommandList>
            <CommandEmpty>{t('transactionForm.assetEmpty')}</CommandEmpty>
            <CommandGroup>
              {assets.map((asset) => (
                <CommandItem
                  key={asset.ticker}
                  value={`${asset.ticker} ${asset.name}`}
                  onSelect={() => {
                    onChange(asset.ticker);
                    setOpen(false);
                  }}
                >
                  <span className="num w-14 font-medium">{asset.ticker}</span>
                  <span className="truncate text-muted-foreground">{asset.name}</span>
                  <Check
                    aria-hidden="true"
                    className={cn(
                      'ml-auto size-3.5',
                      asset.ticker === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
