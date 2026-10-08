import {
  ANCHOR,
  getOffice,
  type Office,
  type OfficeId,
  officeForZone,
} from '@core/cities/registry';
import { computed, type ReadonlySignal, type Signal, signal } from '@preact/signals';
import type { Track } from './track';

export interface CitiesState {
  activeIds: Signal<OfficeId[]>;
  refId: Signal<OfficeId | null>;
  viewerOffice: Office | undefined;
  /** refId ▸ viewer's office ▸ São Paulo (HQ). */
  defaultRef: ReadonlySignal<Office>;
  toggle(id: OfficeId): void;
  move(id: OfficeId, toIndex: number): void;
  add(id: OfficeId): void;
  /** Makes `id` the reference city, adding it first when inactive. */
  setReference(id: OfficeId): void;
}

export function createCities(
  initial: { activeIds: OfficeId[]; refId: OfficeId | null },
  viewerZone: string,
  track: Track,
): CitiesState {
  const activeIds = signal([...initial.activeIds]);
  const refId = signal(initial.refId);
  const viewerOffice = officeForZone(viewerZone);
  const hq = getOffice('saopaulo') as Office;
  const defaultRef = computed(
    () => (refId.value ? getOffice(refId.value) : undefined) ?? viewerOffice ?? hq,
  );
  const changed = (action: string, officeId: OfficeId) =>
    track('cities_change', { action, officeId, activeCount: activeIds.value.length });

  const add = (id: OfficeId) => {
    if (activeIds.value.includes(id)) return;
    activeIds.value = [...activeIds.value, id];
    changed('add', id);
  };
  return {
    activeIds,
    refId,
    viewerOffice,
    defaultRef,
    add,
    toggle(id) {
      if (!activeIds.value.includes(id)) return add(id);
      if (id === ANCHOR || activeIds.value.length === 1) return;
      activeIds.value = activeIds.value.filter((x) => x !== id);
      if (refId.value === id) refId.value = null;
      changed('remove', id);
    },
    move(id, toIndex) {
      if (id === ANCHOR) return;
      const list = activeIds.value.filter((x) => x !== id);
      if (list.length === activeIds.value.length) return;
      list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, id);
      activeIds.value = list;
      changed('move', id);
    },
    setReference(id) {
      add(id);
      refId.value = id;
      changed('reference', id);
    },
  };
}
