#!/usr/bin/env python3
"""Encode safe, optional lighter H.264 cuts of the existing mobile films.

No originals are modified. Only keep an encode when it materially reduces
transfer and survives geometry/duration/visual-similarity checks.
Run from repository root (Ubuntu Actions with ffmpeg and ffprobe).
"""
from pathlib import Path
import json, re, subprocess, sys, math

FILES = [
    ("assets/heroes/loop-mobile/hero-lupas.mp4", "assets/heroes/loop-mobile-optimized/hero-lupas.mp4"),
    ("assets/heroes/loop-mobile/hero-acessorios.mp4", "assets/heroes/loop-mobile-optimized/hero-acessorios.mp4"),
    ("assets/heroes/loop-mobile/hero-relogios.mp4", "assets/heroes/loop-mobile-optimized/hero-relogios.mp4"),
    ("assets/heroes/loop-mobile/hero-perfumes.mp4", "assets/heroes/loop-mobile-optimized/hero-perfumes.mp4"),
    ("assets/heroes/loop-mobile/hero-trajes.mp4", "assets/heroes/loop-mobile-optimized/hero-trajes.mp4"),
    ("assets/heroes/web/hero-3d-mobile.mp4", "assets/heroes/web/hero-3d-mobile-optimized.mp4"),
    ("assets/heroes/web/film-scrub-mobile.mp4", "assets/heroes/web/film-scrub-mobile-optimized.mp4"),
    ("assets/heroes/web/hero-film-mobile.mp4", "assets/heroes/web/hero-film-mobile-optimized.mp4"),
    ("assets/INTRO-LOADER-STREET-540.mp4", "assets/INTRO-LOADER-STREET-540-optimized.mp4"),
]

def call(args, timeout=240):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=timeout)

def probe(path):
    data = json.loads(call(["ffprobe", "-v", "error", "-select_streams", "v:0",
                            "-show_entries", "stream=width,height,r_frame_rate,duration:format=duration",
                            "-of", "json", str(path)]).stdout)
    video = data["streams"][0]
    return (int(video["width"]), int(video["height"]),
            float(video.get("duration") or data["format"]["duration"]),
            video.get("r_frame_rate", ""))

def encode(src, dst):
    if not src.is_file():
        raise RuntimeError("Source missing: " + str(src))
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Keep every frame, the exact cut, orientation and visual composition.
        # Video sources are mute in the client; intro music is a separate MP3.
        call(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
              "-map", "0:v:0", "-an", "-c:v", "libx264", "-preset", "medium",
              "-crf", "27", "-maxrate", "1500k", "-bufsize", "3000k",
              "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "2",
              str(dst)], timeout=360)
        original = probe(src)
        compact = probe(dst)
        if original[:2] != compact[:2] or abs(original[2] - compact[2]) > 0.15 or original[3] != compact[3]:
            raise RuntimeError("Source geometry / fps / duration changed")
        saving = 1 - dst.stat().st_size / src.stat().st_size
        if saving < 0.13:
            print(f"SKIP {src}: {saving:.0%} saving is not worth switching")
            dst.unlink(missing_ok=True)
            return False
        # SSIM guards the cinematography: refuse an excessively soft/blocky cut.
        # The source and output share dimensions & framerate.
        quality = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-i", str(dst),
                 "-filter_complex", "[0:v][1:v]ssim", "-an", "-f", "null", "-"],
                 capture_output=True, text=True, timeout=360)
        if quality.returncode:
            raise RuntimeError("Similarity verification failed: " + quality.stderr[-600:])
        match = re.search(r"SSIM.*?All:([0-9.]+)", quality.stderr)
        if not match or float(match.group(1)) < 0.93:
            raise RuntimeError("SSIM quality below 0.93 or unavailable: " + str(match.group(1) if match else "missing"))
        print(f"PASS {src}: {src.stat().st_size/1024/1024:.2f} MiB -> "
              f"{dst.stat().st_size/1024/1024:.2f} MiB, saved {saving:.1%}, SSIM {match.group(1)}")
        return True
    except Exception as e:
        dst.unlink(missing_ok=True)
        print(f"REJECT {src}: {e}")
        return False

def main():
    accepted = []
    for a,b in FILES:
        if encode(Path(a), Path(b)):
            accepted.append(b)
    Path("mobile-media-encodes.json").write_text(json.dumps({"accepted":accepted}, indent=2)+"\n")
    print("Accepted cuts:", accepted)
    # Successful no-op is fine. Do not force lower-quality assets into production.
    return 0
if __name__ == "__main__":
    sys.exit(main())
