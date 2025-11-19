import { useEffect } from "react";
import { create } from "zustand";
import { db, Draft, Photo } from "../lib/db";
import { compressToWebp } from "../lib/image";

type CompleteOptions = {
  preserveKeys?: string[];
};

type SortOrder = "asc" | "desc";

type DraftState = {
  current?: Draft;
  photos: Photo[];
  completedCount: number;
  newDraft: () => Promise<string>;
  load: (id: string) => Promise<void>;
  setField: (key: string, value: any) => Promise<void>;
  setFields: (patch: Record<string, any>) => Promise<void>;
  setQR: (qr: string) => Promise<void>;
  attachPhoto: (file: File) => Promise<void>;
  removePhoto: (photoId: string) => Promise<void>;
  togglePhotoForList: (photoId: string) => Promise<void>;
  refreshPhotos: () => Promise<void>;
  refreshStats: () => Promise<void>;
  completeCurrent: (options?: CompleteOptions) => Promise<string | undefined>;
  clearCurrent: () => Promise<void>;
  listHistory: (order?: SortOrder) => Promise<Draft[]>;
  purgeCompleted: () => Promise<number>;
  duplicateDraft: (baseDraftId: string, count: number) => Promise<number>;
};

export const useDraft = create<DraftState>((set, get) => {
  const refreshPhotosInternal = async () => {
    const cur = get().current;
    if (!cur) {
      set({ photos: [] });
      return;
    }
    const rows = await db.survey_photos.where("draftId").equals(cur.id).reverse().toArray();
    set({ photos: rows });
  };

  const refreshStatsInternal = async () => {
    const count = await db.survey_drafts.filter((d) => d.fields?.status === "completed").count();
    set({ completedCount: count });
  };

  const writeDraft = async (next: Draft) => {
    await db.survey_drafts.put(next);
    set({ current: next });
    await refreshStatsInternal();
  };

  const state: DraftState = {
    current: undefined,
    photos: [],
    completedCount: 0,
    async newDraft() {
      const id = crypto.randomUUID();
      const draft: Draft = { id, fields: {}, photoIds: [], updatedAt: Date.now() };
      await db.survey_drafts.put(draft);
      set({ current: draft });
      setTimeout(() => {
        void refreshPhotosInternal();
      }, 0);
      await refreshStatsInternal();
      return id;
    },
    async load(id) {
      let draft = await db.survey_drafts.get(id);
      if (!draft) {
        draft = { id, fields: {}, photoIds: [], updatedAt: Date.now() };
        await db.survey_drafts.put(draft);
      }
      set({ current: draft });
      await refreshPhotosInternal();
      await refreshStatsInternal();
    },
    async setField(key, value) {
      const cur = get().current;
      if (!cur) return;
      const nextFields = { ...cur.fields };
      if (value === undefined || value === null || value === "") {
        delete nextFields[key];
      } else {
        nextFields[key] = value;
      }
      const next: Draft = { ...cur, fields: nextFields, updatedAt: Date.now() };
      await writeDraft(next);
    },
    async setFields(patch) {
      const cur = get().current;
      if (!cur) return;
      const nextFields = { ...cur.fields };
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          delete nextFields[key];
        } else {
          nextFields[key] = value;
        }
      });
      const next: Draft = { ...cur, fields: nextFields, updatedAt: Date.now() };
      await writeDraft(next);
    },
    async setQR(qr) {
      const cur = get().current;
      if (!cur) return;
      const next: Draft = {
        ...cur,
        qr,
        fields: { ...cur.fields, sealNo: qr, qrCode: qr },
        updatedAt: Date.now(),
      };
      await writeDraft(next);
    },
    async attachPhoto(file) {
      const cur = get().current;
      if (!cur) return;
      const { blob, thumb } = await compressToWebp(file);
      const existing = await db.survey_photos.where("draftId").equals(cur.id).count();
      const photo: Photo = {
        id: crypto.randomUUID(),
        draftId: cur.id,
        blob,
        thumb,
        size: blob.size,
        createdAt: Date.now(),
        selectedForList: existing === 0,
      };
      await db.survey_photos.put(photo);
      const next: Draft = {
        ...cur,
        photoIds: [...cur.photoIds, photo.id],
        updatedAt: Date.now(),
      };
      await writeDraft(next);
      await refreshPhotosInternal();
    },
    async togglePhotoForList(photoId) {
      const cur = get().current;
      if (!cur) return;
      const target = await db.survey_photos.get(photoId);
      const willSelect = !target?.selectedForList;
      await db.survey_photos
        .where("draftId")
        .equals(cur.id)
        .modify((photo) => {
          // eslint-disable-next-line no-param-reassign
          photo.selectedForList = willSelect && photo.id === photoId;
        });
      await refreshPhotosInternal();
    },
    async removePhoto(photoId) {
      const cur = get().current;
      if (!cur) return;
      await db.survey_photos.delete(photoId);
      const nextPhotoIds = cur.photoIds.filter((id) => id !== photoId);
      const next: Draft = {
        ...cur,
        photoIds: nextPhotoIds,
        updatedAt: Date.now(),
      };
      await writeDraft(next);
      await refreshPhotosInternal();
    },
    async refreshPhotos() {
      await refreshPhotosInternal();
    },
    async refreshStats() {
      await refreshStatsInternal();
    },
    async completeCurrent(options) {
      const cur = get().current;
      if (!cur) return;
      const next: Draft = {
        ...cur,
        fields: { ...cur.fields, status: "completed", completedAt: Date.now() },
        updatedAt: Date.now(),
      };
      await writeDraft(next);
      await refreshPhotosInternal();
      const newId = await get().newDraft();
      await refreshPhotosInternal();
      const preserveKeys = options?.preserveKeys ?? [];
      if (preserveKeys.length > 0) {
        const preserved: Record<string, any> = {};
        preserveKeys.forEach((key) => {
          if (cur.fields?.[key] !== undefined) {
            preserved[key] = cur.fields[key];
          }
        });
        if (Object.keys(preserved).length > 0) {
          await get().setFields(preserved);
        }
      }
      return newId;
    },
    async clearCurrent() {
      const cur = get().current;
      if (!cur) return;
      await db.survey_photos.where("draftId").equals(cur.id).delete();
      await db.survey_drafts.delete(cur.id);
      set({ current: undefined, photos: [] });
      await refreshStatsInternal();
    },
    async listHistory(order: SortOrder = "asc") {
      const collection = db.survey_drafts.orderBy("updatedAt");
      const rows = order === "desc" ? await collection.reverse().toArray() : await collection.toArray();
      return rows.filter((draft) => draft.fields?.status === "completed");
    },
    async purgeCompleted() {
      const completed = await db.survey_drafts.filter((draft) => draft.fields?.status === "completed").toArray();
      if (completed.length === 0) {
        return 0;
      }
      await db.transaction("rw", db.survey_drafts, db.survey_photos, async () => {
        for (const draft of completed) {
          await db.survey_photos.where("draftId").equals(draft.id).delete();
          await db.survey_drafts.delete(draft.id);
        }
      });
      const currentDraft = get().current;
      if (currentDraft && completed.some((draft) => draft.id === currentDraft.id)) {
        set({ current: undefined, photos: [] });
      }
      await refreshStatsInternal();
      await refreshPhotosInternal();
      return completed.length;
    },
    async duplicateDraft(baseDraftId, count) {
      if (count <= 0) return 0;
      const baseDraft = await db.survey_drafts.get(baseDraftId);
      if (!baseDraft) {
        throw new Error("複製元の履歴が見つかりません");
      }
      const baseFields = { ...(baseDraft.fields ?? {}) };
      const baseQr =
        (baseFields.sealNo as string | undefined) ||
        (baseFields.qr as string | undefined) ||
        (baseFields.qrCode as string | undefined) ||
        (baseDraft.qr as string | undefined);
      if (!baseQr) {
        throw new Error("複製元のQRコードが取得できませんでした");
      }
      const qrMatch = baseQr.match(/(\d+)(?!.*\d)/);
      const numericStart = qrMatch ? qrMatch.index ?? -1 : -1;
      const baseNumber = qrMatch ? parseInt(qrMatch[1], 10) : null;
      const digitLength = qrMatch ? qrMatch[1].length : 0;
      const basePrefix = numericStart >= 0 ? baseQr.slice(0, numericStart) : baseQr;
      const baseSuffix = numericStart >= 0 ? baseQr.slice(numericStart + digitLength) : "";

      const basePhotos = await db.survey_photos.where("draftId").equals(baseDraftId).toArray();
      const clones: Draft[] = [];
      const newPhotos: Photo[] = [];
      const now = Date.now();

      const makeQr = (offset: number) => {
        if (baseNumber !== null) {
          const nextNumber = baseNumber + offset;
          const padded = String(nextNumber).padStart(digitLength, "0");
          return `${basePrefix}${padded}${baseSuffix}`;
        }
        // fallback: append suffix with offset
        return `${baseQr}-${offset}`;
      };

      for (let i = 1; i <= count; i++) {
        const newId = crypto.randomUUID();
        const newQr = makeQr(i);
        const newPhotoIds: string[] = [];
        const cloneFields = {
          ...baseFields,
          qr: newQr,
          qrCode: newQr,
          sealNo: newQr,
          status: "completed",
          completedAt: now + i,
        };

        basePhotos.forEach((photo) => {
          const newPhotoId = crypto.randomUUID();
          newPhotoIds.push(newPhotoId);
          newPhotos.push({
            ...photo,
            id: newPhotoId,
            draftId: newId,
            createdAt: now + i,
          });
        });

        clones.push({
          id: newId,
          fields: cloneFields,
          photoIds: newPhotoIds,
          updatedAt: now + i,
        });
      }

      await db.transaction("rw", db.survey_drafts, db.survey_photos, async () => {
        if (newPhotos.length > 0) {
          await db.survey_photos.bulkPut(newPhotos);
        }
        if (clones.length > 0) {
          await db.survey_drafts.bulkPut(clones);
        }
      });

      await refreshStatsInternal();
      const currentDraft = get().current;
      if (currentDraft) {
        const refreshed = await db.survey_drafts.get(currentDraft.id);
        if (refreshed) {
          set({ current: refreshed });
        }
      }
      return clones.length;
    },
  };

  void refreshStatsInternal();
  return state;
});

export function useEnsureDraft() {
  const { current, newDraft } = useDraft();
  useEffect(() => {
    if (!current) {
      void newDraft();
    }
  }, [current, newDraft]);
}
