import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, Building, Department, Division, Floor } from "../../lib/db";
import { useDraft, useEnsureDraft } from "../../store/useDraft";

function includesQuery(value: string, query: string) {
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase());
}

export default function DepartmentPage() {
  useEnsureDraft();
  const navigate = useNavigate();
  const { current, setFields } = useDraft();
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
    sessionStorage.setItem("visitedDepartment", "1");
  }, []);

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
    if (selectedBuilding) {
      setBuildingQuery(selectedBuilding.name);
    } else {
      setBuildingQuery("");
    }
  }, [selectedBuilding]);
  useEffect(() => {
    if (selectedFloor) {
      setFloorQuery(selectedFloor.name);
    } else {
      setFloorQuery("");
    }
  }, [selectedFloor]);
  useEffect(() => {
    if (selectedDepartment) {
      setDepartmentQuery(selectedDepartment.name);
    } else {
      setDepartmentQuery("");
    }
  }, [selectedDepartment]);
  useEffect(() => {
    if (selectedDivision) {
      setDivisionQuery(selectedDivision.name);
    } else {
      setDivisionQuery("");
    }
  }, [selectedDivision]);

  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => includesQuery(b.name, buildingQuery));
  }, [buildings, buildingQuery]);

  const filteredFloors = useMemo(() => {
    return floors.filter((f) => {
      if (selectedBuildingId && f.buildingId !== selectedBuildingId) return false;
      return includesQuery(f.name, floorQuery);
    });
  }, [floors, floorQuery, selectedBuildingId]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((dpt) => {
      if (selectedBuildingId && dpt.buildingId !== selectedBuildingId) return false;
      if (selectedFloorId && dpt.floorId !== selectedFloorId) return false;
      return includesQuery(dpt.name, departmentQuery);
    });
  }, [departments, departmentQuery, selectedBuildingId, selectedFloorId]);

  const filteredDivisions = useMemo(() => {
    return divisions.filter((div) => {
      if (selectedBuildingId && div.buildingId !== selectedBuildingId) return false;
      if (selectedFloorId && div.floorId !== selectedFloorId) return false;
      if (selectedDepartmentId && div.departmentId !== selectedDepartmentId) return false;
      return includesQuery(div.name, divisionQuery);
    });
  }, [divisions, divisionQuery, selectedBuildingId, selectedFloorId, selectedDepartmentId]);

  const handleSelectBuilding = (b: Building | null) => {
    if (!b || selectedBuildingId === b.id) {
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
    setFloorQuery("");
    setDepartmentQuery("");
    setDivisionQuery("");
    setSelectedBuildingId(b.id);
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
  const handleSelectFloor = (f: Floor | null) => {
    if (!f || selectedFloorId === f.id) {
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

  const readyForNext = Boolean(
    selectedBuildingId &&
    selectedFloorId &&
    selectedDepartmentId &&
    selectedDivisionId
  );

  return (
    <div className="page">
      <div className="page-section">
        <h2 className="section-title">部署入力</h2>
        <div className="grid">
          <label>
            調査日
            <input value={current?.fields?.surveyDate ?? surveyDate} disabled />
          </label>
          <label>
            調査担当
            <input value={current?.fields?.investigator ?? investigator} disabled />
          </label>
        </div>
        <div className="grid" style={{ marginTop: 16 }}>
          <label>
            棟
            <input value={buildingQuery} onChange={(e) => setBuildingQuery(e.target.value)} placeholder="棟を検索" />
          </label>
          <div className="option-list">
            {filteredBuildings.map((b) => (
              <button key={b.id} onClick={() => handleSelectBuilding(b)} className={b.id === selectedBuildingId ? "active" : ""}>
                {b.name}
              </button>
            ))}
          </div>
          <label>
            階
            <input value={floorQuery} onChange={(e) => setFloorQuery(e.target.value)} placeholder="階を検索" />
          </label>
          <div className="option-list">
            {filteredFloors.map((f) => (
              <button key={f.id} onClick={() => handleSelectFloor(f)} className={f.id === selectedFloorId ? "active" : ""}>
                {f.name}（{buildings.find((b) => b.id === f.buildingId)?.name ?? ""}）
              </button>
            ))}
          </div>
          <label>
            部署
            <input value={departmentQuery} onChange={(e) => setDepartmentQuery(e.target.value)} placeholder="部署を検索" />
          </label>
          <div className="option-list">
            {filteredDepartments.map((dpt) => (
              <button key={dpt.id} onClick={() => handleSelectDepartment(dpt)} className={dpt.id === selectedDepartmentId ? "active" : ""}>
                {dpt.name}
              </button>
            ))}
          </div>
          <label>
            部門
            <input value={divisionQuery} onChange={(e) => setDivisionQuery(e.target.value)} placeholder="部門を検索" />
          </label>
          <div className="option-list">
            {filteredDivisions.map((div) => (
              <button key={div.id} onClick={() => handleSelectDivision(div)} className={div.id === selectedDivisionId ? "active" : ""}>
                {div.name}
              </button>
            ))}
          </div>
        </div>
        <p className="helper-text">今日一日がんばって！！</p>
      </div>
      <footer className="page-footer">
        <button className="ghost" onClick={() => navigate("/home")}>ホーム</button>
        <button onClick={() => navigate("/survey/all")} disabled={!readyForNext}>
          次へ
        </button>
      </footer>
    </div>
  );
}
