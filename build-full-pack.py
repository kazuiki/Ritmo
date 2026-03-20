"""
Build a FULL embedded Godot PCK v3 from a sparse Android-export payload folder.

Usage examples:
  python build-full-pack.py --folder eatgame --output eat_full.pck
  python build-full-pack.py --folder bathgame --output full_main.pck
  python build-full-pack.py --folder makehair --output full_main.pck
"""

import argparse
import hashlib
import os
import struct
import sys


PACK_REL_FILEBASE = 1 << 1


def collect_files(base_dir: str, output_name: str):
    skip_names = {
        "assets.sparsepck",
        "project.binary",
        "_cl_",
        "icon.svg",
        output_name,
        "eat_full.pck",
        "bath_full.pck",
        "make_hair_full.pck",
        "full_main.pck",
    }

    entries = []
    for dirpath, _, filenames in os.walk(base_dir):
        for fname in filenames:
            abs_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(abs_path, base_dir).replace("\\", "/")
            if rel_path in skip_names:
                continue
            entries.append((rel_path, abs_path))
    entries.sort(key=lambda x: x[0])
    return entries


def build_pck(entries, output_path: str):
    file_metas = []
    for rel_path, abs_path in entries:
        with open(abs_path, "rb") as f:
            data = f.read()
        file_metas.append(
            {
                "path_bytes": (rel_path + "\x00").encode("utf-8"),
                "data": data,
                "size": len(data),
                "md5": hashlib.md5(data).digest(),
                "flags": 0,
            }
        )

    file_count = len(file_metas)
    pack_flags = PACK_REL_FILEBASE

    files_offset = 104
    header_size = files_offset + 4

    file_table_size = 0
    for fm in file_metas:
        file_table_size += 4 + len(fm["path_bytes"]) + 8 + 8 + 16 + 4

    content_offset = header_size + file_table_size
    if content_offset % 64 != 0:
        content_offset = ((content_offset // 64) + 1) * 64

    current_rel_offset = 0
    for fm in file_metas:
        fm["rel_offset"] = current_rel_offset
        fm["abs_offset"] = content_offset + current_rel_offset
        current_rel_offset += fm["size"]
        if current_rel_offset % 8 != 0:
            current_rel_offset = ((current_rel_offset // 8) + 1) * 8

    with open(output_path, "wb") as out:
        out.write(b"GDPC")
        out.write(struct.pack("<I", 3))
        out.write(struct.pack("<I", 4))
        out.write(struct.pack("<I", 6))
        out.write(struct.pack("<I", 0))
        out.write(struct.pack("<I", pack_flags))
        out.write(struct.pack("<Q", content_offset))
        out.write(struct.pack("<Q", files_offset))
        out.write(b"\x00" * 64)
        out.write(struct.pack("<I", file_count))

        for fm in file_metas:
            out.write(struct.pack("<I", len(fm["path_bytes"])))
            out.write(fm["path_bytes"])
            out.write(struct.pack("<q", fm["rel_offset"]))
            out.write(struct.pack("<q", fm["size"]))
            out.write(fm["md5"])
            out.write(struct.pack("<I", fm["flags"]))

        if out.tell() < content_offset:
            out.write(b"\x00" * (content_offset - out.tell()))

        for fm in file_metas:
            out.write(fm["data"])
            rem = out.tell() % 8
            if rem != 0:
                out.write(b"\x00" * (8 - rem))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--folder", required=True, help="Payload folder under android/app/src/main/assets")
    parser.add_argument("--output", default="full_main.pck", help="Output PCK filename")
    args = parser.parse_args()

    root = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.join(root, "android", "app", "src", "main", "assets", args.folder)
    if not os.path.isdir(base_dir):
        print(f"ERROR: folder not found: {base_dir}")
        sys.exit(1)

    entries = collect_files(base_dir, args.output)
    if not entries:
        print(f"ERROR: no payload files found in {base_dir}")
        sys.exit(1)

    output_path = os.path.join(base_dir, args.output)
    build_pck(entries, output_path)
    size = os.path.getsize(output_path)
    print(f"Built {output_path} ({size} bytes)")


if __name__ == "__main__":
    main()
