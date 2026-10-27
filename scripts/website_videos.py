# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from __future__ import annotations
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT_DIR / "tools" / "videos"
VENV_DIR = CACHE_DIR / "venv"
VENV_PYTHON = VENV_DIR / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
REQUIREMENTS_STAMP = VENV_DIR / ".wasmgpu-requirements"
MEDIA_DIR = CACHE_DIR / "media"
VOICE_CACHE_DIR = CACHE_DIR / "voice"
KOKORO_DIR = CACHE_DIR / "kokoro"
QA_DIR = CACHE_DIR / "qa"
SAMPLER_PATH = CACHE_DIR / "voice-sampler.mp4"
VIDEOS_DIR = ROOT_DIR / "assets" / "videos"
IMAGES_DIR = ROOT_DIR / "assets" / "images"
FONTS_DIR = ROOT_DIR / "assets" / "fonts"
PACKAGE_JSON_PATH = ROOT_DIR / "package.json"
PINNED_REQUIREMENTS = [
    "annotated-types==0.8.0", "attrs==26.1.0", "av==19.0.1", "beautifulsoup4==4.15.0", "cffi==2.1.1", "click==8.5.0",
    "cloudpickle==3.1.2", "cloup==4.0.0", "decorator==5.3.1", "dlinfo==2.0.0", "espeakng-loader==0.2.4",
    "flatbuffers==25.12.19", "glcontext==3.1.0", "isosurfaces==0.1.2", "joblib==1.6.0", "kokoro-onnx==0.6.1",
    "manim==0.21.0", "manim-voiceover==0.4.0", "ManimPango==0.7.0", "mapbox_earcut==2.1.0", "markdown-it-py==4.2.0",
    "mdurl==0.1.2", "moderngl==5.13.0", "moderngl-window==3.1.1", "mutagen==1.48.1", "networkx==3.7", "numpy==2.5.3",
    "onnxruntime==1.30.0", "packaging==26.3", "phonemizer==3.4.0", "pillow==12.3.0", "protobuf==7.36.2",
    "pycairo==1.29.2", "pycparser==3.0", "pydantic==2.13.5", "pydantic_core==2.46.5", "pydub==0.25.1", "pyglet==2.1.16",
    "pyglm==2.8.3", "Pygments==2.21.0", "python-dotenv==1.2.4", "python-slugify==8.0.4", "rich==15.0.0", "scipy==1.18.1",
    "screeninfo==0.8.1", "skia-pathops==0.9.2", "soundfile==0.14.0", "soupsieve==2.10", "sox==1.5.0", "srt==3.5.3",
    "svgelements==1.9.6", "text-unidecode==1.3", "tqdm==4.70.1", "typing-inspection==0.4.4", "typing_extensions==4.16.0",
    "watchdog==6.0.0"
]
SUPPORTED_INTERPRETERS = ("python3.13", "python3.12", "python3.11")

def running_in_video_venv() -> bool:
    return Path(sys.prefix).resolve() == VENV_DIR.resolve()

def find_supported_interpreter() -> str | None:
    for name in SUPPORTED_INTERPRETERS:
        path = shutil.which(name)
        if path is not None:
            return path
    return None

def ensure_video_venv() -> Path:
    if not VENV_PYTHON.exists():
        interpreter = find_supported_interpreter()
        if interpreter is None:
            raise RuntimeError("No supported Python interpreter found. The video tools need Python 3.11, 3.12, or 3.13 because kokoro-onnx does not support Python 3.14. On Ubuntu 24.04, install one with: sudo apt install python3.12 python3.12-venv")
        print(f"Creating the video environment at {VENV_DIR} with {interpreter}", flush=True)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        subprocess.run([interpreter, "-m", "venv", str(VENV_DIR)], check=True)
    pinned = "\n".join(PINNED_REQUIREMENTS) + "\n"
    if not REQUIREMENTS_STAMP.exists() or REQUIREMENTS_STAMP.read_text(encoding="utf-8") != pinned:
        print("Installing the pinned video requirements", flush=True)
        subprocess.run([str(VENV_PYTHON), "-m", "pip", "install", "--disable-pip-version-check", "--upgrade", "pip", "setuptools", "wheel"], check=True)
        subprocess.run([str(VENV_PYTHON), "-m", "pip", "install", "--disable-pip-version-check", *PINNED_REQUIREMENTS], check=True)
        REQUIREMENTS_STAMP.write_text(pinned, encoding="utf-8")
    return VENV_PYTHON

def bootstrap() -> int:
    try:
        venv_python = ensure_video_venv()
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"Video environment setup failed: {exc}", file=sys.stderr)
        return 1
    return subprocess.run([str(venv_python), str(Path(__file__).resolve()), *sys.argv[1:]]).returncode

if __name__ == "__main__" and not running_in_video_venv():
    raise SystemExit(bootstrap())

import argparse
import functools
import hashlib
import inspect
import json
import logging
import math
import re
import tempfile
import textwrap
import urllib.request
from collections.abc import Callable, Sequence
from dataclasses import dataclass

import av
import manimpango
import numpy as np
import soundfile
from kokoro_onnx import Kokoro
from manim import (
    BOLD, DOWN, LEFT, MEDIUM, ORIGIN, PI, RIGHT, SEMIBOLD, UP,
    Animation, AnimationGroup, Arc, Arrow, Circle, Code, Create, DashedLine, DashedVMobject, Dot, Ellipse, FadeIn, FadeOut, GrowArrow,
    Indicate, LaggedStart, Line, MathTex, Mobject, MoveAlongPath, Paragraph, Polygon, Rectangle, RoundedRectangle, Scene, Square,
    Succession, SurroundingRectangle, Text, Transform, ReplacementTransform, VGroup, VMobject, Wait, Write, config, interpolate_color,
    ManimColor, logger
)
from manim_voiceover import VoiceoverScene
from manim_voiceover.helper import remove_bookmarks
from manim_voiceover.services.base import SpeechService, initialize_speech_service
from PIL import Image, ImageDraw, ImageFont

config.max_files_cached = 4000
logging.getLogger("phonemizer").propagate = False
logging.getLogger("av.container.output").addFilter(lambda record: not record.getMessage().startswith("Some options were not used"))

@dataclass(frozen=True)
class VideoSpec:
    name: str
    scene: str
    title: str
    subtitle: str
    docs_path: str

VIDEOS = [
    VideoSpec("wasmgpu", "WasmGPUVideo", "WasmGPU", "WebGPU × WebAssembly rendering and computing engine for scientific workloads in the browser", "docs/"),
    VideoSpec("architecture", "ArchitectureVideo", "Architecture", "How WasmGPU's subsystems fit together", "docs/architecture/"),
    VideoSpec("compute", "ComputeVideo", "Compute", "GPU compute pipelines, ndarrays, kernels, and readback", "docs/compute/"),
    VideoSpec("interact", "InteractVideo", "Interaction", "Controls, picking, selection, annotations, and data scaling", "docs/interact/"),
    VideoSpec("interop", "InteropVideo", "Interoperability", "Driver memory, arenas, foreign WebAssembly, Python, and WebGPU layouts", "docs/interop/"),
    VideoSpec("math", "MathVideo", "Mathematics", "Vectors, matrices, and quaternions in f32 and f64", "docs/math/"),
    VideoSpec("objects", "ObjectsVideo", "Objects", "Geometry, materials, textures, scientific primitives, and glTF", "docs/objects/"),
    VideoSpec("render", "RenderVideo", "Render", "Engine lifecycle, the frame, culling, effects, and transforms", "docs/render/"),
    VideoSpec("world", "WorldVideo", "World", "Scenes, cameras, lights, and overlays", "docs/world/")
]
VIDEO_BY_NAME = {spec.name: spec for spec in VIDEOS}
VIDEO_BY_SCENE = {spec.scene: spec for spec in VIDEOS}
GENERAL = VIDEO_BY_NAME["wasmgpu"]
TITLE_CARD_ENV = "WASMGPU_VIDEO_TITLE_CARD"
DOCS_URL = "https://zushah.github.io/WasmGPU/"
VERSION = json.loads(PACKAGE_JSON_PATH.read_text(encoding="utf-8"))["version"]
MIN_DURATION = 180.0
MAX_DURATION = 300.0

for font_path in sorted(FONTS_DIR.glob("*.ttf")):
    if not manimpango.register_font(str(font_path)):
        raise RuntimeError(f"Could not register font: {font_path}")

FONT = "Montserrat"
MONO = "Ubuntu Mono"
BACKGROUND = "#0b0b10"
TEXT = "#F4F4F8"
MUTED = "#A9A9BC"
HAIRLINE = "#34344A"
PANEL = "#15151f"
ERROR = "#FF6B6B"
BRAND = ["#005a9c", "#3355c6", "#654ff0", "#8472f3", "#9b8df5"]
ACCENT = BRAND[3]
API = "#4E79FF"
ENGINE = "#22D37D"
COMPUTE = "#17C9FF"
DATA = "#FFB238"
DRIVER = "#B18AFF"
BROWSER = "#FF5EA8"
COLORMAPS = {
    "viridis": ["#440154", "#472c7b", "#3a528b", "#2c728e", "#20908c", "#27ad80", "#5bc862", "#aadb32", "#fde724"],
    "plasma": ["#0c0786", "#4c02a1", "#7e03a7", "#a92395", "#cb4777", "#e56b5c", "#f79341", "#fdc328", "#eff821"],
    "magma": ["#000003", "#1c1046", "#50127b", "#822581", "#b63679", "#e55063", "#fb8660", "#fec286", "#fbfcbf"],
    "inferno": ["#000003", "#200c4a", "#570f6d", "#892269", "#bb3754", "#e35832", "#f98c09", "#f8c931", "#fcfea4"],
    "turbo": ["#30123b", "#466be3", "#28bbeb", "#32f197", "#a4fc3b", "#ecd139", "#fb8022", "#d23005", "#7a0402"],
    "grayscale": ["#000000", "#202020", "#404040", "#606060", "#808080", "#9f9f9f", "#bfbfbf", "#dfdfdf", "#ffffff"]
}
VIRIDIS = COLORMAPS["viridis"]
CODE_STYLE = "monokai"
CARD_TITLE_SIZE = 88
WORDMARK_WEIGHT = MEDIUM
HEADING_SIZE = 46
BODY_SIZE = 32
LABEL_SIZE = 26
SMALL_SIZE = 24
CODE_SIZE = 24
CAP_HEIGHT = 0.0097
SAFE_LEFT = -6.6
SAFE_RIGHT = 6.6
SAFE_BOTTOM = -2.9
HEADING_Y = 3.12
CONTENT_TOP = 2.5
CONTENT_CENTER = DOWN * 0.2
LINE_GAP = 0.3
CARD_LOGO_Y = 2.23
CARD_BASELINE_Y = 0.025
CARD_TEXT_Y = -0.82
CARD_BADGE_Y = -2.0
CARD_HOLD = 1.2
CARD_SWAP = 1.0
CARD_SETTLE = 0.6

LOGO_TRIANGLES = [
    ([(20.000, 140.000), (380.000, 140.000), (200.000, 451.769)], BRAND[0]),
    ([(380.000, 140.000), (290.000, 295.885), (470.000, 295.885)], BRAND[1]),
    ([(380.000, 451.769), (290.000, 295.885), (470.000, 295.885)], BRAND[2]),
    ([(470.000, 295.885), (425.000, 217.942), (515.000, 217.942)], BRAND[3]),
    ([(470.000, 140.000), (425.000, 217.942), (515.000, 217.942)], BRAND[4]),
    ([(510.000, 295.885), (420.000, 451.769), (600.000, 451.769)], BRAND[4]),
    ([(600.000, 140.000), (510.000, 295.885), (690.000, 295.885)], BRAND[3]),
    ([(600.000, 295.885), (690.000, 295.885), (645.000, 373.827)], BRAND[2]),
    ([(690.000, 295.885), (645.000, 373.827), (735.000, 373.827)], BRAND[1]),
    ([(645.000, 373.827), (735.000, 373.827), (690.000, 451.769)], BRAND[0]),
]

VOICE = "am_michael"
SPEED = 1.0
SAMPLER_VOICES = ["af_heart", "af_bella", "af_nicole", "af_sarah", "am_michael", "am_fenrir", "am_puck", "bf_emma", "bf_isabella", "bm_george"]
KOKORO_MODEL = KOKORO_DIR / "kokoro-v1.0.int8.onnx"
KOKORO_VOICES = KOKORO_DIR / "voices-v1.0.bin"
KOKORO_FILES = {
    KOKORO_MODEL: ("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx", "6e742170d309016e5891a994e1ce1559c702a2ccd0075e67ef7157974f6406cb"),
    KOKORO_VOICES: ("https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin", "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d")
}

PRONUNCIATIONS: dict[str, str] = {
    "WasmGPU": "wasm G P U",
    "WebGPU": "web G P U",
    "WebAssembly": "web assembly",
    "WGSL": "W G S L",
    "glTF": "G L T F",
    "GLB": "G L B",
    "ndarray": "N D array",
    "ndarrays": "N D arrays",
    "CPUndarray": "CPU N D array",
    "CPUndarrays": "CPU N D arrays",
    "GPUndarray": "GPU N D array",
    "GPUndarrays": "GPU N D arrays",
    "PointCloud": "point cloud",
    "GlyphField": "glyph field",
    "NodeLink": "node link",
    "SplatField": "splat field",
    "LatticeSpace": "lattice space",
    "f32": "F 32",
    "f64": "F 64",
    "u32": "U 32",
    "c64": "C 64",
    "vec3": "vec 3",
    "mat4": "mat 4",
    "quat": "quat",
    "SMAA": "S M A A",
    "PCF": "P C F",
    "PBR": "P B R",
    "SoA": "structure of arrays",
    "Pyodide": "pie oh dide",
    "NumPy": "num pie",
    "SIMD": "sim D",
    "jsDelivr": "J S deliver",
    "npm": "N P M",
    "IIFE": "I I F E",
    "ESM": "E S M",
    "ownBuffers": "own buffers",
    "canReadback": "can read back",
    "dtype": "D type",
    "dtypes": "D types",
    "GEMM": "gem",
    "LU": "L U",
    "RGBA8": "R G B A 8",
    "NavigationControls": "navigation controls",
    "requestStats": "request stats",
    "ID": "I D",
    "IDs": "I Ds",
    "WasmModule": "wasm module",
    "WasmMemoryView": "wasm memory view",
    "SharedArrayBuffer": "shared array buffer",
    "isParallel": "is parallel",
    "isOrthogonal": "is orthogonal",
    "angBetween": "ang between",
    "toRotation": "to rotation",
    "fromAxisAngle": "from axis angle",
    "decomposeTRS": "decompose T R S",
    "lookAt": "look at",
    "rotateX": "rotate X",
    "freeF32": "free F 32",
    "freeF64": "free F 64",
    "vec3f": "vec 3 F",
    "vec3d": "vec 3 D",
    "mat4f": "mat 4 F",
    "mat4d": "mat 4 D",
    "quatf": "quat F",
    "quatd": "quat D",
    "binary32": "binary 32",
    "cullingStats": "culling stats",
    "createPerformanceStats": "create performance stats",
    "createTransform": "create transform",
    "isRunning": "is running",
    "castShadow": "cast shadow",
    "createScene": "create scene",
    "traverseVisible": "traverse visible",
    "findByName": "find by name",
    "findAllByName": "find all by name",
    "getBounds": "get bounds",
    "createCamera": "create camera",
    "setWorldPosition": "set world position",
    "createLight": "create light",
    "createOverlay": "create overlay",
    "setLayerEnabled": "set layer enabled",
    "i32": "I 32",
    "capBytes": "cap bytes",
    "usedBytes": "used bytes",
    "copyInto": "copy into",
    "createHeapArena": "create heap arena",
    "addChild": "add child",
    "setParent": "set parent",
    "createMesh": "create mesh",
    "loadAndImport": "load and import",
    "receiveShadow": "receive shadow",
    "DOM": "dom"
}
PRONUNCIATION_PATTERN = re.compile(r"\b(" + "|".join(re.escape(key) for key in sorted(PRONUNCIATIONS, key=len, reverse=True)) + r")\b")
DOTTED_NAME_PATTERN = re.compile(r"(?<=[A-Za-z])\.(?=[A-Za-z])")

def spoken(text: str) -> str:
    text = DOTTED_NAME_PATTERN.sub(" dot ", text)
    return PRONUNCIATION_PATTERN.sub(lambda match: PRONUNCIATIONS[match.group(1)], text)

def voice_language(voice: str) -> str:
    return "en-gb" if voice.startswith("b") else "en-us"

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()

def ensure_kokoro_model() -> None:
    KOKORO_DIR.mkdir(parents=True, exist_ok=True)
    for path, (url, expected) in KOKORO_FILES.items():
        if path.exists() and sha256_file(path) == expected:
            continue
        print(f"Downloading {path.name}", flush=True)
        with tempfile.NamedTemporaryFile(dir=KOKORO_DIR, delete=False) as handle:
            temporary = Path(handle.name)
            with urllib.request.urlopen(url) as response:
                shutil.copyfileobj(response, handle)
        actual = sha256_file(temporary)
        if actual != expected:
            temporary.unlink()
            raise RuntimeError(f"Checksum mismatch for {path.name}: expected {expected}, got {actual}")
        temporary.replace(path)

_KOKORO: Kokoro | None = None

def kokoro() -> Kokoro:
    global _KOKORO
    if _KOKORO is None:
        _KOKORO = Kokoro(str(KOKORO_MODEL), str(KOKORO_VOICES))
    return _KOKORO

class KokoroService(SpeechService):
    def __init__(self, voice: str = VOICE, speed: float = SPEED, **kwargs: object) -> None:
        initialize_speech_service(self, kwargs)
        self.voice = voice
        self.speed = speed

    def generate_from_text(self, text: str, cache_dir: str | None = None, path: str | None = None, **kwargs: object) -> dict:
        cache_dir = cache_dir or self.cache_dir
        written = remove_bookmarks(text)
        speech = spoken(written)
        input_data = {"input_text": speech, "service": "kokoro", "model": KOKORO_MODEL.name, "voice": self.voice, "speed": self.speed}
        cached = self.get_cached_result(input_data, cache_dir)
        if cached is not None:
            return cached
        audio_path = self.get_audio_basename(input_data) + ".wav"
        samples, sample_rate = kokoro().create(speech, voice=self.voice, speed=self.speed, lang=voice_language(self.voice))
        soundfile.write(str(Path(cache_dir) / audio_path), samples, sample_rate)
        return {"input_text": written, "input_data": input_data, "original_audio": audio_path}

def txt(text: str, size: float = BODY_SIZE, color: str = TEXT, weight: str = MEDIUM) -> Text:
    return Text(text, font=FONT, font_size=size, color=color, weight=weight, disable_ligatures=True)

def mono(text: str, size: float = CODE_SIZE, color: str = TEXT) -> Text:
    return Text(text, font=MONO, font_size=size, color=color, disable_ligatures=True)

def wrap(text: str, width: int) -> list[str]:
    return textwrap.wrap(text, width=width, break_long_words=False, break_on_hyphens=False) or [""]

def lines(text: str | Sequence[str], size: float = BODY_SIZE, color: str = TEXT, weight: str = MEDIUM, width: int | None = None, align: str = "left", font: str = FONT) -> Paragraph:
    rows = list(wrap(text, width) if width is not None and isinstance(text, str) else ([text] if isinstance(text, str) else text))
    return Paragraph(*rows, font=font, font_size=size, color=color, weight=weight, alignment=align, line_spacing=0.75, disable_ligatures=True)

def logo_mark(width: float) -> VGroup:
    triangles = VGroup(*[Polygon(*[[x, -y, 0] for x, y in points], fill_color=color, fill_opacity=1, stroke_color=color, stroke_width=0.6) for points, color in LOGO_TRIANGLES])
    return triangles.scale_to_fit_width(width).move_to(ORIGIN)

def pill(text: str, color: str, size: float = SMALL_SIZE, font: str = FONT, weight: str = SEMIBOLD, fill_opacity: float = 0.14) -> VGroup:
    label = Text(text, font=font, font_size=size, color=color, weight=weight, disable_ligatures=True) if font == FONT else mono(text, size, color)
    frame = RoundedRectangle(corner_radius=0.2, width=label.width + 0.45, height=size * CAP_HEIGHT + 0.36, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=fill_opacity)
    label.move_to(frame)
    return VGroup(frame, label)

def card_title(text: str) -> VGroup:
    glyphs = Text("H" + text, font=FONT, font_size=CARD_TITLE_SIZE, color=TEXT, weight=WORDMARK_WEIGHT if text == "WasmGPU" else BOLD, disable_ligatures=True)
    title = VGroup(*glyphs[1:])
    return title.shift([-title.get_center()[0], CARD_BASELINE_Y - glyphs[0].get_bottom()[1], 0])

def card_layout(title: str, text: Mobject) -> VGroup:
    logo = logo_mark(3.6).move_to([0, CARD_LOGO_Y, 0])
    version = pill(f"v{VERSION}", ACCENT, 26).move_to([0, CARD_BADGE_Y, 0])
    heading = card_title(title)
    text.move_to([0, CARD_TEXT_Y, 0])
    if text.get_top()[1] > heading.get_bottom()[1] - 0.3:
        text.move_to([0, (heading.get_bottom()[1] + version.get_top()[1]) / 2, 0])
    return VGroup(logo, heading, text, version)

def title_card(spec: VideoSpec) -> VGroup:
    rows = [spec.subtitle] if len(spec.subtitle) <= 62 else wrap(spec.subtitle, 52)
    return card_layout(spec.title, lines(rows, 30, MUTED, align="center"))

def end_card(spec: VideoSpec) -> VGroup:
    return card_layout(spec.title, mono(DOCS_URL + spec.docs_path, 30, BRAND[4]))

def chrome() -> VGroup:
    rule = Line([SAFE_LEFT, 2.62, 0], [SAFE_RIGHT, 2.62, 0], color=HAIRLINE, stroke_width=2)
    logo = logo_mark(1.0)
    logo.move_to([SAFE_RIGHT - logo.width / 2, HEADING_Y, 0])
    return VGroup(rule, logo)

def chapter_heading(number: int | None, title: str) -> Text:
    label = title if number is None else f"{number:02d}   {title}"
    heading = Text(label, font=FONT, font_size=HEADING_SIZE, color=TEXT, weight=SEMIBOLD, t2c=None if number is None else {"[0:2]": ACCENT}, disable_ligatures=True)
    heading.move_to([SAFE_LEFT + heading.width / 2, HEADING_Y, 0])
    return heading

def agenda_list(chapters: Sequence[str]) -> VGroup:
    items = VGroup(*[Text(f"{index:02d}   {title}", font=FONT, font_size=28, color=TEXT, weight=MEDIUM, t2c={"[0:2]": ACCENT}, disable_ligatures=True) for index, title in enumerate(chapters, start=1)])
    pitch = 0.62
    top = 0.3 + (len(items) - 1) * pitch / 2 + 28 * CAP_HEIGHT / 2
    for index, item in enumerate(items):
        item.shift([0.6 - item.get_left()[0], top - index * pitch - item.get_top()[1], 0])
    return items

def bullet(text: str, size: float = BODY_SIZE, color: str = TEXT, marker: str = ACCENT, width: int | None = None, font: str = FONT) -> VGroup:
    body = lines(text, size, color, width=width, font=font) if width is not None else (txt(text, size, color) if font == FONT else mono(text, size, color))
    dot = Square(side_length=0.15, fill_color=marker, fill_opacity=1, stroke_width=0).rotate(PI / 4)
    dot.move_to([body.get_left()[0] - 0.36, body.get_top()[1] - size * CAP_HEIGHT / 2, 0])
    return VGroup(dot, body)

def bullet_list(items: Sequence[str], size: float = BODY_SIZE, color: str = TEXT, marker: str = ACCENT, pitch: float | None = None, width: int | None = None, font: str = FONT) -> VGroup:
    rows = VGroup(*[bullet(item, size, color, marker, width, font) for item in items])
    step = pitch if pitch is not None else size * CAP_HEIGHT * 2.9
    top = 0.0
    for row in rows:
        row.shift([-row.get_left()[0], top - row[1].get_top()[1], 0])
        top -= max(step, row[1].height + size * CAP_HEIGHT * 1.3)
    return rows

def code_panel(code: str, language: str = "javascript", size: float = CODE_SIZE) -> Code:
    return Code(
        code_string=code.strip("\n"),
        language=language,
        formatter_style=CODE_STYLE,
        add_line_numbers=False,
        background="rectangle",
        background_config={"buff": 0.32, "fill_color": PANEL, "stroke_color": HAIRLINE, "stroke_width": 2, "corner_radius": 0.16},
        paragraph_config={"font": MONO, "font_size": size, "line_spacing": 0.65}
    )

def box(label: str | Sequence[str], color: str, width: float, height: float | None = None, size: float = LABEL_SIZE, weight: str = SEMIBOLD, text_color: str = TEXT, wrap_at: int | None = None, font: str = FONT, fill_opacity: float = 0.15) -> VGroup:
    if isinstance(label, str) and wrap_at is not None:
        label = wrap(label, wrap_at)
    text = lines(label, size, text_color, weight, align="center", font=font)
    frame = RoundedRectangle(corner_radius=0.12, width=width, height=height if height is not None else text.height + 0.42, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=fill_opacity)
    text.move_to(frame)
    return VGroup(frame, text)

def chip(label: str, color: str, width: float, size: float = SMALL_SIZE, wrap_at: int | None = None, font: str = FONT, height: float | None = None) -> VGroup:
    return box(label, color, width, height, size, MEDIUM, TEXT, wrap_at, font, 0.12)

def solid_arrow(start: np.ndarray | Sequence[float], end: np.ndarray | Sequence[float], color: str = MUTED, stroke: float = 3, buff: float = 0.06) -> Arrow:
    return Arrow(start, end, buff=buff, stroke_width=stroke, color=color, tip_length=0.18, max_tip_length_to_length_ratio=0.45, max_stroke_width_to_length_ratio=12)

def dashed_arrow(start: np.ndarray | Sequence[float], end: np.ndarray | Sequence[float], color: str = MUTED, stroke: float = 3, buff: float = 0.06) -> DashedLine:
    start = np.array(start, dtype=float)
    end = np.array(end, dtype=float)
    direction = (end - start) / np.linalg.norm(end - start)
    line = DashedLine(start + direction * buff, end - direction * buff, dash_length=0.11, dashed_ratio=0.55, color=color, stroke_width=stroke)
    return line.add_tip(tip_length=0.18, tip_width=0.18)

def connect(a: Mobject, b: Mobject, color: str = MUTED, dashed: bool = False, direction: np.ndarray | None = None, buff: float = 0.08) -> VMobject:
    if direction is None:
        delta = b.get_center() - a.get_center()
        direction = RIGHT if abs(delta[0]) >= abs(delta[1]) and delta[0] >= 0 else LEFT if abs(delta[0]) >= abs(delta[1]) else UP if delta[1] > 0 else DOWN
    start = a.get_edge_center(direction)
    end = b.get_edge_center(-direction)
    return dashed_arrow(start, end, color, buff=buff) if dashed else solid_arrow(start, end, color, buff=buff)

def memory_cells(count: int, color: str, cell: float = 0.4, filled: Sequence[int] = (), fill_opacity: float = 0.7) -> VGroup:
    cells = VGroup(*[Square(side_length=cell, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=fill_opacity if index in filled else 0.08) for index in range(count)])
    return cells.arrange(RIGHT, buff=0)

def equation(tex: str, size: float = 46, color: str = TEXT) -> MathTex:
    return MathTex(tex, font_size=size, color=color)

def highlight(mobject: Mobject, color: str = ACCENT, buff: float = 0.1) -> SurroundingRectangle:
    return SurroundingRectangle(mobject, color=color, buff=buff, corner_radius=0.12, stroke_width=3)

def gradient_bar(colors: Sequence[str], width: float, height: float, steps: int = 48) -> VGroup:
    stops = [ManimColor(color) for color in colors]
    cells = VGroup()
    for index in range(steps):
        t = index / (steps - 1) * (len(stops) - 1)
        low = min(int(t), len(stops) - 2)
        color = interpolate_color(stops[low], stops[low + 1], t - low)
        cells.add(Rectangle(width=width / steps, height=height, fill_color=color, fill_opacity=1, stroke_width=0))
    return cells.arrange(RIGHT, buff=0)

def colormap_color(t: float, colors: Sequence[str] = VIRIDIS) -> ManimColor:
    stops = [ManimColor(color) for color in colors]
    t = min(max(t, 0.0), 1.0) * (len(stops) - 1)
    low = min(int(t), len(stops) - 2)
    return interpolate_color(stops[low], stops[low + 1], t - low)

def object_glyph(kind: str, size: float = 1.4, color: str = DATA) -> VGroup:
    rng = np.random.default_rng(7)
    half = size / 2
    if kind == "mesh":
        top = Polygon([0, half, 0], [half * 0.87, half * 0.5, 0], [0, 0, 0], [-half * 0.87, half * 0.5, 0], fill_color=color, fill_opacity=0.55, stroke_color=color, stroke_width=2)
        left = Polygon([-half * 0.87, half * 0.5, 0], [0, 0, 0], [0, -half, 0], [-half * 0.87, -half * 0.5, 0], fill_color=color, fill_opacity=0.3, stroke_color=color, stroke_width=2)
        right = Polygon([half * 0.87, half * 0.5, 0], [0, 0, 0], [0, -half, 0], [half * 0.87, -half * 0.5, 0], fill_color=color, fill_opacity=0.15, stroke_color=color, stroke_width=2)
        return VGroup(top, left, right)
    if kind == "pointcloud":
        points = rng.normal(0, 0.24, size=(70, 2)) * size
        return VGroup(*[Dot([float(np.clip(x, -half, half)), float(np.clip(y, -half, half)), 0], radius=0.035 * size, color=colormap_color(0.25 + 0.75 * (1 - min(1.0, math.hypot(x, y) / half)))) for x, y in points])
    if kind == "glyphfield":
        glyphs = VGroup()
        for row in range(4):
            for column in range(4):
                center = np.array([(column - 1.5) * size / 4, (row - 1.5) * size / 4, 0])
                angle = 0.6 * math.sin(column * 0.9 + row * 0.7) + 0.4
                direction = np.array([math.cos(angle), math.sin(angle), 0]) * size * 0.1
                glyphs.add(Arrow(center - direction, center + direction, buff=0, stroke_width=3, color=colormap_color((row + column) / 6), tip_length=0.08 * size, max_tip_length_to_length_ratio=0.5))
        return glyphs
    if kind == "nodelink":
        nodes = [np.array([x, y, 0]) * half for x, y in [(-0.75, 0.55), (0.1, 0.8), (0.8, 0.3), (-0.3, -0.1), (0.45, -0.6), (-0.8, -0.65)]]
        edges = [(0, 1), (1, 2), (0, 3), (1, 3), (3, 4), (2, 4), (3, 5)]
        graph = VGroup(*[Line(nodes[a], nodes[b], color=MUTED, stroke_width=2) for a, b in edges])
        graph.add(*[Dot(point, radius=0.07 * size, color=colormap_color(index / 5)) for index, point in enumerate(nodes)])
        return graph
    if kind == "splatfield":
        splats = VGroup()
        for index in range(9):
            x, y = rng.uniform(-0.6, 0.6, size=2) * half
            splats.add(Ellipse(width=rng.uniform(0.35, 0.7) * size, height=rng.uniform(0.15, 0.32) * size, fill_color=colormap_color(index / 8, ["#3355c6", "#8472f3", "#FF5EA8", "#FFB238"]), fill_opacity=0.35, stroke_width=0).rotate(rng.uniform(0, PI)).move_to([x, y, 0]))
        return splats
    if kind == "latticespace":
        cells = VGroup()
        for row in range(5):
            for column in range(5):
                value = 0.5 + 0.5 * math.sin(column * 0.8) * math.cos(row * 0.7)
                cells.add(Square(side_length=size / 5, fill_color=colormap_color(value), fill_opacity=0.9, stroke_color=BACKGROUND, stroke_width=1.5).move_to([(column - 2) * size / 5, (row - 2) * size / 5, 0]))
        return cells
    raise ValueError(f"Unknown object glyph: {kind}")

def value_cells(values: Sequence[int | str], color: str, cell: float = 0.62, size: float = SMALL_SIZE, fill_opacity: float = 0.12) -> VGroup:
    cells = VGroup()
    for value in values:
        square = Square(side_length=cell, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=fill_opacity)
        cells.add(VGroup(square, mono(str(value), size, TEXT).move_to(square)))
    return cells.arrange(RIGHT, buff=0)

def check_mark(color: str = ENGINE, size: float = 0.3) -> VMobject:
    return VMobject(stroke_color=color, stroke_width=5).set_points_as_corners([[-0.5 * size, 0, 0], [-0.15 * size, -0.35 * size, 0], [0.5 * size, 0.4 * size, 0]])

def cross_mark(color: str = ERROR, size: float = 0.3) -> VGroup:
    half = size * 0.42
    return VGroup(Line([-half, -half, 0], [half, half, 0], color=color, stroke_width=5), Line([-half, half, 0], [half, -half, 0], color=color, stroke_width=5))

def two_column_list(items: Sequence[str], marker: str | Sequence[str], width: int = 30, pitch: float = 0.52, split: int | None = None) -> VGroup:
    split = split if split is not None else math.ceil(len(items) / 2)
    markers = [marker] * len(items) if isinstance(marker, str) else list(marker)
    columns = VGroup()
    for start, stop in [(0, split), (split, len(items))]:
        rows = VGroup(*[bullet(item, SMALL_SIZE, TEXT, markers[index], width) for index, item in enumerate(items[start:stop], start)])
        top = 0.0
        for row in rows:
            row.shift([-row.get_left()[0], top - row[1].get_top()[1], 0])
            top -= max(pitch, row[1].height + 0.2)
        columns.add(rows)
    columns[0].align_to([SAFE_LEFT + 0.35, 0, 0], LEFT)
    columns[1].align_to([0.45, 0, 0], LEFT)
    columns[1].align_to(columns[0], UP)
    return columns

def as_animations(step: Animation | Sequence[Animation] | Callable[[], Animation | Sequence[Animation]]) -> list[Animation]:
    if inspect.isfunction(step):
        step = step()
    return list(step) if isinstance(step, (list, tuple)) else [step]

