export type BottleStatus = 'OPENED' | 'UNOPENED';
export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER';

export interface UserBottleImage {
  id: number;
  imageUrl: string;
}

export interface UserBottle {
  id: number;
  spiritId: number | null;
  spiritNameKo: string | null;
  spiritNameEn: string | null;
  spiritNameText: string | null;
  category: SpiritCategory;
  purchaseDate: string | null;
  batch: string | null;
  bottlingYear: string | null;
  price: number | null;
  store: string | null;
  status: BottleStatus;
  isPublic: boolean;
  memo: string | null;
  images?: UserBottleImage[];
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
  /** 공개 보틀 조회 시 소유자 닉네임 (내 보틀 조회 시 null) */
  ownerNickname?: string | null;
}

export interface UserBottleRequest {
  spiritId?: number;
  spiritNameText?: string;
  category: SpiritCategory;
  purchaseDate?: string | null;
  batch?: string;
  bottlingYear?: string;
  price?: number | null;
  store?: string | null;
  status: BottleStatus;
  isPublic: boolean;
  memo?: string;
}
