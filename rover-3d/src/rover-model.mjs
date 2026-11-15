import * as T from 'three';

// Metres, with +Z forward and +Y up. The named articulation nodes survive GLB export.
export const wheelRadius = .29;
export const wheelStations = [[-.93,.98],[-.97,0],[-.92,-.99],[.93,.98],[.97,0],[.92,-.99]];
const material = (color, metalness, roughness) => new T.MeshStandardMaterial({color, metalness, roughness});
const ceramic = material('#e5d9c2', .24, .58);
const frame = material('#777b76', .67, .49);
const tire = material('#45413a', .42, .74);
const tread = material('#5c5146', .4, .74);
const black = material('#262a27', .36, .64);
const gold = material('#ac7a42', .67, .5);
const white = material('#f2e8cf', .19, .58);
const cable = material('#34332d', .32, .63);
const lens = material('#152a30', .62, .16);
const boxGeometry = new T.BoxGeometry(1,1,1);
const sphereGeometry = new T.SphereGeometry(1,12,8);
function part(parent, name, geometry, surface, x, y, z) {
  const mesh = new T.Mesh(geometry, surface);
  mesh.name = name;
  mesh.position.set(x,y,z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function box(p,n,m,x,y,z,w,h,d) {
  const o = part(p,n,boxGeometry,m,x,y,z);
  o.scale.set(w,h,d); return o;
}
function joint(p,n,m,x,y,z,r) {
  const o=part(p,n,sphereGeometry,m,x,y,z);
  o.scale.setScalar(r); return o;
}
function rod(p,n,m,a,b,r,tip=r) {
  const start=new T.Vector3(...a), end=new T.Vector3(...b);
  const direction=end.clone().sub(start), mid=start.clone().lerp(end,.5);
  const o=part(p,n,new T.CylinderGeometry(tip,r,direction.length(),9),m,mid.x,mid.y,mid.z);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()); return o;
}
function group(parent,name,x=0,y=0,z=0) {
  const node=new T.Group(); node.name=name; node.position.set(x,y,z); parent.add(node); return node;
}

function wheel(parent, index, x, z) {
  const sign=Math.sign(x);
  const mount=group(parent,'wheel_mount_'+index,x,wheelRadius,z);
  const steer=group(mount,'steer_'+index);
  const spin=group(steer,'spin_'+index);
  rod(spin,'Aluminium wheel drum',tire,[-.13,0,0],[.13,0,0],wheelRadius-.018);
  rod(spin,'Outer hub ring',tread,[sign*.131,0,0],[sign*.15,0,0],.20);
  rod(spin,'Hub recess',black,[sign*.15,0,0],[sign*.155,0,0],.168);
  rod(spin,'Axle cap',frame,[sign*.152,0,0],[sign*.17,0,0],.069);
  for(let i=0;i<18;i++){
    const a=i*Math.PI/9;
    const lug=group(spin,'Chevron grouser',0,Math.cos(a)*.273,Math.sin(a)*.273);
    lug.rotation.x=a;
    for(const side of [-1,1]){
      const strip=box(lug,'Raised tread',tread,side*.06,0,side*.017,.13,.027,.036);
      strip.rotation.y=side*.29;
    }
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    joint(spin,'Hub fastener',gold,sign*.162,Math.cos(a)*.114,Math.sin(a)*.114,.018);
  }
}

export function buildRover() {
  const rover=new T.Group(); rover.name='Mars Walk Guardian Rover';
  const body=group(rover,'chassis',0,wheelRadius+.44,0);
  box(body,'Lower mechanical frame',black,0,-.15,0,1.29,.26,1.96);
  box(body,'Instrument enclosure',ceramic,0,.03,.02,1.42,.34,1.97);
  box(body,'Radiator deck',white,0,.229,-.02,1.46,.09,2.12);
  box(body,'Front bulkhead',frame,0,-.021,1.033,1.33,.23,.08);
  for(const s of [-1,1]){
    box(body,'Protective aluminium rail',frame,s*.733,.145,-.007,.062,.115,1.94);
    box(body,'Insulated side plate',ceramic,s*.725,-.029,-.1,.05,.23,1.70);
    for(let i=0;i<8;i++) joint(body,'Deck bolt',frame,s*.68,.279,-.95+i*.265,.014);
    for(let i=0;i<7;i++) box(body,'Front grille',black,s*(.13+i*.072),-.031,1.08,.021,.135,.021);
    box(body,'Front hazard camera housing',white,s*.46,.14,1.077,.20,.145,.13);
    for(const x of [-.047,.047]) rod(body,'Hazard camera lens',lens,[s*.46+x,.144,1.14],[s*.46+x,.144,1.163],.031);
  }
  // Curiosity-style rear radioisotope generator and heat exchanger fins.
  box(body,'Rear power housing',black,0,.235,-1.065,.48,.33,.53);
  rod(body,'Generator core',frame,[0,.25,-.87],[0,.25,-1.44],.19);
  for(let i=0;i<11;i++) box(body,'Power unit fin',frame,0,.25,-.89-i*.052,.43,.32,.022);
  for(const [x,z,w,h,d] of [[.38,.49,.41,.24,.47],[-.35,-.40,.52,.22,.52],[.42,-.43,.34,.29,.30],[-.19,.05,.28,.19,.52]]) {
    box(body,'Deck science instrument',white,x,.27+h/2,z,w,h,d);
    box(body,'Latching cover',frame,x,.28+h,z,w*.86,.028,d*.85);
    box(body,'Insulation strip',gold,x-w*.32,.29+h,z,w*.14,.014,d*.85);
  }
  const mast=group(body,'mast_head',-.43,1.24,.48);
  rod(body,'Mast column',frame,[-.43,.27,.48],[-.43,1.24,.48],.059);
  for (const y of [.31,.56,1.0,1.17]) rod(body,'Mast collar',gold,[-.43,y,.48],[-.43,y+.037,.48],.084);
  box(mast,'Stereo camera housing',ceramic,0,.043,0,.50,.21,.28);
  box(mast,'Recessed instrument panel',black,0,.052,.146,.425,.143,.019);
  for(const x of [-.158,-.060,.071,.157]) {
    rod(mast,'Camera bezel',frame,[x,.056,.151],[x,.056,.175],.041);
    rod(mast,'Optical glass',lens,[x,.056,.175],[x,.056,.18],.029);
  }
  box(mast,'Laser housing',white,.096,.187,-.018,.21,.118,.22);
  rod(mast,'Laser aperture',lens,[.096,.187,.087],[.096,.187,.11],.042);
  rod(body,'UHF whip',frame,[.42,.42,-.77],[.43,1.13,-.79],.018,.009);
  rod(body,'Low gain antenna',gold,[.50,.29,.09],[.5,.67,.09],.046,.027);
  const antenna=part(body,'High gain antenna',new T.CylinderGeometry(.17,.16,.045,6),white,.28,.60,-.23);
  antenna.rotation.x=.36;
  rod(body,'Antenna pedestal',frame,[.28,.28,-.23],[.28,.59,-.23],.047);
  const arm=group(body,'arm_shoulder',.42,.045,1.00);
  joint(arm,'Shoulder actuator',black,0,0,0,.138);
  rod(arm,'Shoulder link',frame,[0,0,0],[.20,-.17,.48],.073);
  const elbow=group(arm,'arm_elbow',.20,-.17,.48);
  joint(elbow,'Elbow actuator',gold,0,0,0,.091);
  rod(elbow,'Forearm link',ceramic,[0,0,0],[-.32,-.05,.29],.064,.051);
  rod(elbow,'Arm wiring loom',cable,[.039,-.027,.025],[-.275,-.077,.29],.016);
  const turret=group(elbow,'arm_turret',-.32,-.05,.30);
  rod(turret,'Tool carousel',black,[0,-.10,0],[0,.059,0],.15);
  box(turret,'Sample collection tool',frame,0,-.075,.139,.18,.095,.22);
  rod(turret,'Inspection optic',lens,[-.09,0,.08],[-.09,.01,.144],.043);
  wheelStations.forEach(([x,z],i) => wheel(rover,i,x,z));
  for(const sign of [-1,1]){
    const prefix=sign<0?'suspension_left':'suspension_right';
    const suspension=group(rover,prefix);
    const rocker=[sign*.699,.626,-.04];
    const bogie=[sign*.785,wheelRadius+.21,-.43];
    const front=[sign*.80,wheelRadius,.98], middle=[sign*.80,wheelRadius,0], rear=[sign*.80,wheelRadius,-.99];
    const linkEnds=[[rocker,front],[rocker,bogie],[bogie,middle],[bogie,rear],[[rocker[0],rocker[1]+.19,rocker[2]+.13],new T.Vector3(...front).lerp(new T.Vector3(...rocker),.34).toArray()]];
    for(const [i,[a,b]] of linkEnds.entries()){
      const start=new T.Vector3(...a), end=new T.Vector3(...b);
      const direction=end.clone().sub(start), mid=start.clone().lerp(end,.5);
      const link=part(suspension,prefix+'_link_'+i,new T.CylinderGeometry(.048,.058,1,8),i===4?black:frame,mid.x,mid.y,mid.z);
      link.scale.y=direction.length();
      link.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
    }
    for(const [i,p] of [rocker,bogie,front,rear].entries()) joint(suspension,prefix+'_joint_'+i,black,...p,.078);
  }
  return rover;
}
