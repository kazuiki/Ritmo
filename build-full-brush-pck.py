"""
Build a FULL embedded Godot PCK v3 from the brushgame sparse export.

The sparse .sparsepck from the Android export only contains a file table
(metadata). The actual file data lives as loose files alongside it.
load_resource_pack() is more reliable with a FULL pack with embedded data,
so this script reads every loose file under brushgame/ and packs them into
single .pck.

Output: brushgame/full_main.pck
"""
import hashlib
import os
import struct
import sys

BRUSHGAME_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "android", "app", "src", "main", "assets", "brushgame"
)
OUTPUT_PCK = os.path.join(BRUSHGAME_DIR, "full_main.pck")

# Files to skip (not Godot resources or generated output)
SKIP_FILES = {"assets.sparsepck", "full_main.pck", "project.binary", "_cl_", "icon.svg"}

# PCK v3 flags
PACK_REL_FILEBASE = 1 << 1


def collect_files(base_dir):
    entries = []
    for dirpath, _, filenames in os.walk(base_dir):
        for fname in filenames:
            abs_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(abs_path, base_dir).replace("\\", "/")
            if rel_path in SKIP_FILES:
                continue
            entries.append((rel_path, abs_path))
    entries.sort(key=lambda x: x[0])
    return entries


def build_pck(entries, output_path):
    file_metas = []
    for rel_path, abs_path in entries:
        with open(abs_path, "rb") as f:
            data = f.read()
        md5 = hashlib.md5(data).digest()
        path_bytes = (rel_path + "\x00").encode("utf-8")
        file_metas.append({
            "path_bytes": path_bytes,
            "data": data,
            "size": len(data),
            "md5": md5,
            "flags": 0,
        })

    file_count = len(file_metas)
    pack_flags = PACK_REL_FILEBASE

    FILES_OFFSET = 104
    HEADER_SIZE = FILES_OFFSET + 4

    file_table_size = 0
    for fm in file_metas:
        file_table_size += 4 + len(fm["path_bytes"]) + 8 + 8 + 16 + 4

    content_offset = HEADER_SIZE + file_table_size
    alignment = 64
    if content_offset % alignment != 0:
        content_offset = ((content_offset // alignment) + 1) * alignment

    current_rel_offset = 0
    for fm in file_metas:
        fm["rel_offset"] = current_rel_offset
        fm["abs_offset"] = content_offset + current_rel_offset
        current_rel_offset += fm["size"]
        if current_rel_offset % 8 != 0:
            current_rel_offset = ((current_rel_offset // 8) + 1) * 8

    total_size = content_offset + current_rel_offset

    print(f"Building PCK v3: {file_count} files, {total_size:,} bytes")
    print(f"  content_offset={content_offset}, files_offset={FILES_OFFSET}")

    with open(output_path, "wb") as out:
        out.write(b"GDPC")
        out.write(struct.pack("<I", 3))
        out.write(struct.pack("<I", 4))
        out.write(struct.pack("<I", 6))
        out.write(struct.pack("<I", 0))
        out.write(struct.pack("<I", pack_flags))
        out.write(struct.pack("<Q", content_offset))
        out.write(struct.pack("<Q", FILES_OFFSET))
        out.write(b"\x00" * 64)
        out.write(struct.pack("<I", file_count))

        assert out.tell() == HEADER_SIZE

        for fm in file_metas:
            out.write(struct.pack("<I", len(fm["path_bytes"])))
            out.write(fm["path_bytes"])
            out.write(struct.pack("<q", fm["rel_offset"]))
            out.write(struct.pack("<q", fm["size"]))
            out.write(fm["md5"])
            out.write(struct.pack("<I", fm["flags"]))

        current_pos = out.tell()
        if current_pos < content_offset:
            out.write(b"\x00" * (content_offset - current_pos))

        assert out.tell() == content_offset

        for fm in file_metas:
            pos = out.tell()
            expected = fm["abs_offset"]
            assert pos == expected
            out.write(fm["data"])
            current_pos = out.tell()
            remainder = current_pos % 8
            if remainder != 0:
                out.write(b"\x00" * (8 - remainder))

    actual_size = os.path.getsize(output_path)
    print(f"Written: {output_path}")
    print(f"Total size: {actual_size:,} bytes")


def main():
    if not os.path.isdir(BRUSHGAME_DIR):
        print(f"ERROR: brushgame dir not found: {BRUSHGAME_DIR}")
        sys.exit(1)

    entries = collect_files(BRUSHGAME_DIR)
    print(f"Found {len(entries)} files in {BRUSHGAME_DIR}")

    if not entries:
        print("ERROR: No files found!")
        sys.exit(1)

    build_pck(entries, OUTPUT_PCK)
    print("DONE")


if __name__ == "__main__":
    main()
