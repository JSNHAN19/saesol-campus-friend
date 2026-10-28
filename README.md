# 같은 캠퍼스 — 장애학생 이해 인터랙티브 활동

대학생 대상 장애학생 이해 교육용 모바일 웹 활동입니다. QR로 접속해 캐릭터의 자기소개를 듣고, 질문 3개 중 골라 답을 듣고, 상황 선택 게임과 소감 남기기까지 약 3분 동안 진행합니다.

| 주소 | 내용 |
|---|---|
| `/` | 캐릭터 선택 |
| `/?c=minjun` | 민준 편 (지적장애) — 다른 속도, 같은 캠퍼스 |
| `/?c=seoyun` | 서윤 편 (자폐성장애) — 다른 감각, 같은 캠퍼스 |
| `/poster.html?c=minjun` | 인쇄용 홍보 포스터 (A4 가로, QR 포함) |

## 구조

```
data/characters.json   대사·질문·선택지·해설 (내용 수정은 여기서만)
config.js              응답 저장 주소, 선물 안내 문구
assets/<캐릭터>/        bg(배경) · char(캐릭터 레이어) · full(원본) · qr
assets/audio/<캐릭터>/  대사 음성 mp3 (없으면 브라우저 음성으로 대체)
tools/make_tts.py      음성 일괄 생성
apps-script/           구글 시트 응답 저장
```

## 운영 메모

- **음성**: `pip install edge-tts && python tools/make_tts.py` 실행 후 `assets/audio`를 커밋. 대사를 고쳤다면 다시 실행.
- **응답 저장**: `apps-script/README.md` 참고 후 `config.js`의 `endpoint`에 URL 입력.
- **캐릭터 추가**: `characters.json`에 항목을 추가하고 `assets/<id>/`에 같은 이름의 이미지를 넣으면 됩니다.
- 응답은 익명이며 이름·연락처는 수집하지 않습니다.
