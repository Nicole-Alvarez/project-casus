import {DEFAULT_CHARACTER,isCharacter} from './characters.mjs';
export function parseMessage(raw) {
  if (typeof raw !== 'string' || raw.length > 1024) return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.type === 'join') {
    if (typeof value.room !== 'string' || !/^[a-z0-9]{3,12}$/i.test(value.room)) return null;
    if (typeof value.name !== 'string') return null;
    const name = value.name.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 18);
    if (!name) return null;
    const sprite=value.sprite===undefined?DEFAULT_CHARACTER:value.sprite;
    if(!isCharacter(sprite))return null;
    return { type: 'join', room: value.room.toUpperCase(), name, sprite };
  }
  if(value.type==='appearance'){
    if(Object.keys(value).some(key=>!['type','sprite'].includes(key))||!isCharacter(value.sprite))return null;
    return {type:'appearance',sprite:value.sprite};
  }
  if (value.type === 'input') {
    const fields = ['left', 'right', 'jump', 'respawn', 'float', 'grapple', 'dash'];
    if (Object.keys(value).some(key => key !== 'type' && !fields.includes(key))) return null;
    if (fields.some(key => typeof value[key] !== 'boolean')) return null;
    return { type: 'input', ...Object.fromEntries(fields.map(key => [key, value[key]])) };
  }
  return null;
}
