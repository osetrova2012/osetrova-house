// src/view3d/AssetsKeys.ts

/* ======================================================
   Asset registry (type/variant -> GLB url)
   - SceneObject имеет (type + variant)
   - Здесь решаем какой GLB брать
====================================================== */

const BASE = import.meta.env.BASE_URL;

// ===================== TYPES =====================

export type BuildingType =
  | 'greenhouse'
  | 'bathhouse'
  | 'garage'
  | 'doghouse'
  // legacy (если где-то осталось старое)
  | 'shed';

export type PlantType =
  | 'oak'
  | 'birch'
  | 'apple'
  | 'thuja'
  | 'spruce'
  | 'carrot'
  | 'tomato'
  | 'cabbage'
  | 'pumpkin'
  // legacy (если где-то осталось старое)
  | 'apple_tree';

export type SceneType = 'house' | BuildingType | PlantType;

export type HouseMaterial = 'brick' | 'wood';
export type HouseAspect = '1x1' | '2x1';
export type HouseFloors = 1 | 2 | 3;

export type SceneVariant =
  | { kind: 'none' }
  | {
      kind: 'house';
      material: HouseMaterial;
      floors: HouseFloors;
      aspect: HouseAspect;
    };

export type AssetDef = {
  type: SceneType;
  glbUrl: string;

  // для массовых объектов (деревья/кусты/овощи)
  instanced?: boolean;
  instanceGroup?: string;
};

// ===================== HELPERS =====================

function url(rel: string) {
  return `${BASE}${rel}`;
}

export type HouseAssetKey = `house_${HouseMaterial}_${HouseFloors}f_${HouseAspect}`;

export function getHouseAssetKey(
  material: HouseMaterial,
  floors: HouseFloors,
  aspect: HouseAspect
): HouseAssetKey {
  return `house_${material}_${floors}f_${aspect}`;
}

// ===================== MAPS =====================

// Домики (12 штук)
const HOUSE_GLB: Record<HouseAssetKey, string> = {
  // brick
  house_brick_1f_1x1: url('assets/glb/objects/houses/house_brick_1f_1x1.glb'),
  house_brick_2f_1x1: url('assets/glb/objects/houses/house_brick_2f_1x1.glb'),
  house_brick_3f_1x1: url('assets/glb/objects/houses/house_brick_3f_1x1.glb'),
  house_brick_1f_2x1: url('assets/glb/objects/houses/house_brick_1f_2x1.glb'),
  house_brick_2f_2x1: url('assets/glb/objects/houses/house_brick_2f_2x1.glb'),
  house_brick_3f_2x1: url('assets/glb/objects/houses/house_brick_3f_2x1.glb'),

  // wood
  house_wood_1f_1x1: url('assets/glb/objects/houses/house_wood_1f_1x1.glb'),
  house_wood_2f_1x1: url('assets/glb/objects/houses/house_wood_2f_1x1.glb'),
  house_wood_3f_1x1: url('assets/glb/objects/houses/house_wood_3f_1x1.glb'),
  house_wood_1f_2x1: url('assets/glb/objects/houses/house_wood_1f_2x1.glb'),
  house_wood_2f_2x1: url('assets/glb/objects/houses/house_wood_2f_2x1.glb'),
  house_wood_3f_2x1: url('assets/glb/objects/houses/house_wood_3f_2x1.glb'),
};

// Постройки
const BUILDING_GLB: Record<BuildingType, string | null> = {
  greenhouse: url('assets/glb/objects/buildings/greenhouse.glb'),
  bathhouse: null,
  garage: url('assets/glb/objects/buildings/garage.glb'),
  doghouse: null,
  shed: null, // legacy
};

// Насаждения (основные)
type PlantCore = Exclude<PlantType, 'apple_tree'>;

const PLANT_GLB: Record<PlantCore, { glbUrl: string | null; group: string; instanced: true }> = {
  // trees
  oak:    { glbUrl: url('assets/glb/objects/plants/trees/oak.glb'),    group: 'oak',    instanced: true },
  birch:  { glbUrl: url('assets/glb/objects/plants/trees/birch.glb'),  group: 'birch',  instanced: true },
  apple:  { glbUrl: url('assets/glb/objects/plants/trees/apple.glb'),  group: 'apple',  instanced: true },
  spruce: { glbUrl: null, group: 'spruce', instanced: true },

  // shrubs
  thuja:  { glbUrl: url('assets/glb/objects/plants/shrubs/thuja.glb'), group: 'thuja',  instanced: true },

  // vegetables
  carrot:  { glbUrl: url('assets/glb/objects/plants/vegetables/carrot.glb'),  group: 'carrot',  instanced: true },
  tomato:  { glbUrl: url('assets/glb/objects/plants/vegetables/tomato.glb'),  group: 'tomato',  instanced: true },
  cabbage: { glbUrl: url('assets/glb/objects/plants/vegetables/cabbage.glb'), group: 'cabbage', instanced: true },
  pumpkin: { glbUrl: url('assets/glb/objects/plants/vegetables/pumpkin.glb'), group: 'pumpkin', instanced: true },
};

// ===================== PUBLIC API =====================

export function getAssetDef(type: SceneType, variant?: SceneVariant): AssetDef | null {
  // Дом
  if (type === 'house') {
    const v = variant && variant.kind === 'house' ? variant : null;

    const material: HouseMaterial = v?.material ?? 'brick';
    const floors: HouseFloors = v?.floors ?? 1;
    const aspect: HouseAspect = v?.aspect ?? '1x1';

    const key = getHouseAssetKey(material, floors, aspect);
    const glbUrl = HOUSE_GLB[key];

    // защита от опечаток/нет файла
    if (!glbUrl) return null;

    return { type, glbUrl };
  }

  // Постройки
  if (type in BUILDING_GLB) {
    const glbUrl = BUILDING_GLB[type as BuildingType];
    if (!glbUrl) return null;
    return { type, glbUrl };
  }

  // Legacy алиас: apple_tree -> apple
  const plantType: PlantCore =
    type === 'apple_tree' ? 'apple' : (type as PlantCore);

  // Насаждения
  const plant = PLANT_GLB[plantType];
  if (plant?.glbUrl) {
    return {
      type,
      glbUrl: plant.glbUrl,
      instanced: true,
      instanceGroup: plant.group,
    };
  }

  return null;
}
