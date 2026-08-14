import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserBottle, UserBottleImage, UserBottleRequest, SpiritCategory } from '../types/userBottle.types';
import { useCreateBottle, useUpdateBottle, useUploadBottleImage, useReplaceBottleImage, useDeleteBottleImage } from '../hooks/useUserBottle';
import axiosInstance from '@/shared/api/axiosInstance';
import { getLocalizedSpiritListNames } from '@/domain/spirit/utils/spiritDisplayName';
import ImageEditorModal from '@/shared/components/ImageEditorModal';
import { formatOptionalPriceInput, parsePriceInput } from '@/shared/utils/moneyInput';
import { formatYearMonth } from '@/shared/utils/yearMonth';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import FormFieldLabel, { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel';
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface SpiritOption {
  id: number;
  nameKo: string;
  nameEn: string | null;
  parentId?: number | null;
  variantType?: UserBottle['variantType'];
  seriesIdentifier?: string | null;
  seriesIdentifierEn?: string | null;
  variantValue?: string | null;
  variantValueEn?: string | null;
  category: SpiritCategory;
  vintageYear?: number | null;
  vintageStatus?: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null;
}
interface Props { open: boolean; onClose: () => void; editing?: UserBottle; }
interface PendingImage { id: string; file: File; previewUrl: string; }

const CATEGORIES: SpiritCategory[] = ['WHISKY', 'COGNAC', 'WINE', 'OTHER'];
const MAX_IMAGES = 2;

const defaultForm = (): UserBottleRequest => ({
  category: 'WHISKY',
  purchaseDate: null,
  price: null,
  store: null,
  volumeMl: null,
  status: 'UNOPENED',
  isPublic: false,
});

const stripOptional = (value: string) => value.replace(/\s*\([^)]*\)\s*$/u, '');

const getSpiritOptionNames = (spirit: SpiritOption, language: string) => {
  const names = getLocalizedSpiritListNames(spirit, language);
  return names.secondaryName === names.primaryName
    ? { ...names, secondaryName: '' }
    : names;
};

