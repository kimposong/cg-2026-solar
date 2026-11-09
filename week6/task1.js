/* 6주차 실습 1 — 단계별 재질 만들기 (TODO 1~5 작성 완료)
 * 보고서 캡처를 위해 '적용 단계' 선택을 추가했다.
 *   0: 시작 코드(Phong 회색)  1: +색 맵  2: +PBR 직접광  3: +ARM  4: +노멀 맵  5: +환경 반사
 * 필터 비교를 위해 '텍스처 필터'와 'UV 반복' 조절도 추가했다.
 */
(() => {
'use strict';
const cv=document.querySelector('#cv'), gl=D.context(cv); if(!gl)return;
const VS=`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uVP;
uniform float uUVScale;
out vec3 vP,vN; out vec2 vUV;
void main(){vP=aPos;vN=aNormal;vUV=aUV*uUVScale;gl_Position=uVP*vec4(aPos,1.);}`;
const FS=`#version 300 es
precision highp float;
const float PI=3.14159265;
in vec3 vP,vN; in vec2 vUV; out vec4 outColor;
uniform sampler2D uColor,uNormal,uARM,uEnv;
uniform vec3 uEye,uLight,uTint;
uniform float uRough,uMetal,uNormalStrength,uPower,uAmbient,uEnvPower;
uniform int uStage;

vec3 srgbToLinear(vec3 c){
 return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));
}
vec3 linearToSrgb(vec3 c){
 return mix(12.92*c,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));
}

// TODO 2: Cook-Torrance 직접광. 반환값은 BRDF * cos(θl) (광원 세기는 밖에서 곱한다)
vec3 directPBR(vec3 N,vec3 V,vec3 L,vec3 base,float rough,float metal){
 rough=max(rough,0.045);                  // r=0이면 D가 무한대로 발산하므로 하한
 vec3 H=normalize(L+V);
 float NL=max(dot(N,L),0.0), NV=max(dot(N,V),1e-4);
 float NH=max(dot(N,H),0.0), VH=max(dot(V,H),0.0);
 if(NL<=0.0) return vec3(0.0);
 // D: GGX 법선 분포, α=r²
 float a=rough*rough, a2=a*a;
 float d=NH*NH*(a2-1.0)+1.0;
 float D=a2/(PI*d*d);
 // F: Schlick 프레넬, 유전체 F0=0.04, 금속 F0=baseColor
 vec3 F0=mix(vec3(0.04),base,metal);
 vec3 F=F0+(1.0-F0)*pow(1.0-VH,5.0);
 // G: Smith + Schlick-GGX, 직접광용 k=(r+1)²/8
 float k=(rough+1.0)*(rough+1.0)/8.0;
 float G=(NL/(NL*(1.0-k)+k))*(NV/(NV*(1.0-k)+k));
 vec3 spec=D*F*G/(4.0*NL*NV);
 // 에너지 보존: 반사된 만큼(F) 빼고, 금속은 확산이 없다
 vec3 kd=(1.0-F)*(1.0-metal);
 return (kd*base/PI+spec)*NL;
}

// TODO 4 보조: 화면 공간 미분으로 TBN을 만든다 (메시에 접선 속성이 없어도 됨)
mat3 cotangentFrame(vec3 N,vec3 P,vec2 uv){
 vec3 dp1=dFdx(P), dp2=dFdy(P);
 vec2 du1=dFdx(uv), du2=dFdy(uv);
 vec3 dp2perp=cross(dp2,N), dp1perp=cross(N,dp1);
 vec3 T=dp2perp*du1.x+dp1perp*du2.x;
 vec3 B=dp2perp*du1.y+dp1perp*du2.y;
 float invmax=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-20));
 return mat3(T*invmax,B*invmax,N);
}

// TODO 5 보조: 방향 → 등장방형(equirectangular) 파노라마 UV
vec2 dirToEquirect(vec3 d){
 return vec2(atan(d.z,d.x)/(2.0*PI)+0.5, asin(clamp(d.y,-1.0,1.0))/PI+0.5);
}

void main(){
 vec3 N=normalize(vN),V=normalize(uEye-vP),L=normalize(uLight);
 vec3 base=uTint;
 // TODO 1: 색 맵은 sRGB로 저장되어 있으므로 선형화한 뒤 조명 계산에 쓴다
 if(uStage>=1) base=srgbToLinear(texture(uColor,vUV).rgb)*uTint;

 float rough=uRough,metal=uMetal,ao=1.0;
 // TODO 3: ARM은 수치 데이터 → sRGB 변환 금지. R=AO, G=roughness, B=metallic
 if(uStage>=3){
  vec3 arm=texture(uARM,vUV).rgb;
  ao=arm.r;
  rough=max(arm.g*uRough,0.045);
  metal=arm.b*uMetal;
 }

 // TODO 4: 접선 공간 법선 = RGB*2-1, xy만 강도로 스케일 → 세계 공간으로
 if(uStage>=4 && uNormalStrength>0.0){
  vec3 nt=texture(uNormal,vUV).rgb*2.0-1.0;
  nt.xy*=uNormalStrength;
  N=normalize(cotangentFrame(N,vP,vUV)*normalize(nt));
 }

 vec3 color;
 if(uStage>=2){
  // TODO 2: Phong 대신 PBR 직접광 + 상수 ambient(간접광 근사, AO는 여기만)
  color=uPower*directPBR(N,V,L,base,rough,metal)+uAmbient*ao*base;
 }else{
  float nl=max(dot(N,L),0.0);
  vec3 R=reflect(-L,N);
  color=base*(uAmbient+uPower*nl)
       +vec3(0.6)*uPower*pow(max(dot(R,V),0.0),32.0)*step(0.0001,nl);
 }

 // TODO 5: 반사 방향으로 환경 파노라마 조회. 거칠수록 높은 밉(흐린) 레벨
 if(uStage>=5){
  vec3 Rv=reflect(-V,N);
  vec3 env=srgbToLinear(textureLod(uEnv,dirToEquirect(Rv),rough*7.0).rgb);
  vec3 envF0=mix(vec3(0.04),base,metal);
  float NV=max(dot(N,V),0.0);
  // 거칠기를 반영한 Schlick: 거친 면은 스침각에서도 반사가 과하게 밝지 않게
  vec3 envF=envF0+(max(vec3(1.0-rough),envF0)-envF0)*pow(1.0-NV,5.0);
  color+=uEnvPower*ao*env*envF;
 }

 color=max(color,vec3(0.0));
 color=color/(1.0+color); // HDR → 표시 범위 (Reinhard)
 outColor=vec4(linearToSrgb(color),1.0);
}`;
const prog=D.program(gl,VS,FS),U=D.uniforms(gl,prog,[
 'uVP','uEye','uLight','uTint','uRough','uMetal','uNormalStrength','uPower','uAmbient','uEnvPower',
 'uColor','uNormal','uARM','uEnv','uStage','uUVScale'
]);
const mesh=D.upload(gl,D.cube(1.9));

/* ---- 텍스처 필터 ---- */
const aniso=gl.getExtension('EXT_texture_filter_anisotropic');
const maxAniso=aniso?Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)):1;
let filterMode='aniso';
function applyFilter(tex){
 gl.bindTexture(gl.TEXTURE_2D,tex);
 const F={
  nearest:[gl.NEAREST,gl.NEAREST,1],
  linear:[gl.LINEAR,gl.LINEAR,1],
  trilinear:[gl.LINEAR_MIPMAP_LINEAR,gl.LINEAR,1],
  aniso:[gl.LINEAR_MIPMAP_LINEAR,gl.LINEAR,maxAniso],
 }[filterMode];
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,F[0]);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,F[1]);
 if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,F[2]);
}

