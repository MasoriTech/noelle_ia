
(() => {

function status(msg){
  let el=document.getElementById("streamSTTStatus");
  if(!el){
    el=document.createElement("div");
    el.id="streamSTTStatus";
    el.style.marginTop="6px";
    document.body.appendChild(el);
  }
  el.textContent=msg;
}

window.streamSTTStatus=status;

})();
