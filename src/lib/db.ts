import Dexie, { Table } from "dexie";

export interface Draft {
  id: string;
  qr?: string;
  fields: Record<string, any>;
  photoIds: string[];
  updatedAt: number;
}
export interface Photo {
  id: string;
  draftId: string;
  blob: Blob;
  thumb: Blob;
  size: number;
  createdAt: number;
}
export interface MasterItem {
  id: string;
  name: string;
  nameNfkc: string;
  maker?: string;
  makerNfkc?: string;
  model?: string;
  updatedAt?: number;
}
export interface IndexRow {
  id: string; // legacy key 'masters-fuse-index'
  data: any;
}
export interface Building {
  id: string;
  name: string;
}
export interface Floor {
  id: string;
  buildingId: string;
  name: string;
}
export interface Department {
  id: string;
  buildingId: string;
  floorId: string;
  name: string;
}
export interface Division {
  id: string;
  buildingId: string;
  floorId: string;
  departmentId: string;
  name: string;
}
export interface ProductCategory {
  id: string;
  name: string;
}
export interface ProductSubcategory {
  id: string;
  categoryId: string;
  name: string;
}
export interface ProductItem {
  id: string;
  categoryId: string;
  subcategoryId: string;
  name: string;
}
export interface ProductMaker {
  id: string;
  categoryId: string;
  subcategoryId: string;
  itemId: string;
  name: string;
}
export interface ProductModel {
  id: string;
  categoryId: string;
  subcategoryId: string;
  itemId: string;
  makerId: string;
  name: string;
}
export interface Room {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  departmentId: string;
  divisionId: string;
}

export class AppDB extends Dexie {
  survey_drafts!: Table<Draft, string>;
  survey_photos!: Table<Photo, string>;
  survey_masters!: Table<MasterItem, string>;
  indices!: Table<IndexRow, string>;
  settings!: Table<{ key: string; value: any }, string>;
  location_buildings!: Table<Building, string>;
  location_floors!: Table<Floor, string>;
  location_departments!: Table<Department, string>;
  location_divisions!: Table<Division, string>;
  product_categories!: Table<ProductCategory, string>;
  product_subcategories!: Table<ProductSubcategory, string>;
  product_items!: Table<ProductItem, string>;
  product_makers!: Table<ProductMaker, string>;
  product_models!: Table<ProductModel, string>;
  location_rooms!: Table<Room, string>;

  constructor() {
    super("meddx_survey");
    this.version(1).stores({
      survey_drafts: "id,updatedAt,qr",
      survey_photos: "id,draftId,createdAt",
      survey_masters: "id,updatedAt,nameNfkc,makerNfkc,model",
      indices: "id",
      settings: "key",
    });
    this.version(2).stores({
      survey_drafts: "id,updatedAt,qr",
      survey_photos: "id,draftId,createdAt",
      survey_masters: "id,updatedAt,nameNfkc,makerNfkc,model",
      indices: "id",
      settings: "key",
      location_buildings: "id,name",
      location_floors: "id,buildingId,name",
      location_departments: "id,buildingId,floorId,name",
      location_divisions: "id,buildingId,floorId,departmentId,name",
      product_categories: "id,name",
      product_subcategories: "id,categoryId,name",
      product_items: "id,categoryId,subcategoryId,name",
      product_makers: "id,categoryId,subcategoryId,itemId,name",
      product_models: "id,categoryId,subcategoryId,itemId,makerId,name",
    });
    this.version(3).stores({
      survey_drafts: "id,updatedAt,qr",
      survey_photos: "id,draftId,createdAt",
      survey_masters: "id,updatedAt,nameNfkc,makerNfkc,model",
      indices: "id",
      settings: "key",
      location_buildings: "id,name",
      location_floors: "id,buildingId,name",
      location_departments: "id,buildingId,floorId,name",
      location_divisions: "id,buildingId,floorId,departmentId,name",
      product_categories: "id,name",
      product_subcategories: "id,categoryId,name",
      product_items: "id,categoryId,subcategoryId,name",
      product_makers: "id,categoryId,subcategoryId,itemId,name",
      product_models: "id,categoryId,subcategoryId,itemId,makerId,name",
      location_rooms: "id,buildingId,floorId,departmentId,divisionId,name",
    });
  }
}
export const db = new AppDB();
