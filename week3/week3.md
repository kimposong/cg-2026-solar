# 2주차 보고서

- 이름 : 김태민
- 저장소 : https://github.com/kimposong/cg-2026-solar/
- 실행
    - [Task 1 실행하기](https://kimposong.github.io/cg-2026-solar/week3/task1.html) 
    - [Task 2 실행하기](https://kimposong.github.io/cg-2026-solar/week3/task2.html)
    - [Task 3 실행하기](https://kimposong.github.io/cg-2026-solar/week3/task3.html)

## Task1

### 6단계 순서 비교하기

![순서를 바꾸기 전 스크린 샷](week3/images/task1_1.png)
![순서를 바꾼 후 스크린 샷](week3/images/task1_2.png)

- 행렬곱은 오른쪽부터 먼저 적용되는데 변경 전 행렬곱(TxR) 은 구체를 먼저 회전 시킨 후 구체 위치를 변경하기 때문에 자전을 하게 된다. 변경 후 행렬곱(RxT) 은 구체를 먼저 회전 축 (y축)에서 떨어트려 놓고 난 후 회전축을 중심으로 회전을 시키기 때문에 구체가 회전축을 중심으로 공전을 하게 된다.

### 8단계 실습실의 셰이더를 가져와 바꿔보기

- 바뀐 코드 (바뀐 위치인 `main()` 함수만 기제하였습니다)

```
void main() {
  vec3 N = normalize(vNormal);                       
  vec3 L = normalize(vec3(0.45, 0.8, 0.35));        

  float diff = max(dot(N, L), 0.0);                

  fragColor = vec4(N*0.5+0.5, 1.0);
}
```

![셰이더 변경 후 스크린 샷](week3/images/task1_3.png)

- 구 표면이 무지개처럼 물듭니다. 바닥은 왜 몇 가지 색뿐입니까?
    - 구체는 표면의 위치에 따라 법선의 방향이 연속적으로 변하기 때문에 각 픽셀의 색 또한 연속적으로 변화하기 때문에 무지개 처럼 물든다. 바닥은 각면이 평면으로 구성되어 있기 때문에 면마다 모든 픽셀이 동일한 색을 가진다.

## Task2

### 의도 — 무엇을 만들고 싶었는가

- 어떤 행성을 만들려고 했습니까?
    - 행성 전체가 도시로 뒤덮힌 미래형 행성
- 왜 그렇게 정했습니까? 보는 사람이 무엇을 느끼길 바랐습니까?
    - 미래에 인류가 만들어갈 행성의 종착점 같은 느낌을 상상하면서 만들게 되었습니다
- 예시와 무엇을 다르게 하려 했습니까?
    - 도시의 느낌을 강하게 느끼게 하려면 야경의 느낌을 살려야 한다고 생각해서 광원의 위치를 행성의 뒤편으로 설정했다는 느낌으로 셰이더를 조절함

### 방법 — 어떻게 만들었는가

- 그 모습을 내려면 어떤 계산이 필요하다고 판단했습니까?
    - 가장 중오한건 행성 전체를 아우르는 도시를 표현하기 위해서 행성 전체에 무작위적으로 뿌려져 있는 원과 그를 잇는 선들이 필요하기 때문에 피보나치 구면 배치와 값 잡음으로 원의 위치와 크기를 다양하게 만들었습니다.구면 거리와 대원호 마스크로 원들을 표면 위의 선으로 연결했습니다.
- 실제로 쓴 계산식과 그 식이 왜 그런 무늬가 되는지를 설명하세요.
    - 원형 도시들이 일정 거리를 유지하지만 무작위하게 퍼져 있는 느낌을 살리기 위해서 AI의 도움을 받아 피보나치 구면 배치를 이용하였다. 위도 방향 좌표는 y=1−2(i+0.5)/N으로 균일하게 나누고, 경도는 황금각 2.39996323을 곱해 배치 하는 과정을 거쳤다.
    - 야경의 느낌을 살리기 위해서 일반적인 광원 위치보다 더 화면에서 반대 방향으로 가게 만들기 위해서 AI를 이용해 법선 N과 광원 방향 L의 내적을 계산하고, 음수인 부분은 0으로 잘라 빛을 받지 않는 면을 어둡게 했습니다
- 뜻대로 안 된 것이 있었다면 무엇을 어떻게 고쳤는지 쓰세요. 실패한 시도와 그 이유를 쓴 보고서를 더 높게 봅니다.
    - 처음 원형 도시들을 만들었을 때는 원 사이의 거리를 조절하지 않아서 어느 부분은 너무 원이 밀집되어서 겹치고 다른 부분은 빈곳이 너무 많은 상황이 발생하였는데 해당 부분을 해결하기 위해서 원사이의 거리를 조절하는 방식으로 피보나치 수열을 이용한 계산식을 추가하여 해결하였습니다

### 프래그먼트 셰이더 전체 코드

```json
const FS_SOURCE = `#version 300 es
precision highp float;                // 실수 정밀도 선언 — 여기서는 필수입니다

in vec3 vSurf;                        // 물체 기준 구면 법선 S — 표면 패턴 좌표로 사용
in vec3 vNormal;                      // 버텍스 셰이더에서 회전한 세계 기준 표면 법선 N

uniform float uTime;                  // 애니메이션 시간(초): 도시 불빛의 미세한 점멸에 사용

out vec4 fragColor;                   // 이 픽셀의 최종 색

// ── 조절할 주요 설정 ───────────────────────────────────────
// 도시 연결망: 노드 개수, 각 노드가 뽑는 연결 후보 횟수, 연결 가능한 최대 각거리(라디안)
const int NODE_COUNT = 150;
const int LINK_ATTEMPTS = 4;
const float MAX_LINK_DISTANCE = 1.30;

// 원 크기와 단계: 가장 작은/큰 원의 반지름, 2중·3중 원을 추가하는 크기 난수 기준
const float MIN_HUB_RADIUS = 0.004;
const float MAX_HUB_RADIUS = 0.140;
const float DOUBLE_RING_THRESHOLD = 0.40;
const float TRIPLE_RING_THRESHOLD = 0.70;
const float RING_LINE_WIDTH = 0.0015;

// 연결망 밀도: 값잡음이 각 노드에 적용할 최소/최대 연결 확률
const float MIN_CONNECT_CHANCE = 0.38;
const float MAX_CONNECT_CHANCE = 0.92;
const float ARC_ENDPOINT_TOLERANCE = 0.003;
const float LINK_LINE_WIDTH = 0.0015;

// 조명: 카메라 기준 왼쪽 뒤쪽 광원 방향과 밤 면에 남길 최소 주변광
const vec3 LIGHT_DIRECTION = vec3(-0.978, 0.0, -0.208);
const float AMBIENT_LIGHT = 0.01;

// 행성 표면 색: 밤의 짙은 남색과 빛을 받는 면의 밝은 남색
const vec3 DARK_NIGHT_COLOR = vec3(0.014, 0.020, 0.065);
const vec3 LIT_NIGHT_COLOR = vec3(0.23, 0.29, 0.50);
const float NIGHT_SURFACE_VARIATION = 0.70;

// 구름: 큰/작은 무늬의 좌표 배율, 각 무늬의 가중치, 표시 임계값, 색, 밝기
const vec2 BROAD_CLOUD_SCALE = vec2(10.0, 9.0);
const vec2 FINE_CLOUD_SCALE = vec2(23.0, 21.0);
const float BROAD_CLOUD_WEIGHT = 0.55;
const float FINE_CLOUD_WEIGHT = 0.45;
const vec2 CLOUD_MASK_RANGE = vec2(0.46, 0.64);
const vec3 CLOUD_COLOR = vec3(0.46, 0.48, 0.54);
const float CLOUD_STRENGTH = 0.76;

// 도시 불빛 변화: 시간에 따른 점멸 속도/폭, 구면 위치별 점멸 위상, 구역 밝기 편차
const float LIGHT_PULSE_RATE = 2.0;
const float LIGHT_PULSE_BASE = 0.92;
const float LIGHT_PULSE_AMOUNT = 0.08;
const vec2 LIGHT_PULSE_COORD_SCALE = vec2(9.0, 7.0);
const vec2 DISTRICT_NOISE_SCALE = vec2(5.0, 5.0);
const float DISTRICT_GLOW_MIN = 0.86;

// 도시 불빛: 붉은 주황색과 선/원 각각의 밝기 배율
const vec3 CITY_LIGHT_COLOR = vec3(0.86, 0.40, 0.26);
const float LINK_BRIGHTNESS = 0.75;
const float HUB_BRIGHTNESS = 1.5;

// 셀 좌표를 재현 가능한 0~1 의사 난수로 바꿉니다.
float hashCell(vec2 cell) {
  vec2 p = fract(cell * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}

// 네 격자 꼭짓점의 난수를 부드럽게 보간해 구름과 연결 밀도에 쓰는 값잡음입니다.
float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hashCell(cell);
  float b = hashCell(cell + vec2(1.0, 0.0));
  float c = hashCell(cell + vec2(0.0, 1.0));
  float d = hashCell(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 피보나치 구면 배치로 노드를 고르게 퍼뜨리고 작은 난수로 규칙성을 완화합니다.
vec3 sphereNode(float id) {
  float y = 1.0 - 2.0 * (id + 0.5) / float(NODE_COUNT);
  y += (hashCell(vec2(id, 11.7)) - 0.5) / float(NODE_COUNT);
  y = clamp(y, -0.999, 0.999);
  float longitude = id * 2.39996323 + (hashCell(vec2(id, 29.3)) - 0.5) * 0.2;
  float radius = sqrt(max(0.0, 1.0 - y * y));
  return vec3(radius * cos(longitude), y, radius * sin(longitude));
}

// 내적과 교차곱으로 두 노드 사이의 대원호 선 마스크를 계산합니다.
float connectionMask(vec3 point, vec3 start, vec3 end) {
  if (dot(start, end) < cos(MAX_LINK_DISTANCE)) return 0.0;

  vec3 normal = normalize(cross(start, end));
  float sideDistance = abs(dot(point, normal)); // 대원호 평면에서 현재 픽셀까지의 거리
  float pastStart = dot(cross(start, point), normal); // 시작점에서 호 진행 방향 안쪽인지 검사
  float pastEnd = dot(cross(point, end), normal); // 끝점을 지나 호 바깥으로 나갔는지 검사
  float onArc = step(-ARC_ENDPOINT_TOLERANCE, pastStart) * step(-ARC_ENDPOINT_TOLERANCE, pastEnd);
  float line = 1.0 - smoothstep(LINK_LINE_WIDTH, LINK_LINE_WIDTH + fwidth(sideDistance), sideDistance);
  return line * onArc; // 선의 두께 마스크와 호 구간 마스크를 곱해 연결선만 남김
}

void main() {
  // S는 물체 기준 구면 방향이며, 이 좌표를 써서 표면 무늬가 행성에 붙어 회전하게 합니다.
  vec3 S = normalize(vSurf);
  vec3 N = normalize(vNormal); // 모델 회전이 반영된 세계 기준 법선: 조명 계산용
  vec3 L = normalize(LIGHT_DIRECTION); // 표면에서 광원 쪽을 가리키는 고정 방향
  float longitude = atan(S.z, S.x) / 6.2831853 + 0.5; // atan으로 구한 경도를 0~1로 변환
  float latitude = asin(clamp(S.y, -1.0, 1.0)) / 3.14159265 + 0.5; // 위도를 0~1로 변환

  // 원 테두리와 연결선을 각각 누적할 마스크입니다.
  float hubs = 0.0;
  float innerHubs = 0.0;
  float coreHubs = 0.0;
  float links = 0.0;

  for (int i = 0; i < NODE_COUNT; i++) {
    float id = float(i);
    vec3 start = sphereNode(id);

    // 반지름 범위 안에서 크기를 정하고, 모든 노드에 바깥 원을 그립니다.
    float sizeRoll = hashCell(vec2(id, 53.1));
    float hubRadius = mix(MIN_HUB_RADIUS, MAX_HUB_RADIUS, sizeRoll); // 난수에 따라 원 반지름을 정함
    // 작은 각도에서는 현 길이가 각거리와 거의 같아 값비싼 acos 없이 원을 그릴 수 있습니다.
    float nodeDistance = length(S - start);
    float hubDistance = abs(nodeDistance - 2.0 * sin(hubRadius * 0.5));
    float hub = 1.0 - smoothstep(RING_LINE_WIDTH, RING_LINE_WIDTH + fwidth(hubDistance), hubDistance); // 가장자리만 남겨 원 테두리 생성
    hubs = max(hubs, hub);

    // 중간 크기 이상(상위 60%)은 반지름 절반의 원을 하나 더 그립니다.
    if (sizeRoll >= DOUBLE_RING_THRESHOLD) {
      float innerDistance = abs(nodeDistance - 2.0 * sin(hubRadius * 0.25));
      float innerRing = 1.0 - smoothstep(RING_LINE_WIDTH, RING_LINE_WIDTH + fwidth(innerDistance), innerDistance); // 중간 동심원 테두리
      innerHubs = max(innerHubs, innerRing);
    }

    // 가장 큰 원(상위 30%)은 반지름 1/4의 안쪽 원까지 그려 총 3중 원으로 만듭니다.
    if (sizeRoll >= TRIPLE_RING_THRESHOLD) {
      float coreDistance = abs(nodeDistance - 2.0 * sin(hubRadius * 0.125));
      float coreRing = 1.0 - smoothstep(RING_LINE_WIDTH, RING_LINE_WIDTH + fwidth(coreDistance), coreDistance); // 가장 안쪽 동심원 테두리
      coreHubs = max(coreHubs, coreRing);
    }

    // 값잡음으로 노드별 연결 확률을 다르게 해 연결망이 균일하게 반복되지 않게 합니다.
    float density = valueNoise(vec2(id * 0.43 + 3.1, id * 0.71 + 8.2));
    float connectChance = mix(MIN_CONNECT_CHANCE, MAX_CONNECT_CHANCE, density);

    // 여러 후보를 시험해 최대 거리 안에 있는 원끼리 연결합니다.
    for (int attempt = 0; attempt < LINK_ATTEMPTS; attempt++) {
      float attemptId = float(attempt);
      float connectRoll = hashCell(vec2(id + 41.7 + attemptId * 13.1, 17.3));
      int targetId = int(floor(hashCell(vec2(id + 7.9 + attemptId * 19.7, 61.2)) * float(NODE_COUNT)));
      if (connectRoll < connectChance && targetId != i) {
        vec3 end = sphereNode(float(targetId));
        links = max(links, connectionMask(S, start, end));
      }
    }
  }

  // 남색 표면의 은은한 밝기 변화와 고정된 구름 무늬를 계산합니다.
  float pulsePhase = uTime * LIGHT_PULSE_RATE + dot(vec2(longitude, latitude), LIGHT_PULSE_COORD_SCALE); // 위치별 점멸 시점
  float pulse = LIGHT_PULSE_BASE + LIGHT_PULSE_AMOUNT * sin(pulsePhase); // 불빛 밝기가 시간에 따라 약하게 변함
  float districtNoise = valueNoise(vec2(longitude * DISTRICT_NOISE_SCALE.x, latitude * DISTRICT_NOISE_SCALE.y)); // 도시 구역별 밝기 변화
  float districtGlow = mix(DISTRICT_GLOW_MIN, 1.0, districtNoise);
  float cloudLongitude = longitude; // 시간 오프셋이 없어 구름 무늬가 표면에 고정됨
  float broadCloud = valueNoise(vec2(cloudLongitude * BROAD_CLOUD_SCALE.x, latitude * BROAD_CLOUD_SCALE.y));
  float fineCloud = valueNoise(vec2(cloudLongitude * FINE_CLOUD_SCALE.x, latitude * FINE_CLOUD_SCALE.y));
  float surfaceNoise = broadCloud * BROAD_CLOUD_WEIGHT + fineCloud * FINE_CLOUD_WEIGHT; // 큰/작은 구름을 합성
  // dot(N,L)로 낮·밤 경계를 만들고, 주변광만 남겨 밤 면을 어둡게 유지합니다.
  float diffuse = max(dot(N, L), 0.0); // 법선과 광원 방향의 내적: 빛을 받는 정도
  float illumination = AMBIENT_LIGHT + (1.0 - AMBIENT_LIGHT) * diffuse; // 밤에는 주변광만 남김
  float surfaceVariation = mix(NIGHT_SURFACE_VARIATION, 1.0, surfaceNoise); // 구름 잡음으로 표면 밝기에 미세 변화 추가
  vec3 night = mix(DARK_NIGHT_COLOR, LIT_NIGHT_COLOR, illumination * surfaceVariation);
  float cloudMask = smoothstep(CLOUD_MASK_RANGE.x, CLOUD_MASK_RANGE.y, surfaceNoise); // 잡음 중 구름 모양 선택
  float cloudStrength = cloudMask * CLOUD_STRENGTH * illumination; // 구름은 빛을 받는 면에서만 강조
  night = mix(night, CLOUD_COLOR, cloudStrength);

  // 붉은 주황색 원과 선을 남색 표면 위에 합성해 최종 픽셀 색을 출력합니다.
  vec3 cityLights = CITY_LIGHT_COLOR * districtGlow * pulse * (links * LINK_BRIGHTNESS + (hubs + innerHubs + coreHubs) * HUB_BRIGHTNESS);
  vec3 color = night + cityLights;
  fragColor = vec4(color, 1.0);
}
```

![Task 2 결과](week3/images/task2.png)

## Task3

### 의도 — 무엇을 만들고 싶었는가

- 어떤 행성을 만들려고 했습니까?
    - 영화에서 인상깊게 보았던 인공 행성
- 왜 그렇게 정했습니까? 보는 사람이 무엇을 느끼길 바랐습니까?
    - 영화에서 아주 인상깊게 보았고 자연적인 행성도 좋지만 인공적으로 만든 행성이 어떨지 느끼게 해주기 위해서
- 예시와 무엇을 다르게 하려 했습니까?
    - 인공행성이기 떄문에 표면의 거의 단색으로 덮되 위도와 경도를 따라 격자무의를 주어서 마치 금속판을 덮어 놓은 듯한 느낌을 살리려고 노력함 또한 모티브가 되는 인공행성은 메인 무기인 거대 광선을 발사하는 장치가 있는데 해당 부분을 공을 많이 들임

### 방법 — 어떻게 만들었는가

- 그 모습을 내려면 어떤 계산이 필요하다고 판단했습니까?
    - 인공적인 행성으로 보이기 위해서 지속적으로 격자선을 따라 무작위 적인 위치에서 빛이 점멸하게 하고 광선을 발사하는 장치에서 최대한 표현 할 수 있는 대로 실제 발사하는 장면을 넣어보고 싶어서 순차적으로 차오르는 녹색 레이저와 다 차올랐을 때 중간 부분이 녹색으로 점멸하게 하는 과정
- 실제로 쓴 계산식과 그 식이 왜 그런 무늬가 되는지를 설명하세요.
    - 위도와 경도를 이용하여 만들어 놓은 격자 위에 난수로 선택되는 위치에 작은 점광원을 배치했습니다. 점마다 난수로 점멸 속도와 위상을 다르게 한 뒤 sin(uTime × 속도 + 위상)으로 밝기를 계산해 조명들이 동시에 켜지지 않고 불규칙하게 깜빡이도록 했습니다.
    - 레이저 원반의 방위각을 14개의 방사형 선 순서로 나누고, uTime을 12초 주기로 반복시켜 12시 방향부터 시계방향으로 선을 차례로 켰습니다. 각 선의 순서와 현재 진행량을 비교해 이미 순서가 된 선을 초록색으로 바꿨습니다. 모든 선이 켜진 뒤에는 원반 중앙을 초록색으로 채우고, 중앙 주위의 후광 밝기를 시간에 따라 변하게 해 에너지가 모이고 점멸하는 느낌을 표현했습니다.
- 뜻대로 안 된 것이 있었다면 무엇을 어떻게 고쳤는지 쓰세요. 실패한 시도와 그 이유를 쓴 보고서를 더 높게 봅니다.
    - 원래 모티브가 되는 인공행성에서 레이저가 발사 될 때 레이저가 앞으로 돌출되어서 모여 밖으로 발사되는 과정을 거치는데 해당 프로그램에서는 구의 표면을 셰이더로 꾸미는 과정이기 때문에 원뿔형 오브젝트를 추가하는 과정을 거치지 않으면 위의 방식으로는 표현이 불가능 하다고 판단하여서 표면 위에서 선의 색을 바꾸는 방식으로 표현하게 되었습니다.

### 프래그먼트 셰이더 전체 코드

```json
const FS_SOURCE = `#version 300 es
precision highp float;

in vec3 vSurf;
in vec3 vNormal;
uniform float uTime;
out vec4 fragColor;

// ── 조절값: 패널 격자와 금속 표면 ─────────────────────────────────
const float LONGITUDE_PANELS = 26.0;
const float LATITUDE_PANELS = 14.0;
const vec2 PANEL_LINE_WIDTHS = vec2(0.035, 0.045);
const vec3 HULL_COLOR = vec3(0.34, 0.34, 0.30);
const vec3 PANEL_LINE_COLOR = vec3(0.22, 0.22, 0.20);
const vec2 PANEL_SHADE_RANGE = vec2(0.94, 1.04);
const float PANEL_SEAM_STRENGTH = 0.30;

// 패널 이음새의 점등 밀도·크기, 점 위치와 점멸 속도
const vec3 PANEL_LIGHT_COLOR = vec3(0.95, 0.78, 0.48);
const float PANEL_LIGHT_DENSITY = 0.84;
const float PANEL_LIGHT_DOT_RADIUS = 0.065;
const vec2 PANEL_LIGHT_POSITION_RANGE = vec2(0.12, 0.88);
const vec2 PANEL_BLINK_RATE = vec2(0.7, 1.6);
const vec2 TRENCH_BLINK_RATE = vec2(0.65, 1.4);
const vec2 BLINK_SMOOTH_RANGE = vec2(-0.45, 0.55);
const vec2 POLAR_FADE_RANGE = vec2(0.02, 0.22);

// 적도 트렌치와 그 안의 점등
const vec2 TRENCH_MASK_RANGE = vec2(0.0175, 0.025);
const float TRENCH_EDGE_POSITION = 0.0275;
const vec2 TRENCH_EDGE_WIDTH = vec2(0.0015, 0.004);
const vec3 TRENCH_COLOR = vec3(0.075, 0.080, 0.075);
const vec3 TRENCH_EDGE_COLOR = vec3(0.58, 0.57, 0.50);
const float TRENCH_DOT_DENSITY = 0.62;

// 슈퍼레이저 접시 위치, 크기, 방사형 홈
const vec3 DISH_CENTER = vec3(0.45, 0.78, 0.89);
const float DISH_RADIUS = 0.28;
const float SPOKE_COUNT = 14.0;
const float SPOKE_WIDTH = 0.035;
const float SPOKE_GLOW_WIDTH = 0.10;

// 조명과 레이저 순차 점등
const vec3 LIGHT_DIRECTION = vec3(-0.45, 0.62, 0.64);
const float AMBIENT_LIGHT = 0.12;
const vec3 LIT_HULL_COLOR = vec3(0.72, 0.70, 0.60);
const vec3 LASER_COLOR = vec3(0.08, 1.0, 0.28);
const vec3 LASER_GLOW_COLOR = vec3(0.42, 1.0, 0.62);
const float LASER_PERIOD = 12.0;
const float SPOKE_SWEEP_DURATION = 4.2;
const float CENTER_BLINK_RATE = 1.2;

// 같은 셀에는 같은 의사 난수를 반환해 점등 위치가 표면에 고정됩니다.
float hashCell(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}

// 좌표를 일정 간격으로 반복해 부드러운 선 마스크를 만듭니다.
float gridLine(float coordinate, float divisions, float width) {
  float grid = coordinate * divisions;
  float edge = abs(fract(grid) - 0.5);
  float aa = fwidth(grid);
  return 1.0 - smoothstep(width, width + aa, edge);
}

// 빛마다 다른 위상/속도를 적용하는 공통 점멸 함수입니다.
float blinkLight(float time, float phase, vec2 rateRange) {
  float rate = mix(rateRange.x, rateRange.y, phase);
  return smoothstep(BLINK_SMOOTH_RANGE.x, BLINK_SMOOTH_RANGE.y,
    sin(time * rate + phase * 6.2831853));
}

void main() {
  // 물체 기준 방향 S는 표면 무늬 좌표, 회전된 법선 N은 조명 계산에 씁니다.
  vec3 S = normalize(vSurf);
  vec3 N = normalize(vNormal);
  vec3 L = normalize(LIGHT_DIRECTION);
  float longitude = atan(S.z, S.x) / 6.2831853 + 0.5;
  float latitudeAngle = asin(clamp(S.y, -1.0, 1.0));
  float latitude = latitudeAngle / 3.14159265 + 0.5;

  // 경도·위도로 패널을 나누고 극점에서는 경도선이 뭉치지 않게 감쇠합니다.
  float meridians = gridLine(longitude, LONGITUDE_PANELS, PANEL_LINE_WIDTHS.x)
    * smoothstep(POLAR_FADE_RANGE.x, POLAR_FADE_RANGE.y, 1.0 - abs(S.y));
  float parallels = gridLine(latitude, LATITUDE_PANELS, PANEL_LINE_WIDTHS.y);
  vec2 panelId = floor(vec2(longitude * LONGITUDE_PANELS, latitude * LATITUDE_PANELS));
  float panelShade = mix(PANEL_SHADE_RANGE.x, PANEL_SHADE_RANGE.y, hashCell(panelId));
  float panelSeams = max(meridians, parallels);

  // 각 경도선/위도선의 패널 구간마다 무작위 위치를 고르고, 교차점에 묶이지 않게 점을 놓습니다.
  float latitudeSegment = fract(latitude * LATITUDE_PANELS);
  float longitudeSegment = fract(longitude * LONGITUDE_PANELS);
  float meridianPointAt = mix(PANEL_LIGHT_POSITION_RANGE.x, PANEL_LIGHT_POSITION_RANGE.y, hashCell(panelId + vec2(17.0, 3.0)));
  float parallelPointAt = mix(PANEL_LIGHT_POSITION_RANGE.x, PANEL_LIGHT_POSITION_RANGE.y, hashCell(panelId + vec2(5.0, 29.0)));
  float meridianPointDistance = abs(latitudeSegment - meridianPointAt);
  float parallelPointDistance = abs(longitudeSegment - parallelPointAt);
  float meridianPoint = (1.0 - smoothstep(PANEL_LIGHT_DOT_RADIUS * 0.65, PANEL_LIGHT_DOT_RADIUS, meridianPointDistance))
    * meridians * step(PANEL_LIGHT_DENSITY, hashCell(panelId + vec2(31.0, 7.0)));
  float parallelPoint = (1.0 - smoothstep(PANEL_LIGHT_DOT_RADIUS * 0.65, PANEL_LIGHT_DOT_RADIUS, parallelPointDistance))
    * parallels * step(PANEL_LIGHT_DENSITY, hashCell(panelId + vec2(11.0, 43.0)));

  // 선 종류별로 점멸 속도와 위상을 다르게 해 점들이 독립적으로 깜빡이게 합니다.
  float meridianPhase = hashCell(panelId + vec2(23.0, 19.0));
  float parallelPhase = hashCell(panelId + vec2(37.0, 13.0));
  float meridianBlink = blinkLight(uTime, meridianPhase, PANEL_BLINK_RATE);
  float parallelBlink = blinkLight(uTime, parallelPhase, PANEL_BLINK_RATE);
  float polarFade = smoothstep(POLAR_FADE_RANGE.x, POLAR_FADE_RANGE.y, 1.0 - abs(S.y));
  float panelLights = max(meridianPoint * meridianBlink, parallelPoint * parallelBlink) * polarFade;

  // 행성 적도 둘레의 넓은 구조 트렌치와 위아래 가장자리선을 만듭니다.
  float equatorDistance = abs(latitudeAngle);
  float trench = 1.0 - smoothstep(TRENCH_MASK_RANGE.x, TRENCH_MASK_RANGE.y, equatorDistance);
  float trenchEdges = 1.0 - smoothstep(TRENCH_EDGE_WIDTH.x, TRENCH_EDGE_WIDTH.y, abs(equatorDistance - TRENCH_EDGE_POSITION));
  float trenchPanel = floor(longitude * LONGITUDE_PANELS);
  float trenchPointAt = mix(PANEL_LIGHT_POSITION_RANGE.x, PANEL_LIGHT_POSITION_RANGE.y, hashCell(vec2(trenchPanel, 71.0)));
  float trenchPointDistance = abs(fract(longitude * LONGITUDE_PANELS) - trenchPointAt);
  float trenchPoint = (1.0 - smoothstep(PANEL_LIGHT_DOT_RADIUS * 0.65, PANEL_LIGHT_DOT_RADIUS, trenchPointDistance))
    * trench * step(TRENCH_DOT_DENSITY, hashCell(vec2(trenchPanel, 89.0)));
  float trenchPhase = hashCell(vec2(trenchPanel, 107.0));
  float trenchBlink = blinkLight(uTime, trenchPhase, TRENCH_BLINK_RATE);
  float trenchLights = trenchPoint * trenchBlink;

  // 카메라를 향한 고정된 구면 위치에 슈퍼레이저 접시를 파냅니다.
  vec3 dishCenter = normalize(DISH_CENTER);
  float dishAngle = acos(clamp(dot(S, dishCenter), -1.0, 1.0));
  float dishInside = 1.0 - smoothstep(DISH_RADIUS - 0.012, DISH_RADIUS + 0.012, dishAngle);
  float dishRim = 1.0 - smoothstep(0.012, 0.026, abs(dishAngle - DISH_RADIUS));
  float dishInnerRing = 1.0 - smoothstep(0.009, 0.018, abs(dishAngle - DISH_RADIUS * 0.72));
  float dishInnerRim = 1.0 - smoothstep(0.010, 0.020, abs(dishAngle - DISH_RADIUS * 0.40));

  // 접시 중심을 기준으로 방사형 홈과 작은 중앙 렌즈를 배치합니다.
  vec3 tangent = S - dishCenter * dot(S, dishCenter);
  vec3 dishRight = normalize(cross(vec3(0.0, 1.0, 0.0), dishCenter));
  vec3 dishUp = normalize(cross(dishCenter, dishRight));
  float bearing = atan(dot(tangent, dishUp), dot(tangent, dishRight)) / 6.2831853 + 0.5;
  float spokes = gridLine(bearing, SPOKE_COUNT, SPOKE_WIDTH) * smoothstep(0.10, 0.14, dishAngle) * dishInside;
  float lens = 1.0 - smoothstep(0.075, 0.095, dishAngle);
  float lensRing = 1.0 - smoothstep(0.008, 0.016, abs(dishAngle - 0.105));

  // LASER_PERIOD마다 12시 방향부터 시계방향으로 방사형 홈을 차례로 활성화합니다.
  float laserCycle = mod(uTime, LASER_PERIOD);
  float sweepProgress = clamp(laserCycle / SPOKE_SWEEP_DURATION * SPOKE_COUNT, 0.0, SPOKE_COUNT);
  float clockwiseBearing = fract(0.75 - bearing + 1.0);
  float spokeOrder = mod(floor(clockwiseBearing * SPOKE_COUNT + 0.5), SPOKE_COUNT);
  float activeSpoke = step(spokeOrder + 0.5, sweepProgress);
  float greenSpokes = spokes * activeSpoke;
  float spokeBloom = gridLine(bearing, SPOKE_COUNT, SPOKE_GLOW_WIDTH) * smoothstep(0.10, 0.14, dishAngle) * dishInside * activeSpoke;
  float centerActivation = smoothstep(SPOKE_SWEEP_DURATION, SPOKE_SWEEP_DURATION + 0.25, laserCycle);
  float centerBlink = 0.25 + 0.75 * (0.5 + 0.5 * sin((laserCycle - SPOKE_SWEEP_DURATION) * CENTER_BLINK_RATE * 6.2831853));
  float centerFill = 1.0 - smoothstep(DISH_RADIUS * 0.25, DISH_RADIUS * 0.29, dishAngle);
  float centerBloom = (1.0 - smoothstep(DISH_RADIUS * 0.29, DISH_RADIUS * 0.72, dishAngle))
    * smoothstep(DISH_RADIUS * 0.18, DISH_RADIUS * 0.29, dishAngle);

  // 확산광으로 낮과 밤을 나누고, 금속 패널에는 낮은 주변광을 유지합니다.
  float diffuse = max(dot(N, L), 0.0);
  float illumination = AMBIENT_LIGHT + (1.0 - AMBIENT_LIGHT) * diffuse;
  vec3 hull = HULL_COLOR * panelShade * illumination;
  hull = mix(hull, PANEL_LINE_COLOR * illumination, panelSeams * PANEL_SEAM_STRENGTH);
  hull = mix(hull, TRENCH_COLOR * illumination, trench * 0.92);
  hull = mix(hull, TRENCH_EDGE_COLOR * illumination, trenchEdges * 0.72);
  // 접시 안쪽은 어둡게 눌러 깊이를 주고, 테두리·방사형 홈·렌즈를 층층이 합성합니다.
  hull = mix(hull, vec3(0.025, 0.027, 0.025) * (0.30 + 0.70 * illumination), dishInside * 0.98);
  hull = mix(hull, LIT_HULL_COLOR * (0.55 + 0.45 * illumination), dishRim * 0.96);
  hull = mix(hull, vec3(0.24, 0.25, 0.23) * illumination, dishInnerRing * 0.85);
  hull = mix(hull, vec3(0.62, 0.60, 0.51) * (0.55 + 0.45 * illumination), spokes * 0.90);
  hull = mix(hull, vec3(0.32, 0.30, 0.24) * illumination, dishInnerRim * 0.80);
  hull = mix(hull, vec3(0.70, 0.66, 0.52) * illumination, lensRing * 0.90);
  hull = mix(hull, vec3(0.19, 0.18, 0.14) * illumination, lens * 0.88);

  // 활성화된 홈의 금속색을 초록색으로 전환하고, 스윕이 끝나면 중앙 렌즈를 채웁니다.
  hull = mix(hull, LASER_COLOR, greenSpokes);
  hull += LASER_GLOW_COLOR * spokeBloom * 0.24;
  hull = mix(hull, LASER_COLOR, centerFill * centerActivation);
  hull += LASER_GLOW_COLOR * centerBloom * centerActivation * centerBlink * 1.2;

  // 패널 접합부 점광원은 주변 금속 조명과 독립적으로 발광시킵니다.
  hull += PANEL_LIGHT_COLOR * panelLights * (1.0 - dishInside) * (0.35 + 0.65 * illumination);
  // 적도 검은 트렌치 안에도 패널 경계선을 따라 점멸 조명을 배치합니다.
  hull += PANEL_LIGHT_COLOR * trenchLights * (1.0 - dishInside) * 0.85;

  fragColor = vec4(hull, 1.0);
}
```

![Task 3 결과](week3/images/task3.png)