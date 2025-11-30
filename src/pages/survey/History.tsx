import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, Draft, ProductCategory, ProductSubcategory, ProductItem, ProductMaker, ProductModel } from "../../lib/db";
import { useDraft, useEnsureDraft } from "../../store/useDraft";

type DraftFields = Record<string, any>;

function includesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase());
}

export default function HistoryPage() {
  useEnsureDraft();
  const navigate = useNavigate();
  const { listHistory, setFields, setQR } = useDraft();

  const [historyItems, setHistoryItems] = useState<Draft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [height, setHeight] = useState("");
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
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [makerId, setMakerId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [categoryOptionsOpen, setCategoryOptionsOpen] = useState(false);
  const [subcategoryOptionsOpen, setSubcategoryOptionsOpen] = useState(false);
  const [itemOptionsOpen, setItemOptionsOpen] = useState(false);
  const [makerOptionsOpen, setMakerOptionsOpen] = useState(false);
  const [modelOptionsOpen, setModelOptionsOpen] = useState(false);

  useEffect(() => {
    void Promise.all([
      listHistory("desc"),
      db.product_categories.toArray(),
      db.product_subcategories.toArray(),
      db.product_items.toArray(),
      db.product_makers.toArray(),
      db.product_models.toArray(),
    ]).then(([rows, c, s, i, m, mo]) => {
      setHistoryItems(rows);
      setCategories(c);
      setSubcategories(s);
      setItems(i);
      setMakers(m);
      setModels(mo);
    });
  }, [listHistory]);

  const selectedDraft = useMemo(() => historyItems.find((d) => d.id === selectedId), [historyItems, selectedId]);

  const resolvedCategoryId = useMemo(() => {
    if (categoryId) return categoryId;
    const name = categoryQuery.trim().toLowerCase();
    if (!name) return null;
    const match = categories.find((c) => c.name.toLowerCase() === name);
    return match?.id ?? null;
  }, [categoryId, categoryQuery, categories]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => includesQuery(c.name, categoryQuery)),
    [categories, categoryQuery]
  );

  const resolvedSubcategoryId = useMemo(() => {
    if (subcategoryId) return subcategoryId;
    const name = subcategoryQuery.trim().toLowerCase();
    if (!name || !resolvedCategoryId) return null;
    const match = subcategories.find(
      (s) => s.categoryId === resolvedCategoryId && s.name.toLowerCase() === name
    );
    return match?.id ?? null;
  }, [subcategoryId, subcategoryQuery, resolvedCategoryId, subcategories]);

  const filteredSubcategories = useMemo(() => {
    const base = resolvedCategoryId ? subcategories.filter((s) => s.categoryId === resolvedCategoryId) : subcategories;
    return base.filter((s) => includesQuery(s.name, subcategoryQuery));
  }, [resolvedCategoryId, subcategories, subcategoryQuery]);

  const resolvedItemId = useMemo(() => {
    if (itemId) return itemId;
    const name = itemQuery.trim().toLowerCase();
    if (!name || !resolvedSubcategoryId) return null;
    const match = items.find((it) => it.subcategoryId === resolvedSubcategoryId && it.name.toLowerCase() === name);
    return match?.id ?? null;
  }, [itemId, itemQuery, resolvedSubcategoryId, items]);

  const filteredItems = useMemo(() => {
    const base = resolvedSubcategoryId ? items.filter((it) => it.subcategoryId === resolvedSubcategoryId) : items;
    return base.filter((it) => includesQuery(it.name, itemQuery));
  }, [resolvedSubcategoryId, items, itemQuery]);

  const resolvedMakerId = useMemo(() => {
    if (makerId) return makerId;
    const name = makerQuery.trim().toLowerCase();
    if (!name || !resolvedItemId) return null;
    const match = makers.find((mk) => mk.itemId === resolvedItemId && mk.name.toLowerCase() === name);
    return match?.id ?? null;
  }, [makerId, makerQuery, resolvedItemId, makers]);

  const filteredMakers = useMemo(() => {
    const base = resolvedItemId ? makers.filter((mk) => mk.itemId === resolvedItemId) : makers;
    return base.filter((mk) => includesQuery(mk.name, makerQuery));
  }, [resolvedItemId, makers, makerQuery]);

  const resolvedModelId = useMemo(() => {
    if (modelId) return modelId;
    const name = modelQuery.trim().toLowerCase();
    if (!name || !resolvedMakerId) return null;
    const match = models.find((md) => md.makerId === resolvedMakerId && md.name.toLowerCase() === name);
    return match?.id ?? null;
  }, [modelId, modelQuery, resolvedMakerId, models]);

  const filteredModels = useMemo(() => {
    const base = resolvedMakerId ? models.filter((md) => md.makerId === resolvedMakerId) : models;
    return base.filter((md) => includesQuery(md.name, modelQuery));
  }, [resolvedMakerId, models, modelQuery]);

  const displayNames = (draft: Draft) => {
    const fields = (draft.fields ?? {}) as DraftFields;
    const qr =
      (fields.sealNo as string | undefined) ??
      (fields.qrCode as string | undefined) ??
      (fields.qr as string | undefined) ??
      (draft.qr as string | undefined) ??
      "-";
    const catName =
      (fields.categoryName as string | undefined) ?? categories.find((c) => c.id === fields.categoryId)?.name ?? "-";
    const subcatName =
      (fields.subcategoryName as string | undefined) ??
      subcategories.find((s) => s.id === fields.subcategoryId)?.name ??
      "-";
    const itemName =
      (fields.itemName as string | undefined) ?? items.find((it) => it.id === fields.itemId)?.name ?? "-";
    const makerName =
      (fields.makerName as string | undefined) ?? makers.find((mk) => mk.id === fields.makerId)?.name ?? "-";
    const modelName =
      (fields.modelName as string | undefined) ?? models.find((md) => md.id === fields.modelId)?.name ?? "-";
    const width = fields.width ?? "-";
    const depth = fields.depth ?? "-";
    const height = fields.height ?? "-";
    return { qr, catName, subcatName, itemName, makerName, modelName, width, depth, height };
  };

  const handleReuse = async () => {
    if (!selectedDraft) return;
    const fields = (selectedDraft.fields ?? {}) as DraftFields;
    const reuseFields: DraftFields = {
      categoryId: fields.categoryId,
      categoryName: fields.categoryName,
      subcategoryId: fields.subcategoryId,
      subcategoryName: fields.subcategoryName,
      itemId: fields.itemId,
      itemName: fields.itemName,
      makerId: fields.makerId,
      makerName: fields.makerName,
      modelId: fields.modelId,
      modelName: fields.modelName,
      width: fields.width,
      depth: fields.depth,
      height: fields.height,
    };
    await setFields(reuseFields);
    navigate("/survey/all");
  };

  const handleEnterEdit = () => {
    if (!selectedDraft) return;
    const { catName, subcatName, itemName, makerName, modelName, width, depth, height } = displayNames(selectedDraft);
    const fields = (selectedDraft.fields ?? {}) as DraftFields;
    setCategoryId((fields.categoryId as string | undefined) ?? null);
    setSubcategoryId((fields.subcategoryId as string | undefined) ?? null);
    setItemId((fields.itemId as string | undefined) ?? null);
    setMakerId((fields.makerId as string | undefined) ?? null);
    setModelId((fields.modelId as string | undefined) ?? null);
    setCategoryQuery(catName === "-" ? "" : catName);
    setSubcategoryQuery(subcatName === "-" ? "" : subcatName);
    setItemQuery(itemName === "-" ? "" : itemName);
    setMakerQuery(makerName === "-" ? "" : makerName);
    setModelQuery(modelName === "-" ? "" : modelName);
    setWidth(width === "-" ? "" : String(width));
    setDepth(depth === "-" ? "" : String(depth));
    setHeight(height === "-" ? "" : String(height));
    setCategoryOptionsOpen(false);
    setSubcategoryOptionsOpen(false);
    setItemOptionsOpen(false);
    setMakerOptionsOpen(false);
    setModelOptionsOpen(false);
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!selectedDraft) return;
    const nextFields = {
      ...(selectedDraft.fields ?? {}),
      categoryId: categoryId ?? undefined,
      categoryName: categoryQuery ?? "",
      subcategoryId: subcategoryId ?? undefined,
      subcategoryName: subcategoryQuery ?? "",
      itemId: itemId ?? undefined,
      itemName: itemQuery ?? "",
      makerId: makerId ?? undefined,
      makerName: makerQuery ?? "",
      modelId: modelId ?? undefined,
      modelName: modelQuery ?? "",
      width: width ?? "",
      depth: depth ?? "",
      height: height ?? "",
    };
    await db.survey_drafts.put({
      ...selectedDraft,
      fields: nextFields,
      updatedAt: Date.now(),
    });
    const rows = await listHistory("desc");
    setHistoryItems(rows);
    setEditMode(false);
  };

  const handleCategoryInput = (value: string) => {
    setCategoryQuery(value);
    setCategoryId(null);
    setSubcategoryQuery("");
    setSubcategoryId(null);
    setItemQuery("");
    setItemId(null);
    setMakerQuery("");
    setMakerId(null);
    setModelQuery("");
    setModelId(null);
  };

  const handleSubcategoryInput = (value: string) => {
    setSubcategoryQuery(value);
    setSubcategoryId(null);
    setItemQuery("");
    setItemId(null);
    setMakerQuery("");
    setMakerId(null);
    setModelQuery("");
    setModelId(null);
  };

  const handleItemInput = (value: string) => {
    setItemQuery(value);
    setItemId(null);
    setMakerQuery("");
    setMakerId(null);
    setModelQuery("");
    setModelId(null);
  };

  const handleMakerInput = (value: string) => {
    setMakerQuery(value);
    setMakerId(null);
    setModelQuery("");
    setModelId(null);
  };

  const handleModelInput = (value: string) => {
    setModelQuery(value);
    setModelId(null);
  };

  const selectCategory = (category: ProductCategory) => {
    if (categoryId === category.id) {
      handleCategoryInput("");
      return;
    }
    setCategoryId(category.id);
    setCategoryQuery(category.name);
    setSubcategoryQuery("");
    setSubcategoryId(null);
    setItemQuery("");
    setItemId(null);
    setMakerQuery("");
    setMakerId(null);
    setModelQuery("");
    setModelId(null);
    setCategoryOptionsOpen(false);
  };

  const selectSubcategory = (subcategory: ProductSubcategory) => {
    if (subcategoryId === subcategory.id) {
      handleSubcategoryInput("");
      return;
    }
    const parentCategory = categories.find((c) => c.id === subcategory.categoryId);
    setCategoryQuery(parentCategory?.name ?? "");
    setCategoryId(subcategory.categoryId);
    setSubcategoryId(subcategory.id);
    setSubcategoryQuery(subcategory.name);
    setItemQuery("");
    setItemId(null);
    setMakerQuery("");
    setMakerId(null);
    setModelQuery("");
    setModelId(null);
    setSubcategoryOptionsOpen(false);
  };

  const selectItem = (item: ProductItem) => {
    if (itemId === item.id) {
      handleItemInput("");
      return;
    }
    const parentSubcategory = subcategories.find((s) => s.id === item.subcategoryId);
    const parentCategory = categories.find((c) => c.id === item.categoryId);
    setCategoryQuery(parentCategory?.name ?? "");
    setSubcategoryQuery(parentSubcategory?.name ?? "");
    setCategoryId(item.categoryId);
    setSubcategoryId(item.subcategoryId);
    setItemId(item.id);
    setItemQuery(item.name);
    setMakerQuery("");
    setMakerId(null);
    setModelQuery("");
    setModelId(null);
    setItemOptionsOpen(false);
  };

  const selectMaker = (maker: ProductMaker) => {
    if (makerId === maker.id) {
      handleMakerInput("");
      return;
    }
    const parentItem = items.find((it) => it.id === maker.itemId);
    const parentSubcategory = subcategories.find((s) => s.id === maker.subcategoryId);
    const parentCategory = categories.find((c) => c.id === maker.categoryId);
    setCategoryQuery(parentCategory?.name ?? "");
    setSubcategoryQuery(parentSubcategory?.name ?? "");
    setItemQuery(parentItem?.name ?? "");
    setCategoryId(maker.categoryId);
    setSubcategoryId(maker.subcategoryId);
    setItemId(maker.itemId);
    setMakerId(maker.id);
    setMakerQuery(maker.name);
    setModelQuery("");
    setModelId(null);
    setMakerOptionsOpen(false);
  };

  const selectModel = (model: ProductModel) => {
    if (modelId === model.id) {
      handleModelInput("");
      return;
    }
    const parentMaker = makers.find((mk) => mk.id === model.makerId);
    const parentItem = items.find((it) => it.id === model.itemId);
    const parentSubcategory = subcategories.find((s) => s.id === model.subcategoryId);
    const parentCategory = categories.find((c) => c.id === model.categoryId);
    setCategoryQuery(parentCategory?.name ?? "");
    setSubcategoryQuery(parentSubcategory?.name ?? "");
    setItemQuery(parentItem?.name ?? "");
    setMakerQuery(parentMaker?.name ?? "");
    setCategoryId(model.categoryId);
    setSubcategoryId(model.subcategoryId);
    setItemId(model.itemId);
    setMakerId(model.makerId);
    setModelId(model.id);
    setModelQuery(model.name);
    setModelOptionsOpen(false);
  };

  return (
    <div className="page">
      <div>
        <div className="history-list">
          {historyItems.map((draft) => {
            const names = displayNames(draft);
            const selected = draft.id === selectedId;
            const isEditingThis = editMode && selected;
            if (isEditingThis) {
              return (
                <div
                  key={draft.id}
                  className="history-row is-selected"
                >
                  <div className="history-card-grid">
                    <label>
                      QRコード
                      <input value={names.qr} readOnly />
                    </label>
                    <label>
                      大分類
                      <input
                        value={categoryQuery}
                        onChange={(e) => handleCategoryInput(e.target.value)}
                        onFocus={() => setCategoryOptionsOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setCategoryOptionsOpen(false), 100);
                        }}
                        placeholder="大分類を検索"
                      />
                    </label>
                    {categoryOptionsOpen && filteredCategories.length > 0 && (
                      <div className="option-list">
                        {filteredCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => selectCategory(category)}
                            className={category.id === categoryId ? "active" : ""}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <label>
                      中分類
                      <input
                        value={subcategoryQuery}
                        onChange={(e) => handleSubcategoryInput(e.target.value)}
                        onFocus={() => setSubcategoryOptionsOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setSubcategoryOptionsOpen(false), 100);
                        }}
                        placeholder="中分類を検索"
                      />
                    </label>
                    {subcategoryOptionsOpen && filteredSubcategories.length > 0 && (
                      <div className="option-list">
                        {filteredSubcategories.map((subcategory) => (
                          <button
                            key={subcategory.id}
                            type="button"
                            onClick={() => selectSubcategory(subcategory)}
                            className={subcategory.id === subcategoryId ? "active" : ""}
                          >
                            {subcategory.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <label>
                      品目
                      <input
                        value={itemQuery}
                        onChange={(e) => handleItemInput(e.target.value)}
                        onFocus={() => setItemOptionsOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setItemOptionsOpen(false), 100);
                        }}
                        placeholder="品目を検索"
                      />
                    </label>
                    {itemOptionsOpen && filteredItems.length > 0 && (
                      <div className="option-list">
                        {filteredItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectItem(item)}
                            className={item.id === itemId ? "active" : ""}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <label>
                      メーカー名
                      <input
                        value={makerQuery}
                        onChange={(e) => handleMakerInput(e.target.value)}
                        onFocus={() => setMakerOptionsOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setMakerOptionsOpen(false), 100);
                        }}
                        placeholder="メーカーを検索"
                      />
                    </label>
                    {makerOptionsOpen && filteredMakers.length > 0 && (
                      <div className="option-list">
                        {filteredMakers.map((maker) => (
                          <button
                            key={maker.id}
                            type="button"
                            onClick={() => selectMaker(maker)}
                            className={maker.id === makerId ? "active" : ""}
                          >
                            {maker.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <label>
                      型式
                      <input
                        value={modelQuery}
                        onChange={(e) => handleModelInput(e.target.value)}
                        onFocus={() => setModelOptionsOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setModelOptionsOpen(false), 100);
                        }}
                        placeholder="型式を検索"
                      />
                    </label>
                    {modelOptionsOpen && filteredModels.length > 0 && (
                      <div className="option-list">
                        {filteredModels.map((model) => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => selectModel(model)}
                            className={model.id === modelId ? "active" : ""}
                          >
                            {model.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <label>
                      W
                      <input
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                      />
                    </label>
                    <label>
                      D
                      <input
                        value={depth}
                        onChange={(e) => setDepth(e.target.value)}
                      />
                    </label>
                    <label>
                      H
                      <input
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={draft.id}
                type="button"
                className={`history-row${selected ? " is-selected" : ""}`}
                onClick={() => setSelectedId(draft.id)}
              >
                <div className="history-card-grid">
                  <label>
                    QRコード
                    <div className="history-value">{names.qr}</div>
                  </label>
                  <label>
                    大分類
                    <div className="history-value">{names.catName}</div>
                  </label>
                  <label>
                    中分類
                    <div className="history-value">{names.subcatName}</div>
                  </label>
                  <label>
                    品目
                    <div className="history-value">{names.itemName}</div>
                  </label>
                  <label>
                    メーカー名
                    <div className="history-value">{names.makerName}</div>
                  </label>
                  <label>
                    型式
                    <div className="history-value">{names.modelName}</div>
                  </label>
                  <label>
                    W
                    <div className="history-value">{names.width}</div>
                  </label>
                  <label>
                    D
                    <div className="history-value">{names.depth}</div>
                  </label>
                  <label>
                    H
                    <div className="history-value">{names.height}</div>
                  </label>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="page-footer">
        {editMode ? (
          <>
            <button type="button" className="ghost" onClick={() => setEditMode(false)}>
              キャンセル
            </button>
            <button type="button" onClick={handleSave}>
              保存
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ghost" onClick={() => navigate(-1)}>
              戻る
            </button>
            <button type="button" className="ghost" onClick={handleEnterEdit} disabled={!selectedDraft}>
              修正
            </button>
            <button type="button" onClick={handleReuse} disabled={!selectedDraft}>
              再利用
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
