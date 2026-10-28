# 같은 캠퍼스 (saesol-campus-friend)

근무 학교 교감선생님 의뢰로 만드는 **대학생 대상 장애학생 이해 인터랙티브 활동**. 캠퍼스에 붙인 포스터 QR → 휴대폰 웹으로 약 3분 진행. 원본 콘티는 교감선생님이 만든 PPT 스토리보드(캐릭터당 10장)이며, **콘티의 흐름·대사에서 벗어나지 않는 것**이 원칙.

## 캐릭터
- `minjun` 민준 — 지적장애, 사회복지학과 2학년, "다른 속도, 같은 캠퍼스" (파랑 테마)
- `seoyun` 서윤 — 자폐성장애, 컴퓨터공학과 1학년, "다른 감각, 같은 캠퍼스" (보라 테마)

## 화면 흐름 (콘티 1~10장)
title(포스터/시작) → intro(자기소개, 음성) → board(질문 3개 자유 선택) → q1~q3(답변, 음성) → game(상황 3지선다) → feedback(정답 해설 + 내가 고른 답 피드백) → reflect(소감 입력 + 체크) → outro(작별 인사, 음성) → 선물 확인 카드

## 구조
- 빌드 없는 정적 사이트 (HTML/CSS/vanilla JS). GitHub Pages `main` / root 배포.
- `data/characters.json` — 모든 대사·질문·선택지·해설의 단일 출처. 텍스트 수정은 여기서만.
- `app.js` — 해시 라우팅(`#intro` 등), `?c=<id>`로 캐릭터 선택. 진행 상태는 sessionStorage.
- `config.js` — Apps Script 응답 저장 URL(`endpoint`), 선물 안내 문구.
- `assets/<id>/` — `bg.webp`(캐릭터 지운 배경), `char.webp`(누끼 캐릭터), `full.webp`(원본), `qr.png`
- `assets/audio/<id>/{intro,q1,q2,q3,outro}.mp3` — 대사 음성. 없으면 브라우저 speechSynthesis로 폴백.
- `tools/make_tts.py` — edge-tts로 음성 일괄 생성 (characters.json의 `voice` 사용)
- `apps-script/` — 구글 시트 응답 저장 웹앱 코드 + 설정법
- `poster.html?c=<id>` — 인쇄용 A4 가로 포스터

## 애니메이션 원리 (AI 영상 생성 안 씀)
배경/캐릭터 레이어 분리 → 배경 드리프트, 캐릭터 호흡·흔들림, 빛 입자. 음성 재생 중엔 Web Audio 분석으로 `--amp` CSS 변수를 갱신해 캐릭터 들썩임·음파 막대를 구동하고, 말풍선 자막을 재생 위치에 맞춰 타이핑. 정답 선택 시 `happy`, 오답 시 `nod` 반응.

## 로컬 실행
```
python -m http.server 8000   # http://localhost:8000/?c=minjun
```
(file://로 열면 JSON fetch가 막힘)

## 진행 중 / 남은 일
- [x] 음성 생성: `pip install edge-tts` → `python tools/make_tts.py` → `assets/audio` 커밋. 서윤 목소리(`ko-KR-HyunsuMultilingualNeural`)가 안 되면 `edge-tts --list-voices`에서 ko-KR 남성 음성으로 교체.
- [ ] GitHub Pages 활성화 확인 (Settings → Pages → main / root)
- [ ] 교감선생님 검토: 선택지별 피드백 문구 6개(`game.options[].note`, 콘티에 없던 추가분), 선물 지급 방식
- [ ] 방향 확정 후 Apps Script 연결 (학교 측 구글 계정 소유로)

## 주의
- 장애 이해 교육 자료. 과장된 표정·몸짓, 고정관념을 강화하는 연출·문구 금지. 개인차 존중 메시지 유지.
- 응답은 익명. 이름·연락처 등 개인정보 수집 항목 추가 금지(추가 시 수집 동의 절차 필요).
- QR이 `https://jsnhan19.github.io/saesol-campus-friend/?c=<id>`로 인쇄되므로 **저장소 이름·소유자 변경 금지** (바꾸면 QR 재생성·재인쇄).
- UI 문구는 반말 캐릭터 톤 유지, 화면 표시 텍스트에 "(가제)" 같은 제작 메모 노출 금지.
