import{r,j as t}from"./index-EjDNZXO3.js";const K=({children:D,width:i=200,height:l=80,borderRadius:a=20,borderWidth:p=.07,brightness:g=50,opacity:x=.93,blur:m=11,displace:$=0,backgroundOpacity:F=0,saturation:k=1,distortionScale:h=-180,redOffset:v=0,greenOffset:y=10,blueOffset:R=20,xChannel:b="R",yChannel:j="G",mixBlendMode:G="difference",className:_="",contentClassName:z="",style:N={}})=>{const c=r.useId().replace(/:/g,"-"),f=`glass-filter-${c}`,w=`red-grad-${c}`,S=`blue-grad-${c}`,[T,q]=r.useState(!1),o=r.useRef(null),C=r.useRef(null),A=r.useRef(null),I=r.useRef(null),B=r.useRef(null),E=r.useRef(null),H=()=>{var M;const e=(M=o.current)==null?void 0:M.getBoundingClientRect(),s=(e==null?void 0:e.width)||400,n=(e==null?void 0:e.height)||200,u=Math.min(s,n)*(p*.5),W=`
      <svg viewBox="0 0 ${s} ${n}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${w}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${S}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${s}" height="${n}" fill="black"></rect>
        <rect x="0" y="0" width="${s}" height="${n}" rx="${a}" fill="url(#${w})" />
        <rect x="0" y="0" width="${s}" height="${n}" rx="${a}" fill="url(#${S})" style="mix-blend-mode: ${G}" />
        <rect x="${u}" y="${u}" width="${s-u*2}" height="${n-u*2}" rx="${a}" fill="hsl(0 0% ${g}% / ${x})" style="filter:blur(${m}px)" />
      </svg>
    `;return`data:image/svg+xml,${encodeURIComponent(W)}`},d=()=>{var e;(e=C.current)==null||e.setAttribute("href",H())};r.useEffect(()=>{var e;d(),[{ref:A,offset:v},{ref:I,offset:y},{ref:B,offset:R}].forEach(({ref:s,offset:n})=>{s.current&&(s.current.setAttribute("scale",(h+n).toString()),s.current.setAttribute("xChannelSelector",b),s.current.setAttribute("yChannelSelector",j))}),(e=E.current)==null||e.setAttribute("stdDeviation",$.toString())},[i,l,a,p,g,x,m,$,h,v,y,R,b,j,G]),r.useEffect(()=>{if(!o.current)return;const e=new ResizeObserver(()=>{setTimeout(d,0)});return e.observe(o.current),()=>{e.disconnect()}},[]),r.useEffect(()=>{setTimeout(d,0)},[i,l]),r.useEffect(()=>{q(U())},[]);const U=()=>{if(typeof window>"u"||typeof document>"u")return!1;const e=/Safari/.test(navigator.userAgent)&&!/Chrome/.test(navigator.userAgent),s=/Firefox/.test(navigator.userAgent);if(e||s)return!1;const n=document.createElement("div");return n.style.backdropFilter=`url(#${f})`,n.style.backdropFilter!==""},V={...N,width:typeof i=="number"?`${i}px`:i,height:typeof l=="number"?`${l}px`:l,borderRadius:`${a}px`,"--glass-frost":F,"--glass-saturation":k,"--filter-id":`url(#${f})`};return t.jsxs("div",{ref:o,className:`glass-surface ${T?"glass-surface--svg":"glass-surface--fallback"}`,style:V,children:[t.jsx("svg",{className:"glass-surface__filter",xmlns:"http://www.w3.org/2000/svg",children:t.jsx("defs",{children:t.jsxs("filter",{id:f,colorInterpolationFilters:"sRGB",x:"0%",y:"0%",width:"100%",height:"100%",children:[t.jsx("feImage",{ref:C,x:"0",y:"0",width:"100%",height:"100%",preserveAspectRatio:"none",result:"map"}),t.jsx("feDisplacementMap",{ref:A,in:"SourceGraphic",in2:"map",id:"redchannel",result:"dispRed"}),t.jsx("feColorMatrix",{in:"dispRed",type:"matrix",values:`1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0`,result:"red"}),t.jsx("feDisplacementMap",{ref:I,in:"SourceGraphic",in2:"map",id:"greenchannel",result:"dispGreen"}),t.jsx("feColorMatrix",{in:"dispGreen",type:"matrix",values:`0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0`,result:"green"}),t.jsx("feDisplacementMap",{ref:B,in:"SourceGraphic",in2:"map",id:"bluechannel",result:"dispBlue"}),t.jsx("feColorMatrix",{in:"dispBlue",type:"matrix",values:`0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0`,result:"blue"}),t.jsx("feBlend",{in:"red",in2:"green",mode:"screen",result:"rg"}),t.jsx("feBlend",{in:"rg",in2:"blue",mode:"screen",result:"output"}),t.jsx("feGaussianBlur",{ref:E,in:"output",stdDeviation:"0.7"})]})})}),t.jsx("div",{className:`glass-surface__content ${_} ${z}`,children:D})]})};export{K as G};
