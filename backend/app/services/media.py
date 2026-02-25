import math
import os
import subprocess
import wave
from pathlib import Path

import numpy as np

from ..config import settings

MOOD_PRESETS = {
    'Peace': {'key_freq': 261.63, 'tempo': 45, 'pad': 0.35},
    'Hope': {'key_freq': 293.66, 'tempo': 56, 'pad': 0.42},
    'Reflection': {'key_freq': 220.00, 'tempo': 40, 'pad': 0.30},
    'Worship': {'key_freq': 329.63, 'tempo': 64, 'pad': 0.46},
    'Reverence': {'key_freq': 246.94, 'tempo': 48, 'pad': 0.38},
}


def _fade_envelope(samples: int, sample_rate: int) -> np.ndarray:
    fade_len = int(sample_rate * 3)
    env = np.ones(samples)
    env[:fade_len] = np.linspace(0, 1, fade_len)
    env[-fade_len:] = np.linspace(1, 0, fade_len)
    return env


def generate_ambient_wav(output_path: str, mood: str, duration_seconds: int, sample_rate: int = 44100) -> str:
    preset = MOOD_PRESETS.get(mood, MOOD_PRESETS['Peace'])
    t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds), endpoint=False)

    root = np.sin(2 * math.pi * preset['key_freq'] * t)
    fifth = np.sin(2 * math.pi * (preset['key_freq'] * 1.5) * t + 0.7)
    octave = np.sin(2 * math.pi * (preset['key_freq'] / 2) * t + 1.2)

    lfo = 0.5 + 0.5 * np.sin(2 * math.pi * (preset['tempo'] / 60 / 4) * t)
    mix = (root * 0.45 + fifth * 0.35 + octave * 0.2) * (preset['pad'] + 0.2 * lfo)

    wet = np.roll(mix, int(sample_rate * 0.14)) * 0.18
    audio = (mix + wet) * _fade_envelope(len(mix), sample_rate)
    audio = np.clip(audio, -0.9, 0.9)

    pcm = (audio * 32767).astype(np.int16)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(output_path, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm.tobytes())

    return output_path


def generate_video_with_audio(video_path: str, audio_path: str, verse_text: str, mood: str, duration_seconds: int) -> str:
    Path(video_path).parent.mkdir(parents=True, exist_ok=True)
    safe_text = verse_text.replace(':', '\\:').replace("'", "\\'")
    hue_shift = {'Peace': 0.55, 'Hope': 0.16, 'Reflection': 0.70, 'Worship': 0.10, 'Reverence': 0.62}.get(mood, 0.55)

    vf = (
        "geq=r='128+80*sin(2*PI*(X/W+T/60+{h}))':"
        "g='90+60*sin(2*PI*(Y/H+T/75+{h}/2))':"
        "b='140+70*sin(2*PI*(X/W+Y/H+T/90+{h}/3))',"
        "noise=alls=4:allf=t+u,"
        "drawtext=fontcolor=white:fontsize=56:font='Serif':"
        "text='{txt}':x=(w-text_w)/2:y=(h-text_h)/2:"
        "alpha='if(lt(t,2),t/2,if(lt(t,{d}-2),0.96,({d}-t)/2))'"
    ).format(d=duration_seconds, txt=safe_text, h=hue_shift)

    cmd = [
        settings.ffmpeg_binary,
        '-y',
        '-f', 'lavfi',
        '-i', f"color=c=#10151f:s=1920x1080:d={duration_seconds}:r=30",
        '-i', audio_path,
        '-vf', vf,
        '-map', '1:a',
        '-map', '0:v',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-shortest',
        '-movflags', '+faststart',
        video_path,
    ]

    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return video_path


def media_url(path: str) -> str:
    return f"/media/{os.path.basename(path)}"