class WasmGPUVideoScene(VoiceoverScene):
    CHAPTERS: list[str] = []

    def setup(self) -> None:
        self.camera.background_color = BACKGROUND
        self.set_speech_service(KokoroService(cache_dir=str(VOICE_CACHE_DIR / type(self).__name__)))
        self.frame_chrome = chrome()
        self.heading: Text | None = None

    @property
    def spec(self) -> VideoSpec:
        return VIDEO_BY_SCENE[type(self).__name__]

    def say(self, text: str, *steps: Animation | Sequence[Animation] | Callable[[], Animation | Sequence[Animation]] | None, gap: float = LINE_GAP, max_run: float = 1.4) -> None:
        with self.voiceover(text=text) as tracker:
            slot = tracker.duration / max(1, len(steps))
            timeline: list[Animation] = []
            cursor = 0.0
            for index, step in enumerate(steps):
                if step is None:
                    continue
                if index * slot - cursor > 1e-3:
                    timeline.append(Wait(run_time=index * slot - cursor))
                    cursor = index * slot
                run_time = min(max(slot * 0.7, 0.5), max_run)
                timeline.append(AnimationGroup(*as_animations(step), run_time=run_time))
                cursor += run_time
            if tracker.duration + gap - cursor > 1e-3:
                timeline.append(Wait(run_time=tracker.duration + gap - cursor))
            self.play_frames(*timeline)
        self.check_layout(text)

    def add_sound(self, sound_file: str, time_offset: float = 0, gain: float | None = None, **kwargs: object) -> None:
        if self.renderer.skip_animations:
            return
        frames = round((self.time + time_offset) * config.frame_rate)
        self.renderer.file_writer.add_sound(sound_file, frames / config.frame_rate, gain, **kwargs)

    def play_frames(self, *timeline: Animation) -> None:
        step = 1 / config.frame_rate
        total = sum(animation.run_time for animation in timeline)
        frames = max(1, math.ceil(total / step - 1e-6))
        run_time = frames * step
        while run_time / step > frames:
            run_time = math.nextafter(run_time, 0.0)
        if run_time - total > 1e-9:
            timeline = (*timeline, Wait(run_time=run_time - total))
        self.play(Succession(*timeline), run_time=run_time)

    def check_layout(self, context: str) -> None:
        if self.heading is None:
            return
        for mobject in self.content():
            if not mobject.get_family() or all(len(member.points) == 0 for member in mobject.get_family()):
                continue
            left, bottom = mobject.get_corner(DOWN + LEFT)[:2]
            right, top = mobject.get_corner(UP + RIGHT)[:2]
            if bottom > 2.62:
                continue
            if top > CONTENT_TOP + 0.05 or bottom < SAFE_BOTTOM or left < SAFE_LEFT - 0.05 or right > SAFE_RIGHT + 0.05:
                logger.warning(f"Layout: {type(mobject).__name__} spans x [{left:.2f}, {right:.2f}], y [{bottom:.2f}, {top:.2f}] after: {context[:60]}")

    def swap_card(self, old: VGroup, new: VGroup, same_title: bool = False) -> None:
        parts = [2] if same_title else [1, 2]
        exits = AnimationGroup(*[FadeOut(old[index], shift=0.25 * UP) for index in parts])
        entries = AnimationGroup(*[FadeIn(new[index], shift=0.25 * UP) for index in parts])
        self.play_frames(AnimationGroup(exits, entries, lag_ratio=0.75, run_time=CARD_SWAP))
        self.remove(*old, *new)
        self.add(new)

    def open(self, *intro: str) -> None:
        card = title_card(self.spec)
        if self.spec == GENERAL:
            self.add(card)
        else:
            general = title_card(GENERAL)
            self.add(general)
            self.play_frames(Wait(run_time=CARD_HOLD))
            self.swap_card(general, card)
        self.play_frames(Wait(run_time=CARD_SETTLE))
        agenda = agenda_list(self.CHAPTERS)
        first, *rest = intro
        factor = min(0.7, 5.6 / card[0:2].width)
        self.say(first, None, AnimationGroup(FadeOut(card[2:]), card[0:2].animate.scale(factor).move_to([-3.45, 0.3, 0]), LaggedStart(*[FadeIn(item, shift=0.1 * RIGHT) for item in agenda], lag_ratio=0.15)), max_run=2.5)
        for line in rest:
            self.say(line)

    def content(self) -> list[Mobject]:
        return [mobject for mobject in self.mobjects if mobject is not self.frame_chrome and mobject is not self.heading]

    def clear_content(self, run_time: float = 0.6) -> None:
        outgoing = self.content()
        if outgoing:
            self.play_frames(AnimationGroup(*[FadeOut(mobject) for mobject in outgoing], run_time=run_time))

    def chapter(self, number: int | None, title: str) -> None:
        assert number is None or self.CHAPTERS[number - 1] == title, f"Chapter {number} is listed as {self.CHAPTERS[number - 1]!r} in the agenda"
        outgoing = self.content() + ([self.heading] if self.heading is not None else [])
        exits: list[Animation] = [FadeOut(mobject) for mobject in outgoing]
        if self.frame_chrome not in self.mobjects:
            exits.append(FadeIn(self.frame_chrome))
        self.heading = chapter_heading(number, title)
        timeline: list[Animation] = [AnimationGroup(*exits, run_time=0.7)] if exits else []
        self.play_frames(*timeline, FadeIn(self.heading, shift=0.25 * RIGHT, run_time=0.6), Wait(run_time=0.2))

    def finish(self, recap: Sequence[str], recap_line: str, closing_line: str) -> None:
        self.chapter(None, "Recap")
        items = bullet_list(recap, BODY_SIZE).move_to(CONTENT_CENTER)
        self.say(recap_line, LaggedStart(*[FadeIn(item, shift=0.2 * RIGHT) for item in items], lag_ratio=0.35), max_run=3.0)
        outgoing = list(self.mobjects)
        self.heading = None
        card = end_card(self.spec)
        self.play_frames(AnimationGroup(*[FadeOut(mobject) for mobject in outgoing], run_time=0.8), Wait(run_time=0.2))
        self.say(closing_line, LaggedStart(FadeIn(card[0], scale=0.9), FadeIn(card[1:]), lag_ratio=0.4), max_run=1.6, gap=CARD_HOLD)
        self.swap_card(card, title_card(GENERAL), same_title=self.spec == GENERAL)
        self.play_frames(Wait(run_time=2.0))

class TitleCardScene(Scene):
    def construct(self) -> None:
        self.camera.background_color = BACKGROUND
        self.add(title_card(VIDEO_BY_NAME[os.environ[TITLE_CARD_ENV]]))

SAMPLER_TEXT = "WasmGPU pairs a WebGPU renderer with a Rust WebAssembly driver. It imports glTF assets, sorts Gaussian splats on the GPU, and moves ndarrays between Pyodide, WGSL kernels, and f32 or f64 memory."

class VoiceSamplerScene(WasmGPUVideoScene):
    def construct(self) -> None:
        for index, voice in enumerate(SAMPLER_VOICES):
            self.set_speech_service(KokoroService(voice=voice, cache_dir=str(VOICE_CACHE_DIR / type(self).__name__)))
            accent = "British English" if voice.startswith("b") else "American English"
            gender = "female" if voice[1] == "f" else "male"
            card = VGroup(
                txt(f"Voice {index + 1} of {len(SAMPLER_VOICES)}", LABEL_SIZE, MUTED),
                mono(voice, 96, TEXT),
                txt(f"{accent} · {gender}", 30, ACCENT, SEMIBOLD),
                lines(wrap(SAMPLER_TEXT, 64), SMALL_SIZE, MUTED, align="center"),
            ).arrange(DOWN, buff=0.45).move_to(UP * 0.35)
            self.play_frames(FadeIn(card, run_time=0.5))
            self.say(SAMPLER_TEXT, gap=0.6)
            self.play_frames(FadeOut(card, run_time=0.5))

# =============================== Video: wasmgpu ===============================
# Sources: ./README.md (About, Getting Started), ./website/docs/index.md, ./package.json,
# ./ARCHITECTURE.md §1.1-§1.3 and §1.19, ./typescript/index.ts, ./typescript/core/engine.ts,
# ./typescript/core/renderer.ts, ./typescript/compute/buffer.ts, ./typescript/compute/readback.ts,
# ./mkdocs.yaml, and the eight section index pages under ./website/docs/.

LAYERS = [
    ("Public API", API, "WasmGPU class and factory surface"),
    ("WebGPU Engine", ENGINE, ""),
    ("Object & Data Model", DATA, "Scenes, objects, assets, and interop"),
    ("WebAssembly Driver", DRIVER, "Heap, frame arena, math, and culling"),
    ("Browser Resources", BROWSER, "Device, caches, buffers, and passes")
]

DOCS_SECTIONS = [
    ("Architecture", ["How the subsystems", "fit together"]),
    ("Compute", ["Kernels, pipelines,", "ndarrays, readback"]),
    ("Interaction", ["Controls, picking,", "annotation, scaling"]),
    ("Interoperability", ["Memory, Python, and", "WebGPU interop"]),
    ("Mathematics", ["Vectors, matrices,", "and quaternions"]),
    ("Objects", ["Meshes, materials,", "primitives, glTF"]),
    ("Render", ["Lifecycle, culling,", "effects, transforms"]),
    ("World", ["Scenes, cameras,", "lights, overlays"])
]

def layer_rows() -> VGroup:
    rows = VGroup()
    for index, (title, color, description) in enumerate(LAYERS):
        y = 1.95 - index * 1.06
        frame = RoundedRectangle(corner_radius=0.14, width=13.2, height=0.86, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.1).move_to([0, y, 0])
        name = txt(title, LABEL_SIZE, color, SEMIBOLD)
        name.move_to([-6.3 + name.width / 2, y, 0])
        divider = Line([-1.95, y - 0.28, 0], [-1.95, y + 0.28, 0], color=color, stroke_width=2)
        if description:
            detail = VGroup(txt(description, SMALL_SIZE, TEXT))
        else:
            detail = VGroup(chip("Renderer and tools", ENGINE, 3.8, height=0.58), chip("Compute subsystem", COMPUTE, 3.8, height=0.58)).arrange(RIGHT, buff=0.25)
        detail.move_to([-1.65 + detail.width / 2, y, 0])
        rows.add(VGroup(frame, name, divider, detail))
    return rows

def language_tile(name: str, role: str, items: Sequence[str], path: str, color: str) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.18, width=4.25, height=4.7, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.08)
    title = txt(name, 36, color, SEMIBOLD)
    subtitle = txt(role, SMALL_SIZE, MUTED)
    entries = bullet_list(items, SMALL_SIZE, TEXT, color)
    footer = mono(path, SMALL_SIZE, MUTED)
    title.move_to(frame.get_top() + DOWN * 0.6)
    subtitle.next_to(title, DOWN, buff=0.22)
    entries.next_to(subtitle, DOWN, buff=0.55).align_to(frame, LEFT).shift(RIGHT * 0.45)
    footer.move_to(frame.get_bottom() + UP * 0.5)
    return VGroup(frame, title, subtitle, entries, footer)

def docs_card(title: str, scope: Sequence[str], color: str) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.14, width=4.2, height=1.6, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.1)
    heading = txt(title, LABEL_SIZE, TEXT, SEMIBOLD)
    body = lines(scope, SMALL_SIZE, MUTED)
    play = Polygon([0, 0.12, 0], [0, -0.12, 0], [0.2, 0, 0], fill_color=color, fill_opacity=1, stroke_width=0)
    heading.move_to(frame.get_corner(UP + LEFT) + np.array([0.25 + heading.width / 2, -0.36, 0]))
    play.move_to(frame.get_corner(UP + RIGHT) + np.array([-0.32, -0.36, 0]))
    body.next_to(heading, DOWN, buff=0.16).align_to(heading, LEFT)
    return VGroup(frame, heading, body, play)

def station(title: str, detail: str, color: str, width: float = 3.4) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.14, width=width, height=1.2, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.12)
    name = txt(title, LABEL_SIZE, TEXT, SEMIBOLD)
    note = txt(detail, SMALL_SIZE, color)
    VGroup(name, note).arrange(DOWN, buff=0.16).move_to(frame)
    return VGroup(frame, name, note)

class WasmGPUVideo(WasmGPUVideoScene):
    CHAPTERS = ["Three languages", "Five layers", "One frame", "Data paths", "Rendering and computing", "The documentation", "Getting started"]

    def construct(self) -> None:
        self.open(
            "WasmGPU is a WebGPU and WebAssembly engine for scientific rendering and computing in the browser.",
            "This overview explains how it is built, and how its documentation is organized."
        )
        self.languages()
        self.layers()
        self.frame_loop()
        self.data_paths()
        self.capabilities()
        self.documentation()
        self.getting_started()
        self.finish(
            ["TypeScript engine, Rust driver, WGSL shaders", "Five layers, solid and dashed arrows", "run() resets the frame arena every frame", "Data moves through WebAssembly and GPU buffers", "Eight documentation sections"],
            "In short: three languages, five layers, a frame loop, explicit data paths, and eight documentation sections.",
            "Continue with the architecture guide, or open any section of the documentation."
        )

    def languages(self) -> None:
        self.chapter(1, "Three languages")
        tiles = VGroup(
            language_tile("TypeScript", "WebGPU engine", ["Public API", "Renderer, compute", "Interaction tools"], "./typescript/", API),
            language_tile("Rust", "WebAssembly driver", ["Heap, frame arena", "Transforms, math", "Culling, decoding"], "./rust/src/", DRIVER),
            language_tile("WGSL", "GPU shaders", ["Render passes", "Compute kernels", "Bundled as text"], "./wgsl/", BROWSER)
        ).arrange(RIGHT, buff=0.2).move_to(CONTENT_CENTER)
        self.say("WasmGPU is written in three languages, each with a distinct job.", LaggedStart(*[FadeIn(VGroup(tile[0:3], tile[4]), shift=0.2 * UP) for tile in tiles], lag_ratio=0.25), max_run=2.0)
        roles = [
            "TypeScript implements the public API and the WebGPU engine, including the renderer, compute, and interaction tools.",
            "Rust implements the WebAssembly driver, for memory, transforms, math, culling, and asset decoding.",
            "WGSL shaders do the rendering and compute work on the GPU, and are bundled into JavaScript as text."
        ]
        for tile, line in zip(tiles, roles):
            self.say(line, AnimationGroup(Indicate(tile[1], color=tile[0].get_stroke_color(), scale_factor=1.08), LaggedStart(*[FadeIn(entry, shift=0.15 * RIGHT) for entry in tile[3]], lag_ratio=0.3)), None, max_run=1.8)

    def layers(self) -> None:
        self.chapter(2, "Five layers")
        rows = layer_rows()
        self.say("The architecture is organized into five layers.", LaggedStart(*[FadeIn(row[0:3], shift=0.15 * RIGHT) for row in rows], lag_ratio=0.15), max_run=2.0)
        narration = [
            "The public API is the WasmGPU class and its factory surface.",
            "The WebGPU engine runs the frame loop, the renderer, and the interaction tools, beside the compute subsystem.",
            "The object and data model holds scenes, transforms, objects, glTF assets, and interop.",
            "The WebAssembly driver provides heap and frame-arena memory, and Rust routines for transforms, math, bounds, and culling.",
            "Browser resources are the GPU device and queue, caches, buffers, textures, and passes."
        ]
        for row, line in zip(rows, narration):
            if len(row[3]) == 2:
                self.say(line, FadeIn(row[3][0], shift=0.15 * RIGHT), FadeIn(row[3][1], shift=0.15 * RIGHT), Indicate(row[3][1], color=COMPUTE, scale_factor=1.06))
            else:
                self.say(line, AnimationGroup(FadeIn(row[3], shift=0.15 * RIGHT), row[0].animate.set_fill(opacity=0.22)), row[0].animate.set_fill(opacity=0.1))
        examples = []
        for (left, left_color), (right, right_color), dashed in [(("Frame loop", ENGINE), ("Renderer", ENGINE), False), (("Transform store", DATA), ("Transform propagation", DRIVER), True)]:
            pair = VGroup(chip(left, left_color, 2.8, wrap_at=12, height=0.9), chip(right, right_color, 2.8, wrap_at=12, height=0.9)).arrange(RIGHT, buff=1.1)
            pair.add(connect(pair[0], pair[1], TEXT, dashed=dashed))
            examples.append(pair)
        notes = [lines(["Solid arrows: creation,", "ownership, references,", "or calls"], SMALL_SIZE, TEXT), lines(["Dashed arrows: data moving", "through WebAssembly memory", "or WebGPU resources"], SMALL_SIZE, TEXT)]
        legend = VGroup(*[VGroup(example, note).arrange(RIGHT, buff=0.7) for example, note in zip(examples, notes)]).arrange(DOWN, buff=0.8, aligned_edge=LEFT).move_to(UP * 0.2)
        footnote = txt("The diagram below this video uses the same convention.", SMALL_SIZE, MUTED).next_to(legend, DOWN, buff=0.55)
        self.say("In the diagram below this video, solid arrows show creation, ownership, references, or calls.", AnimationGroup(FadeOut(rows), FadeIn(legend[0][0][0:2])), Create(legend[0][0][2]), FadeIn(legend[0][1]))
        self.say("Dashed arrows show data moving through WebAssembly memory or WebGPU resources.", FadeIn(legend[1][0][0:2]), Create(legend[1][0][2]), AnimationGroup(FadeIn(legend[1][1]), FadeIn(footnote)))

    def frame_loop(self) -> None:
        self.chapter(3, "One frame")
        code = code_panel("""
const wgpu = await WasmGPU.create(canvas, descriptor);

wgpu.run((dt, time) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
""").move_to(UP * 0.95)
        create_line = highlight(code.code_lines[0], API, 0.08)
        run_lines = highlight(code.code_lines[2:6], ENGINE, 0.08)
        tree = VGroup(*[box([label], color, width, 0.64, SMALL_SIZE, MEDIUM, font=MONO) for label, color, width in [("initWebAssembly()", DRIVER, 3.7), ("Renderer.create()", ENGINE, 3.7), ("Compute", COMPUTE, 2.3), ("PythonInterop", COMPUTE, 2.9), ("ScaleService", COMPUTE, 2.7)]])
        for node, position in zip(tree, [[-4.4, -1.2, 0], [0.0, -1.2, 0], [4.15, -1.2, 0], [2.35, -2.42, 0], [5.25, -2.42, 0]]):
            node.move_to(position)
        tree_arrows = VGroup(connect(tree[0], tree[1]), connect(tree[1], tree[2]), solid_arrow(tree[2].get_bottom(), tree[3].get_top()), solid_arrow(tree[2].get_bottom(), tree[4].get_top()))
        self.say("An application starts with WasmGPU.create, given a canvas and an optional descriptor.", FadeIn(code), Create(create_line))
        self.say(
            "It initializes WebAssembly, creates the WebGPU renderer, and builds the instance's compute, Python, and scaling services.",
            FadeIn(tree[0], shift=0.15 * UP),
            AnimationGroup(GrowArrow(tree_arrows[0]), FadeIn(tree[1], shift=0.15 * UP)),
            AnimationGroup(GrowArrow(tree_arrows[1]), FadeIn(tree[2], shift=0.15 * UP), GrowArrow(tree_arrows[2]), GrowArrow(tree_arrows[3]), FadeIn(tree[3:], shift=0.15 * UP))
        )
        self.say("Then run starts a browser animation loop.", AnimationGroup(FadeOut(VGroup(tree, tree_arrows)), ReplacementTransform(create_line, run_lines)))
        cycle = VGroup(*[box([label], color, 5.2, 0.74, SMALL_SIZE, MEDIUM, font=MONO) for label, color in [("requestAnimationFrame", MUTED), ("frameArena.reset()", DRIVER), ("callback(dt, time, wgpu)", API), ("wgpu.render(scene, camera)", ENGINE)]])
        for node, position in zip(cycle, [[-3.0, 0.9, 0], [3.0, 0.9, 0], [3.0, -1.5, 0], [-3.0, -1.5, 0]]):
            node.move_to(position)
        arrows = VGroup(connect(cycle[0], cycle[1], direction=RIGHT), connect(cycle[1], cycle[2], direction=DOWN), connect(cycle[2], cycle[3], direction=LEFT), connect(cycle[3], cycle[0], direction=UP))
        token = Dot(cycle[0].get_center(), radius=0.13, color=ACCENT).set_z_index(2)
        self.say(
            "Each frame resets the frame arena, measures the time step, and calls your callback, which usually renders a scene with a camera.",
            AnimationGroup(FadeOut(VGroup(code, run_lines)), FadeIn(cycle[0]), FadeIn(token)),
            AnimationGroup(GrowArrow(arrows[0]), FadeIn(cycle[1]), token.animate.move_to(cycle[1])),
            AnimationGroup(GrowArrow(arrows[1]), FadeIn(cycle[2]), token.animate.move_to(cycle[2])),
            AnimationGroup(GrowArrow(arrows[2]), FadeIn(cycle[3]), token.animate.move_to(cycle[3]))
        )
        stages = VGroup(*[box(wrap(label, 12), ENGINE, 2.75, 1.05, SMALL_SIZE, MEDIUM) for label in ["Update transforms", "Build draw lists", "Encode GPU passes", "Submit to the queue"]])
        stages.arrange(RIGHT, buff=0.55).move_to(DOWN * 0.6)
        stage_arrows = VGroup(*[connect(stages[index], stages[index + 1]) for index in range(3)])
        title = mono("Renderer.render(scene, camera)", LABEL_SIZE, ENGINE).next_to(stages, UP, buff=0.7)
        self.say(
            "Render updates transforms, builds draw lists, encodes the GPU passes, and submits them to the device queue.",
            AnimationGroup(GrowArrow(arrows[3]), token.animate.move_to(cycle[0])),
            AnimationGroup(FadeOut(VGroup(cycle[:3], arrows, token)), ReplacementTransform(cycle[3], title)),
            LaggedStart(*[FadeIn(stage, shift=0.15 * RIGHT) for stage in stages], *[GrowArrow(arrow) for arrow in stage_arrows], lag_ratio=0.15)
        )

    def data_paths(self) -> None:
        self.chapter(4, "Data paths")
        source = station("Typed array", "JavaScript", API, 3.2)
        memory = station("WebAssembly memory", "Rust works in place", DRIVER, 4.5)
        gpu = station("GPU buffer", "used by passes", BROWSER, 3.2)
        staging = station("Staging buffer", "mapped async", BROWSER, 3.2)
        result = station("Typed array", "JavaScript", API, 3.2)
        for node, position in [(source, [-5.0, 1.25, 0]), (memory, [0.0, 1.25, 0]), (gpu, [5.0, 1.25, 0]), (staging, [5.0, -1.65, 0]), (result, [0.0, -1.65, 0])]:
            node.move_to(position)
        upload = dashed_arrow(source.get_right(), memory.get_left(), DRIVER, buff=0.1)
        write = dashed_arrow(memory.get_right(), gpu.get_left(), BROWSER, buff=0.1)
        copy = dashed_arrow(gpu.get_bottom(), staging.get_top(), BROWSER, buff=0.1)
        read = dashed_arrow(staging.get_left(), result.get_right(), API, buff=0.1)
        labels = VGroup(
            mono("copy", SMALL_SIZE, MUTED).next_to(upload, UP, buff=0.15),
            mono("queue.writeBuffer", SMALL_SIZE, MUTED).move_to([2.82, 2.2, 0]),
            mono("copyBufferToBuffer", SMALL_SIZE, MUTED).next_to(copy, LEFT, buff=0.25),
            mono("mapAsync", SMALL_SIZE, MUTED).next_to(read, UP, buff=0.15)
        )
        packet = memory_cells(4, API, 0.22, filled=range(4)).move_to(source.get_top() + UP * 0.38).set_z_index(3)
        self.say("Data moves between JavaScript, WebAssembly, and the GPU along a few explicit paths.", FadeIn(source), FadeIn(packet))
        self.say(
            "Typed arrays are copied into WebAssembly memory, where Rust processes them, and results are read back through typed views.",
            AnimationGroup(Create(upload), FadeIn(labels[0]), FadeIn(memory)),
            packet.animate.move_to(memory.get_top() + UP * 0.38).set_color(DRIVER),
            Indicate(memory[2], color=DRIVER, scale_factor=1.1)
        )
        self.say(
            "Queue writes copy those views, or plain typed arrays, into GPU buffers that render and compute passes use.",
            AnimationGroup(Create(write), FadeIn(labels[1]), FadeIn(gpu)),
            packet.animate.move_to(gpu.get_top() + UP * 0.38).set_color(BROWSER),
            Indicate(gpu[2], color=BROWSER, scale_factor=1.1)
        )
        self.say(
            "To read results back, the GPU copies a buffer range into a staging buffer, which is mapped asynchronously and returned as a typed array.",
            AnimationGroup(Create(copy), FadeIn(labels[2]), FadeIn(staging)),
            packet.animate.move_to(staging.get_bottom() + DOWN * 0.38),
            AnimationGroup(Create(read), FadeIn(labels[3]), FadeIn(result)),
            packet.animate.move_to(result.get_bottom() + DOWN * 0.38).set_color(API)
        )

    def capabilities(self) -> None:
        self.chapter(5, "Rendering and computing")
        families = [("mesh", "Mesh"), ("pointcloud", "PointCloud"), ("glyphfield", "GlyphField"), ("nodelink", "NodeLink"), ("splatfield", "SplatField"), ("latticespace", "LatticeSpace")]
        tiles = VGroup(*[VGroup(object_glyph(kind, 1.3), mono(name, SMALL_SIZE, TEXT)).arrange(DOWN, buff=0.3) for kind, name in families])
        tiles.arrange_in_grid(rows=2, cols=3, buff=(0.5, 0.55)).move_to([-3.25, -0.55, 0])
        render_title = txt("Render", 30, DATA, SEMIBOLD).move_to([-3.35, 1.95, 0])
        divider = Line([0.1, 2.2, 0], [0.1, -2.75, 0], color=HAIRLINE, stroke_width=2)
        compute_title = txt("Compute", 30, COMPUTE, SEMIBOLD).move_to([3.4, 1.95, 0])
        compute_items = bullet_list(["WGSL pipelines and dispatch", "Built-in kernels library", "CPU and GPU ndarrays", "Asynchronous readback"], SMALL_SIZE, TEXT, COMPUTE, pitch=0.56)
        compute_items.align_to([0.85, 1.45, 0], UP + LEFT)
        interop_title = txt("Interop", LABEL_SIZE, MUTED, SEMIBOLD).move_to([3.4, -1.05, 0])
        interop = VGroup(pill("Python via Pyodide", DATA), pill("WebAssembly", DRIVER), pill("WebGPU layouts", BROWSER))
        interop[0].move_to([3.4, -1.68, 0])
        interop[1:].arrange(RIGHT, buff=0.25).move_to([3.4, -2.38, 0])
        self.say("For rendering, meshes combine geometry and materials, and five scientific primitives cover points, glyphs, graphs, Gaussian splats, and regular cells.", AnimationGroup(FadeIn(render_title), Create(divider), FadeIn(tiles[0], shift=0.2 * UP)), *[FadeIn(tile, shift=0.2 * UP) for tile in tiles[1:]])
        self.say("For computing, you write WGSL pipelines or call built-in kernels, with CPU and GPU ndarrays and asynchronous readback.", FadeIn(compute_title), *[FadeIn(item, shift=0.15 * RIGHT) for item in compute_items])
        self.say("Interop connects the engine to Python through Pyodide, to foreign WebAssembly modules, and to declarative WebGPU layouts.", FadeIn(interop_title), FadeIn(interop[0], shift=0.15 * UP), FadeIn(interop[1], shift=0.15 * UP), FadeIn(interop[2], shift=0.15 * UP))

    def documentation(self) -> None:
        self.chapter(6, "The documentation")
        colors = [BRAND[1], COMPUTE, ENGINE, DRIVER, BRAND[4], DATA, BROWSER, API]
        cards = VGroup(*[docs_card(title, scope, color) for (title, scope), color in zip(DOCS_SECTIONS, colors)])
        top, middle, bottom = VGroup(*cards[0:3]), VGroup(*cards[3:6]), VGroup(*cards[6:8])
        for row in (top, middle, bottom):
            row.arrange(RIGHT, buff=0.25)
        VGroup(top, middle, bottom).arrange(DOWN, buff=0.18).move_to(CONTENT_CENTER)
        slots = VGroup(*[RoundedRectangle(corner_radius=0.14, width=4.2, height=1.6, stroke_color=HAIRLINE, stroke_width=2).move_to(card) for card in cards])
        self.say("The documentation has eight sections, and each opens with an overview video like this one.", LaggedStart(*[Create(slot) for slot in slots], lag_ratio=0.1), max_run=2.0)
        narration = [
            "Architecture shows how the subsystems fit together. Compute covers pipelines, ndarrays, kernels, and readback.",
            "Interaction covers controls, picking, annotations, and scaling. Interoperability covers memory, Python, and WebGPU layouts.",
            "Mathematics covers vectors, matrices, and quaternions. Objects covers geometry, materials, primitives, and glTF.",
            "Render covers the lifecycle, culling, effects, and transforms. World covers scenes, cameras, lights, and overlays."
        ]
        for index, line in enumerate(narration):
            self.say(line, FadeIn(cards[2 * index], scale=0.95), FadeIn(cards[2 * index + 1], scale=0.95))

    def getting_started(self) -> None:
        self.chapter(7, "Getting started")
        install = code_panel("npm install @zushah/wasmgpu@0.10.0", "bash")
        script = code_panel('<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.10.0/\nrelease/WasmGPU.iife.min.js"></script>', "html")
        VGroup(install, script).arrange(DOWN, buff=0.35, aligned_edge=LEFT).move_to(UP * 0.6)
        example = code_panel("""
const wgpu = await WasmGPU.create(canvas, { antialias: true });
const scene = wgpu.createScene([0.05, 0.05, 0.1]);
const camera = wgpu.createCamera.perspective({ fov: 60 });
camera.transform.setPosition(-2, 2, -2);
camera.lookAt(0, 0, 0);
scene.addLight(wgpu.createLight.directional({ intensity: 1.5 }));
scene.add(wgpu.createMesh(wgpu.geometry.box(1, 1, 1),
    wgpu.material.standard({ color: [1, 0, 0] })));
wgpu.run(() => wgpu.render(scene, camera));
""").move_to(UP * 0.1)
        gallery = txt("Complete programs are in the examples gallery.", SMALL_SIZE, MUTED).next_to(example, DOWN, buff=0.3)
        self.say("WasmGPU is installed from npm, or loaded as a script from the jsDelivr CDN.", FadeIn(install, shift=0.15 * UP), FadeIn(script, shift=0.15 * UP))
        self.say("A minimal program creates the engine, a scene, a camera, a light, and a mesh, then renders inside run.", AnimationGroup(FadeOut(VGroup(install, script)), FadeIn(example)), Indicate(example.code_lines[6], color=DATA, scale_factor=1.02), Indicate(example.code_lines[8], color=ENGINE, scale_factor=1.02))
        self.say("The examples gallery shows complete programs built with these APIs.", FadeIn(gallery))

# ============================ Video: architecture =============================
# Sources: ./ARCHITECTURE.md §1 (diagram labels and edges from §1.1), ./website/docs/architecture/index.md,
# ./typescript/core/engine.ts, ./typescript/core/renderer.ts, ./typescript/core/drawlists.ts,
# ./typescript/core/resources.ts, ./typescript/core/transform.ts, ./rust/src/transform.rs,
# ./typescript/wasm/driver.ts, ./rust/src/frame_arena.rs, ./typescript/compute/ndarray.ts,
# ./typescript/world/pointcloud.ts, ./typescript/scaling/service.ts, ./typescript/gltf/loader.ts,
# ./typescript/gltf/import.ts, ./typescript/python/index.ts, ./esbuild.config.js, and ./wgsl/.

DIAGRAM = [
    ("Public API", API, ["User Application", f"WasmGPU v{VERSION}", "Factory surface"]),
    ("WebGPU Engine", ENGINE, ["Frame loop", "Renderer", "Effects facade", "Scaling service", "Overlay framework", "Annotation toolkit", "Picking utility", "Compute subsystem", "Buffer resource manager", "Pipeline controller", "Dispatch workgroup planner", "Kernels library", "N-dimensional array model for CPU & GPU memory", "Asynchronous readback ring", "Scratch buffer pool"]),
    ("Object & Data Model", DATA, ["Scene", "Transform store in SoA memory", "Mesh with geometry, material, texture, morphing, & skinning", "Pointcloud, glyphfield, nodelink, splatfield, & latticespace", "Colormapping", "Skinning instance data", "Annotation store", "Loader for glTF 2.0 asset data", "Accessor decoding & data conversion", "Importer from asset data to scene resources", "Imported nodes, metadata, variants, cameras, & lights", "WebGPU interop", "WebAssembly interop", "Python interop"]),
    ("WebAssembly Driver", DRIVER, ["Heap allocation for persistent typed memory", "Frame arena for transient typed memory", "Transform propagation", "Matrix, vector, & quaternion mathematics", "N-dimensional array indexing & stride-offsetting", "Mesh normal generation", "glTF accessor decoding, sparse patching, & numeric conversion", "Animation sampling & joint matrix generation", "Bounds computation", "Frustum culling"]),
    ("Browser Resources", BROWSER, ["Graphics device & queue", "Pipeline cache & bindgroup cache", "Buffers, textures, & samplers", "Render passes for opaques, transparents, transmissions, effects, post-processing, & interaction", "Compute passes for kernels"])
]
FACTORY_SURFACE = "scene, camera, controls, light, effects, geometry, material, texture, mesh, pointcloud, glyphfield, nodelink, splatfield, latticespace, asset import, animation, overlay, annotation, interop"

def diagram_map() -> VGroup:
    columns = VGroup()
    for title, color, nodes in DIAGRAM:
        frame = RoundedRectangle(corner_radius=0.16, width=2.45, height=4.9, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.08)
        name = lines(wrap(title, 11), SMALL_SIZE, color, SEMIBOLD, align="center").move_to(frame.get_top() + DOWN * 0.55)
        pips = VGroup(*[RoundedRectangle(corner_radius=0.05, width=0.9, height=0.17, stroke_width=0, fill_color=COMPUTE if color == ENGINE and index >= 7 else color, fill_opacity=0.85) for index in range(len(nodes))])
        pips.arrange_in_grid(cols=2, buff=(0.14, 0.13)).next_to(name, DOWN, buff=0.35)
        count = txt(f"{len(nodes)} nodes", SMALL_SIZE, MUTED).move_to(frame.get_bottom() + UP * 0.4)
        columns.add(VGroup(frame, name, pips, count))
    return columns.arrange(RIGHT, buff=0.22).move_to(CONTENT_CENTER)

