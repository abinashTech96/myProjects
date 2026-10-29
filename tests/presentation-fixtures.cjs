/* Fixed architectural dimensions for reviewed regression scenes. */
exports.design=kind=>{
 const p={unit:'in',scale:1.2,plot:{inW:'720',inH:'600'},wallSettings:{external:9,internal:4.5,height:120},floorCount:1,elements:[],fixtures:[],view:{mode:'2d',parapet:'none'},design:{roof:{type:'flat',thickness:6,overhang:0}}};
 const room=(id,x,y,w,h,floor=0,type='bedroom')=>({id,type,x,y,w,h,floor});
 if(kind==='irregular'){
  p.elements=[{...room('angled',60,60,360,300,0,'living'),points:[{x:0,y:0},{x:360,y:0},{x:360,y:180},{x:240,y:300},{x:0,y:300}]}];
  p.design.workbench={site:{boundary:[{x:-60,y:-60},{x:760,y:-40},{x:780,y:500},{x:600,y:650},{x:-40,y:640}]}};
  p.design.roof={...p.design.roof,type:'hip',rise:40,overhang:12};
 }else if(kind==='courtyard'){
  p.elements=[room('court-n',90,90,480,120,0,'living'),room('court-s',90,390,480,120),room('court-w',90,210,120,180),room('court-e',450,210,120,180,0,'kitchen')];
 }else if(kind==='multistorey'||kind==='furnished'){
  p.floorCount=3;for(let f=0;f<3;f++)p.elements.push(room('storey-'+f,70,70,300,300,f,'living'),room('wing-'+f,370,70,180,300,f));
  p.design.workbench={levels:[{id:'datum-one',floor:1,base:144,height:132},{id:'datum-two',floor:2,base:282,height:120}]};
  p.design.roof={...p.design.roof,type:'gable',rise:48,overhang:10};
  if(kind==='furnished'){
   for(let f=0;f<3;f++)for(let i=0;i<20;i++)p.elements.push({id:`seat-${f}-${i}`,type:['sofa','bed','chair'][i%3],isFurniture:true,x:90+(i%5)*50,y:100+Math.floor(i/5)*60,w:48,h:48,customHeight:40,floor:f,rot:(i%4)*90});
   p.design.workbench.interiors=[{room:'wing-0',items:[{id:'fitout-counter',type:'wall-cabinet',x:400,y:100,w:100,h:24,height:36,base:0,clearance:0}]}];
  }
 }else throw Error('Unknown presentation fixture '+kind);
 return p;
};
