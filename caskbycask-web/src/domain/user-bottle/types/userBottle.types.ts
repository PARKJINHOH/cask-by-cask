export type BottleStatus = 'OPENED' | 'UNOPENED';
export type SpiritCategory = 'WHISKY' | 'COGNAC' | 'WINE' | 'OTHER';
export type BottleSortKey = 'NAME' | 'CATEGORY' | 'PURCHASE_DATE' | 'PRICE' | 'STATUS' | 'VISIBILITY';
export type BottleSortDir = 'ASC' | 'DESC';
export type SpiritVariantType = 'BATCH' | 'RELEASE_YEAR' | 'SINGLE_CASK' | 'NONE';

export interface UserBottleImage {
  id: number;
  imageUrl: string;
}

export interface UserBottle {
  id: number;
  spiritId: number | null;
  spiritNameKo: string | null;
  spiritNameEn: string | null;
  parentId: number | null;
  variantType: SpiritVariantType | null;
  seriesIdentifier: string | null;
  seriesIdentifierEn: string | null;
  variantValue: string | null;
  variantValueEn: string | null;
  vintageYear: number | null;
  vintageStatus: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null;
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
  purchaseYears: number[];
}

export interface MyBottleQuery {
  category?: SpiritCategory;
  status?: BottleStatus;
  startDate?: string;
  endDate?: string;
  /** 이전 클라이언트 호환용. 신규 화면은 startDate/endDate를 사용한다. */
  year?: number;
  page?: number;
  size?: number;
  sortKey?: BottleSortKey;
  sortDir?: BottleSortDir;
  lang?: 'ko' | 'en';
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
