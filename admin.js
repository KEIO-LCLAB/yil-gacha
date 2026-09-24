'use strict';
(() => {
 const $=id=>document.getElementById(id), config=YILConfig;
 const database='projects/yil-gacha-ichii/databases/(default)';
 let key=null,busy=false;
 for(let n=2;n<=11;n++){const o=document.createElement('option');o.value=n;o.textContent=n+'枚';$('max-cards').append(o);}
 function preview(){const max=Number($('max-cards').value);$('preview').replaceChildren();for(let n=1;n<=max;n++){const tr=document.createElement('tr'),p=Math.round(config.probability(n,max)*100);for(const value of [n+'枚',p+'%',(100-p)+'%']){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('preview').append(tr);}}
 $('logout').addEventListener('click',()=>{key=null;$('panel').hidden=true;$('login').hidden=false;$('password').value='';$('message').textContent='ログアウトしました。';});
 $('max-cards').addEventListener('change',preview);
 $('login').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;$('login-button').disabled=true;$('message').textContent='確認中…';
 try{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode($('login-id').value.trim()+':'+$('password').value));
  const candidate=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const response=await fetch('https://firestore.googleapis.com/v1/'+database+'/documents/adminKeys/'+candidate,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('login');
  const max=await config.read();key=candidate;$('password').value='';$('login').hidden=true;$('panel').hidden=false;$('max-cards').value=max;$('current').textContent='現在の上限：'+max+'枚';preview();$('message').textContent='ログインしました。';
 }catch{key=null;$('message').textContent='ID・パスワード、または通信状態をご確認ください。';}
 finally{busy=false;$('login-button').disabled=false;}
 });
 $('settings').addEventListener('submit',async e=>{e.preventDefault();if(busy||!key)return;const max=Number($('max-cards').value);if(!config.validMax(max))return;busy=true;$('save').disabled=true;$('logout').disabled=true;$('max-cards').disabled=true;$('message').textContent='保存中…';
 try{
  const nonce=crypto.randomUUID(),fields={maxCards:{integerValue:String(max)},nonce:{stringValue:nonce}};
  const writes=[{update:{name:database+'/documents/adminKeys/'+key,fields},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]},{update:{name:database+'/documents/settings/gacha',fields}}];
  const response=await fetch('https://firestore.googleapis.com/v1/'+database+'/documents:commit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({writes}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('save');const actual=await config.read();$('current').textContent='現在の上限：'+actual+'枚';$('max-cards').value=actual;preview();$('message').textContent=actual===max?'保存しました。上限'+max+'枚でクリアファイル100%になります。':'別の端末で変更されました。現在の上限をご確認ください。';
 }catch{$('message').textContent='保存結果を確認できません。再ログインして現在の上限を確認してください。';}
 finally{busy=false;$('save').disabled=false;$('logout').disabled=false;$('max-cards').disabled=false;}
 });
})();
