import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: CategoryNode[];
}

export interface ServiceArea {
  id: string;
  countryCode: string;
  stateCode: string;
  stateName: string;
  cityCode: string;
  cityName: string;
  isActive: boolean;
  buyingEnabled: boolean;
  sellingEnabled: boolean;
}

/**
 * Categories and service areas change rarely, so they are fetched once per app session
 * and shared by every screen. A failed request is retried on the next call.
 */
function cached<T>(path: string) {
  let promise: Promise<T[]> | null = null;
  let value: T[] = [];
  const load = () => {
    promise ??= fetchApi<T[]>(path).then((res) => {
      if (res.success && res.data) {
        value = res.data;
        return value;
      }
      promise = null;
      return [];
    });
    return promise;
  };
  const useValue = () => {
    const [state, setState] = useState<T[]>(value);
    useEffect(() => {
      let alive = true;
      load().then((v) => alive && setState(v));
      return () => {
        alive = false;
      };
    }, []);
    return state;
  };
  return { load, useValue };
}

const categories = cached<CategoryNode>('/categories');
const areas = cached<ServiceArea>('/locations/service-areas');

export const getCategories = categories.load;
export const useCategories = categories.useValue;
export const getServiceAreas = areas.load;
export const useServiceAreas = areas.useValue;

/** City name for a listing's cityCode, falling back to the code itself. */
export function cityName(list: ServiceArea[], cityCode: string): string {
  return list.find((a) => a.cityCode === cityCode)?.cityName ?? cityCode;
}

/** Finds a category (top-level or child) and its parent by id. */
export function findCategory(tree: CategoryNode[], id: string): { category: CategoryNode; parent: CategoryNode | null } | null {
  for (const top of tree) {
    if (top.id === id) return { category: top, parent: null };
    const child = top.children?.find((c) => c.id === id);
    if (child) return { category: child, parent: top };
  }
  return null;
}

/** Outlined icon for a top-level category, by slug. */
export function categoryIcon(slug: string): string {
  const map: Record<string, string> = {
    mobiles: 'cellphone',
    'mobile-phones': 'cellphone',
    tablets: 'tablet',
    electronics: 'laptop',
    laptops: 'laptop',
    vehicles: 'motorbike',
    cars: 'car-outline',
    bikes: 'motorbike',
    furniture: 'sofa-outline',
    fashion: 'tshirt-crew-outline',
    property: 'home-city-outline',
    jobs: 'briefcase-outline',
    services: 'wrench-outline',
  };
  return map[slug] ?? 'shape-outline';
}
