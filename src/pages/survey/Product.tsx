import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  db,
  Draft,
  ProductCategory,
  ProductItem,
  ProductMaker,
  ProductModel,
  ProductSubcategory,
} from "../../lib/db";
import { useDraft, useEnsureDraft } from "../../store/useDraft";
import DuplicateOverlay from "../../components/DuplicateOverlay";

function includesQuery(value: string, query: string) {
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase());
}

type SortOrder = "asc" | "desc";

type DraftFields = Record<string, any>;

export default function ProductPage() {
  useEnsureDraft();
  const navigate = useNavigate();
  const { current, setFields, completeCurrent, listHistory } = useDraft();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [makers, setMakers] = useState<ProductMaker[]>([]);
  const [models, setModels] = useState<ProductModel[]>([]);

  const [categoryQuery, setCategoryQuery] = useState("");
  const [subcategoryQuery, setSubcategoryQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [makerQuery, setMakerQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");

  const [w, setW] = useState("");
  const [d, setD] = useState("");
  const [h, setH] = useState("");
  const [note, setNote] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<Draft[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyOrder, setHistoryOrder] = useState<SortOrder>("asc");

  const prevCategoryId = useRef<string | undefined>(undefined);
  const prevSubcategoryId = useRef<string | undefined>(undefined);
  const prevItemId = useRef<string | undefined>(undefined);
  const prevMakerId = useRef<string | undefined>(undefined);
  const prevModelId = useRef<string | undefined>(undefined);

  useEffect(() => {
    void Promise.all([
      db.product_categories.toArray(),
      db.product_subcategories.toArray(),
      db.product_items.toArray(),
      db.product_makers.toArray(),
      db.product_models.toArray(),
    ]).then(([c, s, i, m, mo]) => {
      setCategories(c);
      setSubcategories(s);
      setItems(i);
      setMakers(m);
      setModels(mo);
    });
  }, []);

  useEffect(() => {
    setW((current?.fields?.width as string) ?? "");
    setD((current?.fields?.depth as string) ?? "");
    setH((current?.fields?.height as string) ?? "");
    setNote((current?.fields?.note as string) ?? "");
  }, [current?.fields?.width, current?.fields?.depth, current?.fields?.height, current?.fields?.note]);

  const categoryId = current?.fields?.categoryId as string | undefined;
  const subcategoryId = current?.fields?.subcategoryId as string | undefined;
  const itemId = current?.fields?.itemId as string | undefined;
  const makerId = current?.fields?.makerId as string | undefined;
  const modelId = current?.fields?.modelId as string | undefined;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSubcategory = subcategories.find((s) => s.id === subcategoryId);
  const selectedItem = items.find((i) => i.id === itemId);
  const selectedMaker = makers.find((m) => m.id === makerId);
  const selectedModel = models.find((m) => m.id === modelId);

  useEffect(() => {
    if (selectedCategory?.id !== prevCategoryId.current) {
      if (selectedCategory) {
        setCategoryQuery(selectedCategory.name);
      } else if (prevCategoryId.current) {
        setCategoryQuery("");
      }
      prevCategoryId.current = selectedCategory?.id;
    }
  }, [selectedCategory]);
  useEffect(() => {
    if (selectedSubcategory?.id !== prevSubcategoryId.current) {
      if (selectedSubcategory) {
        setSubcategoryQuery(selectedSubcategory.name);
      } else if (prevSubcategoryId.current) {
        setSubcategoryQuery("");
      }
      prevSubcategoryId.current = selectedSubcategory?.id;
    }
  }, [selectedSubcategory]);
  useEffect(() => {
    if (selectedItem?.id !== prevItemId.current) {
      if (selectedItem) {
        setItemQuery(selectedItem.name);
      } else if (prevItemId.current) {
        setItemQuery("");
      }
      prevItemId.current = selectedItem?.id;
    }
  }, [selectedItem]);
  useEffect(() => {
    if (selectedMaker?.id !== prevMakerId.current) {
      if (selectedMaker) {
        setMakerQuery(selectedMaker.name);
      } else if (prevMakerId.current) {
        setMakerQuery("");
      }
      prevMakerId.current = selectedMaker?.id;
    }
  }, [selectedMaker]);
  useEffect(() => {
    if (selectedModel?.id !== prevModelId.current) {
      if (selectedModel) {
        setModelQuery(selectedModel.name);
      } else if (prevModelId.current) {
        setModelQuery("");
      }
      prevModelId.current = selectedModel?.id;
    }
  }, [selectedModel]);

  const filteredCategories = useMemo(() => categories.filter((c) => includesQuery(c.name, categoryQuery)), [categories, categoryQuery]);
  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => includesQuery(s.name, subcategoryQuery)),
    [subcategories, subcategoryQuery]
  );
  const filteredItems = useMemo(
    () => items.filter((it) => includesQuery(it.name, itemQuery)),
    [items, itemQuery]
  );
  const filteredMakers = useMemo(
    () => makers.filter((mk) => includesQuery(mk.name, makerQuery)),
    [makers, makerQuery]
  );
  const filteredModels = useMemo(
    () => models.filter((md) => includesQuery(md.name, modelQuery)),
    [models, modelQuery]
  );

  const selectCategory = (category: ProductCategory) => {
    if (categoryId === category.id) {
      setCategoryQuery("");
      setSubcategoryQuery("");
      setItemQuery("");
      setMakerQuery("");
      setModelQuery("");
      void setFields({
        categoryId: undefined,
        subcategoryId: undefined,
        itemId: undefined,
        makerId: undefined,
        modelId: undefined,
      });
      return;
    }
    setCategoryQuery(category.name);
    setSubcategoryQuery("");
    setItemQuery("");
    setMakerQuery("");
    setModelQuery("");
    void setFields({
      categoryId: category.id,
      subcategoryId: undefined,
      itemId: undefined,
      makerId: undefined,
      modelId: undefined,
    });
  };

  const selectSubcategory = (subcategory: ProductSubcategory) => {
    if (subcategoryId === subcategory.id) {
      setSubcategoryQuery("");
      setItemQuery("");
      setMakerQuery("");
      setModelQuery("");
      void setFields({
        categoryId: categoryId ?? subcategory.categoryId,
        subcategoryId: undefined,
        itemId: undefined,
        makerId: undefined,
        modelId: undefined,
      });
      return;
    }
    setSubcategoryQuery(subcategory.name);
    setItemQuery("");
    setMakerQuery("");
    setModelQuery("");
    void setFields({
      categoryId: subcategory.categoryId,
      subcategoryId: subcategory.id,
      itemId: undefined,
      makerId: undefined,
      modelId: undefined,
    });
  };

  const selectItem = (item: ProductItem) => {
    if (itemId === item.id) {
      setItemQuery("");
      setMakerQuery("");
      setModelQuery("");
      void setFields({
        categoryId: categoryId ?? item.categoryId,
        subcategoryId: subcategoryId ?? item.subcategoryId,
        itemId: undefined,
        makerId: undefined,
        modelId: undefined,
      });
      return;
    }
    setItemQuery(item.name);
    setMakerQuery("");
    setModelQuery("");
    void setFields({
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      itemId: item.id,
      makerId: undefined,
      modelId: undefined,
    });
  };

  const selectMaker = (maker: ProductMaker) => {
    if (makerId === maker.id) {
      setMakerQuery("");
      setModelQuery("");
      void setFields({
        categoryId: categoryId ?? maker.categoryId,
        subcategoryId: subcategoryId ?? maker.subcategoryId,
        itemId: itemId ?? maker.itemId,
        makerId: undefined,
        modelId: undefined,
      });
      return;
    }
    setMakerQuery(maker.name);
    setModelQuery("");
    void setFields({
      categoryId: maker.categoryId,
      subcategoryId: maker.subcategoryId,
      itemId: maker.itemId,
      makerId: maker.id,
      modelId: undefined,
    });
  };

  const selectModel = (model: ProductModel) => {
    if (modelId === model.id) {
      setModelQuery("");
      void setFields({
        categoryId: categoryId ?? model.categoryId,
        subcategoryId: subcategoryId ?? model.subcategoryId,
        itemId: itemId ?? model.itemId,
        makerId: makerId ?? model.makerId,
        modelId: undefined,
      });
      return;
    }
    setModelQuery(model.name);
    void setFields({
      categoryId: model.categoryId,
      subcategoryId: model.subcategoryId,
      itemId: model.itemId,
      makerId: model.makerId,
      modelId: model.id,
    });
  };

  const fetchHistory = useCallback(
    async (order: SortOrder) => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const rows = await listHistory(order);
        setHistoryItems(rows);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setHistoryError(message);
        setHistoryItems([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [listHistory]
  );

  useEffect(() => {
    if (historyOpen) {
      void fetchHistory(historyOrder);
    } else {
      setHistoryError(null);
    }
  }, [historyOpen, historyOrder, fetchHistory]);

  const hydrateFromFields = (fields: DraftFields) => {
    const nextCategoryId = fields.categoryId as string | undefined;
    const nextSubcategoryId = fields.subcategoryId as string | undefined;
    const nextItemId = fields.itemId as string | undefined;
    const nextMakerId = fields.makerId as string | undefined;
    const nextModelId = fields.modelId as string | undefined;
    const nextWidth = fields.width != null ? String(fields.width) : "";
    const nextDepth = fields.depth != null ? String(fields.depth) : "";
    const nextHeight = fields.height != null ? String(fields.height) : "";
    const nextNote = fields.note != null ? String(fields.note) : "";

    setW(nextWidth);
    setD(nextDepth);
    setH(nextHeight);
    setNote(nextNote);

    const cat = categories.find((c) => c.id === nextCategoryId);
    const subcat = subcategories.find((s) => s.id === nextSubcategoryId);
    const item = items.find((i) => i.id === nextItemId);
    const maker = makers.find((m) => m.id === nextMakerId);
    const model = models.find((m) => m.id === nextModelId);

    setCategoryQuery(cat?.name ?? "");
    setSubcategoryQuery(subcat?.name ?? "");
    setItemQuery(item?.name ?? "");
    setMakerQuery(maker?.name ?? "");
    setModelQuery(model?.name ?? "");

    void setFields({
      categoryId: nextCategoryId,
      subcategoryId: nextSubcategoryId,
      itemId: nextItemId,
      makerId: nextMakerId,
      modelId: nextModelId,
      width: nextWidth,
      depth: nextDepth,
      height: nextHeight,
      note: nextNote,
    });
  };

  const applyHistory = (draft: Draft) => {
    hydrateFromFields(draft.fields ?? {});
    setHistoryOpen(false);
  };

  const toggleHistoryOrder = () => {
    setHistoryOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleNext = async () => {
    await completeCurrent({
      preserveKeys: ["surveyDate", "investigator", "buildingId", "floorId", "departmentId", "divisionId"],
    });
    navigate("/survey/label");
  };

  const handleResetDepartment = () => {
    void setFields({ buildingId: undefined, floorId: undefined, departmentId: undefined, divisionId: undefined });
    navigate("/survey/department");
  };

  return (
    <div className="page">
      <div className="page-section">
        <h2 className="section-title">商品登録</h2>
        <div className="grid">
          <label>
            大分類
            <input value={categoryQuery} onChange={(e) => setCategoryQuery(e.target.value)} placeholder="大分類を検索" />
          </label>
          <div className="option-list">
            {filteredCategories.map((category) => (
              <button key={category.id} onClick={() => selectCategory(category)} className={category.id === categoryId ? "active" : ""}>
                {category.name}
              </button>
            ))}
          </div>
          <label>
            中分類
            <input value={subcategoryQuery} onChange={(e) => setSubcategoryQuery(e.target.value)} placeholder="中分類を検索" />
          </label>
          <div className="option-list">
            {filteredSubcategories.map((subcategory) => (
              <button key={subcategory.id} onClick={() => selectSubcategory(subcategory)} className={subcategory.id === subcategoryId ? "active" : ""}>
                {subcategory.name}
              </button>
            ))}
          </div>
          <label>
            品目
            <input value={itemQuery} onChange={(e) => setItemQuery(e.target.value)} placeholder="品目を検索" />
          </label>
          <div className="option-list">
            {filteredItems.map((item) => (
              <button key={item.id} onClick={() => selectItem(item)} className={item.id === itemId ? "active" : ""}>
                {item.name}
              </button>
            ))}
          </div>
          <label>
            メーカー名
            <input value={makerQuery} onChange={(e) => setMakerQuery(e.target.value)} placeholder="メーカー名を検索" />
          </label>
          <div className="option-list">
            {filteredMakers.map((maker) => (
              <button key={maker.id} onClick={() => selectMaker(maker)} className={maker.id === makerId ? "active" : ""}>
                {maker.name}
              </button>
            ))}
          </div>
          <label>
            型式
            <input value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} placeholder="型式を検索" />
          </label>
          <div className="option-list">
            {filteredModels.map((model) => (
              <button key={model.id} onClick={() => selectModel(model)} className={model.id === modelId ? "active" : ""}>
                {model.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid" style={{ marginTop: 16 }}>
          <label>
            W
            <input value={w} onChange={(e) => { const value = e.target.value; setW(value); void setFields({ width: value }); }} placeholder="mm" />
          </label>
          <label>
            D
            <input value={d} onChange={(e) => { const value = e.target.value; setD(value); void setFields({ depth: value }); }} placeholder="mm" />
          </label>
          <label>
            H
            <input value={h} onChange={(e) => { const value = e.target.value; setH(value); void setFields({ height: value }); }} placeholder="mm" />
          </label>
          <label>
            備考
            <textarea value={note} onChange={(e) => { const value = e.target.value; setNote(value); void setFields({ note: value }); }} rows={3} />
          </label>
        </div>
        <div className="row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
          <button type="button" className="ghost" onClick={() => setHistoryOpen(true)}>履歴表示</button>
        </div>
      </div>
      <footer className="page-footer">
        <button type="button" className="ghost" onClick={() => setDuplicateOpen(true)}>複製</button>
        <button className="ghost" onClick={() => navigate("/survey/asset")}>戻る</button>
        <button className="secondary" onClick={handleResetDepartment}>部門</button>
        <button onClick={handleNext}>次へ</button>
      </footer>

      {historyOpen && (
        <div className="history-overlay">
          <div className="history-panel">
            <div className="history-header">
              <h3>作業履歴</h3>
              <div className="row">
                <button className="ghost" onClick={toggleHistoryOrder}>
                  {historyOrder === "asc" ? "降順にする" : "昇順にする"}
                </button>
                <button className="ghost" onClick={() => setHistoryOpen(false)}>閉じる</button>
              </div>
            </div>
            {historyLoading && <p className="helper-text">読み込み中...</p>}
            {historyError && <p className="badge warn">エラー: {historyError}</p>}
            {!historyLoading && !historyError && historyItems.length === 0 && (
              <p className="helper-text">表示できる履歴がありません。</p>
            )}
            {!historyLoading && !historyError && historyItems.length > 0 && (
              <div className="history-list">
                {historyItems.map((draft) => {
                  const fields = (draft.fields ?? {}) as DraftFields;
                  const completedAt = fields.completedAt ?? draft.updatedAt;
                  const catName = categories.find((c) => c.id === fields.categoryId)?.name ?? "-";
                  const subcatName = subcategories.find((s) => s.id === fields.subcategoryId)?.name ?? "-";
                  const itemName = items.find((i) => i.id === fields.itemId)?.name ?? "-";
                  const makerName = makers.find((m) => m.id === fields.makerId)?.name ?? "-";
                  const modelName = models.find((m) => m.id === fields.modelId)?.name ?? "-";
                  const width = fields.width ?? "-";
                  const depth = fields.depth ?? "-";
                  const height = fields.height ?? "-";
                  return (
                    <button
                      type="button"
                      key={draft.id}
                      className="history-row"
                      onClick={() => applyHistory(draft)}
                    >
                      <div className="history-meta">
                        <span>{new Date(completedAt).toLocaleString()}</span>
                        {fields.assetNo && <span className="pill">資産 {fields.assetNo}</span>}
                        {fields.equipmentNo && <span className="pill">備品 {fields.equipmentNo}</span>}
                        {fields.sealNo && <span className="pill">QR {fields.sealNo}</span>}
                      </div>
                      <div className="history-tags">
                        <span className="pill">{catName}</span>
                        <span className="pill">{subcatName}</span>
                        <span className="pill">{itemName}</span>
                        <span className="pill">{makerName}</span>
                        <span className="pill">{modelName}</span>
                      </div>
                      <div className="history-meta">
                        <span>W: {width}</span>
                        <span>D: {depth}</span>
                        <span>H: {height}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <DuplicateOverlay open={duplicateOpen} onClose={() => setDuplicateOpen(false)} />
    </div>
  );
}
