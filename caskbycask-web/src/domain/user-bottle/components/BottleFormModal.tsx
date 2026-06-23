import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserBottle, UserBottleRequest, SpiritCategory, BottleStatus } from '../types/userBottle.types';
import { useCreateBottle, useUpdateBottle, useUploadBottleImage } from '../hooks/useUserBottle';
import axiosInstance from '@/shared/api/axiosInstance';

interface SpiritOption { id: number; nameKo: string; nameEn: string | null; category: string; }
interface Props { open: boolean; onClose: () => void; editing?: UserBottle; }

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER'];

const defaultForm = (): UserBottleRequest => ({
  category: 'WHISKY', purchaseDate: '', price: 0, store: '',
  status: 'UNOPENED', isPublic: false,
});

export function BottleFormModal({ open, onClose, editing }: Props) {
  const { t, i18n } = useTranslation();
  const createMut = useCreateBottle();
  const updateMut = useUpdateBottle();
  const uploadImageMut = useUploadBottleImage();

  const [spiritQuery, setSpiritQuery] = useState('');
  const [selectedSpirit, setSelectedSpirit] = useState<SpiritOption | null>(null);
  const [spiritOptions, setSpiritOptions] = useState<SpiritOption[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [form, setForm] = useState<UserBottleRequest>(defaultForm());

  useEffect(() => {
    if (!open) { setForm(defaultForm()); setSelectedSpirit(null); setSpiritQuery(''); setPendingImages([]); return; }
    if (editing) {
      setForm({
        spiritId: editing.spiritId ?? undefined,
        spiritNameText: editing.spiritNameText ?? undefined,
        category: editing.category, purchaseDate: editing.purchaseDate,
        batch: editing.batch ?? undefined, bottlingYear: editing.bottlingYear ?? undefined,
        price: editing.price, store: editing.store,
        status: editing.status, isPublic: editing.isPublic, memo: editing.memo ?? undefined,
      });
    }
  }, [open, editing]);

  useEffect(() => {
    if (spiritQuery.length < 2) { setSpiritOptions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get('/api/spirits', { params: { keyword: spiritQuery, size: 5 } });
        setSpiritOptions(res.data?.data?.content ?? []);
      } catch { setSpiritOptions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [spiritQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: UserBottleRequest = {
        ...form,
        spiritId: selectedSpirit?.id,
        spiritNameText: selectedSpirit ? undefined : (spiritQuery || form.spiritNameText),
      };
      let bottleId: number;
      if (editing) {
        const updated = await updateMut.mutateAsync({ id: editing.id, data: payload });
        bottleId = updated?.id ?? editing.id;
      } else {
        const created = await createMut.mutateAsync(payload);
        if (!created?.id) return;
        bottleId = created.id;
      }
      for (const file of pendingImages) {
        await uploadImageMut.mutateAsync({ id: bottleId, file });
      }
      onClose();
    } catch {
      // Errors surfaced via mutation.error or global axios interceptor toast
    }
  };

  if (!open) return null;
  const isPending = createMut.isPending || updateMut.isPending || uploadImageMut.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b z-10">
          <h2 className="font-bold text-neutral-900 text-base">
            {editing ? t('collection.form.title.edit') : t('collection.form.title.add')}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 품명 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.spiritName')}</label>
            <input type="text"
              value={selectedSpirit ? `${selectedSpirit.nameKo}${selectedSpirit.nameEn ? ` (${selectedSpirit.nameEn})` : ''}` : spiritQuery}
              onChange={e => { setSpiritQuery(e.target.value); setSelectedSpirit(null); }}
              placeholder={t('collection.form.spiritSearch')}
              maxLength={200}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            {spiritOptions.length > 0 && !selectedSpirit && (
              <ul className="mt-1 border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                {spiritOptions.map(s => (
                  <li key={s.id}>
                    <button type="button"
                      onClick={() => { setSelectedSpirit(s); setSpiritQuery(''); setSpiritOptions([]); setForm(f => ({ ...f, category: s.category as SpiritCategory })); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50">
                      {s.nameKo}{s.nameEn ? ` (${s.nameEn})` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 종류 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.category')}</label>
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as SpiritCategory }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{t(`collection.filter.${c}`)}</option>)}
            </select>
          </div>

          {/* 구매일 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.purchaseDate')}</label>
            <input type="date" max="9999-12-31" lang={i18n.language} required value={form.purchaseDate}
              onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.price')}</label>
            <input type="number" min="0" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* 매장 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.store')}</label>
            <input type="text" required value={form.store}
              onChange={e => setForm(f => ({ ...f, store: e.target.value }))}
              maxLength={200}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* 배치 / 병입년도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.batch')}</label>
              <input type="text" value={form.batch ?? ''}
                onChange={e => setForm(f => ({ ...f, batch: e.target.value || undefined }))}
                maxLength={100}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.bottlingYear')}</label>
              <input type="text" value={form.bottlingYear ?? ''} placeholder="2022.02"
                onChange={e => setForm(f => ({ ...f, bottlingYear: e.target.value || undefined }))}
                maxLength={100}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">{t('collection.form.status')}</label>
            <div className="flex gap-4">
              {(['UNOPENED', 'OPENED'] as BottleStatus[]).map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="status" value={s}
                    checked={form.status === s}
                    onChange={() => setForm(f => ({ ...f, status: s }))} />
                  <span className="text-sm">{t(`collection.status.${s}`)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 공개 여부 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-700">{t('collection.form.isPublic')}</p>
              <p className="text-xs text-neutral-400">{t('collection.form.isPublicDesc')}</p>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${form.isPublic ? 'bg-amber-500' : 'bg-neutral-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* 이미지 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.images')}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple
              onChange={e => {
                const alreadyUploaded = editing?.imageUrls.length ?? 0;
                const remaining = Math.max(0, 2 - alreadyUploaded);
                const files = Array.from(e.target.files ?? []).slice(0, remaining);
                setPendingImages(files);
              }}
              className="w-full text-sm text-neutral-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-amber-50 file:text-amber-700" />
            {pendingImages.length > 0 && (
              <p className="text-xs text-neutral-400 mt-1">{t('collection.form.imageSelected', { count: pendingImages.length })}</p>
            )}
            {editing && editing.imageUrls.length > 0 && (
              <div className="flex gap-2 mt-2">
                {editing.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">{t('collection.form.memo')}</label>
            <textarea value={form.memo ?? ''} rows={2}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value || undefined }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50">
              {t('collection.form.cancel')}
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
              {t('collection.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