def focus_title(index: int) -> VGroup:
    title, color, nodes = DIAGRAM[index]
    name = txt(title, LABEL_SIZE, color, SEMIBOLD)
    count = txt(f"{len(nodes)} nodes", SMALL_SIZE, MUTED).next_to(name, RIGHT, buff=0.35)
    return VGroup(name, count).move_to([SAFE_RIGHT - 1.4, HEADING_Y, 0], aligned_edge=RIGHT)

def stage_box(number: int, title: str, items: Sequence[str]) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.16, width=6.4, height=2.45, stroke_color=ENGINE, stroke_width=3, fill_color=ENGINE, fill_opacity=0.08)
    heading = Text(f"{number}  {title}", font=FONT, font_size=LABEL_SIZE, color=TEXT, weight=SEMIBOLD, t2c={"[0:1]": ENGINE}, disable_ligatures=True)
    heading.move_to(frame.get_corner(UP + LEFT) + np.array([0.3 + heading.width / 2, -0.38, 0]))
    entries = bullet_list(items, SMALL_SIZE, TEXT, ENGINE, pitch=0.5).next_to(heading, DOWN, buff=0.28).align_to(heading, LEFT).shift(RIGHT * 0.4)
    return VGroup(frame, heading, entries)

def ownership_panel(title: str, owned: bool) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.16, width=6.2, height=3.3, stroke_color=HAIRLINE, stroke_width=2, fill_color=PANEL, fill_opacity=1)
    heading = (mono(title, LABEL_SIZE, DATA) if owned else txt(title, LABEL_SIZE, MUTED, SEMIBOLD)).move_to(frame.get_top() + DOWN * 0.45)
    buffer = chip("caller GPUBuffer", BROWSER, 3.2)
    holder = chip("PointCloud", DATA, 2.2)
    VGroup(buffer, holder).arrange(RIGHT, buff=0.55).move_to(frame.get_center() + UP * 0.05)
    link = connect(holder, buffer, MUTED, direction=LEFT)
    result = txt("destroy() frees it" if owned else "destroy() leaves it alive", SMALL_SIZE, ERROR if owned else ENGINE).move_to(frame.get_bottom() + UP * 0.5)
    return VGroup(frame, heading, buffer, holder, link, result)

class ArchitectureVideo(WasmGPUVideoScene):
    CHAPTERS = ["The diagram", "Runtime creation", "The render path", "Memory and ownership", "Compute and scaling", "Assets and interop", "Shaders and invariants"]

    def construct(self) -> None:
        self.open("This video walks through the implemented architecture of WasmGPU, following the diagram and the sections on this page.")
        self.diagram()
        self.runtime()
        self.render_path()
        self.memory()
        self.compute_and_scaling()
        self.assets_and_interop()
        self.shaders_and_invariants()
        self.finish(
            ["Five subgraphs, forty-seven nodes", "A four-stage render path", "Explicit memory lifetimes and ownership", "Kernel-based scaling, atomic glTF import", "WGSL layouts match TypeScript packing"],
            "To recap: five subgraphs, a four-stage render path, explicit memory ownership, kernel-based scaling, and atomic imports.",
            "Each subsystem is covered in depth by its own section of the documentation."
        )

    def diagram(self) -> None:
        self.chapter(1, "The diagram")
        columns = diagram_map()
        self.say("The diagram groups forty-seven nodes into five subgraphs, from the public API to browser resources.", LaggedStart(*[FadeIn(column, shift=0.2 * UP) for column in columns], lag_ratio=0.2), max_run=2.5)
        chain = VGroup(*[chip(label, API, 3.4, LABEL_SIZE) for label in DIAGRAM[0][2]]).arrange(RIGHT, buff=0.9).move_to(UP * 1.1)
        chain_arrows = VGroup(connect(chain[0], chain[1], TEXT), connect(chain[1], chain[2], TEXT))
        factories = lines(wrap(FACTORY_SURFACE, 58), SMALL_SIZE, MUTED, align="center").next_to(chain, DOWN, buff=0.6)
        factory_link = DashedLine(chain[2].get_bottom(), factories.get_top() + RIGHT * 4.0 + UP * 0.05, dash_length=0.08, color=API, stroke_width=2)
        title = focus_title(0)
        self.say(
            "The public API is where the application creates the WasmGPU runtime and its factory surface.",
            AnimationGroup(FadeOut(columns), FadeIn(title)),
            AnimationGroup(FadeIn(chain[0]), GrowArrow(chain_arrows[0]), FadeIn(chain[1])),
            AnimationGroup(GrowArrow(chain_arrows[1]), FadeIn(chain[2]), Create(factory_link), FadeIn(factories))
        )
        narration = [
            "The WebGPU engine holds the renderer and the interaction tools, plus the compute subsystem and its parts.",
            "The object and data model holds scenes, transforms, objects, the glTF pipeline, and interop.",
            "The WebAssembly driver provides heap and frame-arena memory, and Rust routines for the engine's hot paths.",
            "Browser resources are the device, queue, caches, buffers, textures, and passes."
        ]
        previous: list[Mobject] = [title, chain, chain_arrows, factories, factory_link]
        for index, line in enumerate(narration, start=1):
            name, color, nodes = DIAGRAM[index]
            markers = [COMPUTE if index == 1 and position >= 7 else color for position in range(len(nodes))]
            split = 8 if index == 1 else None
            listing = two_column_list(nodes, markers, split=split)
            listing.align_to([0, 2.3, 0], UP)
            heading = focus_title(index)
            halves = [listing[0], listing[1]]
            self.say(line, AnimationGroup(*[FadeOut(mobject) for mobject in previous], FadeIn(heading)), LaggedStart(*[FadeIn(row, shift=0.1 * RIGHT) for row in halves[0]], lag_ratio=0.12), LaggedStart(*[FadeIn(row, shift=0.1 * RIGHT) for row in halves[1]], lag_ratio=0.12), max_run=2.2)
            previous = [heading, listing]
        edges = [
            ((f"WasmGPU v{VERSION}", API), ("Factory surface", API), False),
            (("Frame loop", ENGINE), ("Renderer", ENGINE), False),
            (("Compute subsystem", COMPUTE), ("Kernels library", COMPUTE), False),
            (("Transform store in SoA memory", DATA), ("Transform propagation", DRIVER), True),
            (("Renderer", ENGINE), ("Frame arena for transient typed memory", DRIVER), True)
        ]
        rows = VGroup()
        for (left, left_color), (right, right_color), dashed in edges:
            pair = VGroup(chip(left, left_color, 4.6, wrap_at=24, height=0.62 if len(left) <= 24 else 0.92), chip(right, right_color, 4.6, wrap_at=24, height=0.62 if len(right) <= 24 else 0.92)).arrange(RIGHT, buff=1.6)
            pair.add(connect(pair[0], pair[1], TEXT, dashed=dashed))
            rows.add(pair)
        rows.arrange(DOWN, buff=0.22).move_to(DOWN * 0.15)
        rows[3:].shift(DOWN * 0.15)
        kinds = VGroup(txt("solid", SMALL_SIZE, MUTED).next_to(rows[0][2], UP, buff=0.12), txt("dashed", SMALL_SIZE, MUTED).next_to(rows[3][2], UP, buff=0.12))
        self.say(
            "Solid edges carry structure: the runtime creates the factory surface, the frame loop drives the renderer, and compute owns its kernels.",
            AnimationGroup(*[FadeOut(mobject) for mobject in previous]),
            AnimationGroup(FadeIn(rows[0][0:2]), GrowArrow(rows[0][2]), FadeIn(kinds[0])),
            AnimationGroup(FadeIn(rows[1][0:2]), GrowArrow(rows[1][2])),
            AnimationGroup(FadeIn(rows[2][0:2]), GrowArrow(rows[2][2]))
        )
        self.say(
            "Dashed edges carry data, such as transform records flowing to Rust propagation.",
            AnimationGroup(FadeIn(rows[3][0:2]), Create(rows[3][2]), FadeIn(kinds[1])),
            AnimationGroup(FadeIn(rows[4][0:2]), Create(rows[4][2]))
        )

    def runtime(self) -> None:
        self.chapter(2, "Runtime creation")
        steps = [("WasmGPU.create()", API, ""), ("initWebAssembly()", DRIVER, "driver module and 8 MiB frame arena"), ("Renderer.create()", ENGINE, "adapter, device, queue, and context"), ("new Compute()", COMPUTE, "binds PythonInterop and ScaleService")]
        boxes = VGroup(*[box([label], color, 3.9, 0.66, SMALL_SIZE, MEDIUM, font=MONO) for label, color, _ in steps])
        for index, node in enumerate(boxes):
            node.move_to([-4.45, 1.85 - index * 1.38, 0])
        arrows = VGroup(*[solid_arrow(boxes[index].get_bottom(), boxes[index + 1].get_top()) for index in range(3)])
        notes = VGroup(*[txt(note, SMALL_SIZE, color).next_to(boxes[index], RIGHT, buff=0.45) for index, (_, color, note) in enumerate(steps) if note])
        self.say(
            "WasmGPU.create initializes WebAssembly and the frame arena, then creates the renderer with its adapter, device, queue, and canvas context.",
            FadeIn(boxes[0]),
            AnimationGroup(GrowArrow(arrows[0]), FadeIn(boxes[1]), FadeIn(notes[0])),
            AnimationGroup(GrowArrow(arrows[1]), FadeIn(boxes[2]), FadeIn(notes[1]))
        )
        self.say("It then builds the compute subsystem on that device, and binds Python interop and the scaling service to it.", AnimationGroup(GrowArrow(arrows[2]), FadeIn(boxes[3])), FadeIn(notes[2]))
        teardown = VGroup(*[mono(f"{index + 1}. {label}", SMALL_SIZE, TEXT) for index, label in enumerate(["stop()", "destroyPerformanceStats()", "scale.clearCache()", "compute.destroy()", "renderer.destroy()"])]).arrange(DOWN, buff=0.28, aligned_edge=LEFT)
        effects_note = txt("including the effects facade", SMALL_SIZE, MUTED).next_to(teardown[-1], DOWN, buff=0.2).align_to(teardown[-1], LEFT).shift(RIGHT * 0.45)
        panel = RoundedRectangle(corner_radius=0.16, width=6.0, height=teardown.height + effects_note.height + 1.55, stroke_color=HAIRLINE, stroke_width=2, fill_color=PANEL, fill_opacity=1)
        panel_title = mono("wgpu.destroy()", LABEL_SIZE, ERROR)
        panel.move_to([3.5, -0.1, 0])
        panel_title.move_to(panel.get_top() + DOWN * 0.45)
        VGroup(teardown, effects_note).next_to(panel_title, DOWN, buff=0.35).align_to(panel, LEFT).shift(RIGHT * 0.5)
        self.say(
            "Destroy stops the loop, clears the scaling cache, and destroys compute, then the renderer and its effects.",
            AnimationGroup(FadeOut(notes), FadeIn(panel), FadeIn(panel_title)),
            LaggedStart(*[FadeIn(entry, shift=0.1 * RIGHT) for entry in teardown], lag_ratio=0.25),
            FadeIn(effects_note)
        )

    def render_path(self) -> None:
        self.chapter(3, "The render path")
        stages = VGroup(
            stage_box(1, "Prepare", ["Resize render targets", "Stage frame-arena records", "Update dirty transforms"]),
            stage_box(2, "Gather", ["Prepare shadow views", "Write camera, light uniforms", "Build frustum-culled lists"]),
            stage_box(3, "Pack and filter", ["Pack model matrices", "Record culling stats", "Optional occlusion filter"]),
            stage_box(4, "Encode and submit", ["Shadow layers, GPU sorts", "Opaque, transparent, SMAA", "Submit the command buffer"])
        )
        for stage, position in zip(stages, [[-3.35, 1.2, 0], [3.35, 1.2, 0], [-3.35, -1.4, 0], [3.35, -1.4, 0]]):
            stage.move_to(position)
        token = Dot(stages[0][0].get_corner(UP + RIGHT) + np.array([-0.35, -0.38, 0]), radius=0.12, color=ACCENT).set_z_index(3)
        corners = [stage[0].get_corner(UP + RIGHT) + np.array([-0.35, -0.38, 0]) for stage in stages]
        lines_ = [
            "Each call to render runs four stages. First it stages records in the frame arena, and updates dirty transforms in Rust.",
            "Then it prepares shadows, writes uniforms, and builds frustum-culled draw lists for every object family.",
            "Next it packs model matrices in one Rust call, and can filter hidden opaque objects with the previous frame's depth hierarchy.",
            "Finally it encodes shadows, GPU sorts, and the main passes, then submits them."
        ]
        for index, (stage, line) in enumerate(zip(stages, lines_)):
            first = AnimationGroup(FadeIn(stage[0:2]), FadeIn(token) if index == 0 else token.animate.move_to(corners[index]))
            self.say(line, first, LaggedStart(*[FadeIn(entry, shift=0.1 * RIGHT) for entry in stage[2]], lag_ratio=0.3), max_run=1.8)

    def memory(self) -> None:
        self.chapter(4, "Memory and ownership")
        arrays = [("positions", 3, DATA), ("rotations", 4, DATA), ("scales", 3, DATA), ("local matrices", 16, DRIVER), ("world matrices", 16, DRIVER), ("parents", 1, MUTED)]
        unit = 0.12
        rows = VGroup()
        for row_index, (name, floats, color) in enumerate(arrays):
            y = 1.85 - row_index * 0.66
            label = mono(name, SMALL_SIZE, MUTED).move_to([-6.3, y, 0], aligned_edge=LEFT)
            slots = VGroup()
            for slot in range(4):
                block = Rectangle(width=floats * unit, height=0.36, stroke_color=color, stroke_width=1.5, fill_color=color, fill_opacity=0.65 if slot == 2 else 0.15)
                slots.add(block)
            slots.arrange(RIGHT, buff=0.06).move_to([-2.9, y, 0], aligned_edge=LEFT)
            rows.add(VGroup(label, slots))
        index_label = txt("index 2 selects one Transform in every array", SMALL_SIZE, ACCENT).move_to([0, -2.35, 0])
        self.say(
            "Transforms live in a structure-of-arrays store in WebAssembly memory, with separate arrays for positions, rotations, scales, matrices, and parents.",
            LaggedStart(*[FadeIn(row, shift=0.1 * RIGHT) for row in rows[:3]], lag_ratio=0.3),
            LaggedStart(*[FadeIn(row, shift=0.1 * RIGHT) for row in rows[3:]], lag_ratio=0.3),
            FadeIn(index_label)
        )
        bar = Rectangle(width=11.0, height=0.7, stroke_color=DRIVER, stroke_width=3, fill_color=DRIVER, fill_opacity=0.06).move_to(UP * 0.95)
        bar_label = txt("frame arena", LABEL_SIZE, DRIVER, SEMIBOLD).next_to(bar, UP, buff=0.2).align_to(bar, LEFT)
        capacity = mono("8 MiB", SMALL_SIZE, MUTED).next_to(bar, UP, buff=0.22).align_to(bar, RIGHT)
        epoch = mono("epoch 7", SMALL_SIZE, TEXT).next_to(capacity, LEFT, buff=0.6)
        widths = [1.2, 1.9, 1.4, 0.9]
        allocations = VGroup(*[Rectangle(width=width, height=0.56, stroke_width=0, fill_color=color, fill_opacity=0.7) for width, color in zip(widths, [API, ENGINE, DATA, COMPUTE])]).arrange(RIGHT, buff=0.05)
        allocations.move_to(bar.get_left() + RIGHT * (allocations.width / 2 + 0.07))
        head = Polygon([0, 0, 0], [-0.13, -0.22, 0], [0.13, -0.22, 0], fill_color=TEXT, fill_opacity=1, stroke_width=0)
        head.move_to(bar.get_left() + DOWN * 0.48)
        head_end = allocations.get_right()[0] + 0.03
        slice_chip = chip("slice from epoch 7", ENGINE, 3.4).move_to([-3.4, -0.55, 0])
        slice_link = DashedLine(slice_chip.get_top(), allocations[1].get_bottom(), dash_length=0.07, color=ENGINE, stroke_width=2)
        stale = VGroup(chip("slice from epoch 7", ERROR, 3.4), txt("rejected", SMALL_SIZE, ERROR)).arrange(RIGHT, buff=0.3)
        stale.move_to(slice_chip, aligned_edge=LEFT)
        new_epoch = mono("epoch 8", SMALL_SIZE, ACCENT).move_to(epoch)
        self.say(
            "The frame arena is an eight mebibyte bump allocator. Each reset rewinds it and advances its epoch, so stale slices are rejected.",
            AnimationGroup(FadeOut(rows), FadeOut(index_label), FadeIn(VGroup(bar, bar_label, capacity, epoch, head))),
            AnimationGroup(LaggedStart(*[FadeIn(block) for block in allocations], lag_ratio=0.3), head.animate.set_x(head_end), FadeIn(slice_chip), Create(slice_link)),
            AnimationGroup(FadeOut(allocations), head.animate.set_x(bar.get_left()[0]), Transform(epoch, new_epoch)),
            AnimationGroup(FadeOut(slice_link), Transform(slice_chip, stale[0]), FadeIn(stale[1]))
        )
        heap = Rectangle(width=6.0, height=0.6, stroke_color=DRIVER, stroke_width=3, fill_color=DRIVER, fill_opacity=0.06).move_to([2.55, -1.75, 0])
        heap_label = mono("WasmHeapArena", SMALL_SIZE, DRIVER).next_to(heap, UP, buff=0.18).align_to(heap, LEFT)
        heap_blocks = VGroup(*[Rectangle(width=width, height=0.46, stroke_width=0, fill_color=DRIVER, fill_opacity=0.6) for width in [1.0, 1.6, 0.8]]).arrange(RIGHT, buff=0.05)
        heap_blocks.move_to(heap.get_left() + RIGHT * (heap_blocks.width / 2 + 0.07))
        heap_note = txt("reset() or destroy()", SMALL_SIZE, MUTED).next_to(heap, DOWN, buff=0.18).align_to(heap, LEFT)
        crosses = VGroup(*[cross_mark(ERROR, 0.32).move_to(block) for block in heap_blocks])
        self.say(
            "Heap arenas bump-allocate inside one heap block, and their slices expire on reset or destroy.",
            AnimationGroup(FadeOut(VGroup(slice_chip, stale[1])), FadeIn(VGroup(heap, heap_label))),
            LaggedStart(*[FadeIn(block) for block in heap_blocks], lag_ratio=0.3),
            AnimationGroup(FadeIn(heap_note), LaggedStart(*[Create(cross) for cross in crosses], lag_ratio=0.2))
        )
        borrowed = ownership_panel("Default: borrowed", False)
        owned = ownership_panel("ownBuffers: true", True)
        VGroup(borrowed, owned).arrange(RIGHT, buff=0.4).move_to(UP * 0.45)
        ndarray_note = VGroup(mono("GPUndarray", SMALL_SIZE, COMPUTE), txt("destroys only the buffers it owns, never wrapped ones", SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.25).move_to(DOWN * 1.95)
        self.say(
            "Scientific primitives borrow caller-supplied GPU buffers unless created with ownBuffers set to true, and a GPUndarray destroys only buffers it owns.",
            AnimationGroup(FadeOut(VGroup(bar, bar_label, capacity, epoch, head, heap, heap_label, heap_blocks, heap_note, crosses)), FadeIn(borrowed)),
            FadeIn(owned),
            FadeIn(ndarray_note)
        )
        header = VGroup(txt("Domain", SMALL_SIZE, MUTED, SEMIBOLD), mono("f32", SMALL_SIZE, MUTED), mono("f64", SMALL_SIZE, MUTED))
        domains = [("CPU ndarrays and WebAssembly memory", True), ("GPU storage, upload, and readback", True), ("WGSL shader arithmetic", False)]
        table = VGroup()
        for row_index, (label, f64) in enumerate([("", True)] + domains):
            y = 1.6 - row_index * 0.95
            cells = VGroup(header[0].copy() if row_index == 0 else txt(label, LABEL_SIZE, TEXT), header[1].copy() if row_index == 0 else check_mark(ENGINE, 0.34), header[2].copy() if row_index == 0 else (check_mark(ENGINE, 0.34) if f64 else cross_mark(ERROR, 0.34)))
            cells[0].move_to([-6.0, y, 0], aligned_edge=LEFT)
            cells[1].move_to([2.6, y, 0])
            cells[2].move_to([4.6, y, 0])
            table.add(cells)
        rules = VGroup(*[Line([-6.2, 1.6 - index * 0.95 - 0.47, 0], [5.4, 1.6 - index * 0.95 - 0.47, 0], color=HAIRLINE, stroke_width=2) for index in range(3)])
        self.say(
            "Precision follows the domain: f64 works in CPU and WebAssembly memory and in GPU storage, but WGSL has no f64 arithmetic.",
            AnimationGroup(FadeOut(VGroup(borrowed, owned, ndarray_note)), FadeIn(table[0]), Create(rules)),
            AnimationGroup(FadeIn(table[1]), FadeIn(table[2])),
            FadeIn(table[3])
        )

    def compute_and_scaling(self) -> None:
        self.chapter(5, "Compute and scaling")
        parts = VGroup(*[chip(label, COMPUTE, 3.0, wrap_at=14, height=0.88) for label in ["Storage buffers", "Uniform buffers", "Pipelines and bind groups", "Dispatch and workgroups", "Kernels library", "CPU and GPU ndarrays", "Scratch buffer pool", "Readback ring"]])
        parts.arrange_in_grid(rows=4, cols=2, buff=(0.25, 0.22)).move_to([-3.35, -0.25, 0])
        chain = VGroup(*[box([label], DATA if index < 4 else COMPUTE, 5.0, 0.56, SMALL_SIZE, MEDIUM) for index, label in enumerate(["Extract finite f32 values", "Compact", "Minimum and maximum", "Histogram for percentiles", "Asynchronous readback"])])
        chain.arrange(DOWN, buff=0.24).move_to([3.4, -0.1, 0])
        chain_arrows = VGroup(*[solid_arrow(chain[index].get_bottom(), chain[index + 1].get_top(), buff=0.03) for index in range(4)])
        cache = txt("cached by source, revision, settings", SMALL_SIZE, MUTED).next_to(chain, DOWN, buff=0.3)
        title = mono("wgpu.scale", LABEL_SIZE, DATA).next_to(chain, UP, buff=0.25)
        self.say(
            "The compute subsystem wraps buffers, pipelines, dispatch, kernels, ndarrays, scratch pools, and readback rings.",
            LaggedStart(*[FadeIn(part, shift=0.1 * UP) for part in parts[:4]], lag_ratio=0.2),
            LaggedStart(*[FadeIn(part, shift=0.1 * UP) for part in parts[4:]], lag_ratio=0.2)
        )
        self.say(
            "The scaling service chains those kernels: it extracts finite values, compacts them, finds the range, and builds a histogram for percentiles.",
            AnimationGroup(FadeIn(title), FadeIn(chain[0])),
            AnimationGroup(GrowArrow(chain_arrows[0]), FadeIn(chain[1])),
            AnimationGroup(GrowArrow(chain_arrows[1]), FadeIn(chain[2])),
            AnimationGroup(GrowArrow(chain_arrows[2]), FadeIn(chain[3])),
            AnimationGroup(GrowArrow(chain_arrows[3]), FadeIn(chain[4]), FadeIn(cache))
        )

    def assets_and_interop(self) -> None:
        self.chapter(6, "Assets and interop")
        flow = VGroup(*[box(label, DATA, 3.7, 1.1, SMALL_SIZE, MEDIUM) for label in [["load", ".gltf or .glb"], ["decode accessors", "TypeScript and Rust"], ["import", "scene resources"]]])
        flow.arrange(RIGHT, buff=0.85).move_to(UP * 1.55)
        flow_arrows = VGroup(connect(flow[0], flow[1]), connect(flow[1], flow[2]))
        ledger = VGroup(*[chip(label, DATA, 2.5) for label in ["transform", "geometry ref", "material ref", "scene insert", "light binding"]]).arrange(RIGHT, buff=0.12).move_to(DOWN * 0.45)
        ledger_label = txt("ownership transaction", SMALL_SIZE, MUTED).next_to(ledger, UP, buff=0.25).align_to(ledger, LEFT)
        error = VGroup(cross_mark(ERROR, 0.36), txt("error", SMALL_SIZE, ERROR)).arrange(RIGHT, buff=0.15).next_to(ledger, DOWN, buff=0.35).align_to(ledger, RIGHT)
        rollback = Arrow(ledger.get_right() + DOWN * 1.25, ledger.get_left() + DOWN * 1.25, buff=0, color=ERROR, stroke_width=3, tip_length=0.2, max_tip_length_to_length_ratio=0.05)
        rollback_label = txt("rollback in reverse order", SMALL_SIZE, ERROR).next_to(rollback, DOWN, buff=0.15)
        self.say(
            "glTF loading reads JSON or binary GLB sources, decodes accessors in TypeScript and Rust, and imports the result into scene resources.",
            FadeIn(flow[0]),
            AnimationGroup(GrowArrow(flow_arrows[0]), FadeIn(flow[1])),
            AnimationGroup(GrowArrow(flow_arrows[1]), FadeIn(flow[2]))
        )
        self.say(
            "Import is failure-atomic: every acquisition is registered in a transaction, and an error rolls everything back in reverse order.",
            AnimationGroup(FadeIn(ledger_label), LaggedStart(*[FadeIn(entry, shift=0.1 * RIGHT) for entry in ledger], lag_ratio=0.3)),
            FadeIn(error),
            AnimationGroup(GrowArrow(rollback), FadeIn(rollback_label), LaggedStart(*[FadeOut(entry) for entry in reversed(ledger)], lag_ratio=0.3))
        )
        tiles = VGroup()
        for name, color, items in [("Python", DATA, ["Pyodide buffers", "Canonical ndarrays", "Released once"]), ("WebAssembly", DRIVER, ["Foreign instances", "Validated views", "Always borrowed"]), ("WebGPU", BROWSER, ["Declarative layouts", "Binding resources", "Schedules no work"])]:
            frame = RoundedRectangle(corner_radius=0.16, width=4.3, height=3.3, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.08)
            title = txt(name, 30, color, SEMIBOLD).move_to(frame.get_top() + DOWN * 0.5)
            entries = bullet_list(items, SMALL_SIZE, TEXT, color, pitch=0.55).next_to(title, DOWN, buff=0.45).align_to(frame, LEFT).shift(RIGHT * 0.45)
            tiles.add(VGroup(frame, title, entries))
        tiles.arrange(RIGHT, buff=0.15).move_to(CONTENT_CENTER)
        self.say(
            "Interop copies Pyodide buffers into canonical ndarrays, validates views over foreign WebAssembly memory, and describes WebGPU layouts without scheduling work.",
            AnimationGroup(FadeOut(VGroup(flow, flow_arrows, ledger_label, error, rollback, rollback_label)), FadeIn(tiles[0])),
            FadeIn(tiles[1]),
            FadeIn(tiles[2])
        )

    def shaders_and_invariants(self) -> None:
        self.chapter(7, "Shaders and invariants")
        root = mono("./wgsl/", LABEL_SIZE, BROWSER).move_to([-5.9, 1.95, 0], aligned_edge=LEFT)
        folders = [("core/", "SMAA, picking, and occlusion"), ("effects/", "shadow casters and receivers"), ("graphics/", "materials, transmission, mipmaps"), ("world/", "scientific primitives and sorting"), ("compute/", "kernels, scaling, and blitting")]
        tree = VGroup()
        for index, (folder, description) in enumerate(folders):
            y = 1.2 - index * 0.72
            branch = VGroup(Line([-5.75, y + 0.36, 0], [-5.75, y, 0], color=HAIRLINE, stroke_width=2), Line([-5.75, y, 0], [-5.35, y, 0], color=HAIRLINE, stroke_width=2))
            name = mono(folder, SMALL_SIZE, TEXT).move_to([-5.15, y, 0], aligned_edge=LEFT)
            note = txt(description, SMALL_SIZE, MUTED).move_to([-2.6, y, 0], aligned_edge=LEFT)
            tree.add(VGroup(branch, name, note))
        bundle = txt("imported as text and minified into the JavaScript bundle", SMALL_SIZE, ACCENT).move_to([0, -2.4, 0])
        self.say("WGSL lives in five directories, and is minified into the bundle as text.", FadeIn(root), LaggedStart(*[FadeIn(row, shift=0.1 * RIGHT) for row in tree], lag_ratio=0.2), FadeIn(bundle), max_run=1.8)
        invariants = bullet_list(["Frame-arena slices are valid only for their epoch", "Transforms update before world matrices are read", "Picking and warmup never use occlusion filtering", "Uniform layouts match TypeScript packing and WGSL"], 30, TEXT, ACCENT, pitch=0.85).move_to(CONTENT_CENTER)
        self.say(
            "A few invariants hold everywhere: frame-arena slices are valid only for their epoch, and transforms update before draw lists read world matrices.",
            AnimationGroup(FadeOut(VGroup(root, tree, bundle)), FadeIn(invariants[0], shift=0.1 * RIGHT)),
            FadeIn(invariants[1], shift=0.1 * RIGHT)
        )
        self.say("Picking and warmup never use occlusion filtering, and shader uniform layouts must match the TypeScript packing code.", FadeIn(invariants[2], shift=0.1 * RIGHT), FadeIn(invariants[3], shift=0.1 * RIGHT))

# ============================== Video: compute ===============================
# Sources: ./typescript/compute/index.ts, ./typescript/compute/buffer.ts, ./typescript/compute/pipeline.ts,
# ./typescript/compute/dispatch.ts, ./typescript/compute/workgroups.ts, ./typescript/compute/ndarray.ts,
# ./typescript/compute/kernels.ts, ./typescript/compute/readback.ts, ./typescript/compute/blit.ts,
# ./wgsl/compute/reduce-sum-f32.wgsl, ./wgsl/compute/matmul-f32.wgsl, ./wgsl/compute/sort-radix-flags-u32.wgsl,
# ./website/docs/compute/*.md (examples for createPipeline and dispatch1D), and ./ARCHITECTURE.md §1.13.

KERNEL_FAMILIES = [
    ("Element-wise", ["addF32", "subF32", "mulF32", "sclF32", "axpyF32", "dotF32"]),
    ("Linear algebra", ["gemmF32", "luFactorF32Batched", "luSolveF32Batched"]),
    ("Reductions", ["sumF32", "minF32", "maxF32", "reduceF32", "argReduceF32"]),
    ("Primitives", ["scanExclusiveU32", "compactF32", "histogramF32"]),
    ("Sorting", ["radixSortKeysU32", "radixSortPairsU32"]),
    ("Scaling, copy", ["extractScaleValuesF32", "remapScaleF32", "copyF32"])
]

def buffer_card(title: str, call: str, flags: Sequence[str], note: str, color: str) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.16, width=6.3, height=3.3, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.08)
    name = txt(title, 30, color, SEMIBOLD).move_to(frame.get_corner(UP + LEFT) + np.array([0.3, -0.45, 0]), aligned_edge=LEFT)
    method = mono(call, SMALL_SIZE, MUTED).next_to(name, DOWN, buff=0.2).align_to(name, LEFT)
    chips = VGroup(*[pill(flag, color, SMALL_SIZE, MONO) for flag in flags]).arrange(RIGHT, buff=0.15).next_to(method, DOWN, buff=0.35).align_to(name, LEFT)
    remark = txt(note, SMALL_SIZE, MUTED).next_to(chips, DOWN, buff=0.25).align_to(name, LEFT)
    return VGroup(frame, name, method, chips, remark)

