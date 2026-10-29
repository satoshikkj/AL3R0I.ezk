(() => {
"use strict";
const demo = [
{id:"WG-DEMO-001",title:"Política de segurança de conteúdo para revisar",severity:"Alto",category:"Cabeçalhos HTTP",description:"Uma CSP pode reduzir o impacto de injeção de conteúdo. A ausência precisa ser confirmada na resposta real.",evidence:"Demonstração: nenhuma requisição HTTP foi feita.",fix:"Defina uma Content-Security-Policy adequada; teste primeiro em modo Report-Only."},
{id:"WG-DEMO-002",title:"Cabeçalho HSTS para revisar",severity:"Alto",category:"HTTPS/TLS",description:"HSTS instrui navegadores a usar HTTPS em visitas futuras. O contexto do domínio precisa ser verificado.",evidence:"Valor ilustrativo, não observado no alvo.",fix:"Confirme HTTPS em todo o domínio antes de configurar Strict-Transport-Security."},
{id:"WG-DEMO-003",title:"Atributos de cookies para revisar",severity:"Médio",category:"Cookies",description:"Cookies de sessão devem ter atributos coerentes com sua função e com o fluxo da aplicação.",evidence:"Nenhum cookie foi lido ou inspecionado.",fix:"Revise Secure, HttpOnly e SameSite para cada cookie sensível."},
{id:"WG-DEMO-004",title:"X-Content-Type-Options para revisar",severity:"Médio",category:"Cabeçalhos HTTP",description:"O valor nosniff ajuda a evitar inferência de MIME em certos contextos.",evidence:"Nenhuma consulta HTTP foi feita.",fix:"Avalie X-Content-Type-Options: nosniff e confirme os tipos MIME servidos."},
{id:"WG-DEMO-005",title:"Informações de servidor potencialmente expostas",severity:"Baixo",category:"Exposição de informações",description:"Cabeçalhos detalhados podem revelar tecnologia; isso isoladamente não confirma exploração.",evidence:"Nenhum cabeçalho real foi coletado.",fix:"Remova detalhes de versão desnecessários sem prejudicar o diagnóstico."},
{id:"WG-DEMO-006",title:"Exemplo de classificação crítica",severity:"Crítico",category:"Demonstração",description:"A severidade crítica é fictícia nesta linha para demonstrar filtros. A ausência isolada de um cabeçalho não justifica este nível.",evidence:"Dado artificial. Não reporte como vulnerabilidade real.",fix:"Substitua por um achado confirmado e classifique conforme o impacto demonstrado."}
];
const $=id=>document.getElementById(id);
const state={items:demo.map(x=>({...x})),filter:"Todos",target:null};
const cls=s=>({"Crítico":"critical","Alto":"high","Médio":"medium","Baixo":"low"}[s]||"low");
const icon=s=>({"Crítico":"!","Alto":"↑","Médio":"◇","Baixo":"✓"}[s]||"•");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function counts(){return state.items.reduce((a,x)=>(a[x.severity]=(a[x.severity]||0)+1,a),{});}
function renderList(){
 const items=state.items.filter(x=>state.filter==="Todos"||x.severity===state.filter);
 $("list").innerHTML=items.map(x=>`<article class="finding"><div class="symbol ${cls(x.severity)}">${icon(x.severity)}</div><div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p><div class="meta"><span class="badge ${cls(x.severity)}">${esc(x.severity)}</span><span class="category">${esc(x.category)}</span></div><div class="fid">${esc(x.id)}</div><div class="detail"><b>Evidência:</b> ${esc(x.evidence)}<br><br><b>Correção sugerida:</b> ${esc(x.fix)}</div></div><div class="finding-right"><span class="confidence">DEMO</span><button class="details" aria-expanded="false">Detalhes +</button></div></article>`).join("");
 $("empty").classList.toggle("hidden",items.length>0);
 $("list").querySelectorAll(".details").forEach(b=>b.addEventListener("click",()=>{const row=b.closest(".finding");row.classList.toggle("expanded");const open=row.classList.contains("expanded");b.textContent=open?"Fechar −":"Detalhes +";b.setAttribute("aria-expanded",String(open));}));
}
function renderStats(){
 const c=counts(),n=state.items.length;
 const risk=n?Math.round(state.items.reduce((sum,x)=>sum+({"Crítico":10,"Alto":7,"Médio":4,"Baixo":1}[x.severity]||0),0)/(n*10)*100):0;
 $("total").textContent=String(n).padStart(2,"0");$("critical").textContent=String(c["Crítico"]||0).padStart(2,"0");$("high").textContent=String(c["Alto"]||0).padStart(2,"0");$("score").textContent=risk;$("meter").style.width=risk+"%";$("scoreNote").textContent="Pontuação fictícia — não mede o alvo";$("subtitle").textContent="Achados fictícios para demonstrar a interface";$("navCount").textContent=n;$("allCount").textContent=n;
 const colors={"Crítico":"#ff7288","Alto":"#ffb16e","Médio":"#e6d17a","Baixo":"#6bdfb3"};
 $("distribution").innerHTML=["Crítico","Alto","Médio","Baixo"].map(s=>`<div class="distribution-row"><div class="distribution-label"><i class="dot" style="background:${colors[s]}"></i>${s}<b>${c[s]||0}</b></div><div class="bar"><span style="width:${n?(c[s]||0)/n*100:0}%;background:${colors[s]}"></span></div></div>`).join("");
}
function render(){renderList();renderStats();}
function normalize(raw){let u;try{u=new URL(raw.includes("://")?raw:"https://"+raw)}catch{throw Error("Digite um domínio válido, como https://seusite.com.br.")}if(!["http:","https:"].includes(u.protocol)||!u.hostname.includes(".")||u.hostname==="localhost"||u.username||u.password)throw Error("Use uma URL pública HTTP/HTTPS válida, sem credenciais.");return u.origin;}
$("scanForm").addEventListener("submit",async e=>{
 e.preventDefault();try{state.target=normalize($("target").value.trim())}catch(err){$("message").textContent=err.message;$("message").style.color="#ff7288";return}
 $("message").style.color="";$("message").textContent="Simulação visual: nenhum teste foi executado no domínio.";const btn=$("scanBtn");btn.disabled=true;$("progressWrap").classList.remove("hidden");
 const steps=["Validando formato da URL…","Preparando relatório demonstrativo…","Organizando achados de exemplo…","Concluído — sem requisições ao alvo."];
 for(let i=0;i<steps.length;i++){ $("progressLabel").textContent=steps[i];$("progressPct").textContent=Math.round((i+1)/steps.length*100)+"%";$("progressBar").style.width=(i+1)/steps.length*100+"%";await new Promise(r=>setTimeout(r,220));}
 state.items=demo.map(x=>({...x}));render();btn.disabled=false;$("message").textContent="Relatório demonstrativo gerado. O domínio não foi consultado.";
});
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;renderList()}));
$("export").addEventListener("click",()=>{const report={product:"WebGuard Scanner",version:"1.0.0",reportType:"DEMONSTRATION_ONLY",target:state.target,generatedAt:new Date().toISOString(),notice:"Achados fictícios. Nenhuma requisição foi feita ao alvo. Não use como auditoria real.",findings:state.items};const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="webguard-relatorio-demonstrativo.json";a.click();URL.revokeObjectURL(url)});
render();
})();