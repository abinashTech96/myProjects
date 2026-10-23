/* Portable review data and stable-ID revision comparison. Distances remain inches. */
(function(root){
 const finite=(v,l,a=-1e6,b=1e6)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)throw Error('Invalid '+l);};
 function validate(s,p){
  const ids=new Set(p.elements.map(e=>e.id));
  if(!Array.isArray(s.fixtures)||s.fixtures.length>128)throw Error('Use at most 128 light fixtures');
  const keys=new Set();
  if(s.fixtures.some(f=>!f||typeof f!=='object'||Array.isArray(f)))throw Error('Invalid light fixture');
  s.fixtures=s.fixtures.filter(f=>ids.has(f.room));
  for(const f of s.fixtures){if(typeof f.id!=='string'||!f.id||keys.has(f.id)||!['ceiling','spot','wall'].includes(f.type))throw Error('Invalid light fixture');keys.add(f.id);finite(f.x,'light X',0,1);finite(f.y,'light Y',0,1);finite(f.height,'light height',1,1000);finite(f.intensity,'light intensity',0,3);finite(f.temperature,'light temperature',2000,6500);finite(f.spread,'light spread',10,120);finite(f.yaw,'light direction',0,360);f.enabled=f.enabled!==false;}
  if(!Array.isArray(s.bookmarks)||s.bookmarks.length>24)throw Error('Use at most 24 section bookmarks');
  for(const b of s.bookmarks){if(!b||typeof b!=='object'||Array.isArray(b))throw Error('Invalid section bookmark');b.name=String(b.name||'Section').slice(0,80);if(!b.pose||!['plot','building','floor','element','material'].includes(b.pose.kind))throw Error('Invalid bookmark view');
   for(const key of ['position','target']){if(!Array.isArray(b.pose[key])||b.pose[key].length!==3)throw Error('Invalid bookmark camera');b.pose[key].forEach(n=>finite(n,'bookmark coordinate'));}
   if(b.pose.floor!=null){finite(b.pose.floor,'bookmark floor',0,255);if(!Number.isInteger(b.pose.floor))throw Error('Invalid bookmark floor');}
   if((b.pose.floor!=null&&b.pose.floor>=p.floorCount)||(b.pose.element!=null&&!ids.has(b.pose.element))){b.pose.element=null;b.pose.floor=null;b.pose.focus=null;b.pose.kind='building';b.pose.planes=[];b.section=null;}
   if(b.pose.focus!=null&&!ids.has(b.pose.focus))b.pose.focus=null;
   if(!['perspective','orthographic'].includes(b.pose.projection))throw Error('Invalid bookmark projection');finite(b.pose.zoom,'bookmark zoom',.001,1e5);finite(b.pose.explosion,'bookmark explosion',0,10000);
   if(!Array.isArray(b.pose.planes)||b.pose.planes.length>6)throw Error('Invalid bookmark planes');for(const a of b.pose.planes){if(!Array.isArray(a)||a.length!==4)throw Error('Invalid bookmark plane');a.forEach(n=>finite(n,'bookmark plane'));const length=Math.hypot(...a.slice(0,3));if(Math.abs(length-1)>.001)throw Error('Invalid bookmark normal');}
   if(b.section){for(const k of ['xmin','xmax','ymin','ymax','zmin','zmax'])finite(b.section[k],'section '+k);for(const k of ['x','y','z'])if(b.section[k+'min']>=b.section[k+'max'])throw Error('Invalid section bounds');}
   b.note=String(b.note||'').slice(0,500);
  }
  s.detailing=s.detailing!==false;return s;
 }
 function diff(before,after){
  const rows=[];
  for(const [kind,list]of [['element','elements'],['opening','fixtures']]){
   const a=new Map((before[list]||[]).map(e=>[e.id,e])),b=new Map((after[list]||[]).map(e=>[e.id,e]));
   for(const id of new Set([...a.keys(),...b.keys()])){
    const old=a.get(id),now=b.get(id),changes=[];let status;
    if(!old)status='added';else if(!now)status='removed';else{
     const fields=[...new Set([...Object.keys(old),...Object.keys(now)])].filter(k=>k!=='id');
     for(const key of fields)if(JSON.stringify(old[key])!==JSON.stringify(now[key]))changes.push({field:key,before:old[key],after:now[key]});
     if(!changes.length)continue;status=changes.some(c=>['w','h','size','height','points','customHeight'].includes(c.field))?'resized':changes.some(c=>['x','y','floor','offset','roomId','edge','rot'].includes(c.field))?'moved':'changed';
    }
    rows.push({id,kind,status,changes,before:old,after:now});
   }
  }
  // Saved finishes are reviewed even when the structural record is unchanged.
  const a=before.design?.presentation?.surfaces||{},b=after.design?.presentation?.surfaces||{};
  for(const id of new Set([...Object.keys(a),...Object.keys(b)]))if(JSON.stringify(a[id])!==JSON.stringify(b[id]))rows.push({id,kind:'finish',status:'changed',changes:[{field:'surfaces',before:a[id],after:b[id]}],before:before.elements?.find(e=>e.id===id),after:after.elements?.find(e=>e.id===id)});
  return rows;
 }
 root.FourDReviewModel={validate,diff};if(typeof module==='object')module.exports=root.FourDReviewModel;
})(globalThis);
