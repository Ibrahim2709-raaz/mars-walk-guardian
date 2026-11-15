import * as T from 'three'

const craterSites = [[-14,21,9,2], [13,22,6,1.5],[-6,47,10,2.3],[24,53,13,2],[-29,-12,12,1.6]] as const
export const GROUND={width:250,depth:280,xSegments:225,zSegments:250,centerZ:23}
export function relief(x:number,z:number) {
  let y = .49*Math.sin(x*.18+z*.13)+.39*Math.cos(z*.25-x*.075)+.19*Math.sin(x*.45-z*.36)
    +.072*Math.sin(x*1.07+z*.87)+.047*Math.cos(x*1.9-z*1.49);
  for(const [cx,cz,r,depth] of craterSites){
    const d=Math.hypot(x-cx,z-cz)/r;
    y+=depth*(.25*Math.exp(-((d-1)**2)*18)-Math.exp(-(d*d)*3.2));
  }
  return y;
}
// Match the visible terrain triangles, including their shared diagonal.
export function terrainHeight(x:number,z:number) {
  const {width,depth,xSegments,zSegments,centerZ}=GROUND
  const dx=width/xSegments, dz=depth/zSegments
  const u=(x+width/2)/dx, v=(z-centerZ+depth/2)/dz
  if(u<0||v<0||u>=xSegments||v>=zSegments)return relief(x,z)
  const col=Math.floor(u), row=Math.floor(v)
  const x0=col*dx-width/2, z0=row*dz+centerZ-depth/2
  const i=u-col, j=v-row
  const east=relief(x0+dx,z0), south=relief(x0,z0+dz)
  return i+j<=1
    ? (1-i-j)*relief(x0,z0)+i*east+j*south
    : (i+j-1)*relief(x0+dx,z0+dz)+(1-j)*east+(1-i)*south
}
export function noiseSequence(seed:number) {
  let state=seed >>> 0;
  return () => ((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)
}
