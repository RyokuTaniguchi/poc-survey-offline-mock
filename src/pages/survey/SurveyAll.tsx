import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  db,
  Building,
  Floor,
  Department,
  Division,
  Room,
  Draft,
  ProductCategory,
  ProductSubcategory,
  ProductItem,
  ProductMaker,
  ProductModel,
} from "../../lib/db";
import { useDraft, useEnsureDraft } from "../../store/useDraft";
import OcrCaptureDialog from "../../components/OcrCaptureDialog";
import { QRScanner, QRScannerHandle } from "../../lib/qr";
import { primeOcrWorker, type OcrResult } from "../../lib/ocr";
import { ensureCameraAccess } from "../../lib/camera";

function includesQuery(value: string, query: string) {
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase());
}

type SortOrder = "asc" | "desc";
type DraftFields = Record<string, any>;

export default function SurveyAllPage() {
  useEnsureDraft();
  const navigate = useNavigate();
  const draftStore = useDraft();
  const {
    current,
    photos,
    attachPhoto,
    removePhoto,
    setFields,
    completeCurrent,
    listHistory,
    load,
    completedCount,
    duplicateDraft,
    setQR,
    togglePhotoForList,
  } = draftStore;

  // ===== 部署入力セクション =====
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [buildingQuery, setBuildingQuery] = useState("");
  const [floorQuery, setFloorQuery] = useState("");
  const [departmentQuery, setDepartmentQuery] = useState("");
  const [divisionQuery, setDivisionQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | undefined>(undefined);
  const [selectedFloorId, setSelectedFloorId] = useState<string | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>(undefined);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | undefined>(undefined);

  const surveyDate = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, "0")}月${String(today.getDate()).padStart(2, "0")}日`;
  }, []);
  const investigator = typeof window !== "undefined" ? sessionStorage.getItem("mockUserEmail") ?? "" : "";

  useEffect(() => {
    void Promise.all([
      db.location_buildings.toArray(),
      db.location_floors.toArray(),
      db.location_departments.toArray(),
      db.location_divisions.toArray(),
    ]).then(([b, f, d, v]) => {
      setBuildings(b);
      setFloors(f);
      setDepartments(d);
      setDivisions(v);
    });
  }, []);

  useEffect(() => {
    if (!current) return;
    const updates: Record<string, any> = {};
    if (!current.fields?.surveyDate) {
      updates.surveyDate = surveyDate;
    }
    if (investigator && current.fields?.investigator !== investigator) {
      updates.investigator = investigator;
    }
    if (Object.keys(updates).length > 0) {
      void setFields(updates);
    }
  }, [current, investigator, setFields, surveyDate]);

  const buildingId = current?.fields?.buildingId as string | undefined;
  const floorId = current?.fields?.floorId as string | undefined;
  const departmentId = current?.fields?.departmentId as string | undefined;
  const divisionId = current?.fields?.divisionId as string | undefined;

  useEffect(() => {
    setSelectedBuildingId(buildingId);
  }, [buildingId]);
  useEffect(() => {
    setSelectedFloorId(floorId);
  }, [floorId]);
  useEffect(() => {
    setSelectedDepartmentId(departmentId);
  }, [departmentId]);
  useEffect(() => {
    setSelectedDivisionId(divisionId);
  }, [divisionId]);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId),
    [buildings, selectedBuildingId]
  );
  const selectedFloor = useMemo(
    () => floors.find((f) => f.id === selectedFloorId),
    [floors, selectedFloorId]
  );
  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === selectedDepartmentId),
    [departments, selectedDepartmentId]
  );
  const selectedDivision = useMemo(
    () => divisions.find((v) => v.id === selectedDivisionId),
    [divisions, selectedDivisionId]
  );

  useEffect(() => {
    setBuildingQuery(selectedBuilding?.name ?? "");
  }, [selectedBuilding]);
  useEffect(() => {
    setFloorQuery(selectedFloor?.name ?? "");
  }, [selectedFloor]);
  useEffect(() => {
    setDepartmentQuery(selectedDepartment?.name ?? "");
  }, [selectedDepartment]);
  useEffect(() => {
    setDivisionQuery(selectedDivision?.name ?? "");
  }, [selectedDivision]);

  const filteredBuildings = useMemo(
    () => buildings.filter((b) => includesQuery(b.name, buildingQuery)),
    [buildings, buildingQuery]
  );
  const filteredFloors = useMemo(
    () => floors.filter((f) => includesQuery(f.name, floorQuery)),
    [floors, floorQuery]
  );
  const filteredDepartments = useMemo(
    () => departments.filter((d) => includesQuery(d.name, departmentQuery)),
    [departments, departmentQuery]
  );
  const filteredDivisions = useMemo(
    () => divisions.filter((v) => includesQuery(v.name, divisionQuery)),
    [divisions, divisionQuery]
  );

  const handleSelectBuilding = (b: Building) => {
    if (selectedBuildingId === b.id) {
      setBuildingQuery("");
      setFloorQuery("");
      setDepartmentQuery("");
      setDivisionQuery("");
      setSelectedBuildingId(undefined);
      setSelectedFloorId(undefined);
      setSelectedDepartmentId(undefined);
      setSelectedDivisionId(undefined);
      void setFields({
        buildingId: undefined,
        floorId: undefined,
        departmentId: undefined,
        divisionId: undefined,
      });
      return;
    }
    setBuildingQuery(b.name);
    setSelectedBuildingId(b.id);
    setFloorQuery("");
    setDepartmentQuery("");
    setDivisionQuery("");
    setSelectedFloorId(undefined);
    setSelectedDepartmentId(undefined);
    setSelectedDivisionId(undefined);
    void setFields({
      buildingId: b.id,
      floorId: undefined,
      departmentId: undefined,
      divisionId: undefined,
    });
  };

  const handleSelectFloor = (f: Floor) => {
    if (selectedFloorId === f.id) {
      setFloorQuery("");
      setDepartmentQuery("");
      setDivisionQuery("");
      setSelectedFloorId(undefined);
      setSelectedDepartmentId(undefined);
      setSelectedDivisionId(undefined);
      void setFields({
        buildingId: selectedBuildingId,
        floorId: undefined,
        departmentId: undefined,
        divisionId: undefined,
      });
      return;
    }
    const parentBuilding = buildings.find((b) => b.id === f.buildingId);
    if (parentBuilding) {
      setBuildingQuery(parentBuilding.name);
      setSelectedBuildingId(parentBuilding.id);
    }
    setFloorQuery(f.name);
    setDepartmentQuery("");
    setDivisionQuery("");
    setSelectedFloorId(f.id);
    setSelectedDepartmentId(undefined);
    setSelectedDivisionId(undefined);
    void setFields({
      buildingId: f.buildingId,
      floorId: f.id,
      departmentId: undefined,
      divisionId: undefined,
    });
  };

  const handleSelectDepartment = (dpt: Department | null) => {
    if (!dpt || selectedDepartmentId === dpt.id) {
      setDepartmentQuery("");
      setDivisionQuery("");
      setSelectedDepartmentId(undefined);
      setSelectedDivisionId(undefined);
      void setFields({
        buildingId: selectedBuildingId,
        floorId: selectedFloorId,
        departmentId: undefined,
        divisionId: undefined,
      });
      return;
    }
    const parentBuilding = buildings.find((b) => b.id === dpt.buildingId);
    const parentFloor = floors.find((f) => f.id === dpt.floorId);
    if (parentBuilding) {
      setBuildingQuery(parentBuilding.name);
      setSelectedBuildingId(parentBuilding.id);
    }
    if (parentFloor) {
      setFloorQuery(parentFloor.name);
      setSelectedFloorId(parentFloor.id);
    }
    setDepartmentQuery(dpt.name);
    setDivisionQuery("");
    setSelectedDepartmentId(dpt.id);
    setSelectedDivisionId(undefined);
    void setFields({
      buildingId: dpt.buildingId,
      floorId: dpt.floorId,
      departmentId: dpt.id,
      divisionId: undefined,
    });
  };

  const handleSelectDivision = (div: Division | null) => {
    if (!div || selectedDivisionId === div.id) {
      setDivisionQuery("");
      setSelectedDivisionId(undefined);
      void setFields({
        buildingId: selectedBuildingId,
        floorId: selectedFloorId,
        departmentId: selectedDepartmentId,
        divisionId: undefined,
      });
      return;
    }
    const parentBuilding = buildings.find((b) => b.id === div.buildingId);
    const parentFloor = floors.find((f) => f.id === div.floorId);
    const parentDepartment = departments.find((dpt) => dpt.id === div.departmentId);
    if (parentBuilding) {
      setBuildingQuery(parentBuilding.name);
      setSelectedBuildingId(parentBuilding.id);
    }
    if (parentFloor) {
      setFloorQuery(parentFloor.name);
      setSelectedFloorId(parentFloor.id);
    }
    if (parentDepartment) {
      setDepartmentQuery(parentDepartment.name);
      setSelectedDepartmentId(parentDepartment.id);
    }
    setDivisionQuery(div.name);
    setSelectedDivisionId(div.id);
    void setFields({
      buildingId: div.buildingId,
      floorId: div.floorId,
      departmentId: div.departmentId,
      divisionId: div.id,
    });
  };

  const readyDepartment = Boolean(
    selectedBuildingId &&
    selectedFloorId &&
    selectedDepartmentId &&
    selectedDivisionId
  );

  // ===== QR・ラベルNo セクション =====
  const scannerRef = useRef<QRScannerHandle>(null);
  const [sealNo, setSealNo] = useState("");
  const [roomName, setRoomName] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStartSealNo, setBulkStartSealNo] = useState("");
  const [bulkCount, setBulkCount] = useState("");
  const [qrTarget, setQrTarget] = useState<"single" | "bulkStart">("single");

  useEffect(() => {
    setSealNo((current?.fields?.sealNo as string) ?? "");
    setRoomName((current?.fields?.roomName as string) ?? "");
  }, [current?.fields?.sealNo, current?.fields?.roomName]);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    let active = true;
    db.location_rooms
      .toArray()
      .then((rows) => {
        if (active) setRooms(rows);
      })
      .catch(() => {
        if (active) setRooms([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const roomBuildingId = current?.fields?.buildingId as string | undefined;
  const roomFloorId = current?.fields?.floorId as string | undefined;
  const roomDepartmentId = current?.fields?.departmentId as string | undefined;
  const roomDivisionId = current?.fields?.divisionId as string | undefined;

  const roomSuggestions = useMemo(() => {
    if (!roomBuildingId || !roomFloorId || !roomDepartmentId || !roomDivisionId) return [];
    const query = roomName.trim().toLowerCase();
    return rooms.filter((room) => {
      if (room.buildingId !== roomBuildingId) return false;
      if (room.floorId !== roomFloorId) return false;
      if (room.departmentId !== roomDepartmentId) return false;
      if (room.divisionId !== roomDivisionId) return false;
      if (!query) return true;
      return room.name.toLowerCase().includes(query);
    });
  }, [rooms, roomBuildingId, roomFloorId, roomDepartmentId, roomDivisionId, roomName]);

  const handleQrResult = (text: string) => {
    const trimmed = text.trim();
    // 例: https://xxx.com/x/{uuid} 形式のURLから末尾のUUID部分を抽出
    const urlMatch = trimmed.match(/https?:\/\/[^/]+\/x\/([A-Za-z0-9-]+)$/i);
    const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const extracted = (urlMatch && urlMatch[1]) || (uuidMatch && uuidMatch[0]) || trimmed;
    if (qrTarget === "bulkStart") {
      setBulkStartSealNo(extracted);
    } else {
      setSealNo(extracted);
      void setQR(extracted);
    }
  };

  const handleSealChange = (value: string) => {
    setSealNo(value);
    void setFields({ sealNo: value, qrCode: value });
  };

  const handleRoomChange = (value: string) => {
    setRoomName(value);
    void setFields({ roomName: value });
  };

  const handleBulkModeChange = (checked: boolean) => {
    setBulkMode(checked);
    if (checked) {
      // 単体モード → 一括モード
      if (sealNo.trim()) {
        setBulkStartSealNo(sealNo);
      }
    } else {
      // 一括モード → 単体モード
      if (bulkStartSealNo.trim()) {
        setSealNo(bulkStartSealNo);
        void setFields({ sealNo: bulkStartSealNo, qrCode: bulkStartSealNo });
      }
    }
  };

  const readyLabel = useMemo(() => {
    const roomOk = roomName.trim().length > 0;
    const sealOk = sealNo.trim().length > 0;
    const bulkStartOk = bulkStartSealNo.trim().length > 0;
    const bulkCountNum = Number.parseInt(bulkCount, 10);
    const bulkOk = bulkMode && bulkStartOk && Number.isFinite(bulkCountNum) && bulkCountNum > 0;
    const singleOk = !bulkMode && sealOk;
    return roomOk && (singleOk || bulkOk);
  }, [bulkMode, bulkCount, bulkStartSealNo, roomName, sealNo]);

  // ===== 資産No / 写真 セクション =====
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const [assetNo, setAssetNo] = useState("");
  const [equipmentNo, setEquipmentNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [lease, setLease] = useState<boolean>(false);
  const [loaned, setLoaned] = useState<boolean>(false);
  const [ocrTarget, setOcrTarget] = useState<"assetNo" | "equipmentNo">("assetNo");
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  useEffect(() => {
    primeOcrWorker();
  }, []);

  useEffect(() => {
    setAssetNo((current?.fields?.assetNo as string) ?? "");
    setEquipmentNo((current?.fields?.equipmentNo as string) ?? "");
    setPurchaseDate((current?.fields?.purchaseDate as string) ?? "");
    setLease(Boolean(current?.fields?.leaseFlag));
    setLoaned(Boolean(current?.fields?.loanedFlag));
  }, [current?.fields?.assetNo, current?.fields?.equipmentNo, current?.fields?.purchaseDate, current?.fields?.leaseFlag, current?.fields?.loanedFlag]);

  useEffect(() => {
    if (!current?.fields?.purchaseDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = today.toISOString().slice(0, 10);
      setPurchaseDate(iso);
      void setFields({ purchaseDate: iso });
    }
  }, [current?.fields?.purchaseDate, setFields]);

  const thumbUrls = useMemo(() => {
    return photos.map((photo) => ({
      id: photo.id,
      url: URL.createObjectURL(photo.thumb),
      selectedForList: Boolean(photo.selectedForList),
    }));
  }, [photos]);

  const handlePhotoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    await attachPhoto(file);
    if (assetFileInputRef.current) {
      assetFileInputRef.current.value = "";
    }
  };

  const toggleLease = () => {
    const next = !lease;
    setLease(next);
    void setFields({ leaseFlag: next });
  };

  const toggleLoaned = () => {
    const next = !loaned;
    setLoaned(next);
    void setFields({ loanedFlag: next });
  };

  const handleOcrResult = (value: string) => {
    if (!value) return;
    if (ocrTarget === "assetNo") {
      setAssetNo(value);
      void setFields({ assetNo: value });
    } else {
      setEquipmentNo(value);
      void setFields({ equipmentNo: value });
    }
  };

  const openOcrDialog = (target: "assetNo" | "equipmentNo") => {
    setOcrTarget(target);
    setOcrOpen(true);
  };

  const handleOcrRecognized = useCallback((info: { text: string; method: OcrResult["method"]; targetLabel: string }) => {
    setOcrNotice(`${info.targetLabel}を読み取り: ${info.text}`);
  }, []);

  useEffect(() => {
    if (!ocrNotice) return undefined;
    const id = window.setTimeout(() => setOcrNotice(null), 5000);
    return () => {
      window.clearTimeout(id);
    };
  }, [ocrNotice]);

  const assetReadyForNext = photos.length > 0;

  // ===== 商品登録セクション =====
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

  const handleCompleteAndNext = async () => {
    if (!bulkMode) {
      const baseSeal = (current?.fields?.sealNo as string | undefined) ?? sealNo;
      let nextSeal: string | null = null;
      if (baseSeal) {
        const match = baseSeal.match(/(\d+)(?!.*\d)/);
        if (match && match.index !== undefined) {
          const numericStart = match.index;
          const baseNumber = Number.parseInt(match[1], 10);
          const digitLength = match[1].length;
          const prefix = baseSeal.slice(0, numericStart);
          const suffix = baseSeal.slice(numericStart + digitLength);
          const nextNumber = baseNumber + 1;
          const padded = String(nextNumber).padStart(digitLength, "0");
          nextSeal = `${prefix}${padded}${suffix}`;
        }
      }

      await completeCurrent({
        preserveKeys: ["surveyDate", "investigator", "buildingId", "floorId", "departmentId", "divisionId"],
      });

      if (nextSeal) {
        setSealNo(nextSeal);
        await setQR(nextSeal);
      }
      return;
    }

    const start = bulkStartSealNo.trim();
    const count = Number.parseInt(bulkCount, 10);
    if (!start || !Number.isFinite(count) || count <= 0) {
      alert("一括登録モードでは、開始シールNoと1以上の登録個数を入力してください。");
      return;
    }
    if (!current) return;

    const baseId = current.id;

    setSealNo(start);
    await setQR(start);

    await completeCurrent({
      preserveKeys: ["surveyDate", "investigator", "buildingId", "floorId", "departmentId", "divisionId"],
    });

    const extra = count - 1;
    if (extra > 0) {
      await duplicateDraft(baseId, extra);
    }
  };

  const handleGoToPreviousProduct = async () => {
    try {
      const rows = await listHistory("desc");
      const prev = rows[0];
      if (!prev) return;
      await load(prev.id);
    } catch (err) {
      console.error(err);
    }
  };

  const readyProduct =
    Boolean(categoryId && subcategoryId && itemId && makerId && modelId) &&
    Boolean(w || d || h || note);

  return (
    <div className="page">
      {/* QR・ラベルNo */}
      <div className="page-section">
        <h2 className="section-title">QR読取・基本情報</h2>
        <div className="section-title-underline-blue" />
        <div className="grid">
          <label>
            登録モード
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={bulkMode}
                onChange={(e) => handleBulkModeChange(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>一括登録モード</span>
            </div>
          </label>
          {bulkMode ? (
            <>
              <label>
                開始シールNo
                <div className="input-with-action">
                  <input
                    value={bulkStartSealNo}
                    onChange={(e) => setBulkStartSealNo(e.target.value)}
                    placeholder="開始シールNoを入力"
                  />
                  <button
                    type="button"
                    className="ghost input-action"
                    onClick={async () => {
                      try {
                        setQrTarget("bulkStart");
                        await ensureCameraAccess();
                        await scannerRef.current?.start();
                      } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        alert(`カメラを利用できませんでした: ${message}`);
                      }
                    }}
                  >
                    QR撮影
                  </button>
                </div>
              </label>
              <label>
                登録個数
                <input
                  type="number"
                  min={1}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  placeholder="個数を入力（例：椅子50脚の場合は「50」と入力）"
                />
              </label>
            </>
          ) : (
            <label>
              シールNo
              <div className="input-with-action">
                <input
                  value={sealNo}
                  onChange={(e) => handleSealChange(e.target.value)}
                  placeholder="シールNoを入力"
                />
                <button
                  type="button"
                  className="ghost input-action"
                  onClick={async () => {
                    try {
                      setQrTarget("single");
                      await ensureCameraAccess();
                      await scannerRef.current?.start();
                    } catch (err) {
                      const message = err instanceof Error ? err.message : String(err);
                      alert(`カメラを利用できませんでした: ${message}`);
                    }
                  }}
                >
                  QR撮影
                </button>
              </div>
            </label>
          )}
          <label>
            室名
            <input value={roomName} onChange={(e) => handleRoomChange(e.target.value)} placeholder="室名を入力" />
            {roomSuggestions.length > 0 && (
              <div className="option-list" style={{ marginTop: 6 }}>
                {roomSuggestions.map((room) => (
                  <button
                    type="button"
                    key={room.id}
                    onClick={() => handleRoomChange(room.name)}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            )}
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <QRScanner ref={scannerRef} onResult={handleQrResult} />
        </div>
      </div>

      {/* 写真撮影・資産No */}
      <div className="page-section">
        <h2 className="section-title">写真撮影・資産番号</h2>
        <div className="section-title-underline-blue" />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={assetFileInputRef}
          style={{ display: "none" }}
          onChange={(e) => handlePhotoSelect(e.target.files)}
        />
        <div className="grid">
          <label>
            資産番号
            <div className="input-with-action">
              <input value={assetNo} onChange={(e) => { const value = e.target.value; setAssetNo(value); void setFields({ assetNo: value }); }} />
              <button type="button" className="ghost input-action" onClick={() => openOcrDialog("assetNo")}>
                読み取り
              </button>
            </div>
          </label>
          <label>
            備品番号
            <div className="input-with-action">
              <input value={equipmentNo} onChange={(e) => { const value = e.target.value; setEquipmentNo(value); void setFields({ equipmentNo: value }); }} />
              <button type="button" className="ghost input-action" onClick={() => openOcrDialog("equipmentNo")}>
                読み取り
              </button>
            </div>
          </label>
          <label>
            購入年月日
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => {
                const value = e.target.value;
                setPurchaseDate(value);
                void setFields({ purchaseDate: value });
              }}
            />
          </label>
          <div className="row">
            <button type="button" className={lease ? "secondary" : "ghost"} onClick={toggleLease}>
              リース: {lease ? "ON" : "OFF"}
            </button>
            <button type="button" className={loaned ? "secondary" : "ghost"} onClick={toggleLoaned}>
              貸出品: {loaned ? "ON" : "OFF"}
            </button>
          </div>
        </div>
        <div className="photo-strip">
          {thumbUrls.length === 0 ? (
            <div className="photo-strip-empty">
              撮影した写真がここに表示されます
            </div>
          ) : (
            thumbUrls.map((thumb) => (
              <div
                key={thumb.id}
                className={`photo-item${thumb.selectedForList ? " is-selected" : ""}`}
                onClick={() => { void togglePhotoForList(thumb.id); }}
              >
                <span className="visually-hidden">一覧表示用の写真として選択</span>
                <button
                  type="button"
                  className="photo-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removePhoto(thumb.id);
                  }}
                  aria-label="写真を削除"
                >
                  ×
                </button>
                <img src={thumb.url} alt="サムネイル" />
              </div>
            ))
          )}
        </div>
        {ocrNotice && <div className="ocr-result-banner">{ocrNotice}</div>}
      </div>

      {/* 商品登録 */}
      <div className="page-section">
        <h2 className="section-title">資産情報登録</h2>
        <div className="section-title-underline-blue" />
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
          <div className="asset-size-row">
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
          </div>
          <label>
            備考
            <textarea value={note} onChange={(e) => { const value = e.target.value; setNote(value); void setFields({ note: value }); }} rows={3} />
          </label>
        </div>
      </div>

      {/* 全体フッター */}
      <footer className="page-footer">
        <button type="button" className="ghost" onClick={() => navigate("/survey/home")}>ホーム</button>
        <button type="button" className="ghost" onClick={() => navigate("/survey/department")}>
          部門
          <br />
          入力へ
        </button>
        <button type="button" className="ghost" onClick={() => setHistoryOpen(true)}>
          履歴
          <br />
          表示
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => assetFileInputRef.current?.click()}
        >
          写真
          <br />
          撮影
        </button>
        <button
          type="button"
          className="ghost"
          onClick={handleGoToPreviousProduct}
          disabled={completedCount === 0}
        >
          前の商品に
          <br />
          戻る
        </button>
        <button
          type="button"
          onClick={handleCompleteAndNext}
          disabled={!(readyDepartment && readyLabel && assetReadyForNext && readyProduct)}
        >
          商品
          <br />
          登録
        </button>
      </footer>

      {/* 共通ダイアログ/オーバーレイ */}
      <OcrCaptureDialog
        open={ocrOpen}
        targetLabel={ocrTarget === "assetNo" ? "資産番号" : "備品番号"}
        onClose={() => setOcrOpen(false)}
        onResult={handleOcrResult}
        onRecognized={handleOcrRecognized}
      />

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
                        <span>W:{width} / D:{depth} / H:{height}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