export function BottleFormModal({ open, onClose, editing }: Props) {
  const { t, i18n } = useTranslation();
  const createMut = useCreateBottle();
  const updateMut = useUpdateBottle();
  const uploadImageMut = useUploadBottleImage();
  const replaceImageMut = useReplaceBottleImage();
  const deleteImageMut = useDeleteBottleImage();

  const [spiritQuery, setSpiritQuery] = useState('');
  const debouncedSpiritQuery = useDebouncedValue(spiritQuery);
  const [selectedSpirit, setSelectedSpirit] = useState<SpiritOption | null>(null);
  const [spiritOptions, setSpiritOptions] = useState<SpiritOption[]>([]);
  const [existingImages, setExistingImages] = useState<UserBottleImage[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [editingExisting, setEditingExisting] = useState<UserBottleImage | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [form, setForm] = useState<UserBottleRequest>(defaultForm());
  const [nameTouched, setNameTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setForm(defaultForm());
      setSelectedSpirit(null);
      setSpiritQuery('');
      setSpiritOptions([]);
      setExistingImages([]);
      setPendingImages([]);
      setEditingPendingId(null);
      setEditingExisting(null);
      setNameTouched(false);
      return;
    }

    if (editing) {
      setForm({
        spiritId: editing.spiritId ?? undefined,
        spiritNameText: editing.spiritNameText ?? undefined,
        category: editing.category,
        purchaseDate: editing.purchaseDate ?? null,
        batch: editing.batch ?? undefined,
        bottlingYear: editing.bottlingYear ?? undefined,
        price: editing.price ?? null,
        store: editing.store ?? null,
        volumeMl: editing.volumeMl ?? null,
        status: editing.status,
        isPublic: editing.isPublic,
        memo: editing.memo ?? undefined,
      });
      if (editing.spiritId) {
        setSelectedSpirit({
          id: editing.spiritId,
          nameKo: editing.spiritNameKo ?? '',
          nameEn: editing.spiritNameEn,
          parentId: editing.parentId,
          variantType: editing.variantType,
          seriesIdentifier: editing.seriesIdentifier,
          seriesIdentifierEn: editing.seriesIdentifierEn,
          variantValue: editing.variantValue,
          variantValueEn: editing.variantValueEn,
          category: editing.category,
        });
        setSpiritQuery('');
      } else {
        setSelectedSpirit(null);
        setSpiritQuery(editing.spiritNameText ?? '');
      }
      setExistingImages(editing.images ?? editing.imageUrls.map((imageUrl, idx) => ({ id: -idx - 1, imageUrl })));
    } else {
      setForm(defaultForm());
      setSelectedSpirit(null);
      setSpiritQuery('');
      setExistingImages([]);
    }
  }, [open, editing]);

  useEffect(() => {
    const keyword = debouncedSpiritQuery.trim();
    if (keyword.length < 2) { setSpiritOptions([]); return; }
    let ignore = false;
    (async () => {
      try {
        const res = await axiosInstance.get('/api/spirits/autocomplete', {
          params: { keyword, includeVariants: true },
        });
        if (!ignore) setSpiritOptions((res.data?.data ?? []).slice(0, 8));
      } catch {
        if (!ignore) setSpiritOptions([]);
      }
    })();
    return () => { ignore = true; };
  }, [debouncedSpiritQuery]);

  const selectedSpiritNames = selectedSpirit
    ? getSpiritOptionNames(selectedSpirit, i18n.language)
    : null;
  const selectedPending = useMemo(
    () => pendingImages.find((img) => img.id === editingPendingId) ?? null,
    [pendingImages, editingPendingId],
  );
  const hasName = selectedSpirit != null || spiritQuery.trim().length > 0 || (form.spiritNameText?.trim().length ?? 0) > 0;
  const imageCount = existingImages.length + pendingImages.length;
  const isPending = createMut.isPending || updateMut.isPending || uploadImageMut.isPending || replaceImageMut.isPending || deleteImageMut.isPending;

  const handleClose = () => {
    onClose();
  };

  const addPendingImages = (files: FileList | null) => {
    const room = Math.max(0, MAX_IMAGES - imageCount);
    const nextFiles = Array.from(files ?? []).slice(0, room);
    if (nextFiles.length === 0) return;
    setPendingImages((prev) => [
      ...prev,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const deleteExistingImage = async (image: UserBottleImage) => {
    if (!editing || image.id < 0) return;
    await deleteImageMut.mutateAsync({ bottleId: editing.id, imageId: image.id });
    setExistingImages((prev) => prev.filter((img) => img.id !== image.id));
  };

  const handlePendingEditSave = async (file: File) => {
    if (!selectedPending) return;
    setIsEditingImage(true);
    try {
      const nextUrl = URL.createObjectURL(file);
      setPendingImages((prev) => prev.map((img) => {
        if (img.id !== selectedPending.id) return img;
        URL.revokeObjectURL(img.previewUrl);
        return {
          ...img,
          file: new File([file], img.file.name.replace(/\.[^.]+$/, '') + '_edited.png', { type: file.type || 'image/png' }),
          previewUrl: nextUrl,
        };
      }));
      setEditingPendingId(null);
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleExistingEditSave = async (file: File) => {
    if (!editing || !editingExisting || editingExisting.id < 0) return;
    setIsEditingImage(true);
    try {
      await replaceImageMut.mutateAsync({ bottleId: editing.id, imageId: editingExisting.id, file });
      const previewUrl = URL.createObjectURL(file);
      setExistingImages((prev) => prev.map((img) => (
        img.id === editingExisting.id ? { ...img, imageUrl: previewUrl } : img
      )));
      setEditingExisting(null);
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    if (!hasName) return;

    const payload: UserBottleRequest = {
      ...form,
      spiritId: selectedSpirit?.id,
      spiritNameText: selectedSpirit ? undefined : spiritQuery.trim(),
      purchaseDate: form.purchaseDate || null,
      price: form.price ?? null,
      store: form.store?.trim() || null,
      batch: form.batch?.trim() || undefined,
      bottlingYear: form.bottlingYear?.trim() || undefined,
      memo: form.memo?.trim() || undefined,
    };

    try {
      let bottleId: number;
      if (editing) {
        const updated = await updateMut.mutateAsync({ id: editing.id, data: payload });
        bottleId = updated?.id ?? editing.id;
      } else {
        const created = await createMut.mutateAsync(payload);
        if (!created?.id) return;
        bottleId = created.id;
      }
      for (const image of pendingImages) {
        await uploadImageMut.mutateAsync({ id: bottleId, file: image.file });
      }
      handleClose();
    } catch {
      // The global axios interceptor shows API errors.
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white">
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b z-10">
            <h2 className="font-bold text-neutral-900 text-base">
              {editing ? t('collection.form.title.edit') : t('collection.form.title.add')}
            </h2>
            <button type="button" onClick={handleClose} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">x</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <RequiredFieldsNotice />
          <div>
            <FormFieldLabel required className="mb-1">{t('collection.form.spiritName')}</FormFieldLabel>
            <input
              type="text"
              required
              aria-required="true"
              value={selectedSpiritNames
                ? `${selectedSpiritNames.primaryName}${selectedSpiritNames.secondaryName ? ` (${selectedSpiritNames.secondaryName})` : ''}`
                : spiritQuery}
              onChange={(e) => { setSpiritQuery(e.target.value); setSelectedSpirit(null); setNameTouched(true); }}
              onBlur={() => setNameTouched(true)}
              placeholder={t('collection.form.spiritSearch')}
              maxLength={200}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent ${
                nameTouched && !hasName ? 'border-red-400' : 'border-neutral-300'
              }`}
            />
            {spiritOptions.length > 0 && !selectedSpirit && (
              <ul className="mt-1 border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                {spiritOptions.map((s) => {
                  const displayName = getSpiritOptionNames(s, i18n.language);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpirit(s);
                          setSpiritQuery('');
                          setSpiritOptions([]);
                          setForm((f) => ({ ...f, category: s.category as SpiritCategory }));
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                      >
                        {displayName.primaryName}{displayName.secondaryName ? ` (${displayName.secondaryName})` : ''}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <FieldLabel>{t('collection.form.category')}</FieldLabel>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as SpiritCategory }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(`collection.filter.${c}`)}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel>{t('collection.form.purchaseDate')}</FieldLabel>
            <input
              type="date"
              max="9999-12-31"
              lang={i18n.language}
              value={form.purchaseDate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value || null }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <FieldLabel>{t('collection.form.price')}</FieldLabel>
            <input
              type="text"
              inputMode="numeric"
              value={formatOptionalPriceInput(form.price)}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value === '' ? null : parsePriceInput(e.target.value) }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <FieldLabel>{t('collection.form.store')}</FieldLabel>
            <input
              type="text"
              value={form.store ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, store: e.target.value || null }))}
              maxLength={200}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>{stripOptional(t('collection.form.batch'))}</FieldLabel>
              <input
                type="text"
                value={form.batch ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value || undefined }))}
                maxLength={100}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <FieldLabel>{stripOptional(t('collection.form.bottlingYear'))}</FieldLabel>
              {/* 주류 상세의 증류·병입 연월과 같은 규칙(YYYY 또는 YYYY-MM).
                  숫자만 입력해도 하이픈이 자동으로 들어가고, 없는 월(13~)은 입력되지 않는다. */}
              <input
                type="text"
                inputMode="numeric"
                value={form.bottlingYear ?? ''}
                placeholder="2022-02"
                onChange={(e) => setForm((f) => ({
                  ...f,
                  bottlingYear: formatYearMonth(e.target.value) || undefined,
                }))}
                maxLength={7}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>{t('collection.form.status')}</FieldLabel>
              <div className="flex h-[38px] items-center justify-between rounded-lg border border-neutral-300 px-3">
                <span className="text-sm text-neutral-700">{t(`collection.status.${form.status}`)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.status === 'OPENED'}
                  aria-label={t('collection.form.status')}
                  onClick={() => setForm((f) => ({
                    ...f,
                    status: f.status === 'OPENED' ? 'UNOPENED' : 'OPENED',
                  }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                    form.status === 'OPENED' ? 'bg-amber-500' : 'bg-neutral-300'
                  }`}
                >
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    form.status === 'OPENED' ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>
            </div>
            <div>
              <FieldLabel>{t('collection.form.volume')}</FieldLabel>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={form.volumeMl ?? ''}
                  placeholder="700"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setForm((f) => ({
                      ...f,
                      volumeMl: digits === '' ? null : Math.min(Number(digits), 100000),
                    }));
                  }}
                  className="w-full rounded-lg border border-neutral-300 py-2 pl-3 pr-9 text-sm"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">ml</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-700">{t('collection.form.isPublic')}</p>
              <p className="text-xs text-neutral-400">{t('collection.form.isPublicDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
              className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${form.isPublic ? 'bg-amber-500' : 'bg-neutral-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div>
            <FieldLabel>{t('collection.form.images')}</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((image) => (
                <ImageTile
                  key={image.id}
                  src={image.imageUrl}
                  canManage={image.id > 0}
                  onEdit={() => image.id > 0 && setEditingExisting(image)}
                  onRemove={() => deleteExistingImage(image)}
                  t={t}
                />
              ))}
              {pendingImages.map((image) => (
                <ImageTile
                  key={image.id}
                  src={image.previewUrl}
                  canManage
                  onEdit={() => setEditingPendingId(image.id)}
                  onRemove={() => removePendingImage(image.id)}
                  t={t}
                />
              ))}
              {imageCount < MAX_IMAGES && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer text-neutral-400 hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-500 transition-colors">
                  <span className="text-2xl leading-none">+</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="hidden"
                    onChange={(e) => { addPendingImages(e.target.files); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>
            {pendingImages.length > 0 && (
              <p className="text-xs text-neutral-400 mt-1">{t('collection.form.imageSelected', { count: pendingImages.length })}</p>
            )}
          </div>

          <div>
            <FieldLabel>{stripOptional(t('collection.form.memo'))}</FieldLabel>
            <AutoGrowTextarea
              value={form.memo ?? ''}
              rows={2}
              maxLength={1000}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value || undefined }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="flex-1 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50">
              {t('collection.form.cancel')}
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
              {t('collection.form.save')}
            </button>
          </div>
          </form>
        </div>
      </div>

      {selectedPending && (
        <ImageEditorModal
          open={!!selectedPending}
          onClose={() => setEditingPendingId(null)}
          imageSrc={selectedPending.previewUrl}
          onSave={handlePendingEditSave}
          isSaving={isEditingImage}
        />
      )}
      {editingExisting && (
        <ImageEditorModal
          open={!!editingExisting}
          onClose={() => setEditingExisting(null)}
          imageSrc={editingExisting.imageUrl}
          onSave={handleExistingEditSave}
          isSaving={isEditingImage}
        />
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-neutral-700 mb-1">{children}</label>;
}

function ImageTile({
  src,
  canManage,
  onEdit,
  onRemove,
  t,
}: {
  src: string;
  canManage: boolean;
  onEdit: () => void;
  onRemove: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-white">
      <div className="absolute top-0 left-0 w-1/3 h-1/3 checker-corner" />
      <img src={src} alt="" className="relative w-full h-full object-cover" />
      {canManage && (
        <>
          <button
            type="button"
            onClick={onEdit}
            className="absolute top-1 right-8 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-amber-600/85 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            title={t('collection.editBottle')}
            aria-label={t('collection.editBottle')}
          >
            E
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/85 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            title={t('collection.deleteBottle')}
            aria-label={t('collection.deleteBottle')}
          >
            x
          </button>
        </>
      )}
    </div>
  );
}
