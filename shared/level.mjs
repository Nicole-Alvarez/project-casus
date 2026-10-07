export const TILE=36;
export const DT=1/60;
export const MAX_PLAYERS=8;
export const COLORS=['#8ce6ba','#a5c4ff','#f7b5d5','#ffe199','#c7b3ff','#8ce3e8','#ffb79d','#e2edba'];
const shelf=(id,x,y,w,h=36)=>({id,x,y,w,h});
export const LEVEL=Object.freeze({
  name:'Hollowroot Sanctuary',width:3600,height:2100,groundY:1700,
  platforms:[
    {...shelf('forest-floor',0,1700,3600,400),ground:true},
    {...shelf('left-wall',0,0,70,1700),wall:true},
    {...shelf('right-wall',3550,0,50,1700),wall:true},
    {...shelf('cavern-ceiling',0,-100,3600,100),ceiling:true},
    shelf('canopy-1',650,1520,230),shelf('canopy-2',940,1340,230),shelf('canopy-3',1230,1160,260),
    shelf('windfall-landing',1800,1410,100),
    {...shelf('root-left',1900,750,40,700),wall:true},{...shelf('root-right',2140,750,40,700),wall:true},
    shelf('root-cap',1900,750,100),
    shelf('silk-1',1550,920,190),shelf('silk-2',1770,690,200),shelf('silk-3',2100,580,180),
    shelf('bough-west',2370,450,230),shelf('bough-east',2700,450,210),
    shelf('treetop',2700,190,500),shelf('homeward-1',3220,520,200),shelf('homeward-2',3420,980,130),
  ],
  checkpoints:[
    {id:'willow-rest',name:'The threshold',x:350,y:1656},
    {id:'canopy-rest',name:'Moss gallery',x:1290,y:1116},
    {id:'root-rest',name:'Rootshaft crown',x:1930,y:706},
    {id:'treetop-rest',name:'Quiet sanctuary',x:2950,y:146},
  ],
  anchors:[{id:'silk-a',x:1380,y:950},{id:'silk-b',x:1680,y:740},{id:'silk-c',x:1870,y:510},{id:'silk-d',x:2180,y:400},{id:'silk-e',x:2450,y:260},{id:'silk-f',x:2800,y:30}],
  routes:[
    {id:'canopy',name:'Moss gallery',ability:'double jump',x:650,y:1520},
    {id:'windfall',name:'Drift hollow',ability:'float',x:1560,y:1300},
    {id:'roots',name:'The rootshaft',ability:'cling / wall jump',x:2040,y:1240},
    {id:'silk',name:'Silk ascent',ability:'grapple',x:1680,y:740},
    {id:'bough',name:'Broken bridge',ability:'dash',x:2550,y:450},
    {id:'treetop',name:'Quiet sanctuary',ability:'all traversal',x:2950,y:190},
  ],
});
