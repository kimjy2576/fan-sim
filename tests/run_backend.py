"""backend/fan_model.compute_aero 를 tests/cases.json 의 모든 케이스에 대해 실행하고
BEP 결과를 JSON 으로 stdout 에 출력한다. parity.js 가 이 출력을 받아 프론트와 대조한다.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from backend.fan_model import compute_aero  # noqa: E402


def bep_of(geom, fc):
    r = compute_aero({**geom, **({} if fc is None else {})}, mode="on_design", fit_coeffs=fc)
    b = r.get("bep", {})
    hub = r.get("hub", {})
    return {
        "Q": b.get("Q"),
        "Ps": b.get("Ps"),
        "eta": b.get("eta"),
        "blockRatio": hub.get("blockRatio", 0),
    }


def main():
    here = os.path.dirname(__file__)
    spec = json.load(open(os.path.join(here, "cases.json"), encoding="utf-8"))

    out = {"neutral": [], "fc": []}

    # 형상 스윕 (계수 = 기본값 → fit_coeffs=None 은 on-design 등가)
    for c in spec["cases"]:
        out["neutral"].append({"name": c["name"], "bep": bep_of(c["geom"], None)})

    # 계수 스윕 (기본 형상 고정)
    base_geom = spec["cases"][0]["geom"]
    for c in spec["fc_cases"]:
        out["fc"].append({"name": c["name"], "fc": c["fc"], "bep": bep_of(base_geom, c["fc"])})

    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
