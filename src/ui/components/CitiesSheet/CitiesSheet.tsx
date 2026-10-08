import { useT } from '../../app/context';
import { Sheet } from '../Sheet/Sheet';
import { CityList } from './CityList';

/** Phone: the cities list as a bottom sheet. */
export function CitiesSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const t = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t('cities.title')}>
      <CityList />
    </Sheet>
  );
}
