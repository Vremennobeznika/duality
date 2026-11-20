export const emptyState = () => ({version: 1, people: ['Участник 1','Участник 2'], tasks: {one: [], two: []}, events: []});
export const validDate = value => /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value) && !Number.isNaN(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
export const uid = () => {
  if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function')return crypto.randomUUID();
  if(typeof crypto!=='undefined' && typeof crypto.getRandomValues==='function'){const bytes=crypto.getRandomValues(new Uint8Array(16));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}
  return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2); // IDs only, not a security secret
};
const trimmed = (v,max) => typeof v==='string' ? v.trim().slice(0,max) : '';
export function normalize(input){
  if(!input || typeof input!=='object' || input.version!==1 || !input.tasks || !Array.isArray(input.events)) throw Error('Неподдерживаемый формат данных');
  const state=emptyState();
  state.people = [0,1].map(i=>trimmed(input.people?.[i],32)||state.people[i]);
  for(const key of ['one','two']){
    if(!Array.isArray(input.tasks[key]) || input.tasks[key].length>500) throw Error('Некорректный список');
    state.tasks[key]=input.tasks[key].map(x=>{
      if(!x || typeof x.id!=='string' || !trimmed(x.text,200)) throw Error('Некорректная задача');
      const stages=(x.stages??[]);if(!Array.isArray(stages)||stages.length>30)throw Error('Некорректные этапы');
      const cleaned=stages.map(y=>{if(!y||!trimmed(y.id,80)||!trimmed(y.text,150))throw Error('Некорректный этап');return {id:trimmed(y.id,80),text:trimmed(y.text,150),done:y.done===true}});
      if(new Set(cleaned.map(y=>y.id)).size!==cleaned.length)throw Error('Дублирующиеся этапы');
      return {id:trimmed(x.id,80),text:trimmed(x.text,200),done:x.done===true,stages:cleaned};
    });
    if(new Set(state.tasks[key].map(x=>x.id)).size!==state.tasks[key].length) throw Error('Дублирующиеся ID задач');
  }
  if(input.events.length>500) throw Error('Слишком много событий');
  state.events=input.events.map(x=>{
    if(!x || typeof x.id!=='string' || !trimmed(x.title,140) || !validDate(x.date)) throw Error('Некорректное событие');
    return {id:trimmed(x.id,80),date:x.date,title:trimmed(x.title,140),note:trimmed(x.note,500)};
  });
  if(new Set(state.events.map(x=>x.id)).size!==state.events.length) throw Error('Дублирующиеся ID событий');
  return state;
}
export function addTask(state,key,text,id=uid()){
  const next=normalize(state); if(!['one','two'].includes(key) || !trimmed(text,200)) throw Error('Введите задачу');
  next.tasks[key].unshift({id,text:trimmed(text,200),done:false,stages:[]});return next;
}
export function toggleTask(state,key,id){const next=normalize(state);const t=next.tasks[key]?.find(x=>x.id===id);if(!t) throw Error('Задача не найдена');t.done=!t.done;return next;}
export function removeTask(state,key,id){const next=normalize(state);if(!next.tasks[key]?.some(x=>x.id===id)) throw Error('Задача не найдена');next.tasks[key]=next.tasks[key].filter(x=>x.id!==id);return next;}
export function addEvent(state,date,title,note='',id=uid()){
 const next=normalize(state);if(!validDate(date)||!trimmed(title,140))throw Error('Укажите дату и название');next.events.push({id,date,title:trimmed(title,140),note:trimmed(note,500)});return next;
}
export function removeEvent(state,id){const next=normalize(state);if(!next.events.some(x=>x.id===id))throw Error('Событие не найдено');next.events=next.events.filter(x=>x.id!==id);return next;}

export function editTask(state,key,id,text){const n=normalize(state);const t=n.tasks[key]?.find(t=>t.id===id);if(!t||!trimmed(text,200))throw Error('Некорректное название задачи');t.text=trimmed(text,200);return n}
export function addStage(state,key,id,text,stageId=uid()){const n=normalize(state);const t=n.tasks[key]?.find(t=>t.id===id);if(!t||!trimmed(text,150)||t.stages.length>=30)throw Error('Нельзя добавить этап');t.stages.push({id:stageId,text:trimmed(text,150),done:false});t.done=false;return n}
export function toggleStage(state,key,id,stageId){const n=normalize(state);const t=n.tasks[key]?.find(t=>t.id===id);const st=t?.stages.find(s=>s.id===stageId);if(!st)throw Error('Этап не найден');st.done=!st.done;t.done=t.stages.every(x=>x.done);return n}
export function editEvent(state,id,date,title,note=''){const n=normalize(state);const e=n.events.find(x=>x.id===id);if(!e||!validDate(date)||!trimmed(title,140))throw Error('Некорректные данные события');e.date=date;e.title=trimmed(title,140);e.note=trimmed(note,500);return n}
