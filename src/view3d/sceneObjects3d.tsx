// src/view3d/SceneObjects3D.tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { InstancedMesh, Mesh } from 'three';

import type { SceneObject } from './sceneObjects';
import { plotToWorldXZ, degToRad } from './sceneObjects';
import { getAssetDef } from './AssetsKeys';

function pickFirstMesh(root: THREE.Object3D): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((o) => {
    if (found) return;
    if ((o as Mesh).isMesh) found = o as Mesh;
  });
  return found;
}

function cloneForScene(src: THREE.Object3D): THREE.Object3D {
  return src.clone(true);
}

export type SceneObjects3DProps = {
  objects: SceneObject[];
  plotWidth: number;
  plotLength: number;
};

export default function SceneObjects3D({ objects, plotWidth, plotLength }: SceneObjects3DProps) {
  const prepared = useMemo(() => {
    const list = objects
      .map((o) => {
        const def = getAssetDef(o.type, o.variant);
        if (!def) return null;

        const { x, z } = plotToWorldXZ(o.pos.x, o.pos.y, plotWidth, plotLength);
        const rotY = degToRad(o.rotationDeg ?? 0);

        return {
          id: o.id,
          def,
          url: def.glbUrl,
          instanced: Boolean(def.instanced),
          group: def.instanceGroup ?? def.glbUrl, // группируем по group, иначе по url
          x,
          z,
          rotY,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      def: NonNullable<ReturnType<typeof getAssetDef>>;
      url: string;
      instanced: boolean;
      group: string;
      x: number;
      z: number;
      rotY: number;
    }>;

    const instancedGroups = new Map<string, typeof list>();
    const uniques: typeof list = [];

    for (const item of list) {
      if (item.instanced) {
        const arr = instancedGroups.get(item.group) ?? [];
        arr.push(item);
        instancedGroups.set(item.group, arr);
      } else {
        uniques.push(item);
      }
    }

    return { uniques, instancedGroups };
  }, [objects, plotWidth, plotLength]);

  return (
    <group>
      {prepared.uniques.map((item) => (
        <GltfObject key={item.id} url={item.url} x={item.x} z={item.z} rotY={item.rotY} />
      ))}

      {Array.from(prepared.instancedGroups.entries()).map(([groupKey, items]) => (
        <InstancedGltfGroup
          key={groupKey}
          url={items[0].url}
          instances={items.map((i) => ({ x: i.x, z: i.z, rotY: i.rotY }))}
        />
      ))}
    </group>
  );
}

function GltfObject({ url, x, z, rotY }: { url: string; x: number; z: number; rotY: number }) {
  const gltf = useGLTF(url);

  const obj = useMemo(() => cloneForScene(gltf.scene), [gltf.scene]);

  return <primitive object={obj} position={[x, 0, z]} rotation={[0, rotY, 0]} />;
}

function InstancedGltfGroup({
  url,
  instances,
}: {
  url: string;
  instances: Array<{ x: number; z: number; rotY: number }>;
}) {
  const gltf = useGLTF(url);
  const ref = useRef<InstancedMesh>(null);

  const { geometry, material } = useMemo(() => {
    const first = pickFirstMesh(gltf.scene);
    if (!first) return { geometry: null as any, material: null as any };

    return {
      geometry: first.geometry,
      material: Array.isArray(first.material) ? first.material[0] : first.material,
    };
  }, [gltf.scene]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < instances.length; i++) {
      const it = instances[i];
      pos.set(it.x, 0, it.z);
      quat.setFromEuler(new THREE.Euler(0, it.rotY, 0));
      m.compose(pos, quat, scale);
      mesh.setMatrixAt(i, m);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [instances]);

  if (!geometry || !material) return null;

  return <instancedMesh ref={ref} args={[geometry, material, instances.length]} />;
}