const assets={wood_planks:['Diffuse','nor_gl','arm'],rusty_metal_04:['Diffuse','nor_gl','arm'],rock_boulder_dry:['Diffuse','nor_gl','arm']};
const textures={},jobs=[],materialTex=[];let failed=false;
function load(name,isMaterial){
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 jobs.push(new Promise(resolve=>{const img=new Image();img.onload=()=>{
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  if(isMaterial)applyFilter(tex);   // 환경맵은 textureLod에 밉맵이 필요하므로 항상 트라이리니어
  resolve();
 };img.onerror=()=>{failed=true;resolve();};
 img.src='assets/week06/'+name+(name.endsWith('_arm')?'.png':'.jpg');}));
 if(isMaterial)materialTex.push(tex);
 return tex;
}
for(const [asset,kinds] of Object.entries(assets))textures[asset]=kinds.map(kind=>load(asset+'_'+kind,true));
const envTex=load('studio_small_09_tonemapped',false);
Promise.all(jobs).then(()=>{document.querySelector('#status').textContent=failed?'텍스처 로딩 실패: HTTP 서버와 파일 경로 확인':'텍스처 로딩 완료';});
document.querySelector('#ui').innerHTML='';
const defs=[
 {id:'stage',type:'select',label:'적용 단계',value:'5',options:[
  {value:'0',label:'0 · 시작 코드 (Phong 회색)'},{value:'1',label:'1 · + 색 맵 (선형화)'},
  {value:'2',label:'2 · + PBR 직접광'},{value:'3',label:'3 · + ARM 맵'},
  {value:'4',label:'4 · + 노멀 맵'},{value:'5',label:'5 · + 환경 반사'}]},
 {id:'material',type:'select',label:'재질 선택',value:'rusty_metal_04',options:[
  {value:'rusty_metal_04',label:'녹슨 금속'},{value:'wood_planks',label:'나무'},{value:'rock_boulder_dry',label:'돌'}]},
 {id:'filter',type:'select',label:'텍스처 필터',value:'aniso',options:[
  {value:'aniso',label:'트라이리니어 + 비등방 ×'+maxAniso},{value:'trilinear',label:'트라이리니어 (밉맵)'},
  {value:'linear',label:'바이리니어 (밉맵 없음)'},{value:'nearest',label:'NEAREST'}]},
 {id:'uv',label:'UV 반복',min:1,max:12,step:1,value:1},
 {id:'rough',label:'roughness 배율',min:.05,max:1,step:.01,value:1},
 {id:'metal',label:'metallic 배율',min:0,max:1,step:.01,value:1},
 {id:'normal',label:'normal 강도',min:0,max:10,step:.1,value:5},
 {id:'power',label:'직접광 세기',min:0,max:8,step:.1,value:4},
 {id:'ambient',label:'상수 ambient',min:0,max:1,step:.01,value:.15},
 {id:'env',label:'환경맵 반사 세기',min:0,max:3,step:.1,value:1.5},
];
// 같은 조건을 다시 열 수 있도록 URL로 초기값 지정: ?stage=3&filter=nearest&uv=8&yaw=0&pitch=1.2
const Q=new URLSearchParams(location.search);
for(const d of defs){
 if(!Q.has(d.id))continue;
 const q=Q.get(d.id);
 if(d.type==='select'){if(d.options.some(o=>o.value===q))d.value=q;}
 else{const v=parseFloat(q);if(isFinite(v))d.value=Math.max(d.min,Math.min(d.max,v));}
}
const S=D.UI('#ui',defs,(values,id)=>{
 if(id==='filter'){filterMode=values.filter;materialTex.forEach(applyFilter);}
});
filterMode=S.filter;

