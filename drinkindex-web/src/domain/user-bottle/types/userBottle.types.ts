export type BottleStatus = 'OPENED' | 'UNOPENED';
export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER';

export interface UserBottle {
  id: number;
  spiritId: number | null;
  spiritNameKo: string | null;
  spiritNameEn: string | null;
  spiritNameText: string | null;
  category: SpiritCategory;
  purchaseDate: string;
  batch: string | null;
  bottlingYear: string | null;
  price: number;
  store: string;
  status: BottleStatus;
  isPublic: boolean;
  memo: string | null;
  imageUrls: string[];
  createdAt: string;
}

export interface CategoryStat { category: SpiritCategory; count: number; }

export interface BottleStats {
  totalCount: number;
  totalPrice: number;
  openedCount: number;
  unopenedCount: number;
  categoryStats: CategoryStat[];
}

export interface BottleListResponse {
  bottles: UserBottle[];
  stats: BottleStats;
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

export interface UserBottleRequest {
  spiritId?: number;
  spiritNameText?: string;
  category: SpiritCategory;
  purchaseDate: string;
  batch?: string;
  bottlingYear?: string;
  price: number;
  store: string;
  status: BottleStatus;
  isPublic: boolean;
  memo?: string;
}
