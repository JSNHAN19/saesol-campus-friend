"""캐릭터 대사 음성(mp3) 일괄 생성 — data/characters.json의 대사를 그대로 읽습니다.

사용법 (저장소 루트에서):
    pip install edge-tts
    python tools/make_tts.py            # 전체 생성
    python tools/make_tts.py minjun     # 한 캐릭터만

결과: assets/audio/<캐릭터>/{intro,q1,q2,q3,outro}.mp3
목소리·속도는 characters.json의 "voice"에서 바꿀 수 있습니다.
사용 가능한 한국어 목소리 확인: edge-tts --list-voices | grep ko-KR
"""
import asyncio, json, sys
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data/characters.json").read_text(encoding="utf-8"))


async def make(cid, c):
    v = c["voice"]
    out = ROOT / "assets/audio" / cid
    out.mkdir(parents=True, exist_ok=True)
    for line in [c["intro"], *c["questions"], c["outro"]]:
        path = out / f"{line['id']}.mp3"
        await edge_tts.Communicate(line["text"], v["edge"], rate=v["rate"], pitch=v["pitch"]).save(str(path))
        print("✓", path.relative_to(ROOT))


async def main():
    ids = sys.argv[1:] or list(DATA)
    for cid in ids:
        await make(cid, DATA[cid])

asyncio.run(main())
