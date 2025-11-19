import { db, Building, Department, Division, Floor, ProductCategory, ProductItem, ProductMaker, ProductModel, ProductSubcategory, Room } from "./db";
import { parseCsv } from "./csv";

const BASE_PATH = import.meta.env.BASE_URL ?? "/";

function withBase(path: string) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_PATH}${normalized}`;
}

async function fetchCsvRows(path: string) {
  const url = withBase(path);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to download ${path}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

export async function downloadMastersFromLocal() {
  const [buildingRows, floorRows, departmentRows, divisionRows, roomRows, categoryRows, subcategoryRows, itemRows, makerRows, modelRows] = await Promise.all([
    fetchCsvRows("/masters/locations_buildings.csv"),
    fetchCsvRows("/masters/locations_floors.csv"),
    fetchCsvRows("/masters/locations_departments.csv"),
    fetchCsvRows("/masters/locations_divisions.csv"),
    fetchCsvRows("/masters/locations_rooms.csv"),
    fetchCsvRows("/masters/product_categories.csv"),
    fetchCsvRows("/masters/product_subcategories.csv"),
    fetchCsvRows("/masters/product_items.csv"),
    fetchCsvRows("/masters/product_makers.csv"),
    fetchCsvRows("/masters/product_models.csv"),
  ]);

  const buildings: Building[] = buildingRows.map((row) => ({
    id: row["id"],
    name: row["name"],
  }));
  const floors: Floor[] = floorRows.map((row) => ({
    id: row["id"],
    buildingId: row["buildingId"],
    name: row["name"],
  }));
  const departments: Department[] = departmentRows.map((row) => ({
    id: row["id"],
    buildingId: row["buildingId"],
    floorId: row["floorId"],
    name: row["name"],
  }));
  const divisions: Division[] = divisionRows.map((row) => ({
    id: row["id"],
    buildingId: row["buildingId"],
    floorId: row["floorId"],
    departmentId: row["departmentId"],
    name: row["name"],
  }));
  const rooms: Room[] = roomRows.map((row) => ({
    id: row["roomId"] ?? row["id"],
    name: row["name"],
    buildingId: row["buildingId"],
    floorId: row["floorId"],
    departmentId: row["departmentId"],
    divisionId: row["divisionId"],
  }));
  const categories: ProductCategory[] = categoryRows.map((row) => ({
    id: row["id"],
    name: row["name"],
  }));
  const subcategories: ProductSubcategory[] = subcategoryRows.map((row) => ({
    id: row["id"],
    categoryId: row["categoryId"],
    name: row["name"],
  }));
  const items: ProductItem[] = itemRows.map((row) => ({
    id: row["id"],
    categoryId: row["categoryId"],
    subcategoryId: row["subcategoryId"],
    name: row["name"],
  }));
  const makers: ProductMaker[] = makerRows.map((row) => ({
    id: row["id"],
    categoryId: row["categoryId"],
    subcategoryId: row["subcategoryId"],
    itemId: row["itemId"],
    name: row["name"],
  }));
  const models: ProductModel[] = modelRows.map((row) => ({
    id: row["id"],
    categoryId: row["categoryId"],
    subcategoryId: row["subcategoryId"],
    itemId: row["itemId"],
    makerId: row["makerId"],
    name: row["name"],
  }));

  await db.transaction(
    "rw",
    db.location_buildings,
    db.location_floors,
    db.location_departments,
    db.location_divisions,
    db.location_rooms,
    db.product_categories,
    db.product_subcategories,
    db.product_items,
    db.product_makers,
    db.product_models,
    db.settings,
    async () => {
      await Promise.all([
        db.location_buildings.clear(),
        db.location_floors.clear(),
        db.location_departments.clear(),
        db.location_divisions.clear(),
        db.location_rooms.clear(),
        db.product_categories.clear(),
        db.product_subcategories.clear(),
        db.product_items.clear(),
        db.product_makers.clear(),
        db.product_models.clear(),
      ]);
      await db.location_buildings.bulkPut(buildings);
      await db.location_floors.bulkPut(floors);
      await db.location_departments.bulkPut(departments);
      await db.location_divisions.bulkPut(divisions);
      await db.location_rooms.bulkPut(rooms);
      await db.product_categories.bulkPut(categories);
      await db.product_subcategories.bulkPut(subcategories);
      await db.product_items.bulkPut(items);
      await db.product_makers.bulkPut(makers);
      await db.product_models.bulkPut(models);
      await db.settings.put({ key: "mastersDownloadedAt", value: new Date().toISOString() });
    }
  );
}
