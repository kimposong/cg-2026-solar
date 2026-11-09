/* 6주차 실습 2 — 나만의 태양계에 「철광 행성」 넣기
 *
 * 행성 설정: 철을 많이 품은 암석 행성. 표면은 마른 암석(rock_boulder_dry)이다.
 *
 * 규칙 1 (태양계 변수와 연결) — 항성 접근도 → 산화(녹) 마스크 m1
 *   접근도가 오르면 행성이 태양 쪽으로 다가가고(장면), 받는 빛이 거리 제곱 감쇠로 세진다.
 *   뜨거워질수록 적도(위도 0)부터 극 쪽으로 녹이 번진다.
 *   녹: 주황 갈색, 매우 거칠다(rough↑), 금속성이 거의 없다(metal↓).
 *
 * 규칙 2 (독립 사건) — 운석 충돌 강도 → 크레이터 마스크 m2
 *   강도가 오르면 크레이터가 하나씩 생기고 커진다.
 *   충돌이 녹과 암석을 벗겨 내 신선한 철을 드러낸다.
 *   드러난 철: 회색, 매끈하다(rough↓), 금속(metal=1), 노멀 맵 요철이 줄어든다.
 *
 * 우선순위: 녹(m1)을 먼저 섞고 크레이터(m2)를 나중에 섞는다 → 겹치면 크레이터가 이긴다.
 * 마스크는 모두 vLocal(물체 공간 위치)로 계산하므로 자전해도 표면에 붙어 있다.
 * 장면 구도: 왼쪽에 태양 1개, 오른쪽에 철광 행성 1개. 공전 없이 Y축 자전만 한다.
 */
