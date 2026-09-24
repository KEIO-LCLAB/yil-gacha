const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=require('path').resolve(__dirname,'..')+'/';
const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(root+'shared.js','utf8'),ctx);ctx.YILConfig=ctx.window.YILConfig;
vm.runInContext(fs.readFileSync(root+'app.js','utf8').split('(() => {')[0],ctx);
let checked=0;
for(let max=2;max<=11;max++){
 let prev=-1;
 for(let cards=1;cards<=max;cards++){
  let p=ctx.YILConfig.probability(cards,max);assert(p>=prev);prev=p;
  if(cards===1)assert.equal(p,0);if(cards===max)assert.equal(p,1);
  let percent=Math.round(p*100);let sum=0;for(let i=0;i<10;i++)sum+=Math.max(0,Math.min(100,(percent-i*10)*10));assert.equal(sum/10,percent);
  for(let roll of [0,Math.max(0,p-.00001),p,.999999]){let d=ctx.drawPrize(cards,()=>roll,max);assert.equal(d.clearFile,roll<p);assert.notEqual(d.clearFile,d.sticker);assert.equal(d.complete,cards===max);assert.equal(d.max,max);checked++;}
 }
 assert.throws(()=>ctx.drawPrize(max+1,()=>0,max));
}
assert.equal(ctx.YILConfig.probability(8,11),.55);
for(let max of [1,12,2.5,NaN])assert.throws(()=>ctx.drawPrize(1,()=>0,max));
console.log(`${checked} boundary checks passed; cap 2–11, monotonic curve, endpoints, capsule shares, invalid caps`);