const qCam=(k,d)=>{const v=parseFloat(Q.get(k));return isFinite(v)?v:d;};
const CAM0={dist:qCam('dist',3.9),pitch:qCam('pitch',.4),yaw:qCam('yaw',.6)};
const cam=D.orbit(cv,{...CAM0});document.querySelector('#reset').onclick=()=>{Object.assign(cam,CAM0);};
const view=D.M4.create(),proj=D.M4.create(),vp=D.M4.create();
document.querySelector('#note').textContent='적용 단계를 바꿔 같은 시점에서 TODO별 차이를 비교하세요. 시점 초기화로 같은 각도를 맞출 수 있습니다.';
let visible=true;new IntersectionObserver(e=>visible=e[0].isIntersecting).observe(cv);
D.loop(()=>{
 if(!visible||document.hidden)return;
 D.fit(cv);gl.viewport(0,0,cv.width,cv.height);D.clearColor(gl);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const eye=cam.eye([0,0,0]);D.M4.lookAt(view,eye,[0,0,0],[0,1,0]);D.M4.perspective(proj,Math.PI/4,cv.width/cv.height,.1,100);D.M4.multiply(vp,proj,view);
 gl.useProgram(prog);gl.uniformMatrix4fv(U.uVP,false,vp);gl.uniform3fv(U.uEye,eye);
 gl.uniform3fv(U.uLight,[.6,.7,1.]);gl.uniform3fv(U.uTint,[.6,.6,.6]);
 gl.uniform1i(U.uStage,parseInt(S.stage,10));gl.uniform1f(U.uUVScale,S.uv);
 for(const [key,value] of Object.entries({uRough:S.rough,uMetal:S.metal,uNormalStrength:S.normal,uPower:S.power,uAmbient:S.ambient,uEnvPower:S.env}))gl.uniform1f(U[key],value);
 [...textures[S.material],envTex].forEach((tex,i)=>{
  gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform1i(U[['uColor','uNormal','uARM','uEnv'][i]],i);
 });
 gl.bindVertexArray(mesh.vao);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);gl.bindVertexArray(null);
});
})();
