'use strict';
(() => {
 const $=id=>document.getElementById(id), config=YILConfig;
 let busy=false;
 for(let n=2;n<=11;n++){const o=document.createElement('option');o.value=n;o.textContent=n+'枚';$('max-cards').append(o);}
 function preview(){const max=Number($('max-cards').value);$('preview').replaceChildren();for(let n=1;n<=max;n++){const tr=document.createElement('tr'),p=Math.round(config.probability(n,max)*100);for(const value of [n+'枚',p+'%',(100-p)+'%']){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('preview').append(tr);}}
 async function refresh(){
  let common=null;
  try { common=await config.readCommon(); $('common').textContent='共通の上限：'+common+'枚'; }
  catch { $('common').textContent='共通設定を取得できません。通信状態を確認してください。'; }
  const own=config.override(),max=own??common;
  $('current').textContent=max===null?'上限を確認できません':config.label(max);
  $('max-cards').value=max??11;preview();
 }
 $('max-cards').addEventListener('change',preview);
 refresh();
 $('settings').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;
 try{config.setOverride(Number($('max-cards').value));await refresh();$('message').textContent='この端末に保存しました。ガチャ画面に戻ると反映されます。';}
 catch{$('message').textContent='保存できません。ブラウザの保存設定をご確認ください。';}finally{busy=false;}
 });
 $('reset-common').addEventListener('click',async()=>{if(busy)return;busy=true;
 try{await config.readCommon();config.clearOverride();await refresh();$('message').textContent='端末別設定を解除し、共通設定に戻しました。';}
 catch{$('message').textContent='共通設定に戻せませんでした。通信・保存設定をご確認ください。';}finally{busy=false;}
 });
})();
