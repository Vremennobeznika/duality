import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('every statically referenced DOM ID exists in HTML',()=>{
 const present=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 const referenced=[...app.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
 const missing=[...new Set(referenced.filter(id=>!present.has(id)))];
 assert.deepEqual(missing,[]);
});
test('both themes expose toggle, CSS colors, and initial theme',()=>{
 assert.match(html,/id="themeToggle"/);
 assert.match(html,/id="themeColor"/);
 assert.match(css,/:root\[data-theme="light"\]/);
 assert.match(app,/duo-theme-v1/);
});
test('single two-person app only, no fixed personal profile names',()=>{
 assert.match(html,/Участник 1/);
 assert.match(html,/Участник 2/);
 assert.doesNotMatch(html,/https:\/\/[a-z0-9]{18,}\.supabase\.co/);
});