(() => {
'use strict';
const cv=document.querySelector('#cv'), gl=D.context(cv); if(!gl)return;
const M4=D.M4;

const VS=`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uVP,uModel;
uniform vec2 uUVScale;
out vec3 vP,vN,vLocal; out vec2 vUV;
void main(){
 vec4 w=uModel*vec4(aPos,1.);
 vP=w.xyz;
 vN=mat3(transpose(inverse(uModel)))*aNormal;   // 비균일 스케일에도 안전한 법선 행렬
 vLocal=aPos;                                   // 마스크용 물체 공간 위치
 vUV=aUV*uUVScale;
 gl_Position=uVP*w;
}`;

const FS=`#version 300 es
precision highp float;
const float PI=3.14159265;
in vec3 vP,vN,vLocal; in vec2 vUV; out vec4 outColor;
uniform sampler2D uColor,uNormal,uARM,uEnv,uRustColor,uRustARM;
uniform vec3 uEye,uStarPos,uStarColor,uFlatColor;
uniform float uStarPower,uAmbient,uEnvPower,uNormalStrength;
uniform float uHeat,uImpact;       // 조건 1, 조건 2 (0~1)
uniform int uMode;                 // 0 발광체(태양), 2 철광 행성
uniform int uView;                 // 0 최종, 1 기본 재질, 2 마스크1, 3 마스크2, 4 두 마스크
#define NCRATER 16
uniform vec4 uCraters[NCRATER];    // xyz 충돌 방향(물체 공간), w 나타나기 시작하는 강도

vec3 srgbToLinear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 linearToSrgb(vec3 c){return mix(12.92*c,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}

// ---- 값 노이즈: 마스크 경계를 자연스럽게 흐트러뜨린다 ----
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){
 vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p*=2.03;a*=.5;}return s;}

// ---- 규칙 1: 열 → 산화 마스크 (적도부터 번짐) ----
float rustMask(vec3 local,float heat){
 float lat=abs(normalize(local).y);                 // 0=적도, 1=극
 float n=fbm(local*3.0)-0.5;
 float front=heat*1.1-0.15-lat+n*0.3;               // 열이 클수록 전선이 극으로 이동 (50%≈위도 |y|<0.4)
 return smoothstep(0.0,0.12,front)*smoothstep(0.0,0.06,heat);  // heat=0이면 정확히 0
}

// ---- 규칙 2: 충돌 → 크레이터 마스크 (하나씩 생기고 커짐) ----
// rim: 크레이터 바로 바깥의 분출물 고리 (어둡고 거칠게 만드는 데 쓴다)
float craterMask(vec3 local,float impact,out float rim){
 vec3 p=normalize(local);
 float jitter=(fbm(p*9.0)-0.5)*0.06;
 float m=0.0;rim=0.0;
 for(int i=0;i<NCRATER;i++){
  vec4 c=uCraters[i];
  float grow=smoothstep(c.w,c.w+0.3,impact);        // 0→1로 연속 성장
  float radius=grow*(0.18+0.20*fract(c.w*13.7+float(i)*0.37));  // 크레이터마다 최대 크기가 다르다
  float d=length(p-c.xyz)+jitter;
  m=max(m,grow*(1.0-smoothstep(radius*0.6,radius,d)));
  rim=max(rim,grow*smoothstep(radius*0.8,radius,d)*(1.0-smoothstep(radius,radius*1.6,d)));
 }
 rim*=1.0-m;
 return m;
}

vec3 directPBR(vec3 N,vec3 V,vec3 L,vec3 base,float rough,float metal){
 rough=max(rough,0.045);
 vec3 H=normalize(L+V);
 float NL=max(dot(N,L),0.0),NV=max(dot(N,V),1e-4),NH=max(dot(N,H),0.0),VH=max(dot(V,H),0.0);
 if(NL<=0.0)return vec3(0.0);
 float a=rough*rough,a2=a*a,d=NH*NH*(a2-1.0)+1.0;
 float Dg=a2/(PI*d*d);
 vec3 F0=mix(vec3(0.04),base,metal);
 vec3 F=F0+(1.0-F0)*pow(1.0-VH,5.0);
 float k=(rough+1.0)*(rough+1.0)/8.0;
 float G=(NL/(NL*(1.0-k)+k))*(NV/(NV*(1.0-k)+k));
 vec3 kd=(1.0-F)*(1.0-metal);
 return (kd*base/PI+Dg*F*G/(4.0*NL*NV))*NL;
}
mat3 cotangentFrame(vec3 N,vec3 P,vec2 uv){
 vec3 dp1=dFdx(P),dp2=dFdy(P);vec2 du1=dFdx(uv),du2=dFdy(uv);
 vec3 dp2perp=cross(dp2,N),dp1perp=cross(N,dp1);
 vec3 T=dp2perp*du1.x+dp1perp*du2.x,B=dp2perp*du1.y+dp1perp*du2.y;
 float invmax=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-20));
 return mat3(T*invmax,B*invmax,N);
}
vec2 dirToEquirect(vec3 d){return vec2(atan(d.z,d.x)/(2.0*PI)+0.5,asin(clamp(d.y,-1.0,1.0))/PI+0.5);}

vec3 shade(vec3 N,vec3 V,vec3 base,float rough,float metal,float ao){
 vec3 toStar=uStarPos-vP;float dist2=dot(toStar,toStar);
 vec3 L=toStar*inversesqrt(dist2);
 vec3 radiance=uStarColor*uStarPower/(1.0+0.18*dist2);  // 거리 제곱 감쇠: 가까울수록 강한 빛
 vec3 color=radiance*directPBR(N,V,L,base,rough,metal)+uAmbient*ao*base;
 vec3 Rv=reflect(-V,N);
 vec3 env=srgbToLinear(textureLod(uEnv,dirToEquirect(Rv),rough*7.0).rgb);
 vec3 F0=mix(vec3(0.04),base,metal);
 float NV=max(dot(N,V),0.0);
 vec3 envF=F0+(max(vec3(1.0-rough),F0)-F0)*pow(1.0-NV,5.0);
 return color+uEnvPower*ao*env*envF;
}
vec3 toDisplay(vec3 c){c=max(c,vec3(0.0));return linearToSrgb(c/(1.0+c));}

void main(){
 if(uMode==0){outColor=vec4(toDisplay(uFlatColor),1.0);return;}   // 항성·궤도선
 vec3 N=normalize(vN),V=normalize(uEye-vP);

 // ---------- 철광 행성 ----------
 float m1=rustMask(vLocal,uHeat);
 float rim;
 float m2=craterMask(vLocal,uImpact,rim);
 if(uView==2){outColor=vec4(vec3(m1),1.0);return;}
 if(uView==3){outColor=vec4(vec3(m2),1.0);return;}
 if(uView==4){outColor=vec4(m1,m2,0.0,1.0);return;}
 if(uView==1){m1=0.0;m2=0.0;rim=0.0;}                 // 기본 재질: 같은 조명, 마스크만 끔

 // 기본 암석 (색 맵은 sRGB → 선형, ARM은 수치 그대로)
 vec3 base=srgbToLinear(texture(uColor,vUV).rgb);
 vec3 arm=texture(uARM,vUV).rgb;
 float ao=arm.r,rough=arm.g,metal=arm.b;

 // 규칙 1: 녹 — 녹슨 금속 텍스처의 색 변화를 빌려 오되 주황 갈색 쪽으로 당긴다
 vec2 rustUV=vUV*2.0;
 vec3 rustCol=mix(vec3(0.40,0.13,0.04),srgbToLinear(texture(uRustColor,rustUV).rgb),0.5);
 float rustRough=max(texture(uRustARM,rustUV).g,0.65);
 base=mix(base,rustCol,m1);
 rough=mix(rough,rustRough,m1);
 metal=mix(metal,0.05,m1);

 // 규칙 2: 충돌로 드러난 철 — 나중에 섞으므로 녹보다 우선
 base*=1.0-0.55*rim;                                  // 분출물 고리: 어둡고 거칠다
 rough=mix(rough,1.0,rim);
 base=mix(base,vec3(0.56,0.57,0.58),m2);              // 철의 F0(선형) 근사
 rough=mix(rough,0.22,m2);
 metal=mix(metal,1.0,m2);
 ao=mix(ao,1.0,m2);

 // 실습 1의 노멀 맵 유지. 충돌로 녹은 면은 요철을 70% 줄인다
 float ns=uNormalStrength*(1.0-0.7*m2);
 if(ns>0.0){
  vec3 nt=texture(uNormal,vUV).rgb*2.0-1.0;
  nt.xy*=ns;
  N=normalize(cotangentFrame(N,vP,vUV)*normalize(nt));
 }
 outColor=vec4(toDisplay(shade(N,V,base,rough,metal,ao)),1.0);
}`;

const prog=D.program(gl,VS,FS),U=D.uniforms(gl,prog,[
 'uVP','uModel','uUVScale','uEye','uStarPos','uStarColor','uFlatColor','uStarPower','uAmbient','uEnvPower',
 'uNormalStrength','uHeat','uImpact','uMode','uView','uCraters',
 'uColor','uNormal','uARM','uEnv','uRustColor','uRustARM'
]);

/* ---- 메시: UV 구 ---- */
const sphere=D.upload(gl,D.revolution(D.profiles.sphere(1,48),96));

/* ---- 크레이터 방향: 황금각 나선으로 고르게 흩고, 나타나는 순서는 섞는다 ---- */
const NCRATER=16,craters=new Float32Array(NCRATER*4);
// 강도 몇 %부터 나타나는지(0~0.68). 위치 순서와 섞어서 한쪽에서만 생기지 않게 한다
const order=[0.00,0.41,0.14,0.55,0.27,0.68,0.05,0.47,0.20,0.60,0.33,0.09,0.51,0.24,0.64,0.37];
for(let i=0;i<NCRATER;i++){
 const y=1-(i+0.5)/NCRATER*2,r=Math.sqrt(1-y*y),th=i*2.39996+0.7;
 craters.set([r*Math.cos(th),y*0.85,r*Math.sin(th),order[i]],i*4);
 const l=Math.hypot(craters[i*4],craters[i*4+1],craters[i*4+2]);
 for(let k=0;k<3;k++)craters[i*4+k]/=l;
}

/* ---- 텍스처 ---- */
const aniso=gl.getExtension('EXT_texture_filter_anisotropic');
const jobs=[];let failed=false;
function load(name){
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 jobs.push(new Promise(resolve=>{const img=new Image();img.onload=()=>{
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  resolve();
 };img.onerror=()=>{failed=true;resolve();};
 img.src='assets/week06/'+name+(name.endsWith('_arm')?'.png':'.jpg');}));
 return tex;
}
// 유닛 순서: uColor, uNormal, uARM, uEnv, uRustColor, uRustARM
const texList=[
 ['uColor',load('rock_boulder_dry_Diffuse')],['uNormal',load('rock_boulder_dry_nor_gl')],['uARM',load('rock_boulder_dry_arm')],
 ['uEnv',load('studio_small_09_tonemapped')],['uRustColor',load('rusty_metal_04_Diffuse')],['uRustARM',load('rusty_metal_04_arm')],
];
Promise.all(jobs).then(()=>{document.querySelector('#status').textContent=failed?'텍스처 로딩 실패: HTTP 서버와 파일 경로 확인':'텍스처 로딩 완료';});

/* ---- UI ---- */
// 같은 조건을 다시 열 수 있도록 URL로 초기값 지정: ?c1=0&c2=100&view=2&spin=0
const Q=new URLSearchParams(location.search);
const qNum=(k,d)=>{const v=parseFloat(Q.get(k));return isFinite(v)?Math.max(0,Math.min(100,v)):d;};
document.querySelector('#ui').innerHTML='';
const S=D.UI('#ui',[
 {id:'c1',label:'조건 1 · 항성 접근도',min:0,max:100,step:1,value:qNum('c1',50),fmt:v=>v+' %',
  hint:'행성이 태양 쪽으로 다가가 빛이 세짐 → 적도부터 녹(마스크 1)'},
 {id:'c2',label:'조건 2 · 운석 충돌 강도',min:0,max:100,step:1,value:qNum('c2',40),fmt:v=>v+' %',
  hint:'크레이터가 생기고 커짐 → 녹 아래의 매끈한 철(마스크 2)'},
 {id:'view',type:'select',label:'보기',value:['0','1','2','3','4'].includes(Q.get('view'))?Q.get('view'):'0',options:[
  {value:'0',label:'최종 재질'},{value:'1',label:'기본 재질 (마스크 끔)'},
  {value:'2',label:'마스크 1 · 산화 (회색조)'},{value:'3',label:'마스크 2 · 크레이터 (회색조)'},
  {value:'4',label:'두 마스크 (R=산화, G=크레이터)'}]},
 {id:'spin',type:'check',label:'행성 자전 (끄면 같은 시점 캡처)',value:Q.get('spin')!=='0'},
 {id:'normal',label:'normal 강도',min:0,max:5,step:.1,value:1.5},
 {id:'star',label:'태양 밝기',min:0,max:30,step:.5,value:14},
 {id:'ambient',label:'상수 ambient',min:0,max:.3,step:.005,value:.06},
 {id:'env',label:'환경맵 반사 세기',min:0,max:2,step:.05,value:.5},
]);

// 구도: 왼쪽에 작은 태양, 오른쪽에 큰 철광 행성. 카메라는 둘 사이를 본다
const CAM0={dist:7.5,pitch:.27,yaw:-.35},TARGET=[-0.2,0,0];   // 태양 쪽으로 살짝 돌려 낮 면이 보이게
const cam=D.orbit(cv,{...CAM0,min:3,max:20});
document.querySelector('#reset').onclick=()=>{Object.assign(cam,CAM0);};
const labels=document.querySelector('#labels');
labels.style.gridTemplateColumns='1fr 1fr';
labels.innerHTML='<span style="border:0"><b>태양</b></span><span style="border:0"><b>철광 행성</b></span>';
const note=document.querySelector('#note');

const view=M4.create(),proj=M4.create(),vp=M4.create(),model=M4.create();
const SUN=[-2.15,0.25,0],SUN_R=0.42,SUN_COLOR=[1.0,0.64,0.19],PLANET_R=1.25;
let spin=0.6,lastT=null;
// 접근도 0 % → x=1.65 (멀다), 100 % → x=0.55 (가깝다). 공전하지 않고 x축 위에서만 움직인다
function planetPos(){return [0.55+1.1*(1-S.c1/100),0,0];}
function sunDist(p){return Math.hypot(p[0]-SUN[0],p[1]-SUN[1],p[2]-SUN[2]);}
// 셰이더 shade()와 같은 감쇠식: 빛 ∝ 1/(1+0.18·d²)
function flux(p){const d=sunDist(p);return S.star/(1+0.18*d*d);}

function drawSphere(m){gl.uniformMatrix4fv(U.uModel,false,m);gl.bindVertexArray(sphere.vao);gl.drawElements(gl.TRIANGLES,sphere.count,gl.UNSIGNED_SHORT,0);}

let visible=true;new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(cv);
D.loop(t=>{
 const dt=lastT==null?0:Math.min(t-lastT,0.1);lastT=t;
 if(!visible||document.hidden)return;
 if(S.spin)spin+=dt*0.22;                  // 공전 없이 자전만 한다 (Y축)
 const P=planetPos();

 D.fit(cv);gl.viewport(0,0,cv.width,cv.height);
 gl.clearColor(0.015,0.028,0.055,1);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const eye=cam.eye(TARGET);
 M4.lookAt(view,eye,TARGET,[0,1,0]);M4.perspective(proj,Math.PI/4,cv.width/cv.height,.1,100);M4.multiply(vp,proj,view);

 gl.useProgram(prog);
 gl.uniformMatrix4fv(U.uVP,false,vp);gl.uniform3fv(U.uEye,eye);
 gl.uniform3fv(U.uStarPos,SUN);gl.uniform3fv(U.uStarColor,SUN_COLOR);
 gl.uniform1f(U.uStarPower,S.star);gl.uniform1f(U.uAmbient,S.ambient);gl.uniform1f(U.uEnvPower,S.env);
 gl.uniform1f(U.uNormalStrength,S.normal);
 gl.uniform1f(U.uHeat,S.c1/100);gl.uniform1f(U.uImpact,S.c2/100);
 gl.uniform1i(U.uView,parseInt(S.view,10));gl.uniform4fv(U.uCraters,craters);
 texList.forEach(([name,tex],i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(U[name],i);});

 // 태양 (발광체, 조명 계산 없음)
 gl.uniform2fv(U.uUVScale,[1,1]);
 M4.identity(model);M4.translate(model,model,SUN);M4.scale(model,model,[SUN_R,SUN_R,SUN_R]);
 gl.uniform1i(U.uMode,0);gl.uniform3fv(U.uFlatColor,SUN_COLOR.map(c=>c*1.6));drawSphere(model);

 // 철광 행성: 위치 → 자전(Y축) → 크기
 gl.uniform2fv(U.uUVScale,[2,1]);   // 경도 방향이 2배 길어서 텍스처를 2번 반복
 M4.identity(model);M4.translate(model,model,P);M4.rotateY(model,model,spin);M4.scale(model,model,[PLANET_R,PLANET_R,PLANET_R]);
 gl.uniform1i(U.uMode,2);drawSphere(model);
 gl.bindVertexArray(null);

 const f=flux(P),f0=flux([1.65,0,0]);
 note.textContent=`태양-행성 중심 거리 ${sunDist(P).toFixed(2)} · 받는 빛 ${f.toFixed(2)} (접근도 0 %일 때의 ${(f0?f/f0:0).toFixed(2)}배)`;
});
})();
