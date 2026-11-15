import { readFile, mkdir, writeFile } from 'node:fs/promises'
import * as T from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

const [csvPath, metadataPath] = process.argv.slice(2)
if (!csvPath || !metadataPath) {
  throw new Error('Usage: node scripts/export-hirise-terrain.mjs <terrain_grid.csv> <terrain_metadata.json>')
}
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
const {width_cells: width, height_cells: height, cell_size_m: spacing} = metadata.grid
const {base, target} = metadata
const lines = (await readFile(csvPath, 'utf8')).trimEnd().split(/\r?\n/)
const fields = lines[0].trim().split(',')
const expected = ['row', 'column', 'longitude_deg_east', 'latitude_deg_planetocentric', 'elevation_m', 'valid']
if (!expected.every((field, i) => fields[i] === field) || lines.length !== width * height + 1) {
  throw new Error('The CSV columns or cell count differ from the HiRISE handoff.')
}
const positions = new Float32Array(width * height * 3)
const valid = new Uint8Array(width * height)
const colors = new Float32Array(positions.length)
const triangles = []
const westEastSpacing = spacing * Math.cos(T.MathUtils.degToRad(base.latitude))
const low = new T.Color('#8d553b'), high = new T.Color('#c4875d'), color = new T.Color()
const baseHeight = Number(lines[1 + base.row * width + base.column].split(',', 6)[4])
for (let index = 0; index < valid.length; index++) {
  // Only the six leading fields are needed. The quoted provenance comes later.
  const [rowText, colText, , , elevation, flag] = lines[index + 1].split(',', 6)
  const row = Number(rowText), column = Number(colText)
  if (row !== Math.floor(index / width) || column !== index % width) throw new Error('CSV row or column order differs from the handoff.')
  if (flag !== 'true') continue
  const y = Number(elevation) - baseHeight
  if (!elevation || !Number.isFinite(y)) throw new Error('Invalid elevation for a valid cell.')
  valid[index] = 1
  positions.set([(column - base.column) * westEastSpacing, y, (base.row - row) * spacing], index * 3)
  const variation = .08 * Math.sin(row * .37 + column * .79) + .045 * Math.cos(row * .81 - column * .33)
  color.copy(low).lerp(high, T.MathUtils.clamp(.32 + y * .019 + variation, 0, 1))
  color.toArray(colors, index * 3)
}
for (let row = 0; row < height - 1; row++) for (let col = 0; col < width - 1; col++) {
  const a = row * width + col, b = a + 1, c = a + width, d = c + 1
  if (valid[a] && valid[b] && valid[c]) triangles.push(a, b, c)
  if (valid[b] && valid[c] && valid[d]) triangles.push(b, d, c)
}
if (!triangles.length || !valid[base.row * width + base.column] || !valid[target.row * width + target.column]) {
  throw new Error('The ground or an endpoint has no elevation coverage.')
}
const geometry = new T.BufferGeometry()
geometry.setAttribute('position', new T.BufferAttribute(positions, 3))
geometry.setAttribute('color', new T.BufferAttribute(colors, 3))
geometry.setIndex(triangles)
geometry.computeVertexNormals()
const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({vertexColors: true, roughness: .94}))
mesh.name = 'Ground'
mesh.userData = {
  elevationSource: metadata.source_products[0].product_id,
  verticalReference: metadata.source_products[0].vertical_datum,
  originElevationM: baseHeight,
  horizontalGroundSpacingM: [westEastSpacing, spacing],
  simulatedBase: base,
  waypointLinkedScienceTarget: target,
  color: 'Illustrative vertex colors'
}
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(data => { this.result = data; this.onloadend?.() }) }
}
const glb = await new GLTFExporter().parseAsync(mesh, {binary: true})
await mkdir(new URL('../public/terrain/', import.meta.url), {recursive: true})
await writeFile(new URL('../public/terrain/gale-hirise.glb', import.meta.url), Buffer.from(glb))
console.log(JSON.stringify({
  source: mesh.userData.elevationSource, validCells: valid.reduce((a, b) => a + b),
  triangles: triangles.length / 3,
  base: [0, 0],
  target: [(target.column - base.column) * westEastSpacing, (base.row - target.row) * spacing]
}))
