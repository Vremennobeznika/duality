import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,normalize,addTask,toggleTask,removeTask,addEvent,removeEvent,validDate,editTask,addStage,toggleStage,editEvent} from '../model.mjs';
test('empty state has two anonymous participants',()=>{const s=emptyState();assert.deepEqual(s.people,['Участник 1','Участник 2']);assert.equal(Object.keys(s.tasks).length,2)});
test('add/toggle/delete tasks are immutable',()=>{const s=emptyState();const a=addTask(s,'one','  Проверка  ','1');assert.equal(a.tasks.one[0].text,'Проверка');assert.equal(s.tasks.one.length,0);assert.equal(toggleTask(a,'one','1').tasks.one[0].done,true);assert.equal(removeTask(a,'one','1').tasks.one.length,0)});
test('calendar validates actual dates',()=>{assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true);const a=addEvent(emptyState(),'2028-02-29','Встреча','','e1');assert.equal(removeEvent(a,'e1').events.length,0);assert.throws(()=>addEvent(emptyState(),'2026-02-29','Нельзя'))});
test('bad input is rejected, not silently discarded',()=>{assert.throws(()=>normalize({version:1,tasks:{one:[],two:[]},events:[{id:'1',date:'bad',title:'x'}]}));assert.throws(()=>normalize({version:999,tasks:{one:[],two:[]},events:[]}))});
test('duplicates prohibited',()=>{assert.throws(()=>normalize({...emptyState(),tasks:{one:[{id:'a',text:'A'},{id:'a',text:'B'}],two:[]}}))});
test('reject unknown participant and missing task',()=>{assert.throws(()=>addTask(emptyState(),'third','X'));assert.throws(()=>toggleTask(emptyState(),'one','missing'))});

test('task stages and editing',()=>{const a=addTask(emptyState(),'one','Original','t1');const b=addStage(a,'one','t1','Первый этап','s1');assert.equal(b.tasks.one[0].stages.length,1);const c=toggleStage(b,'one','t1','s1');assert.equal(c.tasks.one[0].done,true);assert.equal(editTask(c,'one','t1','Исправлено').tasks.one[0].text,'Исправлено');assert.equal(a.tasks.one[0].stages.length,0)});
test('event editing retains ID',()=>{const a=addEvent(emptyState(),'2026-12-01','Начало','','ev1');const b=editEvent(a,'ev1','2026-12-02','Конец','Заметка');assert.equal(b.events[0].id,'ev1');assert.equal(b.events[0].title,'Конец')});
