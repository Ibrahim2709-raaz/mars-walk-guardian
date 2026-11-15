import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
import { buildRover, wheelStations } from '../src/rover-model.mjs';

// Three's exporter uses FileReader for its final binary buffer.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(data => { this.result = data; this.onloadend?.(); }); }
};
const model = buildRover();
const rigidNodes = ['chassis','mast_head','arm_shoulder','arm_elbow','arm_turret',
  ...wheelStations.map((_, i) => 'spin_' + i)].map(name => model.getObjectByName(name));
// Batch by material within each moving assembly, preserving the articulation nodes.
for (const node of rigidNodes) {
  const batches = new Map();
  node.updateMatrixWorld(true);
  const inverse = node.matrixWorld.clone().invert();
  const remove = [];
  function visit(object) {
    if (object !== node && rigidNodes.includes(object)) return;
    if (object.isMesh) {
      const geometry = object.geometry.clone().applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material).push(geometry);
      remove.push(object);
    }
    for (const child of object.children) visit(child);
  }
  visit(node);
  for (const mesh of remove) mesh.removeFromParent();
  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material);
    mesh.name = node.name + '_surface';
    node.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
}
const binary = await new GLTFExporter().parseAsync(model, {binary:true});
await mkdir(new URL('../public/models/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/models/mwg-rover.glb',import.meta.url),Buffer.from(binary));