class ComputeVideo(WasmGPUVideoScene):
    CHAPTERS = ["Buffers", "Pipelines and dispatch", "ndarrays", "The kernels library", "Readback", "Precision and lifetimes"]

    def construct(self) -> None:
        self.open("The compute subsystem runs general-purpose GPU work, from buffers and WGSL pipelines to ndarrays, kernels, and readback.")
        self.buffers()
        self.pipelines()
        self.ndarrays()
        self.kernels()
        self.readback()
        self.lifetimes()
        self.finish(
            ["Storage and uniform buffers", "WGSL pipelines and workgroup dispatch", "CPU and GPU ndarrays with byte strides", "Kernels: reduce, scan, sort, GEMM, LU", "Ring-buffered asynchronous readback"],
            "To recap: buffers, pipelines and dispatch, ndarrays with byte strides, a kernels library, and ring-buffered readback.",
            "The full reference is in the Compute section of the documentation."
        )

    def buffers(self) -> None:
        self.chapter(1, "Buffers")
        storage = buffer_card("StorageBuffer", "compute.createStorageBuffer()", ["STORAGE", "COPY_DST", "COPY_SRC"], "COPY_SRC only with copySrc: true", COMPUTE)
        uniform = buffer_card("UniformBuffer", "compute.createUniformBuffer()", ["UNIFORM", "COPY_DST"], "Both flags, always", DATA)
        VGroup(storage, uniform).arrange(RIGHT, buff=0.3).move_to(UP * 0.7)
        readback = mono("canReadback → true", SMALL_SIZE, ENGINE).next_to(storage[4], DOWN, buff=0.2).align_to(storage[4], LEFT)
        code = code_panel("""
const input = wgpu.compute.createStorageBuffer({ data: values, copySrc: true });
const params = wgpu.compute.createUniformBuffer({ byteLength: 16 });
const result = await input.readAs(Float32Array);
""", size=20).move_to(DOWN * 2.0)
        self.say("Storage buffers hold the data that shaders read and write, and uniform buffers hold small blocks of parameters.", FadeIn(storage, shift=0.15 * UP), FadeIn(uniform, shift=0.15 * UP))
        self.say("Storage buffers accept writes by default; reading one back needs the copy-source flag, reported by canReadback.", Indicate(storage[3][2], color=ENGINE, scale_factor=1.08), FadeIn(readback), FadeIn(code))
        written = memory_cells(12, COMPUTE, 0.55, filled=range(10))
        padding = VGroup(*[Line(cell.get_corner(DOWN + LEFT), cell.get_corner(UP + RIGHT), color=MUTED, stroke_width=2) for cell in written[10:]])
        strip = VGroup(written, padding).move_to(DOWN * 1.75)
        brace_words = VGroup(txt("10 bytes written", SMALL_SIZE, COMPUTE).next_to(written[:10], DOWN, buff=0.2), txt("padding", SMALL_SIZE, MUTED).next_to(written[10:], DOWN, buff=0.2))
        groups = VGroup(*[SurroundingRectangle(written[index:index + 4], color=TEXT, buff=0.0, stroke_width=2, corner_radius=0) for index in range(0, 12, 4)])
        self.say("Writes are padded to four-byte alignment, so a ten-byte write fills twelve bytes.", AnimationGroup(FadeOut(code), FadeIn(written[:10]), FadeIn(brace_words[0])), AnimationGroup(FadeIn(written[10:]), Create(padding), FadeIn(brace_words[1]), Create(groups)))

    def pipelines(self) -> None:
        self.chapter(2, "Pipelines and dispatch")
        code = code_panel("""
const pipeline = wgpu.compute.createPipeline({
    code: wgsl,
    bindGroups: [{ entries: [{ binding: 0,
        visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });
wgpu.compute.dispatch1D(pipeline, [bindGroup], count, 128);
""", size=20).move_to(UP * 0.2)
        pipeline_box = highlight(code.code_lines[0:5], COMPUTE, 0.06)
        bind_box = highlight(code.code_lines[5], DATA, 0.06)
        dispatch_box = highlight(code.code_lines[6], ENGINE, 0.06)
        self.say("A compute pipeline compiles your WGSL, with an automatic or an explicit bind group layout.", FadeIn(code), Create(pipeline_box))
        self.say("Bind groups attach buffers to the shader's bindings, and dispatch launches a grid of workgroups.", ReplacementTransform(pipeline_box, bind_box), Create(dispatch_box))
        count, size = 37, 8
        cells = VGroup(*[Square(side_length=0.3, stroke_width=1.5, stroke_color=BACKGROUND, fill_color=[API, ENGINE, DATA, DRIVER, BROWSER][index // size], fill_opacity=0.85 if index < count else 0.0) for index in range(40)]).arrange(RIGHT, buff=0.02)
        idle = VGroup(*[Square(side_length=0.3, stroke_width=2, stroke_color=BROWSER, fill_opacity=0).move_to(cells[index]) for index in range(count, 40)])
        cells.move_to(UP * 0.7)
        idle.move_to(cells[count:])
        labels = VGroup(*[mono(f"workgroup {index}", SMALL_SIZE - 2, [API, ENGINE, DATA, DRIVER, BROWSER][index]).next_to(cells[index * size:(index + 1) * size], DOWN, buff=0.2) for index in range(5)])
        formula = equation(r"\left\lceil \frac{37}{8} \right\rceil = 5", 52).move_to(DOWN * 1.15 + LEFT * 3.2)
        call = mono("compute.workgroups1D(37, 8)  →  [5, 1, 1]", SMALL_SIZE, TEXT).move_to(DOWN * 1.15 + RIGHT * 2.6)
        idle_note = txt("3 idle invocations in the last workgroup", SMALL_SIZE, BROWSER).move_to(DOWN * 2.3)
        self.say(
            "The one-, two-, and three-dimensional helpers divide the problem size by the workgroup size and round up, so every element is covered.",
            AnimationGroup(FadeOut(VGroup(code, bind_box, dispatch_box)), LaggedStart(*[FadeIn(cells[index * size:min(count, (index + 1) * size)]) for index in range(5)], lag_ratio=0.2), FadeIn(labels)),
            AnimationGroup(Write(formula), FadeIn(call)),
            AnimationGroup(Create(idle), FadeIn(idle_note)),
            max_run=1.8
        )
        encoder = RoundedRectangle(corner_radius=0.16, width=11.0, height=3.4, stroke_color=MUTED, stroke_width=2, fill_color=PANEL, fill_opacity=1).move_to(DOWN * 0.2)
        encoder_label = mono("GPUCommandEncoder", SMALL_SIZE, MUTED).move_to(encoder.get_corner(UP + LEFT) + np.array([0.3, -0.35, 0]), aligned_edge=LEFT)
        compute_pass = RoundedRectangle(corner_radius=0.14, width=9.6, height=1.9, stroke_color=COMPUTE, stroke_width=3, fill_color=COMPUTE, fill_opacity=0.08).move_to(encoder.get_center() + DOWN * 0.3)
        pass_label = txt("one compute pass", SMALL_SIZE, COMPUTE).move_to(compute_pass.get_corner(UP + LEFT) + np.array([0.3, -0.32, 0]), aligned_edge=LEFT)
        dispatches = VGroup(*[box([f"dispatch {index + 1}"], color, 2.6, 0.62, SMALL_SIZE, MEDIUM) for index, color in enumerate([API, ENGINE, DATA])]).arrange(RIGHT, buff=0.4).move_to(compute_pass.get_center() + DOWN * 0.2)
        methods = mono("encodeDispatch · encodeDispatchBatch · dispatchBatch", SMALL_SIZE, TEXT).next_to(encoder, DOWN, buff=0.3)
        self.say(
            "Dispatches can also be encoded into your own command encoder, or batched into a single compute pass.",
            AnimationGroup(FadeOut(VGroup(cells, idle, labels, formula, call, idle_note)), FadeIn(VGroup(encoder, encoder_label))),
            AnimationGroup(Create(compute_pass), FadeIn(pass_label)),
            AnimationGroup(LaggedStart(*[FadeIn(item, shift=0.1 * RIGHT) for item in dispatches], lag_ratio=0.3), FadeIn(methods))
        )

    def ndarrays(self) -> None:
        self.chapter(3, "ndarrays")
        grid_cells = VGroup()
        for row in range(3):
            for column in range(4):
                square = Square(side_length=0.8, stroke_color=COMPUTE, stroke_width=2, fill_color=COMPUTE, fill_opacity=0.1)
                grid_cells.add(VGroup(square, mono(f"{row},{column}", SMALL_SIZE, MUTED).move_to(square)))
        grid_cells.arrange_in_grid(rows=3, cols=4, buff=0).move_to([-3.6, 0.85, 0])
        layout = VGroup(*[VGroup(mono(key, SMALL_SIZE, MUTED), mono(value, SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.3) for key, value in [("dtype", '"f32"'), ("shape", "[3, 4]"), ("stridesBytes", "[16, 4]"), ("offsetBytes", "0")]])
        for row in layout:
            row[1].move_to(row[0].get_right() + RIGHT * (2.25 - row[0].width) + RIGHT * row[1].width / 2)
        layout.arrange(DOWN, buff=0.28, aligned_edge=LEFT).move_to([2.9, 0.85, 0])
        self.say("ndarrays describe memory with a dtype, a shape, byte strides, and a byte offset.", FadeIn(grid_cells), LaggedStart(*[FadeIn(row, shift=0.1 * RIGHT) for row in layout], lag_ratio=0.3))
        formula = equation(r"\text{offset} = o + \sum_k i_k\, s_k", 48).move_to([-3.4, -1.3, 0])
        example = equation(r"(1, 2) \;\rightarrow\; 0 + 1 \cdot 16 + 2 \cdot 4 = 24", 44, DATA).move_to([2.9, -1.3, 0])
        strip = memory_cells(12, COMPUTE, 0.5).move_to(DOWN * 2.35)
        target = strip[6].copy().set_fill(DATA, opacity=0.8).set_stroke(DATA)
        byte_label = mono("byte 24", SMALL_SIZE, DATA).next_to(strip[6], RIGHT, buff=0.15).shift(UP * 0.0)
        byte_label.next_to(strip, RIGHT, buff=0.3)
        self.say(
            "Strides are measured in bytes, so an element's offset is the base offset plus each index times its stride.",
            Write(formula),
            AnimationGroup(grid_cells[6][0].animate.set_fill(DATA, opacity=0.55).set_stroke(DATA), FadeIn(example)),
            AnimationGroup(FadeIn(strip), FadeIn(target), FadeIn(byte_label))
        )
        cpu = VGroup(RoundedRectangle(corner_radius=0.16, width=5.1, height=3.0, stroke_color=DRIVER, stroke_width=3, fill_color=DRIVER, fill_opacity=0.08))
        cpu.add(mono("CPUndarray", LABEL_SIZE, DRIVER).move_to(cpu[0].get_top() + DOWN * 0.42))
        cpu.add(mono('"cpu-webassembly"', SMALL_SIZE, MUTED).next_to(cpu[1], DOWN, buff=0.15))
        cpu.add(VGroup(*[chip(label, DRIVER, 1.5) for label in ["data", "shape", "strides"]]).arrange(RIGHT, buff=0.15).next_to(cpu[2], DOWN, buff=0.35))
        gpu = VGroup(RoundedRectangle(corner_radius=0.16, width=5.1, height=3.0, stroke_color=BROWSER, stroke_width=3, fill_color=BROWSER, fill_opacity=0.08))
        gpu.add(mono("GPUndarray", LABEL_SIZE, BROWSER).move_to(gpu[0].get_top() + DOWN * 0.42))
        gpu.add(mono('"gpu-storagebuffer"', SMALL_SIZE, MUTED).next_to(gpu[1], DOWN, buff=0.15))
        gpu.add(VGroup(chip("empty(): owned buffer", BROWSER, 4.5), chip("wrap(): borrowed buffer", MUTED, 4.5)).arrange(DOWN, buff=0.12).next_to(gpu[2], DOWN, buff=0.28))
        VGroup(cpu, gpu).arrange(RIGHT, buff=2.6).move_to(UP * 0.55)
        upload = solid_arrow(cpu.get_right() + UP * 0.45, gpu.get_left() + UP * 0.45, TEXT)
        download = solid_arrow(gpu.get_left() + DOWN * 0.45, cpu.get_right() + DOWN * 0.45, TEXT)
        upload_label = mono("uploadToGPU", 21, TEXT).next_to(upload, UP, buff=0.08)
        download_label = mono("readbackToCPU", 21, TEXT).next_to(download, DOWN, buff=0.08)
        destroy_note = txt("destroy() frees all three", SMALL_SIZE, MUTED).next_to(cpu, DOWN, buff=0.25)
        self.say(
            "A CPUndarray lives in WebAssembly memory, and destroy frees its data, shape, and stride allocations.",
            AnimationGroup(FadeOut(VGroup(grid_cells, layout, formula, example, strip, target, byte_label)), FadeIn(cpu[0:3])),
            LaggedStart(*[FadeIn(item) for item in cpu[3]], lag_ratio=0.25),
            FadeIn(destroy_note)
        )
        self.say("A GPUndarray lives in a storage buffer: empty allocates one it owns, and wrap borrows an existing one.", FadeIn(gpu[0:3]), FadeIn(gpu[3][0]), FadeIn(gpu[3][1]))
        dtypes = VGroup(*[VGroup(mono(dtype, SMALL_SIZE, TEXT), mono("→", SMALL_SIZE, MUTED), mono(scalar, SMALL_SIZE, ENGINE if scalar != "null" else MUTED)).arrange(RIGHT, buff=0.2) for dtype, scalar in [("f32", "f32"), ("u32", "u32"), ("i32", "i32"), ("f64", "null")]]).arrange(RIGHT, buff=0.7).move_to(DOWN * 2.35)
        self.say(
            "Upload and readback move arrays between the two residences, and the f32, u32, and i32 dtypes map directly to WGSL scalars.",
            AnimationGroup(GrowArrow(upload), FadeIn(upload_label)),
            AnimationGroup(GrowArrow(download), FadeIn(download_label)),
            AnimationGroup(FadeOut(destroy_note), LaggedStart(*[FadeIn(item) for item in dtypes], lag_ratio=0.2))
        )

    def kernels(self) -> None:
        self.chapter(4, "The kernels library")
        rows = VGroup()
        for index, (family, names) in enumerate(KERNEL_FAMILIES):
            label = txt(family, LABEL_SIZE, COMPUTE, SEMIBOLD)
            calls = mono("  ".join(names), 21, TEXT)
            label.move_to([SAFE_LEFT + 0.2, 2.0 - index * 0.84, 0], aligned_edge=LEFT)
            calls.move_to([-2.6, 2.0 - index * 0.84, 0], aligned_edge=LEFT)
            rows.add(VGroup(label, calls))
        rules = VGroup(*[Line([SAFE_LEFT + 0.2, 2.0 - index * 0.84 - 0.42, 0], [SAFE_RIGHT - 0.2, 2.0 - index * 0.84 - 0.42, 0], color=HAIRLINE, stroke_width=1.5) for index in range(5)])
        self.say(
            "The kernels library provides parallel building blocks: element-wise math, dot products, and GEMM over f32, u32, and c64, plus reductions, scans, sorts, and solvers.",
            AnimationGroup(FadeIn(rows[0], shift=0.1 * RIGHT), Create(rules)),
            FadeIn(rows[1], shift=0.1 * RIGHT),
            FadeIn(rows[2], shift=0.1 * RIGHT),
            AnimationGroup(*[FadeIn(row, shift=0.1 * RIGHT) for row in rows[3:]])
        )
        values = [3, 1, 4, 1, 5, 9, 2, 6]
        levels = [values, [8, 10, 6, 7], [14, 17], [31]]
        tree = VGroup(*[value_cells(level, COMPUTE if depth < 3 else DATA, 0.62) for depth, level in enumerate(levels)])
        for depth, level in enumerate(tree):
            level.move_to([-2.48, 1.35 - depth * 1.05, 0], aligned_edge=LEFT)
        tree_links = VGroup()
        for depth in range(3):
            half = len(levels[depth]) // 2
            for index in range(half):
                for source in (index, index + half):
                    tree_links.add(Line(tree[depth][source].get_bottom(), tree[depth + 1][index].get_top(), color=MUTED, stroke_width=1.5))
        tree_title = txt("Workgroup tree: add element i and i + stride, halve the stride", SMALL_SIZE, MUTED).move_to([0, 2.15, 0])
        self.say(
            "Reductions combine values in a tree inside each workgroup, and arg-reductions also return the winning index.",
            AnimationGroup(FadeOut(VGroup(rows, rules)), FadeIn(tree[0]), FadeIn(tree_title)),
            AnimationGroup(Create(tree_links[0:8]), FadeIn(tree[1])),
            AnimationGroup(Create(tree_links[8:12]), FadeIn(tree[2])),
            AnimationGroup(Create(tree_links[12:14]), FadeIn(tree[3]))
        )
        scan_in = value_cells(values, COMPUTE)
        scan_out = value_cells([0, 3, 4, 8, 9, 14, 23, 25], DATA)
        flags = value_cells([1, 0, 1, 1, 0, 1, 0, 1], MUTED)
        packed = value_cells([3, 4, 1, 9, 6], ENGINE)
        labels = ["input", "exclusive scan", "keep flags", "compacted"]
        stack = VGroup(scan_in, scan_out, flags, packed)
        for index, row in enumerate(stack):
            row.move_to([-0.2, 1.65 - index * 1.15, 0], aligned_edge=LEFT)
        row_labels = VGroup(*[txt(label, SMALL_SIZE, MUTED).next_to(stack[index], LEFT, buff=0.4) for index, label in enumerate(labels)])
        row_labels.align_to([-0.6, 0, 0], RIGHT)
        self.say(
            "An exclusive scan gives each element the sum of everything before it, and compaction uses a scan of keep flags to pack the kept values.",
            AnimationGroup(FadeOut(VGroup(tree, tree_links, tree_title)), FadeIn(scan_in), FadeIn(row_labels[0])),
            AnimationGroup(LaggedStart(*[FadeIn(cell, shift=0.15 * DOWN) for cell in scan_out], lag_ratio=0.12), FadeIn(row_labels[1])),
            AnimationGroup(FadeIn(flags), FadeIn(row_labels[2])),
            AnimationGroup(LaggedStart(*[FadeIn(cell, shift=0.15 * DOWN) for cell in packed], lag_ratio=0.15), FadeIn(row_labels[3])),
            max_run=1.8
        )
        keys = [5, 2, 7, 4, 1, 6]
        before = VGroup(*[VGroup(value_cells([key], COMPUTE, 0.7)[0], mono(format(key, "03b"), SMALL_SIZE, MUTED)) for key in keys])
        for item in before:
            item[1].next_to(item[0], DOWN, buff=0.15)
        before.arrange(RIGHT, buff=0.35).move_to(UP * 1.0)
        for item, key in zip(before, keys):
            item[1].set_color(ENGINE if key % 2 == 0 else BROWSER)
        order = [1, 3, 5, 0, 2, 4]
        after = VGroup(*[before[index].copy() for index in order]).arrange(RIGHT, buff=0.35).move_to(DOWN * 1.35)
        pass_label = txt("one pass for bit 0: zeros first, order kept", SMALL_SIZE, MUTED).move_to(UP * 2.15)
        self.say(
            "Radix sorts order u32 keys, or key-value pairs, stably, using one pass per bit.",
            AnimationGroup(FadeOut(VGroup(stack, row_labels)), FadeIn(before)),
            FadeIn(pass_label),
            AnimationGroup(*[ReplacementTransform(before[index].copy(), after[position]) for position, index in enumerate(order)])
        )
        def matrix(rows_: int, columns: int, color: str, cell: float = 0.26) -> VGroup:
            return VGroup(*[Square(side_length=cell, stroke_color=color, stroke_width=1, fill_color=color, fill_opacity=0.08) for _ in range(rows_ * columns)]).arrange_in_grid(rows=rows_, cols=columns, buff=0)
        a, b, c = matrix(8, 6, API), matrix(6, 8, ENGINE), matrix(8, 8, DATA)
        VGroup(a, b, c).arrange(RIGHT, buff=1.1).move_to(DOWN * 0.55)
        times = mono("×", LABEL_SIZE, TEXT).move_to((a.get_right() + b.get_left()) / 2)
        arrow = mono("→", LABEL_SIZE, TEXT).move_to((b.get_right() + c.get_left()) / 2)
        band_a = VGroup(*[a[row * 6 + column] for row in range(2, 4) for column in range(6)])
        band_b = VGroup(*[b[row * 8 + column] for row in range(6) for column in range(4, 6)])
        tile_c = VGroup(*[c[row * 8 + column] for row in range(2, 4) for column in range(4, 6)])
        gemm = equation(r"C \leftarrow \alpha\, A B + \beta\, C", 52).move_to(UP * 1.85)
        tile_note = txt("16 × 16 tiles staged in workgroup memory", SMALL_SIZE, MUTED).next_to(VGroup(a, b, c), DOWN, buff=0.35)
        self.say(
            "GEMM computes alpha times A times B, plus beta times the output, staging sixteen-by-sixteen tiles in workgroup memory.",
            AnimationGroup(FadeOut(VGroup(before, after, pass_label)), Write(gemm)),
            AnimationGroup(FadeIn(VGroup(a, b, c, times, arrow))),
            AnimationGroup(band_a.animate.set_fill(API, opacity=0.7), band_b.animate.set_fill(ENGINE, opacity=0.7), tile_c.animate.set_fill(DATA, opacity=0.8), FadeIn(tile_note))
        )
        batch = VGroup(*[matrix(4, 4, DRIVER, 0.28) for _ in range(4)])
        for index, item in enumerate(batch):
            item.move_to([-4.4 + index * 0.22, 0.2 - index * 0.22, 0])
        lu = equation(r"P A = L U", 56).move_to([0.9, 0.55, 0])
        solve = equation(r"A x = b", 56).move_to([0.9, -0.75, 0])
        calls = VGroup(mono("luFactorF32Batched", SMALL_SIZE, DRIVER), mono("luSolveF32Batched", SMALL_SIZE, DRIVER)).arrange(DOWN, buff=1.05, aligned_edge=LEFT).move_to([4.3, -0.1, 0])
        pivots = txt("partial pivoting, pivot rows in ipiv", SMALL_SIZE, MUTED).move_to(DOWN * 2.05)
        self.say(
            "Batched LU factorization with partial pivoting, and the matching solve, handle many small linear systems at once.",
            AnimationGroup(FadeOut(VGroup(a, b, c, times, arrow, gemm, tile_note)), LaggedStart(*[FadeIn(item) for item in batch], lag_ratio=0.2)),
            AnimationGroup(Write(lu), FadeIn(calls[0]), FadeIn(pivots)),
            AnimationGroup(Write(solve), FadeIn(calls[1]))
        )

    def readback(self) -> None:
        self.chapter(5, "Readback")
        source = box(["StorageBuffer", "copySrc: true"], COMPUTE, 3.6, 1.1, SMALL_SIZE, MEDIUM).move_to([-4.6, 0.6, 0])
        slots = VGroup(*[box([f"slot {index}"], BROWSER, 2.0, 0.7, SMALL_SIZE, MEDIUM) for index in range(3)])
        for slot, position in zip(slots, [[0.0, 1.5, 0], [0.0, 0.6, 0], [0.0, -0.3, 0]]):
            slot.move_to(position)
        ring_label = mono("ReadbackRing", SMALL_SIZE, BROWSER).next_to(slots, UP, buff=0.25)
        cursor = Polygon([0, 0, 0], [-0.22, 0.14, 0], [-0.22, -0.14, 0], fill_color=ACCENT, fill_opacity=1, stroke_width=0).next_to(slots[0], LEFT, buff=0.15)
        copy = dashed_arrow(source.get_right(), slots[0].get_left() + LEFT * 0.45, BROWSER)
        result = box(["Float32Array"], API, 3.0, 0.7, SMALL_SIZE, MEDIUM, font=MONO).move_to([4.6, 0.6, 0])
        mapped = dashed_arrow(slots[0].get_right(), result.get_left(), API)
        map_label = mono("mapAsync", SMALL_SIZE - 2, MUTED).next_to(mapped, UP, buff=0.1)
        methods = mono("read · readAs · readF32 · readU32 · readScalarF32 · readScalarU32", 22, TEXT).move_to(DOWN * 1.35)
        self.say(
            "Results return to JavaScript through a readback ring, which keeps three staging buffers by default and reuses them in turn.",
            FadeIn(source),
            AnimationGroup(FadeIn(slots), FadeIn(ring_label), FadeIn(cursor)),
            cursor.animate.next_to(slots[1], LEFT, buff=0.15),
            cursor.animate.next_to(slots[2], LEFT, buff=0.15)
        )
        self.say(
            "Each read copies a range into the next slot, maps it asynchronously, and resolves a typed array or a single scalar.",
            AnimationGroup(cursor.animate.next_to(slots[0], LEFT, buff=0.15), Create(copy)),
            AnimationGroup(Create(mapped), FadeIn(map_label), FadeIn(result)),
            FadeIn(methods)
        )
        pixels = VGroup(*[Square(side_length=0.22, stroke_width=0, fill_color=colormap_color((row + column) / 14, ["#3355c6", "#8472f3", "#FF5EA8", "#FFB238"]), fill_opacity=1) for row in range(6) for column in range(10)]).arrange_in_grid(rows=6, cols=10, buff=0.0)
        canvas = VGroup(SurroundingRectangle(pixels, color=MUTED, buff=0.12, stroke_width=2, corner_radius=0.06), pixels).move_to([3.6, -1.95, 0])
        blit = mono("blitRGBA8BufferToCanvas", 22, TEXT).move_to([-1.9, -1.95, 0])
        blit_arrow = solid_arrow(blit.get_right(), canvas.get_left(), MUTED)
        self.say("For images, a blitter draws a packed RGBA8 buffer straight to a canvas.", AnimationGroup(FadeOut(methods), FadeIn(blit)), AnimationGroup(GrowArrow(blit_arrow), FadeIn(canvas)))

    def lifetimes(self) -> None:
        self.chapter(6, "Precision and lifetimes")
        header = VGroup(txt("f64 data", LABEL_SIZE, MUTED, SEMIBOLD))
        rows = VGroup()
        for row_index, (label, ok) in enumerate([("Stored in a GPU buffer", True), ("Copied and read back without loss", True), ("Computed on in WGSL", False)]):
            mark = check_mark(ENGINE, 0.36) if ok else cross_mark(ERROR, 0.36)
            text = txt(label, BODY_SIZE, TEXT)
            row = VGroup(mark, text).arrange(RIGHT, buff=0.45)
            row.move_to([-5.6, 1.55 - row_index * 0.8, 0], aligned_edge=LEFT)
            rows.add(row)
        note = txt("shader arithmetic uses f32", SMALL_SIZE, ERROR).next_to(rows[2], RIGHT, buff=0.5)
        header.move_to([-5.6, 2.3, 0], aligned_edge=LEFT)
        self.say(
            "An f64 array can be stored, copied, and read back without loss, but WGSL has no runtime f64 type, so shaders compute in f32.",
            AnimationGroup(FadeIn(header), FadeIn(rows[0], shift=0.1 * RIGHT)),
            FadeIn(rows[1], shift=0.1 * RIGHT),
            AnimationGroup(FadeIn(rows[2], shift=0.1 * RIGHT), FadeIn(note))
        )
        owners = VGroup(*[chip(label, color, 5.6, 22, font=MONO) for label, color in [("StorageBuffer.destroy()", COMPUTE), ("ReadbackRing.destroy()", BROWSER), ("CPUndarray.destroy()", DRIVER), ("GPUndarray.destroy()", DATA)]]).arrange_in_grid(rows=2, cols=2, buff=(0.3, 0.18)).move_to(DOWN * 1.45)
        owned_note = txt("A GPUndarray from wrap() leaves its buffer alive", SMALL_SIZE, MUTED).next_to(owners, DOWN, buff=0.3)
        self.say(
            "Lifetimes are explicit: destroy releases buffers, readback rings, and CPU allocations, and a GPUndarray destroys only buffers it owns.",
            LaggedStart(*[FadeIn(owner, shift=0.1 * UP) for owner in owners[:3]], lag_ratio=0.3),
            AnimationGroup(FadeIn(owners[3], shift=0.1 * UP), FadeIn(owned_note))
        )

# ============================= Video: interact ==============================
# Sources: ./typescript/world/controls.ts, ./typescript/world/picking.ts, ./typescript/core/picking.ts,
# ./typescript/core/engine.ts (pick wrappers), ./typescript/overlay/annotation/ (toolkit.ts, store.ts, types.ts),
# ./typescript/scaling/service.ts, ./typescript/scaling/transform.ts, ./wgsl/compute/scale-remap-f32.wgsl,
# ./typescript/world/pointcloud.ts (applyScaleStats), ./typescript/overlay/legendLayer.ts,
# ./website/docs/interact/*.md, and ./ARCHITECTURE.md §1.9, §1.12, §1.14.

def camera_icon(color: str = TEXT, scale: float = 1.0) -> VGroup:
    body = RoundedRectangle(corner_radius=0.05, width=0.42, height=0.3, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.25)
    lens = Polygon([0.21, 0.0, 0], [0.42, 0.14, 0], [0.42, -0.14, 0], stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.25)
    return VGroup(body, lens).scale(scale)

def key_cap(label: str, color: str = MUTED) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.06, width=0.5, height=0.5, stroke_color=color, stroke_width=2, fill_color=PANEL, fill_opacity=1)
    return VGroup(frame, mono(label, SMALL_SIZE, TEXT).move_to(frame))

def control_panel(name: str, color: str) -> VGroup:
    frame = RoundedRectangle(corner_radius=0.16, width=4.2, height=3.6, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.06)
    title = mono(name, LABEL_SIZE, color).move_to(frame.get_top() + DOWN * 0.4)
    center = frame.get_center() + DOWN * 0.25
    if name == "orbit":
        target = Dot(center, radius=0.08, color=DATA)
        ring = Ellipse(width=3.0, height=1.1, stroke_color=MUTED, stroke_width=2).move_to(center)
        camera = camera_icon(TEXT, 0.9).rotate(PI).move_to(ring.point_from_proportion(0.1))
        arc = Arrow(ring.point_from_proportion(0.62), ring.point_from_proportion(0.72), buff=0, stroke_width=3, color=color, tip_length=0.15, path_arc=-0.6)
        labels = VGroup(equation(r"\theta", 40, color).next_to(ring, DOWN, buff=0.15), equation(r"\varphi", 40, color).next_to(ring, RIGHT, buff=0.1).shift(UP * 0.3))
        polar = Arrow(center + RIGHT * 1.55 + DOWN * 0.1, center + RIGHT * 1.35 + UP * 0.75, buff=0, stroke_width=3, color=color, tip_length=0.15, path_arc=0.5)
        art = VGroup(ring, target, camera, arc, polar, labels)
    elif name == "trackball":
        sphere = Circle(radius=1.05, stroke_color=MUTED, stroke_width=2).move_to(center)
        target = Dot(center, radius=0.08, color=DATA)
        arcs = VGroup(*[Arrow(center + np.array([math.cos(angle), math.sin(angle), 0]) * 1.25, center + np.array([math.cos(angle + 1.0), math.sin(angle + 1.0), 0]) * 1.25, buff=0, stroke_width=3, color=color, tip_length=0.15, path_arc=1.0) for angle in (0.3, 2.4, 4.5)])
        equator = Ellipse(width=2.1, height=0.55, stroke_color=HAIRLINE, stroke_width=2).move_to(center)
        art = VGroup(sphere, equator, target, arcs)
    else:
        camera = camera_icon(TEXT, 1.2).move_to(center + UP * 0.35 + LEFT * 0.5)
        forward = Arrow(camera.get_right(), camera.get_right() + RIGHT * 1.3, buff=0.05, stroke_width=3, color=color, tip_length=0.18)
        keys = VGroup(key_cap("W"), VGroup(key_cap("A"), key_cap("S"), key_cap("D")).arrange(RIGHT, buff=0.08)).arrange(DOWN, buff=0.08).move_to(center + DOWN * 0.85)
        art = VGroup(camera, forward, keys)
    return VGroup(frame, title, art)

def pick_grid() -> VGroup:
    cells = VGroup()
    for row in range(8):
        for column in range(12):
            inside_mesh = (column - 3.2) ** 2 / 7 + (row - 3.5) ** 2 / 5 < 1
            inside_points = column >= 7 and row <= 4 and (row + column) % 2 == 0
            color = API if inside_mesh else DATA if inside_points else HAIRLINE
            cells.add(Square(side_length=0.36, stroke_color=BACKGROUND, stroke_width=1.5, fill_color=color, fill_opacity=0.75 if color != HAIRLINE else 0.25))
    return cells.arrange_in_grid(rows=8, cols=12, buff=0)

class InteractVideo(WasmGPUVideoScene):
    CHAPTERS = ["Camera controls", "Picking", "Selection", "Annotations", "Data scaling"]

    def construct(self) -> None:
        self.open("The interaction subsystems turn input into navigation, picking, selection, measurement, and data scaling, on top of the renderer and the compute kernels.")
        self.controls()
        self.picking()
        self.selection()
        self.annotations()
        self.scaling()
        self.finish(
            ["Orbit, trackball, and fly navigation", "ID-pass picking: point, rectangle, lasso", "Selection keyed by object and element", "Marker, distance, and angle annotations", "Linear, log, and symlog data scaling"],
            "To recap: three navigation modes, identifier-pass picking, a selection store, measurement annotations, and GPU-backed data scaling.",
            "The full reference is in the Interaction section of the documentation."
        )

    def controls(self) -> None:
        self.chapter(1, "Camera controls")
        panels = VGroup(control_panel("orbit", API), control_panel("trackball", ENGINE), control_panel("fly", DATA)).arrange(RIGHT, buff=0.3).move_to(UP * 0.55)
        base = box(["NavigationControls"], ACCENT, 5.2, 0.6, SMALL_SIZE, MEDIUM, font=MONO).move_to(DOWN * 1.95)
        links = VGroup(*[Line(base.get_top(), panel.get_bottom(), color=HAIRLINE, stroke_width=2) for panel in panels])
        self.say("Three navigation modes share one NavigationControls class: orbit, trackball, and fly.", FadeIn(base), AnimationGroup(LaggedStart(*[FadeIn(panel, shift=0.15 * UP) for panel in panels], lag_ratio=0.25), Create(links)), max_run=2.0)
        self.say(
            "Orbit circles a target using azimuth and polar angles, trackball rotates freely about the target, and fly moves the camera itself with keys and pointer look.",
            Indicate(panels[0][2], color=API, scale_factor=1.05),
            Indicate(panels[1][2], color=ENGINE, scale_factor=1.05),
            Indicate(panels[2][2], color=DATA, scale_factor=1.05)
        )
        damping = equation(r"\lambda = 1 - (1 - f)^{60\,\Delta t}", 50).move_to([-3.3, 1.15, 0])
        damping_note = txt("dampingFactor f = 0.1 by default", SMALL_SIZE, MUTED).next_to(damping, DOWN, buff=0.3)
        fitting = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["fitToBounds(bounds)", "fitScene(scene)", 'setView("top")', 'viewBounds("front", scene)']]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([3.3, 1.0, 0])
        views = txt("front · back · left · right · top · bottom", SMALL_SIZE, MUTED).next_to(fitting, DOWN, buff=0.3)
        self.say(
            "Damping smooths motion independently of the frame rate, and fitting and inspection views frame your data with smooth transitions.",
            AnimationGroup(FadeOut(VGroup(panels, base, links)), Write(damping), FadeIn(damping_note)),
            LaggedStart(*[FadeIn(call, shift=0.1 * RIGHT) for call in fitting], lag_ratio=0.25),
            FadeIn(views)
        )
        triads = VGroup()
        for name, up_label in [("y-up-rh", "y"), ("z-up-rh", "z"), ("x-up-rh", "x")]:
            origin = ORIGIN
            up = Arrow(origin, UP * 0.9, buff=0, stroke_width=3, color=ENGINE, tip_length=0.15)
            right = Arrow(origin, RIGHT * 0.9, buff=0, stroke_width=3, color=BROWSER, tip_length=0.15)
            depth = Arrow(origin, (LEFT + DOWN) * 0.55, buff=0, stroke_width=3, color=API, tip_length=0.15)
            label = mono(up_label, SMALL_SIZE, ENGINE).next_to(up, UP, buff=0.08)
            triads.add(VGroup(up, right, depth, label, mono(f'"{name}"', SMALL_SIZE, MUTED).next_to(VGroup(up, right, depth), DOWN, buff=0.3)))
        triads.arrange(RIGHT, buff=1.2).move_to([-3.0, -1.6, 0])
        extras = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["saveState() · reset()", 'pointerLock: "on-click"', "onChange() · onInteractionState()"]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([3.4, -1.6, 0])
        self.say(
            "Axis conventions choose which way is up, y, z, or x, always right-handed, and saved states, pointer lock, and change events round out the controls.",
            LaggedStart(*[FadeIn(triad) for triad in triads], lag_ratio=0.3),
            LaggedStart(*[FadeIn(extra, shift=0.1 * RIGHT) for extra in extras], lag_ratio=0.3)
        )

    def picking(self) -> None:
        self.chapter(2, "Picking")
        grid = pick_grid().move_to([-3.6, 0.35, 0])
        cursor = grid[3 * 12 + 9]
        cursor_box = SurroundingRectangle(cursor, color=TEXT, buff=0.02, stroke_width=3)
        callout = VGroup(mono("rg32uint", SMALL_SIZE, MUTED), mono("objectId: 2", SMALL_SIZE, DATA), mono("elementIndex: 41", SMALL_SIZE, DATA)).arrange(DOWN, buff=0.2, aligned_edge=LEFT)
        callout_frame = SurroundingRectangle(callout, color=HAIRLINE, buff=0.25, corner_radius=0.12, stroke_width=2).set_fill(PANEL, opacity=1)
        callout_group = VGroup(callout_frame, callout).move_to([2.6, 1.2, 0])
        pointer = DashedLine(cursor_box.get_right(), callout_frame.get_left(), dash_length=0.08, color=MUTED, stroke_width=2)
        self.say("Picking renders an identifier pass, where every pixel stores an object ID and an element index.", FadeIn(grid), AnimationGroup(Create(cursor_box), Create(pointer), FadeIn(callout_group)))
        rect = Rectangle(width=4 * 0.36, height=3 * 0.36, stroke_color=ACCENT, stroke_width=3).move_to(VGroup(grid[1 * 12 + 7], grid[3 * 12 + 10]))
        lasso = Polygon(grid[4 * 12 + 1].get_center(), grid[2 * 12 + 2].get_center(), grid[3 * 12 + 5].get_center(), grid[6 * 12 + 6].get_center(), grid[7 * 12 + 2].get_center(), stroke_color=BROWSER, stroke_width=3, fill_opacity=0)
        region = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["pick(scene, camera, x, y)", "pickRect(scene, camera, x0, y0, x1, y1)", "pickLasso(scene, camera, points)"]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([2.6, -1.0, 0])
        result = mono("{ hits, truncated, bounds, sampledPixels }", 22, MUTED).next_to(region, DOWN, buff=0.35)
        result.align_to(region, LEFT)
        self.say(
            "A point pick reads one pixel; rectangle and lasso picks read a region and return unique hits, up to a maximum count.",
            FadeIn(region[0]),
            AnimationGroup(Create(rect), FadeIn(region[1])),
            AnimationGroup(Create(lasso), FadeIn(region[2])),
            FadeIn(result)
        )
        families = VGroup(*[pill(name, color, 22, MONO) for name, color in [("Mesh", API), ("PointCloud", DATA), ("GlyphField", DATA), ("NodeLink", DATA), ("SplatField", DATA), ("LatticeSpace", DATA)]]).arrange(RIGHT, buff=0.12).move_to(UP * 1.2)
        triangle_mesh = VGroup(*[Polygon(*points, stroke_color=API, stroke_width=2, fill_color=API, fill_opacity=0.15) for points in [[[-1.2, -0.7, 0], [0, -0.7, 0], [-0.6, 0.35, 0]], [[0, -0.7, 0], [1.2, -0.7, 0], [0.6, 0.35, 0]], [[-0.6, 0.35, 0], [0.6, 0.35, 0], [0, -0.7, 0]], [[-0.6, 0.35, 0], [0.6, 0.35, 0], [0, 1.4, 0]]]]).move_to([-3.0, -1.1, 0])
        picked = triangle_mesh[2].copy().set_fill(DATA, opacity=0.8).set_stroke(DATA)
        triangle_note = VGroup(mono("elementIndex = triangle", SMALL_SIZE, DATA), mono('requires "primitive-index"', SMALL_SIZE, MUTED)).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([2.2, -1.1, 0])
        self.say(
            "Every object family is pickable, and meshes report triangle indices when the device supports the primitive-index feature.",
            AnimationGroup(FadeOut(VGroup(grid, cursor_box, pointer, callout_group, rect, lasso, region, result)), LaggedStart(*[FadeIn(family, shift=0.1 * UP) for family in families], lag_ratio=0.15)),
            AnimationGroup(FadeIn(triangle_mesh), FadeIn(picked)),
            FadeIn(triangle_note)
        )
        code = code_panel("""
type PickHit = {
    kind: PickKind;
    object: Mesh | PointCloud | GlyphField | NodeLink
        | SplatField | LatticeSpace;
    objectId: number;
    elementIndex: number;
    worldPosition: [number, number, number];
    ndIndex: number[] | null;
    attributes: PickAttributes | null;
};
""", "typescript", 20).move_to(UP * 0.2)
        boxes = [highlight(code.code_lines[6], DATA, 0.05), highlight(code.code_lines[7], ENGINE, 0.05), highlight(code.code_lines[8], COMPUTE, 0.05)]
        self.say(
            "Each hit carries a world position reconstructed from depth, an n-dimensional index for gridded data, and attributes when CPU records are retained.",
            AnimationGroup(FadeOut(VGroup(families, triangle_mesh, picked, triangle_note)), FadeIn(code)),
            Create(boxes[0]),
            Create(boxes[1]),
            Create(boxes[2])
        )
        note = VGroup(txt("Requests run one at a time", SMALL_SIZE, TEXT), txt("No render-only occlusion filtering", SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.8).next_to(code, DOWN, buff=0.25)
        self.say("Pick requests are serialized, and picking never uses the render-only occlusion filter.", FadeIn(note[0]), FadeIn(note[1]))

    def selection(self) -> None:
        self.chapter(3, "Selection")
        store = RoundedRectangle(corner_radius=0.16, width=7.4, height=1.4, stroke_color=ACCENT, stroke_width=3, fill_color=PANEL, fill_opacity=1).move_to(UP * 1.35)
        store_label = mono("SelectionStore", SMALL_SIZE, ACCENT).next_to(store, UP, buff=0.15).align_to(store, LEFT)
        def entries(keys: Sequence[str]) -> VGroup:
            return VGroup(*[pill(key, DATA, SMALL_SIZE, MONO) for key in keys]).arrange(RIGHT, buff=0.25).move_to(store)
        states = [(["2:41", "2:42", "5:7"], ""), (["2:41", "2:42", "5:7", "5:9"], "add(5:9)"), (["2:42", "5:7", "5:9"], "toggle(2:41)"), (["2:42", "5:9"], "remove(5:7)"), (["3:1"], "replace(3:1)")]
        current = entries(states[0][0])
        key_note = txt('keys are "objectId:elementIndex"', SMALL_SIZE, MUTED).next_to(store, DOWN, buff=0.25)
        self.say("A selection store keeps hits keyed by object ID and element index.", AnimationGroup(FadeIn(store), FadeIn(store_label)), AnimationGroup(FadeIn(current), FadeIn(key_note)))
        steps: list[Animation] = []
        log = VGroup()
        for index, (keys, call) in enumerate(states[1:]):
            new = entries(keys)
            line = mono(call, SMALL_SIZE, TEXT).move_to([-2.0, -0.55 - index * 0.5, 0], aligned_edge=LEFT)
            log.add(line)
            steps.append(AnimationGroup(Transform(current, new), FadeIn(line, shift=0.1 * RIGHT)))
        apply_note = mono('apply("toggle", hit) · has · values · size · clear', SMALL_SIZE, MUTED).move_to(DOWN * 2.6)
        self.say("Add, remove, toggle, and replace edit it directly, and apply chooses one of those modes at run time.", *steps, FadeIn(apply_note))

    def annotations(self) -> None:
        self.chapter(4, "Annotations")
        modes = VGroup(*[pill(mode, color, SMALL_SIZE, MONO) for mode, color in [('"idle"', MUTED), ('"marker"', DATA), ('"distance"', ENGINE), ('"angle"', BROWSER)]]).arrange(RIGHT, buff=0.3).move_to(UP * 1.95)
        toolkit = mono("createAnnotation.toolkit()  →  setMode()  →  pickAtAndCommit(x, y)", 22, TEXT).next_to(modes, DOWN, buff=0.35)
        self.say("The annotation toolkit builds measurements on top of picking, with marker, distance, and angle modes.", FadeIn(toolkit), LaggedStart(*[FadeIn(mode) for mode in modes], lag_ratio=0.25))
        a, b, c = np.array([-5.2, -1.9, 0]), np.array([-3.0, 0.4, 0]), np.array([-0.6, -1.5, 0])
        dots = VGroup(*[Dot(point, radius=0.1, color=color) for point, color in [(a, ENGINE), (b, BROWSER), (c, ENGINE)]])
        names = VGroup(equation("a", 40).next_to(dots[0], LEFT, buff=0.15), equation("b", 40).next_to(dots[1], UP, buff=0.15), equation("c", 40).next_to(dots[2], RIGHT, buff=0.15))
        segment_ab = Line(a, b, color=ENGINE, stroke_width=3)
        segment_bc = Line(b, c, color=MUTED, stroke_width=3)
        angle_ab = math.atan2(*(a - b)[1::-1])
        angle_cb = math.atan2(*(c - b)[1::-1])
        arc = Arc(radius=0.6, start_angle=angle_ab, angle=(angle_cb - angle_ab) % (2 * PI), arc_center=b, color=BROWSER, stroke_width=3)
        distance = equation(r"d = \lVert b - a \rVert", 44, ENGINE).move_to([3.4, 0.0, 0])
        theta = equation(r"\theta = \arccos \frac{(a - b) \cdot (c - b)}{\lVert a - b \rVert \, \lVert c - b \rVert}", 40, BROWSER).move_to([3.4, -1.45, 0])
        self.say(
            "Distances join two picked anchors, and angles measure the corner at the middle of three.",
            AnimationGroup(FadeIn(VGroup(dots[0:2], names[0:2])), Create(segment_ab), Write(distance)),
            AnimationGroup(FadeIn(dots[2]), FadeIn(names[2]), Create(segment_bc), Create(arc), Write(theta))
        )
        units = VGroup(*[mono(entry, SMALL_SIZE, TEXT) for entry in ['symbol: "m"', "decimals: 2", 'angleUnit: "deg"']]).arrange(RIGHT, buff=0.6).move_to(UP * 1.0)
        units_label = mono("setUnits({ ... })", SMALL_SIZE, MUTED).next_to(units, UP, buff=0.25)
        probes = VGroup(*[box([label], color, 4.6, 0.7, SMALL_SIZE, MEDIUM) for label, color in [("hover probe readout", COMPUTE), ("selection probe readout", ACCENT)]]).arrange(RIGHT, buff=0.5).move_to(DOWN * 0.75)
        self.say(
            "Units set the symbol, decimals, and degrees or radians, while hover and selection probes report what the pointer hovers over or selects.",
            AnimationGroup(FadeOut(VGroup(dots, names, segment_ab, segment_bc, arc, distance, theta, modes, toolkit)), FadeIn(units_label), LaggedStart(*[FadeIn(unit) for unit in units], lag_ratio=0.2)),
            FadeIn(probes[0], shift=0.1 * UP),
            FadeIn(probes[1], shift=0.1 * UP)
        )
        store = box(["AnnotationStore", "markers, distances, angles"], DATA, 5.2, 1.2, SMALL_SIZE, MEDIUM).move_to([-3.3, -0.4, 0])
        scene = box(["Scene", "meshes, primitives, lights"], MUTED, 5.2, 1.2, SMALL_SIZE, MEDIUM).move_to([3.3, -0.4, 0])
        not_owned = cross_mark(ERROR, 0.4).move_to((store.get_right() + scene.get_left()) / 2)
        overlay = box(["overlay label layer"], ACCENT, 5.2, 0.62, SMALL_SIZE, MEDIUM).move_to([-3.3, -2.05, 0])
        overlay_link = solid_arrow(store.get_bottom(), overlay.get_top(), ACCENT)
        self.say(
            "Records live in the toolkit's own annotation store, not in the scene, and labels are drawn through the overlay.",
            AnimationGroup(FadeOut(VGroup(units, units_label, probes)), FadeIn(store), FadeIn(scene)),
            Create(not_owned),
            AnimationGroup(GrowArrow(overlay_link), FadeIn(overlay))
        )
        events = VGroup(mono("toolkit.revision", SMALL_SIZE, TEXT), mono("onAnnotationsChange(listener)", SMALL_SIZE, TEXT)).arrange(DOWN, buff=0.22, aligned_edge=LEFT).move_to([3.3, -2.05, 0])
        self.say("A revision counter and change events keep interfaces in sync with the store.", FadeIn(events[0], shift=0.1 * RIGHT), FadeIn(events[1], shift=0.1 * RIGHT))

    def scaling(self) -> None:
        self.chapter(5, "Data scaling")
        values = VGroup(*[mono(str(value), SMALL_SIZE, TEXT) for value in ["-40", "0.5", "3", "120", "2500"]]).arrange(RIGHT, buff=0.9).move_to([-3.0, 1.6, 0])
        bar = gradient_bar(VIRIDIS, 6.0, 0.45).move_to([3.3, 1.6, 0])
        ends = VGroup(mono("0", SMALL_SIZE, MUTED).next_to(bar, DOWN, buff=0.15).align_to(bar, LEFT), mono("1", SMALL_SIZE, MUTED).next_to(bar, DOWN, buff=0.15).align_to(bar, RIGHT))
        mapping = solid_arrow(values.get_right() + RIGHT * 0.1, bar.get_left() + LEFT * 0.1, MUTED)
        self.say("The scaling service maps data values into the zero-to-one range that colormaps read.", FadeIn(values), AnimationGroup(GrowArrow(mapping), FadeIn(bar), FadeIn(ends)))
        formula = equation(r"t = \operatorname{clamp}_{[0,1]}\!\left(\frac{f(v) - f(d_0)}{f(d_1) - f(d_0)}\right)^{\gamma}", 44).move_to([-2.4, 0.15, 0])
        modes = VGroup(
            equation(r"f(x) = x", 40, API),
            equation(r"f(x) = \log_b x", 40, ENGINE),
            equation(r"f(x) = \operatorname{sign}(x)\,\log_b\!\left(1 + \tfrac{|x|}{c}\right)", 40, DATA)
        ).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to([-2.4, -1.75, 0])
        names = VGroup(*[mono(name, SMALL_SIZE, color).next_to(mode, LEFT, buff=0.3) for name, color, mode in zip(['"linear"', '"log"', '"symlog"'], [API, ENGINE, DATA], modes)])
        options = VGroup(*[mono(option, SMALL_SIZE, color) for option, color in [("clampMode", TEXT), ('"none" · "range" · "percentile"', MUTED), ("gamma", TEXT), ("invert: t → 1 − t", TEXT)]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([3.7, -1.15, 0])
        self.say(
            "A transform is linear, logarithmic, or symmetric logarithmic, with optional range or percentile clamping, gamma, and inversion.",
            Write(formula),
            AnimationGroup(LaggedStart(*[FadeIn(mode) for mode in modes], lag_ratio=0.25), FadeIn(names)),
            LaggedStart(*[FadeIn(option, shift=0.1 * RIGHT) for option in options], lag_ratio=0.25),
        )
        chain = VGroup(*[box(label, color, 2.35, 1.0, SMALL_SIZE, MEDIUM) for label, color in [(["extract", "finite values"], DATA), (["compact"], DATA), (["min and", "max"], COMPUTE), (["histogram"], COMPUTE), (["async", "readback"], BROWSER)]]).arrange(RIGHT, buff=0.32).move_to(UP * 1.1)
        chain_arrows = VGroup(*[connect(chain[index], chain[index + 1]) for index in range(4)])
        call = mono("wgpu.scale.requestStats({ source, percentiles })", 22, TEXT).next_to(chain, UP, buff=0.3)
        self.say(
            "Statistics come from requestStats, which runs on the GPU: extract finite values, compact them, find the range, and build a histogram when percentiles are requested.",
            AnimationGroup(FadeOut(VGroup(values, bar, ends, mapping, formula, modes, names, options)), FadeIn(call), FadeIn(chain[0])),
            AnimationGroup(GrowArrow(chain_arrows[0]), FadeIn(chain[1])),
            AnimationGroup(GrowArrow(chain_arrows[1]), FadeIn(chain[2])),
            AnimationGroup(GrowArrow(chain_arrows[2]), FadeIn(chain[3])),
            AnimationGroup(GrowArrow(chain_arrows[3]), FadeIn(chain[4]))
        )
        heights = [0.1, 0.25, 0.5, 0.9, 1.3, 1.5, 1.35, 1.0, 0.7, 0.45, 0.3, 0.2, 0.12, 0.08, 0.05, 0.04]
        bars = VGroup(*[Rectangle(width=0.32, height=height, stroke_width=0, fill_color=colormap_color(index / 15), fill_opacity=0.85) for index, height in enumerate(heights)]).arrange(RIGHT, buff=0.04, aligned_edge=DOWN).move_to([-2.6, -1.5, 0])
        axis = Line(bars.get_corner(DOWN + LEFT) + LEFT * 0.1, bars.get_corner(DOWN + RIGHT) + RIGHT * 0.1, color=MUTED, stroke_width=2)
        low = DashedLine(bars[1].get_bottom() + UP * 0.0, bars[1].get_bottom() + UP * 1.7, dash_length=0.08, color=TEXT, stroke_width=2)
        high = DashedLine(bars[11].get_bottom(), bars[11].get_bottom() + UP * 1.7, dash_length=0.08, color=TEXT, stroke_width=2)
        marks = VGroup(mono("p2", SMALL_SIZE, TEXT).next_to(low, UP, buff=0.08), mono("p98", SMALL_SIZE, TEXT).next_to(high, UP, buff=0.08))
        cache = VGroup(mono("2048 bins by default", SMALL_SIZE, MUTED), mono("invalidate(source) · clearCache()", SMALL_SIZE, TEXT)).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to([3.4, -1.3, 0])
        self.say(
            "Percentiles default to two and ninety-eight, estimated from a 2048-bin histogram, and results are cached until invalidated.",
            AnimationGroup(LaggedStart(*[FadeIn(bar_, shift=0.1 * UP) for bar_ in bars], lag_ratio=0.05), Create(axis)),
            AnimationGroup(Create(low), Create(high), FadeIn(marks)),
            FadeIn(cache)
        )
        apply = VGroup(mono("pointCloud.applyScaleStats(stats)", SMALL_SIZE, TEXT), txt("legends read the same scale state", SMALL_SIZE, MUTED))
        apply.arrange(DOWN, buff=0.25).move_to([3.4, -1.3, 0])
        self.say("Objects apply the results to their own transforms, and legends read the same scale state.", AnimationGroup(FadeOut(cache), FadeIn(apply[0])), FadeIn(apply[1]))

# ============================== Video: interop ==============================
# Sources: ./typescript/wasm/driver.ts, ./typescript/wasm/interop.ts, ./rust/src/frame_arena.rs,
# ./typescript/core/engine.ts (run, createHeapArena), ./typescript/world/pointcloud.ts (wasmData, refreshFromWasm),
# ./typescript/python/index.ts, ./python/interop.py, ./typescript/wgsl/interop.ts,
# ./website/docs/interop/*.md, ./website/docs/index.md (platform requirements), and ./ARCHITECTURE.md §1.18-§1.19.

def arena_bar(label: str, width: float, color: str, note: str) -> VGroup:
    bar = Rectangle(width=width, height=0.62, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.06)
    name = mono(label, SMALL_SIZE, color).next_to(bar, UP, buff=0.18).align_to(bar, LEFT)
    extra = mono(note, SMALL_SIZE, MUTED).next_to(bar, UP, buff=0.18).align_to(bar, RIGHT)
    return VGroup(bar, name, extra)

def bump_blocks(bar: Rectangle, widths: Sequence[float], colors: Sequence[str]) -> VGroup:
    blocks = VGroup(*[Rectangle(width=width, height=bar.height - 0.14, stroke_width=0, fill_color=color, fill_opacity=0.7) for width, color in zip(widths, colors)]).arrange(RIGHT, buff=0.05)
    return blocks.move_to(bar.get_left() + RIGHT * (blocks.width / 2 + 0.07))

class InteropVideo(WasmGPUVideoScene):
    CHAPTERS = ["Driver memory", "The frame arena", "Heap arenas", "Foreign WebAssembly", "Python in the browser", "Declarative WebGPU"]

    def construct(self) -> None:
        self.open("Interoperability covers three memory workflows: WasmGPU's own driver memory, arenas inside it, and data owned by foreign WebAssembly modules or Python.")
        self.driver_memory()
        self.frame_arena()
        self.heap_arenas()
        self.foreign()
        self.python()
        self.webgpu()
        self.finish(
            ["Typed views over the driver's memory", "Frame arena: bump allocation and epochs", "Heap arenas: one block, reset or destroy", "Foreign modules: validated, borrowed views", "Python ndarrays and declarative WebGPU"],
            "To recap: driver memory views, the frame arena, heap arenas, foreign module views, Python transfers, and declarative WebGPU layouts.",
            "The full reference is in the Interoperability section of the documentation."
        )

    def driver_memory(self) -> None:
        self.chapter(1, "Driver memory")
        memory = arena_bar("WasmGPU.driver", 10.4, DRIVER, "WebAssembly linear memory")
        memory.move_to([-0.8, 1.3, 0])
        regions = bump_blocks(memory[0], [1.4, 0.9, 3.2, 1.1], [DRIVER, DRIVER, ENGINE, DRIVER])
        region_labels = VGroup(mono("heap", 22, TEXT).move_to(regions[0]), mono("heap", 22, TEXT).move_to(regions[1]), mono("frame arena", 22, TEXT).move_to(regions[2]), mono("heap", 22, TEXT).move_to(regions[3]))
        calls = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["driver.view(Float32Array, ptr, len)", "driver.bytes()", "driver.heap.allocF32(len)", "driver.frame.allocF32(len)"]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([-2.2, -0.9, 0])
        kinds = VGroup(*[mono(kind, SMALL_SIZE, MUTED) for kind in ["typed view", "byte view", 'WasmSlice "heap"', 'WasmSlice "frame"']]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).next_to(calls, RIGHT, buff=0.8)
        self.say(
            "WasmGPU.driver exposes the Rust driver's own linear memory, with typed views and heap or frame-scoped slices.",
            AnimationGroup(FadeIn(memory), LaggedStart(*[FadeIn(region) for region in regions], lag_ratio=0.2), FadeIn(region_labels)),
            LaggedStart(*[FadeIn(call, shift=0.1 * RIGHT) for call in calls], lag_ratio=0.2),
            FadeIn(kinds)
        )
        growth = Rectangle(width=1.6, height=0.62, stroke_color=DRIVER, stroke_width=3, fill_color=DRIVER, fill_opacity=0.25).next_to(memory[0], RIGHT, buff=0)
        grow_label = mono("grow", SMALL_SIZE, DRIVER).next_to(growth, UP, buff=0.18)
        old_view = VGroup(chip("typed view from driver.view()", ERROR, 5.4, 22, font=MONO), txt("reacquire after growth", SMALL_SIZE, ERROR)).arrange(RIGHT, buff=0.35)
        new_view = VGroup(chip("slice.view()", ENGINE, 5.4, 22, font=MONO), txt("current buffer on every call", SMALL_SIZE, ENGINE)).arrange(RIGHT, buff=0.35)
        VGroup(old_view, new_view).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to(DOWN * 0.9)
        self.say(
            "Memory can grow and replace its buffer, so typed views must be reacquired after growth, while slices hand out a fresh view on each call.",
            AnimationGroup(FadeOut(VGroup(calls, kinds)), FadeIn(growth, shift=0.2 * LEFT), FadeIn(grow_label)),
            FadeIn(old_view),
            FadeIn(new_view)
        )
        shared = VGroup(mono("driver.isSharedMemory()", SMALL_SIZE, TEXT), mono("driver.requireSharedMemory()", SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.8).move_to(DOWN * 2.45)
        self.say("Shared-memory checks report whether that memory is a SharedArrayBuffer, which the default build does not require.", FadeIn(shared[0]), FadeIn(shared[1]))

    def frame_arena(self) -> None:
        self.chapter(2, "The frame arena")
        arena = arena_bar("WasmGPU.frameArena", 11.6, DRIVER, "capBytes() = 8 MiB").move_to(UP * 1.2)
        blocks = bump_blocks(arena[0], [1.0, 2.0, 0.6, 1.6], [API, ENGINE, DATA, COMPUTE])
        head = Polygon([0, 0, 0], [-0.13, -0.22, 0], [0.13, -0.22, 0], fill_color=TEXT, fill_opacity=1, stroke_width=0).move_to(arena[0].get_left() + DOWN * 0.48)
        used = mono("usedBytes()", SMALL_SIZE, MUTED).next_to(arena[0], DOWN, buff=0.45).align_to(arena[0], LEFT)
        self.say("The frame arena is a bump allocator for per-frame scratch data, eight mebibytes by default.", FadeIn(arena), AnimationGroup(FadeIn(head), FadeIn(used)))
        calls = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["alloc(bytes, align = 16)", "allocF32(len)"]]).arrange(RIGHT, buff=0.8).move_to(DOWN * 0.55)
        self.say(
            "Each allocation advances a head pointer, aligned to sixteen bytes by default, and usedBytes and capBytes report the fill level.",
            FadeIn(calls),
            AnimationGroup(FadeIn(blocks[0:2]), head.animate.set_x(blocks[1].get_right()[0] + 0.03)),
            AnimationGroup(FadeIn(blocks[2:]), head.animate.set_x(blocks[3].get_right()[0] + 0.03), Indicate(used, color=TEXT))
        )
        epoch = mono("epoch() = 7", SMALL_SIZE, TEXT).move_to([3.6, -1.5, 0])
        next_epoch = mono("epoch() = 8", SMALL_SIZE, ACCENT).move_to(epoch)
        slice_chip = chip('driver.frame slice, epoch 7', ENGINE, 5.3, 22, font=MONO).move_to([-3.0, -1.5, 0])
        stale = chip('driver.frame slice, epoch 7', ERROR, 5.3, 22, font=MONO).move_to(slice_chip)
        rejected = txt("isAlive() is false", SMALL_SIZE, ERROR).next_to(stale, DOWN, buff=0.2)
        run_note = mono("WasmGPU.run() → frameArena.reset() every frame", SMALL_SIZE, MUTED).move_to(DOWN * 2.6)
        self.say(
            "Reset rewinds the head and advances the epoch, which invalidates every frame slice; WasmGPU.run calls reset at the start of each frame.",
            AnimationGroup(FadeOut(calls), FadeIn(slice_chip), FadeIn(epoch)),
            AnimationGroup(FadeOut(blocks), head.animate.set_x(arena[0].get_left()[0]), Transform(epoch, next_epoch)),
            AnimationGroup(Transform(slice_chip, stale), FadeIn(rejected)),
            FadeIn(run_note)
        )

    def heap_arenas(self) -> None:
        self.chapter(3, "Heap arenas")
        heap = arena_bar("WebAssembly heap", 12.0, MUTED, "wasm.allocBytes / freeBytes").move_to(UP * 1.3)
        block = Rectangle(width=5.4, height=0.62, stroke_color=DRIVER, stroke_width=3, fill_color=DRIVER, fill_opacity=0.12).move_to(heap[0].get_left() + RIGHT * 4.6)
        block_label = mono("WasmHeapArena", SMALL_SIZE, DRIVER).next_to(block, DOWN, buff=0.2)
        call = mono("wgpu.createHeapArena(capBytes, align = 16)", SMALL_SIZE, TEXT).move_to(DOWN * 0.3)
        self.say("createHeapArena reserves one block from the WebAssembly heap and bump-allocates inside it.", AnimationGroup(FadeIn(heap), FadeIn(call)), AnimationGroup(Create(block), FadeIn(block_label)))
        allocations = bump_blocks(block, [1.0, 1.6, 0.9], [DRIVER, DRIVER, DRIVER])
        crosses = VGroup(*[cross_mark(ERROR, 0.32).move_to(item) for item in allocations])
        lifecycle = VGroup(mono("reset()", SMALL_SIZE, TEXT), txt("slices expire, block kept", SMALL_SIZE, MUTED), mono("destroy()", SMALL_SIZE, TEXT), txt("slices expire, block freed", SMALL_SIZE, MUTED))
        lifecycle_rows = VGroup(VGroup(lifecycle[0], lifecycle[1]).arrange(RIGHT, buff=0.4), VGroup(lifecycle[2], lifecycle[3]).arrange(RIGHT, buff=0.4)).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to(DOWN * 1.35)
        self.say(
            "Its slices expire when the arena resets or is destroyed, and destroy returns the whole block to the heap.",
            AnimationGroup(FadeOut(call), LaggedStart(*[FadeIn(item) for item in allocations], lag_ratio=0.25)),
            AnimationGroup(FadeIn(lifecycle_rows[0]), LaggedStart(*[Create(cross) for cross in crosses], lag_ratio=0.2)),
            AnimationGroup(FadeIn(lifecycle_rows[1]), FadeOut(VGroup(allocations, crosses)), block.animate.set_stroke(MUTED).set_fill(MUTED, opacity=0.04))
        )
        heap_slice = VGroup(mono("driver.heap.allocF32(len)", SMALL_SIZE, TEXT), txt("valid until slice.free()", SMALL_SIZE, ENGINE)).arrange(RIGHT, buff=0.5).move_to(DOWN * 2.5)
        self.say("Heap slices from the driver are different: each stays valid until its own free call.", FadeIn(heap_slice[0]), FadeIn(heap_slice[1]))

    def foreign(self) -> None:
        self.chapter(4, "Foreign WebAssembly")
        factories = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["webassembly.fromInstance(instance)", "webassembly.fromExports(exports)", "webassembly.fromMemory(memory)"]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([-2.6, 1.55, 0])
        module = box(["WasmModule"], BROWSER, 3.0, 0.7, SMALL_SIZE, MEDIUM, font=MONO).move_to([4.3, 1.55, 0])
        arrows = VGroup(*[solid_arrow(factory.get_right(), module.get_left(), MUTED) for factory in factories])
        self.say("WasmGPU.webassembly wraps another module's instance, exports, or memory, as a WasmModule.", LaggedStart(*[FadeIn(factory, shift=0.1 * RIGHT) for factory in factories], lag_ratio=0.25), AnimationGroup(*[GrowArrow(arrow) for arrow in arrows], FadeIn(module)))
        foreign_memory = memory_cells(16, BROWSER, 0.5).move_to(DOWN * 0.55)
        foreign_label = mono("foreign linear memory", SMALL_SIZE, BROWSER).next_to(foreign_memory, UP, buff=0.18).align_to(foreign_memory, LEFT)
        window = SurroundingRectangle(foreign_memory[4:12], color=ENGINE, buff=0.04, stroke_width=4)
        view_call = mono('module.view({ ptr, length, dtype: "f32" })', SMALL_SIZE, ENGINE).next_to(foreign_memory, DOWN, buff=0.35)
        checks = VGroup(txt("range inside the memory", SMALL_SIZE, MUTED), txt("ptr aligned to the dtype", SMALL_SIZE, MUTED)).arrange(RIGHT, buff=0.9).next_to(view_call, DOWN, buff=0.3)
        self.say(
            "Views over that memory take a pointer, a length, and a dtype; the range is validated, and the pointer must be aligned for the dtype.",
            AnimationGroup(FadeOut(VGroup(factories, arrows)), FadeIn(foreign_memory), FadeIn(foreign_label)),
            AnimationGroup(Create(window), FadeIn(view_call)),
            FadeIn(checks)
        )
        sources = VGroup(*[mono(source, SMALL_SIZE, TEXT) for source in ['ptr: { export: "points_ptr" }', "length: () => count()"]]).arrange(RIGHT, buff=0.8).move_to(DOWN * 2.55)
        moved = SurroundingRectangle(foreign_memory[7:15], color=ENGINE, buff=0.04, stroke_width=4)
        self.say(
            "Pointers and lengths can come from exported functions or globals, and refresh re-resolves them after the module reallocates or grows.",
            AnimationGroup(FadeOut(checks), FadeIn(sources)),
            AnimationGroup(Transform(window, moved), Indicate(view_call, color=ENGINE, scale_factor=1.04))
        )
        flow = VGroup(*[box([label], color, 3.7, 0.7, 22, MEDIUM, font=MONO) for label, color in [("WasmMemoryView", BROWSER), ("PointCloud wasmData", DATA), ("object GPU buffer", COMPUTE)]]).arrange(RIGHT, buff=0.75).move_to(DOWN * 0.4)
        flow_arrows = VGroup(dashed_arrow(flow[0].get_right(), flow[1].get_left(), DATA), dashed_arrow(flow[1].get_right(), flow[2].get_left(), COMPUTE))
        refresh = mono("refreshFromWasm()", 22, COMPUTE).move_to([flow_arrows[1].get_center()[0], flow.get_top()[1] + 0.35, 0])
        borrowed = txt("borrowed: foreign memory is never freed", SMALL_SIZE, MUTED).next_to(flow, DOWN, buff=0.45)
        self.say(
            "Geometry and the scientific objects accept these views as borrowed sources, copy them into their own GPU buffers on refresh, and never free foreign memory.",
            AnimationGroup(FadeOut(VGroup(module, foreign_memory, foreign_label, window, view_call, sources)), FadeIn(flow[0])),
            AnimationGroup(Create(flow_arrows[0]), FadeIn(flow[1])),
            AnimationGroup(Create(flow_arrows[1]), FadeIn(refresh), FadeIn(flow[2])),
            FadeIn(borrowed)
        )

    def python(self) -> None:
        self.chapter(5, "Python in the browser")
        source = box(["Pyodide buffer", "NumPy array"], DATA, 3.4, 1.1, SMALL_SIZE, MEDIUM).move_to([-4.5, 0.6, 0])
        targets = VGroup(box(["CPUndarray"], DRIVER, 3.3, 0.7, SMALL_SIZE, MEDIUM, font=MONO), box(["GPUndarray"], BROWSER, 3.3, 0.7, SMALL_SIZE, MEDIUM, font=MONO)).arrange(DOWN, buff=0.75).move_to([3.8, 0.6, 0])
        links = VGroup(solid_arrow(source.get_right(), targets[0].get_left(), TEXT), solid_arrow(source.get_right(), targets[1].get_left(), TEXT))
        labels = VGroup(mono("python.toCPU(src)", 22, TEXT).next_to(links[0].get_center(), UP, buff=0.2), mono("python.toGPU(src)", 22, TEXT).next_to(links[1].get_center(), DOWN, buff=0.2))
        self.say(
            "In Pyodide, the Python interop copies a Python buffer into a new CPUndarray, or uploads it straight into a GPUndarray.",
            FadeIn(source),
            AnimationGroup(GrowArrow(links[0]), FadeIn(labels[0]), FadeIn(targets[0])),
            AnimationGroup(GrowArrow(links[1]), FadeIn(labels[1]), FadeIn(targets[1]))
        )
        dtypes = VGroup(*[pill(dtype, DATA, 22, MONO) for dtype in ["i8", "u8", "i16", "u16", "i32", "u32", "f32", "f64"]]).arrange(RIGHT, buff=0.15).move_to(DOWN * 1.5)
        rules = VGroup(txt("C-contiguous only", SMALL_SIZE, TEXT), mono("copyInto(dst, src): same dtype and shape", 22, TEXT)).arrange(RIGHT, buff=0.8).move_to(DOWN * 2.35)
        self.say("Inputs must be C-contiguous, in one of eight dtypes, and copyInto requires an exact dtype and shape match.", LaggedStart(*[FadeIn(dtype) for dtype in dtypes], lag_ratio=0.1), FadeIn(rules[0]), FadeIn(rules[1]))
        release = VGroup(VGroup(mono("getBuffer()", SMALL_SIZE, TEXT), txt("acquired here, released exactly once", SMALL_SIZE, ENGINE)).arrange(RIGHT, buff=0.4), VGroup(mono("PyBufferLike", SMALL_SIZE, TEXT), txt("passed in, borrowed, never released", SMALL_SIZE, MUTED)).arrange(RIGHT, buff=0.4)).arrange(DOWN, buff=0.35, aligned_edge=LEFT).move_to(DOWN * 1.9)
        self.say(
            "A buffer the interop acquires is released exactly once, even on failure, while a buffer you pass directly stays borrowed.",
            AnimationGroup(FadeOut(VGroup(dtypes, rules)), FadeIn(release[0])),
            FadeIn(release[1])
        )
        code = code_panel("""
interop = WasmGPUInterop(wgpu)
gpu = interop.to_gpu(points, dtype="f32", copy="if_needed")
cpu = interop.to_cpu(values)
result = await interop.from_gpu(gpu)
""", "python", 22).move_to(DOWN * 0.2)
        policies = mono('copy = "never" | "if_needed" | "always"', SMALL_SIZE, MUTED).next_to(code, DOWN, buff=0.35)
        self.say(
            "On the Python side, a helper class normalizes NumPy arrays with never, if-needed, or always copy policies.",
            AnimationGroup(FadeOut(VGroup(source, targets, links, labels, release)), FadeIn(code)),
            FadeIn(policies)
        )

    def webgpu(self) -> None:
        self.chapter(6, "Declarative WebGPU")
        builders = VGroup(*[mono(call, 22, TEXT) for call in ["webgpu.storageBufferLayout({ binding: 0 })", "webgpu.uniformBufferLayout({ binding: 1 })", "webgpu.samplerLayout({ binding: 2 })", "webgpu.textureLayout({ binding: 3 })"]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT)
        builders.move_to([SAFE_LEFT + 0.1 + builders.width / 2, 1.15, 0])
        layout = box(["GPUBindGroupLayoutEntry"], BROWSER, 4.4, 0.7, 22, MEDIUM, font=MONO).move_to([4.3, 1.15, 0])
        layout_arrow = solid_arrow(builders.get_right() + RIGHT * 0.1, layout.get_left(), MUTED)
        visibility = txt("buffers default to compute visibility", SMALL_SIZE, MUTED).next_to(builders, DOWN, buff=0.3).align_to(builders, LEFT)
        self.say(
            "WasmGPU.webgpu builds bind group layout entries for storage, uniform, sampler, and texture bindings, with compute visibility by default for buffers.",
            LaggedStart(*[FadeIn(builder, shift=0.1 * RIGHT) for builder in builders], lag_ratio=0.25),
            AnimationGroup(GrowArrow(layout_arrow), FadeIn(layout)),
            FadeIn(visibility)
        )
        inputs = VGroup(*[chip(label, color, len(label) * 0.17 + 0.6, 22, font=MONO) for label, color in [("StorageBuffer", COMPUTE), ("GPUBuffer", BROWSER), ("{ buffer, offset, size }", DATA), ("GPUSampler", ACCENT), ("GPUTextureView", ACCENT)]])
        VGroup(VGroup(*inputs[:3]).arrange(RIGHT, buff=0.2), VGroup(*inputs[3:]).arrange(RIGHT, buff=0.2)).arrange(DOWN, buff=0.2).move_to(DOWN * 0.95)
        normalize = mono("webgpu.bindingResource() · webgpu.bindGroupResources()", 22, TEXT).next_to(inputs, DOWN, buff=0.35)
        self.say(
            "Its resource helpers normalize storage buffers, raw GPU buffers, buffer ranges, samplers, and texture views into binding entries.",
            AnimationGroup(FadeOut(visibility), LaggedStart(*[FadeIn(item, shift=0.1 * UP) for item in inputs], lag_ratio=0.15)),
            FadeIn(normalize)
        )
        consumers = VGroup(box(["ComputePipeline"], COMPUTE, 3.4, 0.7, SMALL_SIZE, MEDIUM, font=MONO), box(["CustomMaterial"], DATA, 3.4, 0.7, SMALL_SIZE, MEDIUM, font=MONO)).arrange(RIGHT, buff=0.6).move_to(DOWN * 1.35)
        describes = txt("describes resources; never schedules work", SMALL_SIZE, MUTED).next_to(consumers, DOWN, buff=0.3)
        self.say(
            "It only describes resources: compute pipelines and custom materials still create and run the work.",
            AnimationGroup(FadeOut(VGroup(inputs, normalize)), FadeIn(consumers)),
            FadeIn(describes)
        )

# =============================== Video: math ================================
# Sources: ./website/docs/math/*.md (wasmgpu-math, mat4-perspective, mat4-lookat, vec3-refract, mat4-rotatex),
# ./typescript/wasm/driver.ts (mat4f/quatf/vec3f pointer namespaces), ./wasm/wasm.js (array wrappers over f32 scratch),
# ./rust/src/mat4.rs (perspective, lookAt, decompose_trs), ./rust/src/quat.rs (fromAxisAngle, mul, slerp, toRotation),
# ./rust/src/vec3.rs (proj, oproj, reflect, refract, ang, angBetween), ./typescript/world/camera.ts,
# ./rust/src/transform.rs, ./rust/src/anim.rs, ./rust/src/cull.rs, and ./ARCHITECTURE.md §1.19.

def index_grid(labels: Sequence[str], columns: int, color: str, highlight_cells: Sequence[int] = (), cell: float = 0.78, size: float = 22) -> VGroup:
    cells = VGroup()
    for index, label in enumerate(labels):
        accent = index in highlight_cells
        square = Square(side_length=cell, stroke_color=DATA if accent else color, stroke_width=2, fill_color=DATA if accent else color, fill_opacity=0.35 if accent else 0.08)
        cells.add(VGroup(square, mono(label, size, TEXT).move_to(square)))
    return cells.arrange_in_grid(cols=columns, buff=0)

class MathVideo(WasmGPUVideoScene):
    CHAPTERS = ["Two API styles", "Conventions", "Vectors", "Matrices", "Quaternions", "Where it is used"]

    def construct(self) -> None:
        self.open("WasmGPU's math library covers 3D vectors, four-by-four matrices, and quaternions, in single and double precision, implemented in Rust and exposed to JavaScript.")
        self.api_styles()
        self.conventions()
        self.vectors()
        self.matrices()
        self.quaternions()
        self.usage()
        self.finish(
            ["Array API and f32/f64 pointer API", "Column-major mat4, quat as [x, y, z, w]", "Projection, reflection, refraction", "TRS composition and decomposition", "Shortest-arc slerp with lerp fallback"],
            "To recap: two API styles, column-major matrices, vector projections and optics, transform matrices, and quaternion slerp.",
            "The full reference is in the Mathematics section of the documentation."
        )

    def api_styles(self) -> None:
        self.chapter(1, "Two API styles")
        arrays = code_panel("""
const model = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [2, 0, -5]);
const q = wgpu.math.quat.fromAxisAngle([0, 1, 0], Math.PI / 3);
""", size=20).move_to(UP * 1.55)
        self.say("The vec3, mat4, and quat namespaces take JavaScript arrays and return new arrays, which is convenient for setup code.", FadeIn(arrays), Indicate(arrays.code_lines[0], color=API, scale_factor=1.02))
        stages = VGroup(*[box(label, color, 2.85, 1.05, SMALL_SIZE, MEDIUM) for label, color in [(["JavaScript", "array"], API), (["f32 scratch", "block"], DRIVER), (["Rust", "kernel"], DRIVER), (["new", "array"], API)]]).arrange(RIGHT, buff=0.5).move_to(DOWN * 0.75)
        stage_arrows = VGroup(*[connect(stages[index], stages[index + 1]) for index in range(3)])
        memory_note = txt("reusable blocks in WebAssembly memory, binary32 arithmetic", SMALL_SIZE, MUTED).next_to(stages, DOWN, buff=0.35)
        self.say(
            "Behind them, values are copied into reusable scratch blocks in WebAssembly memory and computed by binary32 Rust kernels.",
            FadeIn(stages[0]),
            AnimationGroup(GrowArrow(stage_arrows[0]), FadeIn(stages[1]), GrowArrow(stage_arrows[1]), FadeIn(stages[2])),
            AnimationGroup(GrowArrow(stage_arrows[2]), FadeIn(stages[3]), FadeIn(memory_note))
        )
        rows = VGroup()
        for precision, color, names in [("f32 · binary32", COMPUTE, ["vec3f", "mat4f", "quatf"]), ("f64 · binary64", DRIVER, ["vec3d", "mat4d", "quatd"])]:
            label = txt(precision, LABEL_SIZE, color, SEMIBOLD)
            chips = VGroup(*[pill(name, color, LABEL_SIZE, MONO) for name in names]).arrange(RIGHT, buff=0.35)
            rows.add(VGroup(label, chips).arrange(RIGHT, buff=0.8))
        rows.arrange(DOWN, buff=0.4, aligned_edge=LEFT).move_to(UP * 1.25)
        self.say(
            "The pointer namespaces, vec3f, mat4f, and quatf for f32, and vec3d, mat4d, and quatd for f64, operate directly on WebAssembly memory.",
            AnimationGroup(FadeOut(VGroup(arrays, stages, stage_arrows, memory_note)), FadeIn(rows[0], shift=0.1 * RIGHT)),
            FadeIn(rows[1], shift=0.1 * RIGHT)
        )
        pointers = code_panel("""
const m = wgpu.math.mat4f.alloc();
wgpu.math.mat4f.identity(m);
wgpu.math.mat4f.rotateY(m, m, Math.PI / 4); // out may alias m
const values = wgpu.math.mat4f.view(m);
wasm.freeF32(m, 16);
""", size=22).move_to(DOWN * 1.3)
        self.say(
            "You allocate blocks and pass output pointers; nothing is allocated per call, outputs may alias inputs, and you free blocks with freeF32 or freeF64.",
            FadeIn(pointers),
            Create(highlight(pointers.code_lines[2], ENGINE, 0.05)),
            Create(highlight(pointers.code_lines[4], ERROR, 0.05))
        )

    def conventions(self) -> None:
        self.chapter(2, "Conventions")
        labels = [f"m{4 * column + row}" for row in range(4) for column in range(4)]
        grid = index_grid(labels, 4, API, highlight_cells=[3, 7, 11]).move_to([-3.6, 0.55, 0])
        flat = index_grid([str(index) for index in range(16)], 16, API, highlight_cells=[12, 13, 14], cell=0.62, size=22).move_to([0, -2.1, 0])
        braces = VGroup(*[mono(f"column {index}", 22, MUTED).next_to(flat[4 * index:4 * index + 4], UP, buff=0.12) for index in range(4)])
        translation = txt("translation", SMALL_SIZE, DATA).next_to(grid, RIGHT, buff=0.35).align_to(grid, UP).shift(DOWN * 0.2)
        self.say(
            "A mat4 is sixteen numbers in column-major order, so the translation sits in elements twelve, thirteen, and fourteen.",
            FadeIn(grid),
            AnimationGroup(FadeIn(flat), FadeIn(braces)),
            FadeIn(translation)
        )
        quat = index_grid(["x", "y", "z", "w"], 4, ACCENT, highlight_cells=[3], cell=0.85, size=SMALL_SIZE).move_to([3.4, 1.35, 0])
        parts = VGroup(txt("vector part", SMALL_SIZE, ACCENT).next_to(quat[0:3], DOWN, buff=0.2), txt("scalar", SMALL_SIZE, DATA).next_to(quat[3], DOWN, buff=0.2))
        self.say("A quat is stored as x, y, z, then w, with the scalar part last.", FadeIn(quat), FadeIn(parts))
        notes = VGroup(*[txt(note, SMALL_SIZE, TEXT) for note in ["Right-handed projections", "WebGPU depth range [0, 1]", "Angles in radians"]]).arrange(DOWN, buff=0.22, aligned_edge=LEFT).move_to([3.4, -0.55, 0])
        self.say("Projections are right-handed with WebGPU depth from zero to one, and angles are in radians.", *[FadeIn(note, shift=0.1 * RIGHT) for note in notes])

    def vectors(self) -> None:
        self.chapter(3, "Vectors")
        operations = VGroup(*[pill(name, COMPUTE, 22, MONO) for name in ["dot", "cross", "norm", "normalize", "dist", "isParallel", "isOrthogonal", "isNormalized"]])
        VGroup(VGroup(*operations[:5]).arrange(RIGHT, buff=0.2), VGroup(*operations[5:]).arrange(RIGHT, buff=0.2)).arrange(DOWN, buff=0.2).move_to(UP * 1.75)
        self.say("Vector operations include dot and cross products, norms, normalization, distances, and predicates such as isParallel and isOrthogonal.", LaggedStart(*[FadeIn(item) for item in operations[:5]], lag_ratio=0.15), LaggedStart(*[FadeIn(item) for item in operations[5:]], lag_ratio=0.15))
        origin = np.array([-5.6, -2.2, 0])
        b = np.array([4.2, 0.9, 0])
        a = np.array([1.9, 2.6, 0])
        projection = b * (np.dot(a, b) / np.dot(b, b))
        vec_b = Arrow(origin, origin + b, buff=0, color=MUTED, stroke_width=4, tip_length=0.2)
        vec_a = Arrow(origin, origin + a, buff=0, color=TEXT, stroke_width=4, tip_length=0.2)
        vec_p = Arrow(origin, origin + projection, buff=0, color=DATA, stroke_width=5, tip_length=0.2)
        vec_o = DashedLine(origin + projection, origin + a, dash_length=0.1, color=BROWSER, stroke_width=4)
        tags = VGroup(equation("a", 40).next_to(vec_a.get_end(), UP, buff=0.1), equation("b", 40).next_to(vec_b.get_end(), RIGHT, buff=0.1))
        formulas = VGroup(equation(r"\operatorname{proj}_b a = \frac{a \cdot b}{\lVert b \rVert^2}\, b", 44, DATA), equation(r"\operatorname{oproj}_b a = a - \operatorname{proj}_b a", 44, BROWSER)).arrange(DOWN, buff=0.4, aligned_edge=LEFT).move_to([2.7, -0.9, 0])
        self.say(
            "Projection keeps the component of a along b, and the orthogonal projection keeps the rest.",
            AnimationGroup(GrowArrow(vec_b), GrowArrow(vec_a), FadeIn(tags)),
            AnimationGroup(GrowArrow(vec_p), Write(formulas[0])),
            AnimationGroup(Create(vec_o), Write(formulas[1]))
        )
        hit = np.array([-3.3, -1.0, 0])
        surface = Line(hit + LEFT * 2.6, hit + RIGHT * 2.6, color=MUTED, stroke_width=3)
        normal = Arrow(hit, hit + UP * 1.5, buff=0, color=ENGINE, stroke_width=4, tip_length=0.2)
        incident = Arrow(hit + np.array([-1.6, 1.4, 0]), hit, buff=0, color=TEXT, stroke_width=4, tip_length=0.2)
        reflected = Arrow(hit, hit + np.array([1.6, 1.4, 0]), buff=0, color=DATA, stroke_width=4, tip_length=0.2)
        refracted = Arrow(hit, hit + np.array([0.95, -1.5, 0]), buff=0, color=COMPUTE, stroke_width=4, tip_length=0.2)
        optics_tags = VGroup(equation(r"\hat n", 40, ENGINE).next_to(normal.get_end(), UP, buff=0.08), equation("v", 40).next_to(incident.get_start(), LEFT, buff=0.08), equation("r", 40, DATA).next_to(reflected.get_end(), RIGHT, buff=0.08), equation("t", 40, COMPUTE).next_to(refracted.get_end(), RIGHT, buff=0.08))
        optics = VGroup(equation(r"r = v - 2\,(v \cdot \hat n)\,\hat n", 44, DATA), equation(r"t = \eta\,(v - d\,\hat n) - \hat n \sqrt{1 - \eta^2 (1 - d^2)}", 40, COMPUTE), equation(r"d = v \cdot \hat n, \quad \eta = n_1 / n_2", 40, MUTED)).arrange(DOWN, buff=0.35, aligned_edge=LEFT).move_to([2.9, -0.75, 0])
        self.say(
            "Reflect mirrors a vector about a normal, and refract bends it by a ratio of refractive indices.",
            AnimationGroup(FadeOut(VGroup(vec_a, vec_b, vec_p, vec_o, tags, formulas)), Create(surface), GrowArrow(normal), GrowArrow(incident)),
            AnimationGroup(GrowArrow(reflected), Write(optics[0]), FadeIn(optics_tags[0:3])),
            AnimationGroup(GrowArrow(refracted), Write(optics[1]), FadeIn(optics[2]), FadeIn(optics_tags[3]))
        )
        angles = VGroup(equation(r"\operatorname{ang}(v)_i = \arccos \frac{v_i}{\lVert v \rVert}", 44), equation(r"\operatorname{angBetween}(a, b) = \arccos \frac{a \cdot b}{\lVert a \rVert \, \lVert b \rVert}", 44)).arrange(DOWN, buff=0.45).move_to(DOWN * 0.75)
        self.say(
            "ang returns the direction angles to each axis, and angBetween returns the angle between two vectors.",
            AnimationGroup(FadeOut(VGroup(surface, normal, incident, reflected, refracted, optics_tags, optics)), Write(angles[0])),
            Write(angles[1])
        )

    def matrices(self) -> None:
        self.chapter(4, "Matrices")
        basics = VGroup(*[pill(name, API, LABEL_SIZE, MONO) for name in ["identity", "mul", "invert", "det", "transpose", "trace"]]).arrange(RIGHT, buff=0.25).move_to(UP * 1.85)
        self.say("Matrix operations include identity, multiply, invert, determinant, transpose, and trace.", LaggedStart(*[FadeIn(item, shift=0.1 * UP) for item in basics], lag_ratio=0.15), max_run=2.0)
        builders = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["translate(m, v)", "rotateX / rotateY / rotateZ(m, angle)", "lookAt(eye, center, up)", "perspective(fovY, aspect, near, far)"]]).arrange(DOWN, buff=0.28, aligned_edge=LEFT).move_to([-3.1, -0.45, 0])
        projection = equation(r"P = \begin{pmatrix} f/a & 0 & 0 & 0 \\ 0 & f & 0 & 0 \\ 0 & 0 & \frac{F}{n - F} & \frac{nF}{n - F} \\ 0 & 0 & -1 & 0 \end{pmatrix}", 38).move_to([3.4, -0.25, 0])
        focal = equation(r"f = 1 / \tan(\theta_y / 2)", 38, MUTED).next_to(projection, DOWN, buff=0.3)
        self.say(
            "translate and rotateX, Y, and Z build transforms, and lookAt and perspective build view and projection matrices.",
            LaggedStart(*[FadeIn(item, shift=0.1 * RIGHT) for item in builders[:2]], lag_ratio=0.3),
            LaggedStart(*[FadeIn(item, shift=0.1 * RIGHT) for item in builders[2:]], lag_ratio=0.3),
            AnimationGroup(Write(projection), FadeIn(focal))
        )
        parts = VGroup(*[box([label], color, 1.2, 1.2, LABEL_SIZE, SEMIBOLD) for label, color in [("T", DATA), ("R", ACCENT), ("S", COMPUTE)]]).arrange(RIGHT, buff=0.25)
        model = box(["M"], API, 1.2, 1.2, LABEL_SIZE, SEMIBOLD)
        compose = VGroup(parts, mono("→", LABEL_SIZE, TEXT), model).arrange(RIGHT, buff=0.45).move_to([-3.0, 0.35, 0])
        trs = index_grid(["tx", "ty", "tz", "qx", "qy", "qz", "qw", "sx", "sy", "sz"], 10, MUTED, cell=0.68, size=22).move_to([1.2, -1.75, 0])
        for index, color in [(0, DATA), (1, DATA), (2, DATA), (3, ACCENT), (4, ACCENT), (5, ACCENT), (6, ACCENT), (7, COMPUTE), (8, COMPUTE), (9, COMPUTE)]:
            trs[index][0].set_stroke(color).set_fill(color, opacity=0.18)
        decompose = mono("mat4f.decomposeTRS(outTrs, m)", SMALL_SIZE, TEXT).next_to(trs, UP, buff=0.3)
        self.say(
            "Composing translation, rotation, and scale gives a model matrix, and decomposeTRS recovers the three parts in the pointer API.",
            AnimationGroup(FadeOut(VGroup(basics, builders, projection, focal)), FadeIn(parts)),
            AnimationGroup(FadeIn(compose[1]), FadeIn(model)),
            AnimationGroup(FadeIn(decompose), LaggedStart(*[FadeIn(cell) for cell in trs], lag_ratio=0.08))
        )

    def quaternions(self) -> None:
        self.chapter(5, "Quaternions")
        axis_angle = equation(r"q = \left(\hat u \sin\tfrac{\theta}{2},\ \cos\tfrac{\theta}{2}\right)", 52, ACCENT).move_to([-2.6, 1.6, 0])
        order = mono("[x, y, z, w]", SMALL_SIZE, MUTED).next_to(axis_angle, RIGHT, buff=0.6)
        self.say("fromAxisAngle builds a rotation from a unit axis and an angle, using the sine and cosine of half the angle.", Write(axis_angle), FadeIn(order))
        rotate = VGroup(equation(r"t = 2\, q_v \times v", 44), equation(r"v' = v + w\, t + q_v \times t", 44)).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to([-2.6, -0.3, 0])
        calls = VGroup(*[mono(call, SMALL_SIZE, TEXT) for call in ["quat.mul(q1, q2)", "quat.invert(q)", "quat.toRotation(q, v)"]]).arrange(DOWN, buff=0.28, aligned_edge=LEFT).move_to([3.6, -0.3, 0])
        self.say("mul composes rotations, invert undoes them, and toRotation rotates a vector by a quaternion.", FadeIn(calls[0:2]), AnimationGroup(FadeIn(calls[2]), Write(rotate)))
        circle = Circle(radius=1.6, stroke_color=HAIRLINE, stroke_width=2).move_to([-3.8, -0.4, 0])
        start_angle, end_angle = 0.35, 1.9
        arc = Arc(radius=1.6, start_angle=start_angle, angle=end_angle - start_angle, arc_center=circle.get_center(), color=ACCENT, stroke_width=5)
        q1 = Dot(circle.get_center() + 1.6 * np.array([math.cos(start_angle), math.sin(start_angle), 0]), radius=0.11, color=TEXT)
        q2 = Dot(circle.get_center() + 1.6 * np.array([math.cos(end_angle), math.sin(end_angle), 0]), radius=0.11, color=TEXT)
        moving = Dot(q1.get_center(), radius=0.13, color=DATA)
        labels = VGroup(equation("q_1", 40).next_to(q1, RIGHT, buff=0.1), equation("q_2", 40).next_to(q2, UP, buff=0.1))
        slerp = equation(r"\operatorname{slerp}(q_1, q_2; t) = \frac{\sin((1 - t)\theta)}{\sin\theta}\, q_1 + \frac{\sin(t\theta)}{\sin\theta}\, q_2", 38).move_to([2.4, 0.5, 0])
        notes = VGroup(equation(r"\cos\theta = q_1 \cdot q_2", 38, MUTED), equation(r"\cos\theta < 0:\ \text{negate } q_2 \text{ (shortest arc)}", 38, MUTED), equation(r"\cos\theta > 0.9995:\ \text{normalized lerp}", 38, MUTED)).arrange(DOWN, buff=0.25, aligned_edge=LEFT).next_to(slerp, DOWN, buff=0.4)
        self.say(
            "slerp interpolates along the shortest arc; when the quaternions are nearly parallel, it falls back to a normalized linear blend.",
            AnimationGroup(FadeOut(VGroup(axis_angle, order, rotate, calls)), FadeIn(VGroup(circle, q1, q2, labels)), Write(slerp)),
            AnimationGroup(Create(arc), FadeIn(moving), FadeIn(notes[0:2])),
            AnimationGroup(MoveAlongPath(moving, arc), FadeIn(notes[2])),
            max_run=2.0
        )

    def usage(self) -> None:
        self.chapter(6, "Where it is used")
        camera = VGroup(box(["PerspectiveCamera"], API, 4.2, 0.7, SMALL_SIZE, MEDIUM, font=MONO), mono("mat4.perspective(fovRad, aspect, near, far)", 22, TEXT), mono("viewProjection = mat4.mul(proj, view)", 22, TEXT)).arrange(DOWN, buff=0.25).move_to(UP * 1.5)
        self.say("Cameras build their projection and view-projection matrices with these functions.", FadeIn(camera[0]), FadeIn(camera[1:]))
        driver = VGroup(*[box(label, DRIVER, 4.1, 1.55, SMALL_SIZE, MEDIUM) for label in [["transform.rs", "compose T · R · S,", "parent · local"], ["anim.rs", "keyframe sampling,", "quaternion slerp"], ["cull.rs", "frustum planes from", "view-projection"]]]).arrange(RIGHT, buff=0.25).move_to(DOWN * 0.85)
        self.say(
            "Inside the driver, Rust composes transform matrices, samples rotations with slerp for animation, and extracts frustum planes for culling.",
            FadeIn(driver[0], shift=0.1 * UP),
            FadeIn(driver[1], shift=0.1 * UP),
            FadeIn(driver[2], shift=0.1 * UP)
        )
        pointers = VGroup(pill("Render", ENGINE, LABEL_SIZE), pill("World", API, LABEL_SIZE)).arrange(RIGHT, buff=0.5).move_to(DOWN * 2.45)
        self.say("See the Render and World sections for how those systems use the results.", FadeIn(pointers[0]), FadeIn(pointers[1]))

# ============================== Video: objects ==============================
# Sources: ./typescript/world/mesh.ts, ./typescript/core/engine.ts (geometry, material, texture, colormap factories),
# ./typescript/graphics/geometry.ts, ./typescript/graphics/material.ts, ./typescript/graphics/texture.ts,
# ./typescript/graphics/colormap.ts (built-in tables), ./typescript/world/{pointcloud,glyphfield,nodelink,splatfield,latticespace}.ts,
# ./typescript/gltf/ (loader.ts, accessors.ts, import.ts), ./rust/src/accessors.rs, ./typescript/graphics/animation.ts,
# ./rust/src/anim.rs, ./wgsl/graphics/ (skinned, skinned8), ./website/docs/objects/*.md, and ./ARCHITECTURE.md §1.5-§1.8, §1.16-§1.17.

def primitive_glyph(kind: str, color: str = DATA, size: float = 0.9) -> VMobject:
    h = size / 2
    if kind == "box":
        return object_glyph("mesh", size, color)
    if kind == "sphere":
        return VGroup(Circle(radius=h, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15), Ellipse(width=size, height=size * 0.3, stroke_color=color, stroke_width=1.5))
    if kind == "cylinder":
        top = Ellipse(width=size * 0.8, height=size * 0.25, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15).shift(UP * h * 0.75)
        bottom = Ellipse(width=size * 0.8, height=size * 0.25, stroke_color=color, stroke_width=2).shift(DOWN * h * 0.75)
        sides = VGroup(Line(top.get_left(), bottom.get_left(), color=color, stroke_width=2), Line(top.get_right(), bottom.get_right(), color=color, stroke_width=2))
        return VGroup(top, bottom, sides)
    if kind == "torus":
        return VGroup(Ellipse(width=size, height=size * 0.55, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15), Ellipse(width=size * 0.45, height=size * 0.2, stroke_color=color, stroke_width=2, fill_color=BACKGROUND, fill_opacity=1))
    if kind == "prism":
        top = Polygon(*[[h * 0.8 * math.cos(a), h * 0.25 * math.sin(a) + h * 0.6, 0] for a in np.linspace(0, 2 * PI, 7)[:-1]], stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15)
        edges = VGroup(*[Line([h * 0.8 * math.cos(a), h * 0.25 * math.sin(a) + h * 0.6, 0], [h * 0.8 * math.cos(a), h * 0.25 * math.sin(a) - h * 0.6, 0], color=color, stroke_width=1.5) for a in np.linspace(0, 2 * PI, 7)[:-1] if math.sin(a) <= 0.01])
        return VGroup(top, edges)
    if kind == "pyramid":
        return VGroup(Polygon([0, h, 0], [-h, -h * 0.55, 0], [h * 0.3, -h * 0.85, 0], stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.25), Polygon([0, h, 0], [h * 0.3, -h * 0.85, 0], [h, -h * 0.45, 0], stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.1))
    if kind == "plane":
        return Polygon([-h, -h * 0.5, 0], [h * 0.5, -h * 0.5, 0], [h, h * 0.5, 0], [-h * 0.5, h * 0.5, 0], stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15)
    if kind == "circle":
        return Circle(radius=h * 0.85, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15)
    if kind == "ellipse":
        return Ellipse(width=size, height=size * 0.55, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15)
    if kind == "rectangle":
        return Rectangle(width=size, height=size * 0.6, stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15)
    if kind == "triangle":
        return Polygon([0, h * 0.8, 0], [-h, -h * 0.7, 0], [h, -h * 0.7, 0], stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.15)
    if kind == "line":
        return Line([-h, -h * 0.4, 0], [h, h * 0.4, 0], color=color, stroke_width=4)
    if kind == "point":
        return Dot(ORIGIN, radius=0.09, color=color)
    raise ValueError(f"Unknown primitive glyph: {kind}")

def surface_wireframe(width: float = 4.4, depth: float = 2.2, rows: int = 9, columns: int = 15, color: str = DATA) -> VGroup:
    def project(u: float, v: float) -> np.ndarray:
        z = 0.45 * math.sin(2.2 * u) * math.cos(2.6 * v)
        return np.array([u * width / 2 + v * 0.9, v * depth / 2 * 0.55 + z, 0])
    group = VGroup()
    for row in range(rows):
        v = -1 + 2 * row / (rows - 1)
        group.add(VMobject(stroke_color=color, stroke_width=1.6).set_points_smoothly([project(-1 + 2 * k / 30, v) for k in range(31)]))
    for column in range(columns):
        u = -1 + 2 * column / (columns - 1)
        group.add(VMobject(stroke_color=colormap_color(column / (columns - 1)), stroke_width=1.6).set_points_smoothly([project(u, -1 + 2 * k / 20) for k in range(21)]))
    return group

class ObjectsVideo(WasmGPUVideoScene):
    CHAPTERS = ["Meshes", "Geometry", "Materials and textures", "Scientific primitives", "glTF 2.0", "Animation"]

    def construct(self) -> None:
        self.open("The objects subsystem defines everything a scene can draw: meshes built from geometry and materials, five scientific primitives, and imported glTF assets.")
        self.mesh_basics()
        self.geometry()
        self.materials()
        self.primitives()
        self.gltf()
        self.animation()
        self.finish(
            ["Meshes: reference-counted geometry and materials", "Primitives, curves, surfaces, custom geometry", "Unlit, standard, data, and custom materials", "Five scientific primitives, borrowed buffers", "glTF 2.0 import and animation"],
            "To recap: reference-counted meshes, built-in and custom geometry, four material types, five scientific primitives, and glTF with animation.",
            "The full reference is in the Objects section of the documentation."
        )

    def mesh_basics(self) -> None:
        self.chapter(1, "Meshes")
        geometry = box(["Geometry", "refs: 1"], DATA, 3.0, 1.1, SMALL_SIZE, MEDIUM).move_to([-4.3, 0.9, 0])
        material = box(["Material", "refs: 1"], ACCENT, 3.0, 1.1, SMALL_SIZE, MEDIUM).move_to([-4.3, -1.0, 0])
        mesh = box(["Mesh", "+ Transform"], API, 2.8, 1.1, SMALL_SIZE, MEDIUM).move_to([-0.2, -0.05, 0])
        links = VGroup(connect(mesh, geometry, MUTED, direction=LEFT), connect(mesh, material, MUTED, direction=LEFT))
        call = mono("wgpu.createMesh(geometry, material)", SMALL_SIZE, TEXT).move_to(UP * 2.1)
        self.say("A mesh pairs one geometry with one material, and gets its own transform.", AnimationGroup(FadeIn(call), FadeIn(geometry), FadeIn(material)), AnimationGroup(FadeIn(mesh), *[GrowArrow(link) for link in links]))
        clone = box(["clone", "shares both"], API, 2.8, 1.1, SMALL_SIZE, MEDIUM).move_to([3.9, -0.05, 0])
        clone_links = VGroup(connect(mesh, clone, TEXT), mono("mesh.clone()", 22, MUTED).move_to([1.85, 0.4, 0]))
        refs = [box(["Geometry", "refs: 2"], DATA, 3.0, 1.1, SMALL_SIZE, MEDIUM).move_to(geometry), box(["Material", "refs: 2"], ACCENT, 3.0, 1.1, SMALL_SIZE, MEDIUM).move_to(material)]
        rule = txt("createMesh takes one reference; destroy() releases it", SMALL_SIZE, MUTED).move_to(DOWN * 2.35)
        self.say(
            "Geometry and materials are reference counted: createMesh takes over one reference and destroy releases it, so shared resources are retained once per extra mesh.",
            FadeIn(rule),
            AnimationGroup(FadeIn(clone), Create(clone_links)),
            AnimationGroup(Transform(geometry, refs[0]), Transform(material, refs[1]))
        )
        hierarchy = VGroup(chip("parent", API, 2.0), chip("child", API, 1.8), chip("child", API, 1.8))
        hierarchy[0].move_to([-3.6, 0.7, 0])
        hierarchy[1].move_to([-4.8, -0.7, 0])
        hierarchy[2].move_to([-2.4, -0.7, 0])
        tree = VGroup(Line(hierarchy[0].get_bottom(), hierarchy[1].get_top(), color=MUTED, stroke_width=2), Line(hierarchy[0].get_bottom(), hierarchy[2].get_top(), color=MUTED, stroke_width=2))
        calls = VGroup(mono("setParent(parent) · addChild(child)", SMALL_SIZE, TEXT), mono("castShadow · receiveShadow", SMALL_SIZE, TEXT), mono("clone() · cloneWithMaterial(material)", SMALL_SIZE, TEXT)).arrange(DOWN, buff=0.3, aligned_edge=LEFT).move_to([2.6, 0.0, 0])
        self.say(
            "Meshes form hierarchies with setParent and addChild, clones share the same resources, and castShadow and receiveShadow control shadows.",
            AnimationGroup(FadeOut(VGroup(geometry, material, mesh, links, clone, clone_links, rule, call)), FadeIn(hierarchy), Create(tree)),
            FadeIn(calls[0]),
            AnimationGroup(FadeIn(calls[1]), FadeIn(calls[2]))
        )

    def geometry(self) -> None:
        self.chapter(2, "Geometry")
        kinds = ["box", "sphere", "cylinder", "torus", "prism", "pyramid", "plane", "circle", "ellipse", "rectangle", "triangle", "line", "point"]
        tiles = VGroup(*[VGroup(primitive_glyph(kind), mono(kind, 22, TEXT)).arrange(DOWN, buff=0.22) for kind in kinds])
        for tile in tiles:
            tile[1].move_to([tile[0].get_center()[0], tile[0].get_center()[1] - 0.75, 0])
        top, bottom = VGroup(*tiles[:7]), VGroup(*tiles[7:])
        top.arrange(RIGHT, buff=0.55)
        bottom.arrange(RIGHT, buff=0.55)
        VGroup(top, bottom).arrange(DOWN, buff=0.55).move_to(DOWN * 0.15)
        self.say(
            "Built-in primitives include boxes, spheres, cylinders, tori, prisms, pyramids, planes, and flat shapes such as circles, ellipses, rectangles, triangles, lines, and points.",
            LaggedStart(*[FadeIn(tile, shift=0.1 * UP) for tile in top], lag_ratio=0.15),
            LaggedStart(*[FadeIn(tile, shift=0.1 * UP) for tile in bottom], lag_ratio=0.15),
            max_run=2.2
        )
        surface = surface_wireframe().move_to([-3.0, -0.35, 0])
        formula = equation(r"\mathbf{r}(u, v) = \big(x(u, v),\ y(u, v),\ z(u, v)\big)", 44).move_to([3.0, 0.7, 0])
        factories = VGroup(*[mono(call, 22, TEXT) for call in ["cartesianCurve · cartesianSurface", "parametricCurve · parametricSurface"]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([3.0, -0.6, 0])
        defaults = txt("surfaces: 128 × 128 cells, normals, UVs", SMALL_SIZE, MUTED).next_to(factories, DOWN, buff=0.3)
        self.say(
            "Cartesian and parametric curves and surfaces sample your functions; surfaces get triangles, normals, and texture coordinates.",
            AnimationGroup(FadeOut(VGroup(top, bottom)), Write(formula)),
            AnimationGroup(Create(surface), FadeIn(factories)),
            FadeIn(defaults)
        )
        custom = VGroup(mono("geometry.custom({ positions, normals, uvs, indices })", 22, TEXT), mono("WasmMemoryView attribute sources: borrowed", 22, DRIVER)).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to(DOWN * 2.35)
        self.say("Custom geometry takes your own vertex and index arrays, and can borrow WebAssembly memory views for its attributes.", AnimationGroup(FadeOut(defaults), FadeIn(custom[0])), FadeIn(custom[1]))

    def materials(self) -> None:
        self.chapter(3, "Materials and textures")
        cards = VGroup()
        for name, color, lines_ in [("unlit", MUTED, ["flat color", "no lighting"]), ("standard", ACCENT, ["metal-rough PBR", "glTF extensions"]), ("data", DATA, ["scale transform", "colormap"]), ("custom", COMPUTE, ["your WGSL", "bind group 1"])]:
            frame = RoundedRectangle(corner_radius=0.16, width=3.1, height=2.0, stroke_color=color, stroke_width=3, fill_color=color, fill_opacity=0.08)
            title = mono(f"material.{name}", 22, color).move_to(frame.get_top() + DOWN * 0.42)
            body = lines(lines_, SMALL_SIZE, TEXT, align="center").next_to(title, DOWN, buff=0.3)
            cards.add(VGroup(frame, title, body))
        cards.arrange(RIGHT, buff=0.2).move_to(UP * 0.9)
        self.say(
            "Four material types share one interface: unlit for flat color, standard for glTF-style physically based shading, data for colormapped values, and custom for your own WGSL.",
            *[FadeIn(card, shift=0.1 * UP) for card in cards]
        )
        groups = VGroup(box(["@group(0)", "camera, model, global state"], MUTED, 5.6, 1.1, SMALL_SIZE, MEDIUM), box(["@group(1)", "your declared resources"], COMPUTE, 5.6, 1.1, SMALL_SIZE, MEDIUM)).arrange(RIGHT, buff=0.4).move_to(DOWN * 1.75)
        self.say("A custom material declares its own resources in bind group one, because bind group zero belongs to the renderer.", AnimationGroup(Indicate(cards[3], color=COMPUTE, scale_factor=1.04), FadeIn(groups[0])), FadeIn(groups[1]))
        texture = VGroup(*[Square(side_length=1.6 / (2 ** level), stroke_color=ACCENT, stroke_width=2, fill_color=ACCENT, fill_opacity=0.25 - 0.04 * level) for level in range(4)]).arrange(RIGHT, buff=0.25, aligned_edge=DOWN).move_to([-3.6, 0.6, 0])
        mip_label = txt("mipmaps", SMALL_SIZE, MUTED).next_to(texture, DOWN, buff=0.25)
        texture_notes = VGroup(mono("texture.create2D({ source, mipmaps, sampler })", 22, TEXT), txt("asynchronous upload, fallback until ready", SMALL_SIZE, MUTED)).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([2.6, 0.75, 0])
        self.say(
            "Textures upload asynchronously with mipmaps and sampler settings, and render with fallback resources until they are ready.",
            AnimationGroup(FadeOut(VGroup(cards, groups)), LaggedStart(*[FadeIn(level) for level in texture], lag_ratio=0.2), FadeIn(mip_label)),
            FadeIn(texture_notes)
        )
        bars = VGroup()
        for name in ["viridis", "plasma", "magma", "inferno", "turbo", "grayscale"]:
            bar = gradient_bar(COLORMAPS[name], 3.4, 0.36, 36)
            bars.add(VGroup(mono(name, 22, TEXT), bar).arrange(RIGHT, buff=0.3))
        for bar in bars:
            bar[1].move_to(bar[0].get_right() + RIGHT * (1.65 - bar[0].width + 0.3) + RIGHT * 1.7)
        left, right = VGroup(*bars[:3]).arrange(DOWN, buff=0.18, aligned_edge=LEFT), VGroup(*bars[3:]).arrange(DOWN, buff=0.18, aligned_edge=LEFT)
        VGroup(left, right).arrange(RIGHT, buff=0.7).move_to(DOWN * 1.75)
        custom_maps = mono("colormap.fromStops(stops) · colormap.fromPalette(colors)", 22, MUTED).move_to(DOWN * 2.7)
        self.say(
            "Colormaps come built in, viridis, plasma, magma, inferno, turbo, and grayscale, or from your own stops and palettes.",
            LaggedStart(*[FadeIn(bar, shift=0.1 * RIGHT) for bar in left], lag_ratio=0.2),
            LaggedStart(*[FadeIn(bar, shift=0.1 * RIGHT) for bar in right], lag_ratio=0.2),
            FadeIn(custom_maps)
        )

    def primitives(self) -> None:
        self.chapter(4, "Scientific primitives")
        names = [("pointcloud", "PointCloud", ["scalar or", "RGBA colored", "points"]), ("glyphfield", "GlyphField", ["ellipsoids,", "arrows, or", "custom glyphs"]), ("nodelink", "NodeLink", ["nodes and", "edges, each", "with a scale"]), ("splatfield", "SplatField", ["Gaussian", "splats with", "SH degree ≤ 3"]), ("latticespace", "LatticeSpace", ["2D or 3D", "cells, x", "fastest"])]
        panels = VGroup()
        for kind, name, note in names:
            frame = RoundedRectangle(corner_radius=0.16, width=2.5, height=3.6, stroke_color=DATA, stroke_width=2, fill_color=DATA, fill_opacity=0.05)
            glyph = object_glyph(kind, 1.25).move_to(frame.get_center() + UP * 0.85)
            title = mono(name, 22, DATA).move_to(frame.get_center() + DOWN * 0.15)
            body = lines(note, 22, MUTED, align="center").next_to(title, DOWN, buff=0.15)
            panels.add(VGroup(frame, glyph, title, body))
        panels.arrange(RIGHT, buff=0.12, aligned_edge=UP).move_to(UP * 0.55)
        narration = [
            "PointCloud draws points colored by a scalar through a colormap, or by per-point colors.",
            "GlyphField instances ellipsoids, arrows, or custom geometry, for example to show vector fields.",
            "NodeLink draws graphs, with separate scales and colormaps for nodes and edges.",
            "SplatField draws Gaussian splats, optionally with spherical harmonics up to degree three, and is always transparent and sorted on the GPU."
        ]
        for panel, line in zip(panels, narration):
            self.say(line, FadeIn(panel, shift=0.1 * UP), Indicate(panel[1], color=DATA, scale_factor=1.06))
        index = equation(r"i = x + W\,(y + H\,z)", 48, DATA).move_to(DOWN * 1.95)
        self.say("LatticeSpace draws regular 2D or 3D cells, stored with x varying fastest.", FadeIn(panels[4], shift=0.1 * UP), Write(index))
        ownership = VGroup(mono("ownBuffers: false", 22, ENGINE), txt("default: caller GPU buffers are borrowed", SMALL_SIZE, TEXT), mono("ownBuffers: true", 22, DATA), txt("destroy() also destroys them", SMALL_SIZE, TEXT))
        rows = VGroup(VGroup(ownership[0], ownership[1]).arrange(RIGHT, buff=0.4), VGroup(ownership[2], ownership[3]).arrange(RIGHT, buff=0.4)).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to(DOWN * 2.05)
        self.say("All five borrow caller-supplied GPU buffers by default, and destroy them only with ownBuffers set to true.", AnimationGroup(FadeOut(index), FadeIn(rows[0])), FadeIn(rows[1]))

    def gltf(self) -> None:
        self.chapter(5, "glTF 2.0")
        steps = VGroup(*[box(label, DATA, 3.6, 1.15, SMALL_SIZE, MEDIUM) for label in [["gltf.load", ".gltf or .glb + buffers"], ["gltf.import", "scene resources"], ["GltfImportResult", "meshes, clips, metadata"]]]).arrange(RIGHT, buff=0.75).move_to(UP * 1.35)
        arrows = VGroup(connect(steps[0], steps[1]), connect(steps[1], steps[2]))
        both = mono("gltf.loadAndImport(source)  =  load + import", 22, MUTED).next_to(steps, DOWN, buff=0.35)
        self.say(
            "gltf.load reads JSON or binary GLB files and their buffers, gltf.import converts them into scene resources, and loadAndImport does both.",
            FadeIn(steps[0]),
            AnimationGroup(GrowArrow(arrows[0]), FadeIn(steps[1]), GrowArrow(arrows[1]), FadeIn(steps[2])),
            FadeIn(both)
        )
        coverage = VGroup(*[pill(label, color, 22) for label, color in [("accessors in Rust", DRIVER), ("sparse patching", DRIVER), ("numeric conversion", DRIVER), ("material extensions", ACCENT), ("skins", API), ("animations", API), ("cameras", ENGINE), ("lights", ENGINE), ("Gaussian splats", BROWSER)]])
        VGroup(*[VGroup(*coverage[start:start + 3]).arrange(RIGHT, buff=0.18) for start in (0, 3, 6)]).arrange(DOWN, buff=0.2).move_to(DOWN * 1.05)
        self.say(
            "Accessor decoding, sparse patching, and numeric conversion run in Rust, and import covers material extensions, skins, animations, cameras, lights, and Gaussian splats.",
            LaggedStart(*[FadeIn(item) for item in coverage[:3]], lag_ratio=0.2),
            LaggedStart(*[FadeIn(item) for item in coverage[3:]], lag_ratio=0.15)
        )
        outcomes = VGroup(*[pill(f'"{label}"', color, SMALL_SIZE, MONO) for label, color in [("supported", ENGINE), ("partial", DATA), ("deferred", COMPUTE), ("unsupported", ERROR)]]).arrange(RIGHT, buff=0.3).move_to(DOWN * 1.2)
        outcome_label = mono("metadata.extensions.support", SMALL_SIZE, MUTED).next_to(outcomes, UP, buff=0.25)
        rollback = txt("A failed import rolls back everything it created, in reverse order", SMALL_SIZE, ERROR).next_to(outcomes, DOWN, buff=0.4)
        self.say(
            "Each asset reports its support as supported, partial, deferred, or unsupported, and a failed import rolls back everything it created.",
            AnimationGroup(FadeOut(coverage), FadeIn(outcome_label)),
            LaggedStart(*[FadeIn(outcome) for outcome in outcomes], lag_ratio=0.25),
            FadeIn(rollback)
        )

    def animation(self) -> None:
        self.chapter(6, "Animation")
        channels = VGroup(*[box([name], color, 2.4, 0.7, SMALL_SIZE, MEDIUM) for name, color in [("translation", DRIVER), ("rotation", DRIVER), ("scale", DRIVER), ("weights", API), ("pointers", API)]]).arrange(RIGHT, buff=0.15).move_to(UP * 1.4)
        domains = VGroup(txt("sampled in Rust", SMALL_SIZE, DRIVER).next_to(channels[0:3], DOWN, buff=0.25), txt("sampled in TypeScript", SMALL_SIZE, API).next_to(channels[3:], DOWN, buff=0.25))
        self.say(
            "Animation clips sample translation, rotation, and scale channels in Rust, while morph weights and animation pointers are sampled in TypeScript.",
            AnimationGroup(LaggedStart(*[FadeIn(channel) for channel in channels[:3]], lag_ratio=0.2), FadeIn(domains[0])),
            AnimationGroup(LaggedStart(*[FadeIn(channel) for channel in channels[3:]], lag_ratio=0.2), FadeIn(domains[1]))
        )
        player = VGroup(mono("animation.createPlayer(clip)", 22, TEXT), mono("speed · loop · playing", 22, MUTED)).arrange(DOWN, buff=0.2, aligned_edge=LEFT).move_to([-3.4, -0.75, 0])
        skins = VGroup(mono("animation.createSkin(name, joints, ibm)", 22, TEXT), txt("4- or 8-influence skinning", SMALL_SIZE, MUTED)).arrange(DOWN, buff=0.2, aligned_edge=LEFT).move_to([3.0, -0.75, 0])
        self.say("Players advance clips with looping and speed, and skins drive four- or eight-influence skinning on the GPU.", FadeIn(player), FadeIn(skins))
        morph = VGroup(*[pill(label, ACCENT, 22) for label in ["positions", "normals", "colors", "bounds"]]).arrange(RIGHT, buff=0.25)
        morph_label = txt("morph targets update", SMALL_SIZE, MUTED)
        VGroup(morph_label, morph).arrange(RIGHT, buff=0.35).move_to(DOWN * 2.2)
        self.say("Morph targets blend positions, normals, and colors, and update the mesh bounds.", FadeIn(morph_label), LaggedStart(*[FadeIn(item) for item in morph], lag_ratio=0.2))

# =============================== Video: render ==============================
# Sources: ./typescript/core/engine.ts, ./typescript/core/renderer.ts, ./typescript/core/types.ts (RendererDescriptor,
# RendererCullingStats), ./typescript/core/drawlists.ts (culling, transparent order), ./typescript/core/objects.ts
# (instanced runs), ./typescript/core/occlusion.ts, ./rust/src/cull.rs, ./typescript/effects/shadows.ts,
# ./typescript/core/shadows.ts, ./typescript/core/stats.ts, ./typescript/core/transform.ts, ./rust/src/transform.rs,
# ./website/docs/render/*.md, and ./ARCHITECTURE.md §1.3, §1.6, §1.10, §1.15, §1.21.

class RenderVideo(WasmGPUVideoScene):
    CHAPTERS = ["Lifecycle", "Inside a frame", "Culling", "Batching and ordering", "Effects", "Stats and transforms"]

    def construct(self) -> None:
        self.open("The render subsystem covers the engine's lifecycle, what happens in each frame, culling, batching, effects, and the transform hierarchy.")
        self.lifecycle()
        self.frame()
        self.culling()
        self.batching()
        self.effects_chapter()
        self.stats_and_transforms()
        self.finish(
            ["create, warmup, run, render, destroy", "Frustum culling, opt-in occlusion culling", "Instanced opaque runs, merged transparency", "Directional shadows and optional SMAA", "Transforms in a structure-of-arrays store"],
            "To recap: the engine lifecycle, the per-frame stages, two kinds of culling, batching and ordering, shadows and SMAA, and the transform store.",
            "The full reference is in the Render section of the documentation."
        )

    def lifecycle(self) -> None:
        self.chapter(1, "Lifecycle")
        code = code_panel("""
const wgpu = await WasmGPU.create(canvas, {
    antialias: true,
    powerPreference: "high-performance",
    canvasFormat: "bgra8unorm",
    frustumCulling: true,
    occlusionCulling: false,
    frustumCullingStats: false,
    occlusionCullingStats: false,
    maxStorageBufferBindingSize: 1 << 28
});
""", size=21).move_to(CONTENT_CENTER)
        self.say(
            "WasmGPU.create takes a canvas and a descriptor: antialiasing, power preference, canvas format, frustum and occlusion culling with their stats, and device limits.",
            FadeIn(code),
            Create(highlight(code.code_lines[1:4], ACCENT, 0.05)),
            Create(highlight(code.code_lines[4:8], ENGINE, 0.05)),
            Create(highlight(code.code_lines[8], DATA, 0.05))
        )
        steps = VGroup(*[box([label], color, 2.15, 0.7, SMALL_SIZE, MEDIUM, font=MONO) for label, color in [("create()", API), ("warmup()", ACCENT), ("run()", ENGINE), ("stop()", DATA), ("destroy()", ERROR)]]).arrange(RIGHT, buff=0.42).move_to(UP * 0.9)
        arrows = VGroup(*[connect(steps[index], steps[index + 1]) for index in range(4)])
        loop = VGroup(box(["render(scene, camera)"], ENGINE, 4.0, 0.7, SMALL_SIZE, MEDIUM, font=MONO).move_to([steps[2].get_x(), -0.9, 0]))
        loop.add(solid_arrow(steps[2].get_bottom(), loop[0].get_top(), ENGINE), mono("every frame", 22, MUTED).next_to(loop[0], DOWN, buff=0.2))
        running = mono("isRunning", SMALL_SIZE, MUTED).next_to(steps[2:4], UP, buff=0.3)
        self.say(
            "warmup prebuilds pipelines and other render resources for a scene and camera before the first visible frame.",
            AnimationGroup(*[FadeOut(mobject) for mobject in self.content()], FadeIn(steps[0])),
            AnimationGroup(GrowArrow(arrows[0]), FadeIn(steps[1]))
        )
        self.say(
            "run starts the loop and stop ends it, isRunning reports the state, render draws one frame, and destroy releases everything.",
            AnimationGroup(GrowArrow(arrows[1]), FadeIn(steps[2]), FadeIn(loop)),
            AnimationGroup(GrowArrow(arrows[2]), FadeIn(steps[3]), FadeIn(running)),
            AnimationGroup(GrowArrow(arrows[3]), FadeIn(steps[4]))
        )

    def frame(self) -> None:
        self.chapter(2, "Inside a frame")
        stages = VGroup(*[box(label, ENGINE, 2.35, 1.2, SMALL_SIZE, MEDIUM) for label in [["camera and", "transforms"], ["draw lists", "per family"], ["shadows,", "model packing"], ["filter", "and sort"], ["encode", "and submit"]]]).arrange(RIGHT, buff=0.3).move_to(UP * 0.85)
        arrows = VGroup(*[connect(stages[index], stages[index + 1]) for index in range(4)])
        self.say(
            "Each render call updates camera matrices and dirty transforms, then builds a draw list for each object family.",
            FadeIn(stages[0]),
            AnimationGroup(GrowArrow(arrows[0]), FadeIn(stages[1]))
        )
        self.say(
            "It prepares shadows and packs model matrices, filters and sorts what is visible, encodes the passes, and submits them in one command buffer.",
            AnimationGroup(GrowArrow(arrows[1]), FadeIn(stages[2])),
            AnimationGroup(GrowArrow(arrows[2]), FadeIn(stages[3])),
            AnimationGroup(GrowArrow(arrows[3]), FadeIn(stages[4]))
        )
        inputs = VGroup(*[pill(label, API, SMALL_SIZE) for label in ["scene", "camera", "descriptor", "effects"]]).arrange(RIGHT, buff=0.25)
        outputs = VGroup(*[pill(label, DATA, SMALL_SIZE) for label in ["frame", "performance stats", "culling counters"]]).arrange(RIGHT, buff=0.25)
        io = VGroup(VGroup(txt("you control", SMALL_SIZE, MUTED), inputs).arrange(RIGHT, buff=0.4), VGroup(txt("you observe", SMALL_SIZE, MUTED), outputs).arrange(RIGHT, buff=0.4)).arrange(DOWN, buff=0.35, aligned_edge=LEFT).move_to(DOWN * 1.6)
        self.say("You control the inputs, the scene, camera, descriptor, and effects, and the stats panel and culling counters show what each frame did.", FadeIn(io[0], shift=0.1 * RIGHT), FadeIn(io[1], shift=0.1 * RIGHT))

    def culling(self) -> None:
        self.chapter(3, "Culling")
        apex = np.array([-5.6, -0.45, 0])
        frustum = Polygon(apex + np.array([0.3, 0.2, 0]), apex + np.array([4.9, 1.9, 0]), apex + np.array([4.9, -1.9, 0]), apex + np.array([0.3, -0.2, 0]), stroke_color=ENGINE, stroke_width=3, fill_color=ENGINE, fill_opacity=0.06)
        camera = camera_icon(TEXT, 1.0).move_to(apex)
        spheres = VGroup(*[Circle(radius=radius, stroke_width=3, stroke_color=color, fill_color=color, fill_opacity=0.25).move_to(apex + np.array(offset)) for offset, radius, color in [((2.6, 0.3, 0), 0.4, ENGINE), ((3.9, -0.9, 0), 0.5, ENGINE), ((4.9, 1.9, 0), 0.45, ENGINE), ((2.2, 1.9, 0), 0.35, ERROR), ((5.9, -0.2, 0), 0.4, ERROR)]])
        test = equation(r"\text{culled if } \exists i:\ \mathbf{n}_i \cdot \mathbf{c} + d_i < -r", 44).move_to([3.2, 1.0, 0])
        planes = txt("six planes, world-space spheres", SMALL_SIZE, MUTED).next_to(test, DOWN, buff=0.35)
        self.say(
            "Frustum culling tests each object's world-space bounding sphere against the six camera planes in Rust, and is on by default.",
            AnimationGroup(FadeIn(camera), Create(frustum)),
            LaggedStart(*[FadeIn(sphere) for sphere in spheres], lag_ratio=0.15),
            AnimationGroup(Write(test), FadeIn(planes))
        )
        levels = VGroup()
        for level, cells in enumerate([8, 4, 2, 1]):
            grid_ = VGroup(*[Square(side_length=1.3 / cells, stroke_color=COMPUTE, stroke_width=1.5, fill_color=COMPUTE, fill_opacity=0.08 + 0.12 * level) for _ in range(cells * cells)]).arrange_in_grid(rows=cells, cols=cells, buff=0)
            levels.add(grid_)
        levels.arrange(RIGHT, buff=0.35, aligned_edge=DOWN).move_to([-3.1, -1.3, 0])
        hierarchy_label = txt("previous frame's depth hierarchy", SMALL_SIZE, COMPUTE).next_to(levels, UP, buff=0.25)
        self.say(
            "Occlusion culling is opt-in: it reuses a low-resolution depth hierarchy from the previous frame to skip opaque objects that were hidden.",
            AnimationGroup(FadeOut(VGroup(camera, frustum, spheres, test, planes)), FadeIn(hierarchy_label)),
            LaggedStart(*[FadeIn(level, shift=0.1 * RIGHT) for level in levels], lag_ratio=0.25)
        )
        rules = VGroup(*[txt(rule, SMALL_SIZE, color) for rule, color in [("conservative", TEXT), ("skipped unless the viewport,", TEXT), ("camera, and occluders match", TEXT), ("never used for picking or warmup", ERROR), ("splat fields excluded", MUTED)]]).arrange(DOWN, buff=0.22, aligned_edge=LEFT).move_to([3.7, -1.0, 0])
        self.say("It is conservative, it is skipped unless the viewport, camera, and occluders still match the captured hierarchy, and picking never uses it.", FadeIn(rules[0]), FadeIn(rules[1:3]), AnimationGroup(FadeIn(rules[3]), FadeIn(rules[4])))
        stats = code_panel("""
wgpu.cullingStats
// { frustum: { tested, visible },
//   occlusion: { tested, visible, occluded } }
""", size=22).move_to(UP * 1.5)
        self.say("cullingStats reports how many objects were tested, visible, and occluded.", AnimationGroup(FadeOut(hierarchy_label), FadeIn(stats)))

    def batching(self) -> None:
        self.chapter(4, "Batching and ordering")
        cubes = VGroup(*[object_glyph("mesh", 0.75, API) for _ in range(5)]).arrange(RIGHT, buff=0.3).move_to([-3.4, 1.3, 0])
        run = box(["one instanced draw ×5"], API, 3.9, 0.7, SMALL_SIZE, MEDIUM).move_to([3.4, 1.3, 0])
        merge = solid_arrow(cubes.get_right(), run.get_left(), MUTED)
        rule = txt("same pipeline, material, and geometry; unchanged runs are reused", SMALL_SIZE, MUTED).next_to(VGroup(cubes, run), DOWN, buff=0.3)
        self.say("Consecutive opaque meshes that share a pipeline, material, and geometry are drawn as one instanced run, and unchanged runs reuse their packed data.", LaggedStart(*[FadeIn(cube) for cube in cubes], lag_ratio=0.1), AnimationGroup(GrowArrow(merge), FadeIn(run)), FadeIn(rule))
        families = [(API, [9.1, 4.0, 1.2]), (DATA, [7.5, 6.2]), (BROWSER, [8.4, 3.3, 2.0])]
        lists = VGroup()
        for color, keys in families:
            lists.add(VGroup(*[box([f"{key:.1f}"], color, 0.95, 0.55, 22, MEDIUM) for key in keys]).arrange(RIGHT, buff=0.1))
        lists.arrange(DOWN, buff=0.18, aligned_edge=LEFT).move_to([-3.9, -1.4, 0])
        merged_keys = sorted([(key, color) for color, keys in families for key in keys], reverse=True)
        merged = VGroup(*[box([f"{key:.1f}"], color, 0.8, 0.55, 22, MEDIUM) for key, color in merged_keys]).arrange(RIGHT, buff=0.06).move_to([2.6, -1.4, 0])
        merged_label = txt("one back-to-front order across families", SMALL_SIZE, MUTED).next_to(merged, UP, buff=0.25)
        self.say(
            "Transparent objects from all six families are merged into one back-to-front order, without building a combined list.",
            AnimationGroup(FadeOut(rule), LaggedStart(*[FadeIn(item) for item in lists], lag_ratio=0.2)),
            AnimationGroup(FadeIn(merged_label), LaggedStart(*[FadeIn(item, shift=0.1 * RIGHT) for item in merged], lag_ratio=0.08))
        )
        sorts = VGroup(pill("SplatField", DATA, SMALL_SIZE, MONO), pill("transparent 3D LatticeSpace", DATA, SMALL_SIZE, MONO)).arrange(RIGHT, buff=0.4)
        sort_note = txt("per-element GPU radix sorts by camera depth", SMALL_SIZE, COMPUTE)
        VGroup(sorts, sort_note).arrange(DOWN, buff=0.25).move_to(DOWN * 1.4)
        self.say("Gaussian splats and transparent 3D lattice cells are sorted per element on the GPU with radix sorts.", AnimationGroup(FadeOut(VGroup(lists, merged, merged_label)), FadeIn(sorts)), FadeIn(sort_note))

    def effects_chapter(self) -> None:
        self.chapter(5, "Effects")
        code = code_panel("""
wgpu.effects.shadows.enable(sun, { updateMode: "always" });
""", size=22).move_to(UP * 1.95)
        shadow_map = VGroup(*[Square(side_length=0.3, stroke_color=HAIRLINE, stroke_width=1, fill_color=MUTED, fill_opacity=0.08) for _ in range(49)]).arrange_in_grid(rows=7, cols=7, buff=0).move_to([-4.2, -0.6, 0])
        kernel = VGroup(*[shadow_map[row * 7 + column] for row in range(2, 5) for column in range(2, 5)])
        map_label = txt("1024 × 1024 depth map", SMALL_SIZE, MUTED).next_to(shadow_map, DOWN, buff=0.2)
        pcf = txt("3 × 3 PCF by default, or hard", SMALL_SIZE, ACCENT).next_to(map_label, DOWN, buff=0.15)
        self.say(
            "Shadows are enabled per directional light through effects.shadows, with a 1024-pixel map and 3-by-3 PCF filtering by default.",
            FadeIn(code),
            AnimationGroup(FadeIn(shadow_map), FadeIn(map_label)),
            AnimationGroup(*[square.animate.set_fill(ACCENT, opacity=0.6) for square in kernel], FadeIn(pcf))
        )
        corners = np.array([[1.0, -1.2, 0], [4.0, -0.1, 0], [4.0, -2.3, 0]])
        frustum = Polygon(*corners, stroke_color=ENGINE, stroke_width=2, fill_color=ENGINE, fill_opacity=0.06)
        light = np.array([0.8, -0.95, 0]) / np.linalg.norm([0.8, -0.95])
        side = np.array([-light[1], light[0], 0])
        along, across = corners @ light, corners @ side
        pad = 0.15
        fit = Polygon(*[light * a + side * c for a, c in [(along.min() - pad, across.min() - pad), (along.max() + pad, across.min() - pad), (along.max() + pad, across.max() + pad), (along.min() - pad, across.max() + pad)]], stroke_color=DATA, stroke_width=3)
        diagram = VGroup(frustum, fit).scale_to_fit_height(2.9).move_to([2.2, -0.65, 0])
        light_dirs = VGroup(*[Arrow(np.array([-3.6 + 0.65 * index, 1.25 - 0.25 * index, 0]), np.array([-3.6 + 0.65 * index, 1.25 - 0.25 * index, 0]) + light * 1.1, buff=0, color=DATA, stroke_width=3, tip_length=0.15) for index in range(4)])
        light_label = txt("directional light", SMALL_SIZE, DATA).next_to(light_dirs, DOWN, buff=0.3)
        fit_label = txt("orthographic box fitted to the camera", SMALL_SIZE, DATA).move_to([2.2, 1.2, 0])
        modes = mono('filter: "pcf" | "hard" · updateMode: "manual"', 22, MUTED).move_to(DOWN * 2.6)
        self.say(
            "Hard filtering and manual updates are available, and each shadow view fits an orthographic box to the camera frustum.",
            AnimationGroup(FadeOut(VGroup(shadow_map, map_label, pcf)), FadeIn(light_dirs), FadeIn(light_label), Create(frustum)),
            AnimationGroup(Create(fit), FadeIn(fit_label)),
            FadeIn(modes)
        )
        roles = VGroup(*[VGroup(mark, txt(text, SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.35) for mark, text in [(check_mark(ENGINE, 0.3), "meshes cast with castShadow"), (check_mark(ENGINE, 0.3), "standard materials receive"), (cross_mark(ERROR, 0.3), "scientific primitives neither cast nor receive")]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([1.6, -0.6, 0])
        self.say(
            "Meshes cast shadows with castShadow, and only standard materials receive them; the scientific primitives neither cast nor receive.",
            AnimationGroup(FadeOut(VGroup(light_dirs, light_label, frustum, fit, fit_label, modes)), FadeIn(roles[0])),
            FadeIn(roles[1]),
            FadeIn(roles[2])
        )
        smaa = VGroup(mono("antialias: true", SMALL_SIZE, ACCENT), txt("subpixel morphological antialiasing (SMAA)", SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.45).move_to(DOWN * 2.45)
        self.say("Antialiasing is optional subpixel morphological antialiasing, SMAA, enabled at creation.", FadeIn(smaa[0]), FadeIn(smaa[1]))

    def stats_and_transforms(self) -> None:
        self.chapter(6, "Stats and transforms")
        panel = RoundedRectangle(corner_radius=0.14, width=4.2, height=2.4, stroke_color=HAIRLINE, stroke_width=2, fill_color=PANEL, fill_opacity=1).move_to([-4.0, 0.9, 0])
        readouts = VGroup(*[mono(text, 22, color) for text, color in [("FPS", ENGINE), ("CPU ms", TEXT), ("GPU ms", TEXT), ("culled / tested", DATA)]]).arrange(DOWN, buff=0.18, aligned_edge=LEFT).move_to(panel.get_center() + LEFT * 0.7)
        graph = VMobject(stroke_color=ENGINE, stroke_width=2).set_points_as_corners([panel.get_center() + np.array([0.45 + 0.13 * index, -0.5 + 0.25 * math.sin(index * 0.9) + 0.1 * math.cos(index * 2.1), 0]) for index in range(11)])
        call = mono("wgpu.createPerformanceStats({ graph: true })", 22, TEXT).move_to([2.35, 1.5, 0])
        gpu_note = txt("GPU time when timestamp queries are available", SMALL_SIZE, MUTED).next_to(call, DOWN, buff=0.3)
        self.say(
            "createPerformanceStats adds a panel with frame rate, CPU and GPU timing, and culling counters, with GPU timing when timestamp queries exist.",
            AnimationGroup(FadeIn(panel), FadeIn(call)),
            AnimationGroup(LaggedStart(*[FadeIn(readout) for readout in readouts], lag_ratio=0.2), Create(graph)),
            FadeIn(gpu_note)
        )
        nodes = VGroup(chip("root", API, 1.7), chip("child", API, 1.7), chip("child", API, 1.7), chip("leaf", API, 1.6))
        nodes[0].move_to([-4.0, -1.0, 0])
        nodes[1].move_to([-5.3, -2.2, 0])
        nodes[2].move_to([-2.7, -2.2, 0])
        nodes[3].move_to([-1.0, -1.0, 0])
        edges = VGroup(Line(nodes[0].get_bottom(), nodes[1].get_top(), color=MUTED, stroke_width=2), Line(nodes[0].get_bottom(), nodes[2].get_top(), color=MUTED, stroke_width=2))
        cycle = VGroup(DashedLine(nodes[2].get_right(), nodes[3].get_bottom(), dash_length=0.08, color=ERROR, stroke_width=2), cross_mark(ERROR, 0.3).move_to([-1.6, -1.7, 0]))
        pointers = VGroup(mono("positionPtr · rotationPtr", 22, MUTED), mono("scalePtr · worldMatrixPtr", 22, MUTED)).arrange(DOWN, buff=0.15, aligned_edge=LEFT).move_to([2.9, -0.55, 0])
        self.say(
            "createTransform adds a node to the structure-of-arrays transform store, with parenting that rejects cycles and pointers to its matrices.",
            AnimationGroup(FadeOut(VGroup(gpu_note)), FadeIn(nodes[0:3]), Create(edges)),
            AnimationGroup(FadeIn(nodes[3]), Create(cycle)),
            FadeIn(pointers)
        )
        world = equation(r"W = W_{\text{parent}}\; L, \qquad L = T\,R\,S", 48).move_to([2.9, -1.75, 0])
        dirty = txt("dirty nodes only, parents first, in Rust", SMALL_SIZE, MUTED).next_to(world, DOWN, buff=0.25)
        self.say("Changes mark nodes dirty, and Rust recomposes local matrices and multiplies each world matrix by its parent's before drawing.", Write(world), FadeIn(dirty))

# =============================== Video: world ===============================
# Sources: ./typescript/world/scene.ts, ./typescript/world/camera.ts, ./typescript/world/light.ts,
# ./typescript/core/engine.ts (createScene, createCamera, createLight, createOverlay), ./typescript/core/renderer.ts
# (autoAspect), ./typescript/overlay/ (system.ts, types.ts, axisTriadLayer.ts, gridLayer.ts, legendLayer.ts),
# ./website/docs/world/*.md, ./website/docs/architecture/index.md (World), and ./ARCHITECTURE.md §1.5, §1.9, §1.12.

def light_icon(kind: str, color: str = DATA) -> VGroup:
    if kind == "ambient":
        return VGroup(*[Circle(radius=0.25 + 0.2 * index, stroke_width=0, fill_color=color, fill_opacity=0.35 - 0.1 * index) for index in range(3)])
    if kind == "directional":
        return VGroup(*[Arrow(np.array([-0.55 + 0.35 * index, 0.6, 0]), np.array([-0.15 + 0.35 * index, -0.4, 0]), buff=0, stroke_width=3, color=color, tip_length=0.15) for index in range(4)])
    if kind == "point":
        rays = VGroup(*[Line(np.array([math.cos(angle), math.sin(angle), 0]) * 0.18, np.array([math.cos(angle), math.sin(angle), 0]) * 0.45, color=color, stroke_width=3) for angle in np.linspace(0, 2 * PI, 9)[:-1]])
        return VGroup(Dot(ORIGIN, radius=0.12, color=color), rays, Circle(radius=0.75, stroke_color=color, stroke_width=1.5).set_stroke(opacity=0.6))
    if kind == "spot":
        apex = np.array([0, 0.65, 0])
        outer = Polygon(apex, np.array([-0.7, -0.55, 0]), np.array([0.7, -0.55, 0]), stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.12)
        inner = Polygon(apex, np.array([-0.35, -0.55, 0]), np.array([0.35, -0.55, 0]), stroke_color=color, stroke_width=2, fill_color=color, fill_opacity=0.3)
        return VGroup(outer, inner, Dot(apex, radius=0.09, color=color))
    raise ValueError(f"Unknown light icon: {kind}")

class WorldVideo(WasmGPUVideoScene):
    CHAPTERS = ["Scenes", "Cameras", "Lights", "Overlays"]

    def construct(self) -> None:
        self.open("The world subsystem holds what a frame looks at: scenes that register objects, cameras that view them, lights that shade them, and overlays drawn on top.")
        self.scenes()
        self.cameras()
        self.lights()
        self.overlays()
        self.finish(
            ["Scenes: flat registration, typed collections", "Perspective and orthographic cameras", "Ambient, directional, point, and spot lights", "Dirty-driven DOM overlays", "Axis triad, grid, and legend layers"],
            "To recap: scenes as flat registries, two camera types, four light types, and overlays that update only when invalidated.",
            "The full reference is in the World section of the documentation."
        )

    def scenes(self) -> None:
        self.chapter(1, "Scenes")
        panel = RoundedRectangle(corner_radius=0.16, width=5.4, height=4.9, stroke_color=API, stroke_width=3, fill_color=API, fill_opacity=0.05).move_to([-3.6, -0.2, 0])
        title = mono("wgpu.createScene(background)", 22, API).move_to(panel.get_top() + DOWN * 0.38)
        collections = [("meshes", "mesh"), ("pointClouds", "pointcloud"), ("glyphFields", "glyphfield"), ("nodeLinks", "nodelink"), ("splatFields", "splatfield"), ("latticeSpaces", "latticespace")]
        rows = VGroup(*[VGroup(object_glyph(kind, 0.42), mono(name, SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.3) for name, kind in collections])
        rows.add(VGroup(light_icon("point").scale(0.4), mono("lights", SMALL_SIZE, TEXT)).arrange(RIGHT, buff=0.3))
        rows.arrange(DOWN, buff=0.13, aligned_edge=LEFT).next_to(title, DOWN, buff=0.3).align_to(panel, LEFT).shift(RIGHT * 0.5)
        self.say(
            "createScene makes a registration container with typed collections for meshes and each of the five scientific primitives, plus lights and a background color.",
            AnimationGroup(FadeIn(panel), FadeIn(title)),
            LaggedStart(*[FadeIn(row, shift=0.1 * RIGHT) for row in rows], lag_ratio=0.12),
            max_run=2.0
        )
        swatch = VGroup(Square(side_length=0.36, stroke_color=MUTED, stroke_width=2, fill_color="#0d0d1a", fill_opacity=1), mono("scene.background = [r, g, b]", 22, TEXT)).arrange(RIGHT, buff=0.3).move_to([2.9, 0.5, 0])
        self.say("The background color is set when the scene is created, or later through its background property.", FadeIn(swatch), Indicate(swatch[0], color=MUTED, scale_factor=1.2))
        calls = VGroup(*[mono(call, 22, TEXT) for call in ["scene.add(object) · scene.remove(object)", "scene.addLight(light)", "scene.clearPointClouds()", "scene.findPointCloudByName(name)"]]).arrange(DOWN, buff=0.2, aligned_edge=LEFT).move_to([3.15, 1.4, 0])
        self.say("add and remove dispatch on the object's type, and typed helpers clear or find one family at a time.", AnimationGroup(FadeOut(swatch), FadeIn(calls[0:2])), FadeIn(calls[2:]))
        tree = VGroup(chip("Transform", ENGINE, 2.2), chip("Transform", ENGINE, 2.2), chip("Transform", ENGINE, 2.2))
        tree[0].move_to([2.9, -0.15, 0])
        tree[1].move_to([1.6, -1.25, 0])
        tree[2].move_to([4.2, -1.25, 0])
        links = VGroup(Line(tree[0].get_bottom(), tree[1].get_top(), color=MUTED, stroke_width=2), Line(tree[0].get_bottom(), tree[2].get_top(), color=MUTED, stroke_width=2))
        tree_note = txt("hierarchy lives in transforms", SMALL_SIZE, ENGINE).move_to([2.9, -2.1, 0])
        self.say("Hierarchy is not stored in the scene: parent-child structure lives in transforms, so the scene stays a flat set of registrations.", AnimationGroup(FadeIn(tree), Create(links)), FadeIn(tree_note))
        queries = VGroup(*[mono(call, 22, TEXT) for call in ["traverse() · traverseVisible()", "findByName() · findAllByName()", "getBounds()"]]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([3.1, -0.5, 0])
        self.say(
            "traverse and traverseVisible walk the meshes, findByName and findAllByName look objects up, and getBounds measures the whole scene.",
            AnimationGroup(FadeOut(VGroup(tree, links, tree_note, calls)), FadeIn(queries[0])),
            FadeIn(queries[1]),
            AnimationGroup(FadeIn(queries[2]), Create(SurroundingRectangle(rows, color=DATA, buff=0.15, corner_radius=0.1)))
        )
        lifetimes = VGroup(VGroup(mono("scene.clear()", SMALL_SIZE, TEXT), txt("removes references", SMALL_SIZE, MUTED)).arrange(RIGHT, buff=0.35), VGroup(mono("scene.destroy()", SMALL_SIZE, ERROR), txt("destroys every object", SMALL_SIZE, ERROR)).arrange(RIGHT, buff=0.35)).arrange(DOWN, buff=0.25, aligned_edge=LEFT).move_to([2.7, -2.2, 0])
        self.say("clear only removes references, while destroy also destroys every registered object.", FadeIn(lifetimes[0]), FadeIn(lifetimes[1]))

    def cameras(self) -> None:
        self.chapter(2, "Cameras")
        eye = np.array([-6.0, 0.3, 0])
        frustum = Polygon(eye, eye + np.array([4.6, 1.6, 0]), eye + np.array([4.6, -1.6, 0]), stroke_color=API, stroke_width=3, fill_color=API, fill_opacity=0.06)
        near = Line(eye + np.array([0.9, 0.31, 0]), eye + np.array([0.9, -0.31, 0]), color=MUTED, stroke_width=3)
        objects_p = VGroup(Square(side_length=0.6, stroke_color=DATA, stroke_width=2, fill_color=DATA, fill_opacity=0.3).move_to(eye + np.array([2.0, 0.0, 0])), Square(side_length=0.6, stroke_color=DATA, stroke_width=2, fill_color=DATA, fill_opacity=0.3).move_to(eye + np.array([4.0, 0.3, 0])))
        camera_p = camera_icon(TEXT, 1.0).move_to(eye + LEFT * 0.15)
        perspective = mono("createCamera.perspective({ fov: 60, autoAspect: true })", 22, API).move_to([0, 2.15, 0])
        self.say(
            "createCamera.perspective takes a vertical field of view in degrees, near and far planes, and an aspect ratio that can follow the canvas automatically.",
            FadeIn(perspective),
            AnimationGroup(FadeIn(camera_p), Create(frustum), Create(near)),
            FadeIn(objects_p)
        )
        infinite = mono("far: Infinity  →  infinite far plane", 22, MUTED).move_to([-3.5, -1.85, 0])
        self.say("Setting far to infinity gives an infinite far plane.", FadeIn(infinite))
        box_ = Rectangle(width=4.0, height=2.4, stroke_color=ENGINE, stroke_width=3, fill_color=ENGINE, fill_opacity=0.06).move_to([3.7, 0.3, 0])
        objects_o = VGroup(Square(side_length=0.6, stroke_color=DATA, stroke_width=2, fill_color=DATA, fill_opacity=0.3).move_to([2.6, 0.2, 0]), Square(side_length=0.6, stroke_color=DATA, stroke_width=2, fill_color=DATA, fill_opacity=0.3).move_to([4.6, 0.5, 0]))
        rays = VGroup(*[DashedLine([1.2, y, 0], [5.7, y, 0], dash_length=0.1, color=ENGINE, stroke_width=1.5) for y in (-0.6, 0.3, 1.2)])
        orthographic = mono("createCamera.orthographic({ left, right, top, bottom })", 21, ENGINE).move_to([1.9, -1.85, 0])
        self.say(
            "createCamera.orthographic uses left, right, top, and bottom bounds instead, so size does not change with distance.",
            AnimationGroup(FadeOut(perspective), FadeOut(infinite), Create(box_)),
            AnimationGroup(Create(rays), FadeIn(objects_o)),
            FadeIn(orthographic)
        )
        fixed = VGroup(mono("aspect: 16 / 9, autoAspect: false", 22, API), txt("glTF cameras keep authored aspect and infinite far planes", SMALL_SIZE, MUTED)).arrange(DOWN, buff=0.2).move_to(DOWN * 1.85)
        self.say("Perspective cameras also support a fixed aspect, and glTF import preserves authored aspect ratios and infinite far planes.", AnimationGroup(FadeOut(orthographic), FadeIn(fixed[0])), FadeIn(fixed[1]))
        api = VGroup(*[mono(call, 22, TEXT) for call in ["camera.transform", "lookAt(x, y, z) · setWorldPosition(x, y, z)", "viewMatrix · getProjectionMatrix() · viewProjectionMatrix"]]).arrange(DOWN, buff=0.22, aligned_edge=LEFT).move_to(DOWN * 1.65)
        self.say(
            "Both cameras own a transform, so lookAt and setWorldPosition move them, and they cache view, projection, and view-projection matrices.",
            AnimationGroup(FadeOut(fixed), FadeIn(api[0])),
            FadeIn(api[1]),
            FadeIn(api[2])
        )

    def lights(self) -> None:
        self.chapter(3, "Lights")
        specs = [("ambient", "ambient", ["color", "intensity"]), ("directional", "directional", ["direction"]), ("point", "point", ["position", "range"]), ("spot", "spot", ["innerCone", "outerCone", "range"])]
        panels = VGroup()
        for kind, name, params in specs:
            frame = RoundedRectangle(corner_radius=0.16, width=3.05, height=3.6, stroke_color=DATA, stroke_width=2, fill_color=DATA, fill_opacity=0.05)
            icon = light_icon(kind).move_to(frame.get_center() + UP * 0.8)
            title = mono(f".{name}()", SMALL_SIZE, DATA).move_to(frame.get_center() + DOWN * 0.3)
            body = VGroup(*[mono(param, 22, MUTED) for param in params]).arrange(DOWN, buff=0.1).next_to(title, DOWN, buff=0.2)
            panels.add(VGroup(frame, icon, title, body))
        panels.arrange(RIGHT, buff=0.2).move_to(UP * 0.12)
        factory = mono("wgpu.createLight", SMALL_SIZE, DATA).next_to(panels, UP, buff=0.18)
        for panel in panels:
            panel[3].set_opacity(0)
        common = txt("all lights: color · intensity · enabled", SMALL_SIZE, TEXT).move_to(DOWN * 2.2)
        self.say(
            "createLight builds ambient, directional, point, and spot lights, each with a color, an intensity, and an enabled flag.",
            AnimationGroup(FadeIn(factory), LaggedStart(*[FadeIn(panel[0:3], shift=0.1 * UP) for panel in panels], lag_ratio=0.2)),
            FadeIn(common)
        )
        self.say("Point and spot lights add a range, and spot lights add inner and outer cone angles.", *[panel[3].animate.set_opacity(1) for panel in panels])
        limit = VGroup(mono("Scene.MAX_LIGHTS = 8", SMALL_SIZE, TEXT), txt("non-ambient lights packed per frame", SMALL_SIZE, MUTED)).arrange(RIGHT, buff=0.4).move_to(DOWN * 2.3)
        self.say("The renderer packs at most eight non-ambient lights per frame, and lights imported from glTF follow their node transforms.", AnimationGroup(FadeOut(common), FadeIn(limit)), Indicate(panels[3][1], color=DATA, scale_factor=1.06))
        shadow = mono("wgpu.effects.shadows.enable(directionalLight)", 22, ENGINE).move_to(DOWN * 2.3)
        self.say("Directional lights can also cast shadows through the effects facade, which the Render section describes.", AnimationGroup(FadeOut(limit), FadeIn(shadow)), Indicate(panels[1], color=ENGINE, scale_factor=1.03))

    def overlays(self) -> None:
        self.chapter(4, "Overlays")
        canvas = Rectangle(width=7.0, height=4.1, stroke_color=MUTED, stroke_width=2, fill_color=PANEL, fill_opacity=1).move_to([-2.85, -0.25, 0])
        canvas_label = mono("canvas", 22, MUTED).next_to(canvas, UP, buff=0.12).align_to(canvas, LEFT)
        root = DashedVMobject(Rectangle(width=7.0, height=4.1).move_to(canvas.get_center() + np.array([0.12, 0.12, 0])), num_dashes=60).set_stroke(ACCENT, 2)
        root_label = mono("overlay root (DOM)", 22, ACCENT).next_to(canvas, UP, buff=0.12).align_to(canvas, RIGHT)
        registry = VGroup(*[mono(f'addLayer(layer) · id "{layer}"', 22, TEXT) for layer in ["axes", "grid", "legend"]]).arrange(DOWN, buff=0.2, aligned_edge=LEFT).move_to([3.85, 1.2, 0])
        self.say("createOverlay.system adds a DOM layer next to the canvas, where overlay layers are registered by ID.", AnimationGroup(FadeIn(canvas), FadeIn(canvas_label)), AnimationGroup(Create(root), FadeIn(root_label)), FadeIn(registry))
        reasons = VGroup(*[pill(reason, ACCENT, 22, MONO) for reason in ["camera", "viewport", "layout", "scale", "colormap", "interaction"]])
        VGroup(*[VGroup(*reasons[start:start + 2]).arrange(RIGHT, buff=0.15) for start in (0, 2, 4)]).arrange(DOWN, buff=0.15).move_to([3.85, -0.6, 0])
        update = mono("invalidate(reason) → update()", 22, TEXT).move_to([3.85, -1.75, 0])
        self.say("It redraws only when something invalidates it, such as the camera, the viewport, a layout change, a scale, a colormap, or an interaction.", LaggedStart(*[FadeIn(reason) for reason in reasons], lag_ratio=0.15), FadeIn(update))
        bind = mono("overlay.bindControls(controls)", 22, ENGINE).move_to([3.85, -2.4, 0])
        self.say("Binding the controls lets camera motion invalidate the overlay automatically.", FadeIn(bind), Indicate(reasons[0], color=ENGINE, scale_factor=1.1))
        toggles = VGroup(mono('setLayerEnabled("grid", false)', 22, TEXT), mono('removeLayer("grid")', 22, TEXT)).arrange(DOWN, buff=0.2, aligned_edge=LEFT).move_to([3.85, -1.9, 0])
        self.say("A layer can be hidden with setLayerEnabled without detaching it, and removing a layer releases its resources.", AnimationGroup(FadeOut(VGroup(update, bind)), FadeIn(toggles[0])), FadeIn(toggles[1]))
        corner = canvas.get_corner(DOWN + LEFT) + np.array([0.75, 0.75, 0])
        triad = VGroup(Arrow(corner, corner + RIGHT * 0.6, buff=0, color=BROWSER, stroke_width=3, tip_length=0.12), Arrow(corner, corner + UP * 0.6, buff=0, color=ENGINE, stroke_width=3, tip_length=0.12), Arrow(corner, corner + np.array([-0.35, -0.3, 0]), buff=0, color=API, stroke_width=3, tip_length=0.12))
        horizon = canvas.get_center()[1] - 0.2
        grid_lines = VGroup(*[Line([canvas.get_center()[0] + 0.55 * offset * 0.45, horizon + 0.3, 0], [canvas.get_center()[0] + 0.55 * offset * 1.6, canvas.get_bottom()[1] + 0.25, 0], color=HAIRLINE, stroke_width=1.5) for offset in range(-4, 5)])
        grid_lines.add(*[Line([canvas.get_center()[0] - 1.0 - 1.4 * t, horizon + 0.3 - 1.6 * t, 0], [canvas.get_center()[0] + 1.0 + 1.4 * t, horizon + 0.3 - 1.6 * t, 0], color=HAIRLINE, stroke_width=1.5) for t in (0.0, 0.3, 0.6, 0.9)])
        grid_labels = VGroup(*[mono(str(value), 22, MUTED).move_to([canvas.get_center()[0] + 0.55 * offset * 1.6, canvas.get_bottom()[1] + 0.12, 0]) for value, offset in [("-2", -2), ("0", 0), ("2", 2)]])
        self.say(
            "The axis triad shows the world axes in a screen corner, and the grid draws a labeled reference plane with adaptive spacing.",
            AnimationGroup(FadeOut(VGroup(registry, reasons, toggles)), Create(triad)),
            AnimationGroup(Create(grid_lines), FadeIn(grid_labels))
        )
        legend_bar = gradient_bar(COLORMAPS["viridis"], 0.35, 2.6, 30).rotate(PI / 2).move_to(canvas.get_right() + LEFT * 0.7 + UP * 0.1)
        ticks = VGroup(*[mono(label, 22, TEXT).next_to(legend_bar, LEFT, buff=0.12).set_y(legend_bar.get_bottom()[1] + fraction * legend_bar.height) for label, fraction in [("0", 0.0), ("0.5", 0.5), ("1", 1.0)]])
        legend_source = VGroup(mono("scaleTransform", 22, DATA), mono("colormap", 22, DATA)).arrange(DOWN, buff=0.2, aligned_edge=LEFT).move_to([3.85, 0.2, 0])
        legend_arrow = solid_arrow(legend_source.get_left(), legend_bar.get_right() + RIGHT * 0.05, DATA)
        self.say(
            "The legend reads an object's scale transform and colormap, and draws a color bar with ticks from that same state.",
            FadeIn(legend_source),
            AnimationGroup(GrowArrow(legend_arrow), FadeIn(legend_bar), FadeIn(ticks))
        )

@dataclass
class VideoResult:
    name: str
    path: Path
    duration: float = 0.0
    size_mb: float = 0.0
    width: int = 0
    height: int = 0
    fps: float = 0.0
    video_codec: str = ""
    audio_codec: str = ""
    cues: int = 0
    card: str = "n/a"
    problems: list[str] | None = None

def quality_flags(draft: bool) -> list[str]:
    return ["-ql", "--fps", "15"] if draft else ["-qh", "--fps", "30"]

def quality_dir(draft: bool) -> str:
    return "480p15" if draft else "1080p30"

def run_manim(arguments: Sequence[str], env: dict[str, str] | None = None) -> None:
    command = [sys.executable, "-m", "manim", "render", *arguments[:-1], "--media_dir", str(MEDIA_DIR), "--progress_bar", "none", "--verbosity", "WARNING", "--silent", str(Path(__file__).resolve()), arguments[-1]]
    subprocess.run(command, check=True, cwd=ROOT_DIR, env=env)

def render_scene(scene: str, draft: bool) -> tuple[Path, Path]:
    run_manim([*quality_flags(draft), scene])
    output_dir = MEDIA_DIR / "videos" / Path(__file__).stem / quality_dir(draft)
    video, subtitles = output_dir / f"{scene}.mp4", output_dir / f"{scene}.srt"
    if not video.exists():
        raise FileNotFoundError(f"Manim did not produce {video}")
    return video, subtitles

@functools.cache
def render_title_card(spec: VideoSpec) -> Path:
    output_name = f"website-video-{spec.name}"
    run_manim(["-qh", "-s", "-o", output_name, "TitleCardScene"], env={**os.environ, TITLE_CARD_ENV: spec.name})
    image = MEDIA_DIR / "images" / Path(__file__).stem / f"{output_name}.png"
    if not image.exists():
        raise FileNotFoundError(f"Manim did not produce {image}")
    destination = IMAGES_DIR / f"{output_name}.png"
    Image.open(image).convert("RGB").save(destination, optimize=True)
    return destination

TIMESTAMP_PATTERN = re.compile(r"(\d{2}:\d{2}:\d{2}),(\d{3})")

def srt_to_vtt(srt_text: str) -> tuple[str, int]:
    blocks = [block for block in re.split(r"\n\s*\n", srt_text.replace("\r\n", "\n").strip()) if block.strip()]
    output = ["WEBVTT", ""]
    for block in blocks:
        rows = block.split("\n")
        if rows[0].strip().isdigit():
            rows = rows[1:]
        rows[0] = TIMESTAMP_PATTERN.sub(r"\1.\2", rows[0])
        output.extend(rows)
        output.append("")
    return "\n".join(output).rstrip("\n") + "\n", len(blocks)

def write_captions(subtitles: Path, destination: Path) -> int:
    vtt, cues = srt_to_vtt(subtitles.read_text(encoding="utf-8") if subtitles.exists() else "")
    with destination.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(vtt)
    return cues

def decode_frames(path: Path, times: Sequence[float]) -> list[tuple[float, Image.Image]]:
    frames: list[tuple[float, Image.Image]] = []
    with av.open(str(path)) as container:
        stream = container.streams.video[0]
        stream.thread_type = "AUTO"
        pending = list(times)
        for frame in container.decode(stream):
            if not pending:
                break
            if frame.time is not None and frame.time + 0.5 / float(stream.average_rate) >= pending[0]:
                frames.append((pending.pop(0), frame.to_image()))
                while pending and frame.time + 0.5 / float(stream.average_rate) >= pending[0]:
                    frames.append((pending.pop(0), frame.to_image()))
    return frames

def contact_sheets(path: Path, duration: float, prefix: str, interval: float = 8.0, columns: int = 6, rows: int = 4) -> list[Path]:
    times = [round(step * interval, 3) for step in range(int(duration // interval) + 1)]
    if duration - 1.0 > times[-1]:
        times.append(round(duration - 1.0, 3))
    frames = decode_frames(path, times)
    thumb_w, thumb_h, label_h = 384, 216, 26
    font = ImageFont.truetype(str(FONTS_DIR / "UbuntuMono-Regular.ttf"), 20)
    for old in QA_DIR.glob(f"{prefix}-sheet-*.png"):
        old.unlink()
    sheets: list[Path] = []
    per_sheet = columns * rows
    for sheet_index in range(0, len(frames), per_sheet):
        chunk = frames[sheet_index:sheet_index + per_sheet]
        sheet_rows = math.ceil(len(chunk) / columns)
        sheet = Image.new("RGB", (columns * thumb_w, sheet_rows * (thumb_h + label_h)), (24, 24, 32))
        draw = ImageDraw.Draw(sheet)
        for index, (time, image) in enumerate(chunk):
            x, y = (index % columns) * thumb_w, (index // columns) * (thumb_h + label_h)
            sheet.paste(image.resize((thumb_w, thumb_h), Image.LANCZOS), (x, y + label_h))
            draw.text((x + 6, y + 3), f"{int(time // 60)}:{time % 60:04.1f}", fill=(230, 230, 240), font=font)
        destination = QA_DIR / f"{prefix}-sheet-{sheet_index // per_sheet + 1}.png"
        sheet.save(destination)
        sheets.append(destination)
    return sheets

def probe(path: Path, result: VideoResult) -> None:
    with av.open(str(path)) as container:
        video = container.streams.video[0]
        audio = container.streams.audio[0] if container.streams.audio else None
        result.duration = float(container.duration / av.time_base) if container.duration else 0.0
        result.width = video.codec_context.width
        result.height = video.codec_context.height
        result.fps = float(video.average_rate)
        result.video_codec = video.codec_context.name
        result.audio_codec = audio.codec_context.name if audio is not None else "none"
    result.size_mb = path.stat().st_size / 1_000_000

def poster_time(spec: VideoSpec) -> float:
    return 0.0 if spec == GENERAL else CARD_HOLD + CARD_SWAP + CARD_SETTLE / 2

def card_differences(video: Path, checks: Sequence[tuple[float, Path]]) -> list[float]:
    differences: list[float] = []
    for (_, frame), (_, card) in zip(decode_frames(video, [time for time, _ in checks]), checks):
        poster = Image.open(card).convert("RGB")
        frame = frame.convert("RGB")
        if poster.size != frame.size:
            differences.append(float("inf"))
            continue
        differences.append(float(np.mean(np.abs(np.asarray(frame, dtype=np.float32) - np.asarray(poster, dtype=np.float32)))))
    return differences

def build_video(spec: VideoSpec, draft: bool) -> VideoResult:
    print(f"Rendering {spec.name} ({spec.scene}) at {quality_dir(draft)}", flush=True)
    video, subtitles = render_scene(spec.scene, draft)
    QA_DIR.mkdir(parents=True, exist_ok=True)
    if draft:
        destination, captions = QA_DIR / f"{spec.name}-draft.mp4", QA_DIR / f"{spec.name}-draft.vtt"
    else:
        VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
        destination, captions = VIDEOS_DIR / f"{spec.name}.mp4", VIDEOS_DIR / f"{spec.name}.vtt"
    shutil.copyfile(video, destination)
    result = VideoResult(spec.name, destination, problems=[])
    result.cues = write_captions(subtitles, captions)
    probe(destination, result)
    if not draft:
        general = render_title_card(GENERAL)
        checks = [(0.0, general), (poster_time(spec), render_title_card(spec)), (result.duration - 0.2, general)]
        differences = card_differences(destination, checks)
        result.card = f"{'match' if max(differences) < 4.0 else 'MISMATCH'} ({max(differences):.2f})"
        for (time, card), difference in zip(checks, differences):
            if difference >= 4.0:
                result.problems.append(f"{card.name} differs from the frame at {time:.1f} s")
    expected = (854, 480, 15.0) if draft else (1920, 1080, 30.0)
    if (result.width, result.height) != expected[:2] or abs(result.fps - expected[2]) > 0.01:
        result.problems.append(f"expected {expected[0]}x{expected[1]} at {expected[2]:g} fps")
    if (result.video_codec, result.audio_codec) != ("h264", "aac"):
        result.problems.append("expected h264 video and aac audio")
    if not draft and not MIN_DURATION <= result.duration <= MAX_DURATION:
        result.problems.append(f"duration outside {MIN_DURATION:g}-{MAX_DURATION:g} s")
    if result.cues == 0:
        result.problems.append("no caption cues")
    contact_sheets(destination, result.duration, f"{spec.name}-draft" if draft else spec.name)
    return result

def build_sampler(draft: bool) -> VideoResult:
    print(f"Rendering the voice sampler at {quality_dir(draft)}", flush=True)
    video, _ = render_scene("VoiceSamplerScene", draft)
    shutil.copyfile(video, SAMPLER_PATH)
    result = VideoResult("sampler", SAMPLER_PATH, problems=[])
    probe(SAMPLER_PATH, result)
    return result

def save_frame(name: str, seconds: float, draft: bool) -> Path:
    source = QA_DIR / f"{name}-draft.mp4" if draft else VIDEOS_DIR / f"{name}.mp4"
    if not source.exists():
        raise FileNotFoundError(f"Render {name} first: {source} does not exist")
    QA_DIR.mkdir(parents=True, exist_ok=True)
    destination = QA_DIR / f"{name}{'-draft' if draft else ''}-frame-{seconds:g}.png"
    decode_frames(source, [seconds])[0][1].save(destination)
    return destination

def print_summary(results: Sequence[VideoResult]) -> None:
    header = f"{'name':<14}{'duration':>10}{'size':>10}  {'resolution':<11}{'fps':>5}  {'codecs':<10}{'cues':>6}  {'card':<16}status"
    print("\n" + header)
    print("-" * len(header))
    for result in results:
        status = "ok" if not result.problems else "FAIL: " + "; ".join(result.problems)
        print(f"{result.name:<14}{result.duration:>8.1f} s{result.size_mb:>7.2f} MB  {f'{result.width}x{result.height}':<11}{result.fps:>5.0f}  {f'{result.video_codec}/{result.audio_codec}':<10}{result.cues:>6}  {result.card:<16}{status}")
    if len(results) > 1:
        print(f"{'total':<14}{sum(r.duration for r in results):>8.1f} s{sum(r.size_mb for r in results):>7.2f} MB")

def main() -> int:
    parser = argparse.ArgumentParser(description="Generate the narrated WasmGPU documentation overview videos.")
    parser.add_argument("names", nargs="*", metavar="NAME", help=f"videos to render (default: all): {', '.join(VIDEO_BY_NAME)}")
    parser.add_argument("--draft", action="store_true", help="render a fast 480p15 preview under ./tools/videos/ without touching ./assets/")
    parser.add_argument("--sampler", action="store_true", help="render the voice sampler to ./tools/videos/voice-sampler.mp4")
    parser.add_argument("--frame", nargs=2, metavar=("NAME", "SECONDS"), help="save one frame of a rendered video to ./tools/videos/qa/")
    args = parser.parse_args()
    unknown = [name for name in args.names if name not in VIDEO_BY_NAME]
    if unknown:
        parser.error(f"unknown video name(s): {', '.join(unknown)}; valid names: {', '.join(VIDEO_BY_NAME)}")
    if args.frame:
        name, seconds = args.frame
        if name not in VIDEO_BY_NAME:
            parser.error(f"unknown video name: {name}; valid names: {', '.join(VIDEO_BY_NAME)}")
        print(f"Saved {save_frame(name, float(seconds), args.draft)}")
        return 0
    ensure_kokoro_model()
    QA_DIR.mkdir(parents=True, exist_ok=True)
    results: list[VideoResult] = []
    selected = [VIDEO_BY_NAME[name] for name in args.names] if args.names else ([] if args.sampler else VIDEOS)
    try:
        if args.sampler:
            results.append(build_sampler(args.draft))
        for spec in selected:
            results.append(build_video(spec, args.draft))
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print_summary(results)
        print(f"Video generation failed: {exc}", file=sys.stderr)
        return 1
    print_summary(results)
    return 0 if all(not result.problems for result in results) else 1

if __name__ == "__main__":
    raise SystemExit(main())
