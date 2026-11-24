import { useTranslation } from 'react-i18next';
import { ASSET_CLASSES, type AssetClass, type Sector } from '@/shared/model';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Select } from '@/shared/ui/Select';
import type { PositionFilters } from '../model/rows';

interface PositionsToolbarProps {
  filters: PositionFilters;
  sectors: readonly Sector[];
  onChange: (filters: PositionFilters) => void;
}

function isAssetClass(value: string): value is AssetClass {
  return ASSET_CLASSES.some((c) => c === value);
}

export function PositionsToolbar({ filters, sectors, onChange }: PositionsToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        aria-label={t('positions.search')}
        placeholder={t('positions.searchPlaceholder')}
        value={filters.query}
        onChange={(e) => {
          onChange({ ...filters, query: e.target.value });
        }}
        className="w-full sm:w-64"
      />
      <Select
        aria-label={t('positions.classFilter')}
        value={filters.assetClass}
        onChange={(e) => {
          const value = e.target.value;
          onChange({ ...filters, assetClass: isAssetClass(value) ? value : 'all' });
        }}
        className="min-w-36 flex-1 sm:flex-none"
      >
        <option value="all">{t('positions.allClasses')}</option>
        {ASSET_CLASSES.map((cls) => (
          <option key={cls} value={cls}>
            {t(`assetClass.${cls}`)}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t('positions.sectorFilter')}
        value={filters.sector}
        onChange={(e) => {
          onChange({ ...filters, sector: sectors.find((s) => s === e.target.value) ?? 'all' });
        }}
        className="min-w-36 flex-1 sm:flex-none"
      >
        <option value="all">{t('positions.allSectors')}</option>
        {sectors.map((sector) => (
          <option key={sector} value={sector}>
            {t(`sector.${sector}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}
