export const CHARACTERS=Object.freeze([
  {id:'beetle',name:'Lantern beetle',letter:'A'},
  {id:'moth',name:'Crescent moth',letter:'B'},
  {id:'ant',name:'Thorn ant',letter:'C'},
  {id:'pillbug',name:'Pebble guardian',letter:'D'},
]);
export const DEFAULT_CHARACTER='beetle';
export const isCharacter=value=>typeof value==='string'&&CHARACTERS.some(character=>character.id===value);
