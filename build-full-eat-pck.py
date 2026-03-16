"""
Build a FULL embedded Godot PCK v3 from the eatgame sparse export.

The sparse .sparsepck from the Android export only contains a file table
(metadata). The actual file data lives as loose files alongside it.
load_resource_pack() needs a FULL pack with embedded data, so this script
reads every loose file under eatgame/ and packs them into a single .pck.

Uses PCK format version 3 (Godot 4.6) with PACK_REL_FILEBASE flag so
file offsets are relative to the content section start.

Output: eatgame/eat_full.pck  (ready for load_resource_pack at runtime)
"""
import hashlib
import os
import struct
import sys

EATGAME_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "android", "app", "src", "main", "assets", "eatgame"
)
OUTPUT_PCK = os.path.join(EATGAME_DIR, "eat_full.pck")

# Files to skip (not Godot resources - they're build artifacts or our output)
SKIP_FILES = {"assets.sparsepck", "eat_full.pck", "project.binary", "_cl_", "icon.svg"}

# PCK v3 flags
PACK_REL_FILEBASE = 1 << 1          # offsets relative to content_offset
PACK_INCLUDES_STRIPPED_FILES = 1 << 2  # includes .remap / stripped files

def collect_files(base_dir):
    """Walk the eatgame dir and collect (relative_path, absolute_path) pairs."""
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
    """Build a Godot PCK v3 with all file data embedded."""

    # --- Prepare file data and metadata ---
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
    # Use ONLY PACK_REL_FILEBASE (=2). Do NOT set PACK_INCLUDES_STRIPPED_FILES (=4)
    # because we don't embed stripped file info after each TOC entry.
    # If that flag is set, Godot reads stripped_count + N hashes after EVERY entry,
    # which misaligns the entire file table when the data isn't there.
    pack_flags = PACK_REL_FILEBASE  # = 2

    # --- PCK v3 header layout ---
    # 4  magic "GDPC"
    # 4  pack_version (3)
    # 4  ver_major (4)
    # 4  ver_minor (6)
    # 4  ver_patch (0)
    # 4  flags (6)
    # 8  content_offset (uint64) - where data section starts
    # 8  files_offset (uint64) - where file TOC starts (= 104, file_count lives here)
    # 64 reserved (16 × uint32, all zero)
    # 4  file_count  (at byte 104)
    # --- file entries start at byte 108 ---
    FILES_OFFSET = 104  # Godot reads file_count from this byte (matches original pack)
    HEADER_SIZE = FILES_OFFSET + 4  # = 108, after file_count, where file entries begin

    # File table size (file entries only, file_count is part of header)
    file_table_size = 0
    for fm in file_metas:
        file_table_size += 4 + len(fm["path_bytes"]) + 8 + 8 + 16 + 4

    content_offset = HEADER_SIZE + file_table_size
    # Align content start to 64 bytes
    alignment = 64
    if content_offset % alignment != 0:
        content_offset = ((content_offset // alignment) + 1) * alignment

    # Calculate RELATIVE offsets (relative to content_offset) for each file
    current_rel_offset = 0
    for fm in file_metas:
        fm["rel_offset"] = current_rel_offset
        fm["abs_offset"] = content_offset + current_rel_offset
        current_rel_offset += fm["size"]
        # Align to 8 bytes
        if current_rel_offset % 8 != 0:
            current_rel_offset = ((current_rel_offset // 8) + 1) * 8

    total_size = content_offset + current_rel_offset

    # --- Write PCK ---
    print(f"Building PCK v3: {file_count} files, {total_size:,} bytes")
    print(f"  content_offset={content_offset}, files_offset={FILES_OFFSET}")

    with open(output_path, "wb") as out:
        # Header
        out.write(b"GDPC")                                    # magic
        out.write(struct.pack("<I", 3))                        # pack_version = 3
        out.write(struct.pack("<I", 4))                        # ver_major
        out.write(struct.pack("<I", 6))                        # ver_minor
        out.write(struct.pack("<I", 0))                        # ver_patch
        out.write(struct.pack("<I", pack_flags))               # flags = 6
        out.write(struct.pack("<Q", content_offset))           # content_offset (uint64)
        out.write(struct.pack("<Q", FILES_OFFSET))             # files_offset (uint64)
        out.write(b"\x00" * 64)                                # reserved (16 × uint32)
        out.write(struct.pack("<I", file_count))               # file_count

        assert out.tell() == HEADER_SIZE, f"Header+file_count size mismatch: {out.tell()} != {HEADER_SIZE}"

        # File table entries (offsets are RELATIVE to content_offset)
        for fm in file_metas:
            out.write(struct.pack("<I", len(fm["path_bytes"])))
            out.write(fm["path_bytes"])
            out.write(struct.pack("<q", fm["rel_offset"]))     # relative offset!
            out.write(struct.pack("<q", fm["size"]))
            out.write(fm["md5"])
            out.write(struct.pack("<I", fm["flags"]))

        # Pad to content_offset
        current_pos = out.tell()
        if current_pos < content_offset:
            out.write(b"\x00" * (content_offset - current_pos))

        assert out.tell() == content_offset, f"Content start mismatch: {out.tell()} != {content_offset}"

        # File data
        for fm in file_metas:
            pos = out.tell()
            expected = fm["abs_offset"]
            assert pos == expected, f"Data offset mismatch for {fm['path_bytes'][:40]}: {pos} != {expected}"
            out.write(fm["data"])
            # Align to 8 bytes
            current_pos = out.tell()
            remainder = current_pos % 8
            if remainder != 0:
                out.write(b"\x00" * (8 - remainder))

    actual_size = os.path.getsize(output_path)
    print(f"Written: {output_path}")
    print(f"Total size: {actual_size:,} bytes")


def main():
    if not os.path.isdir(EATGAME_DIR):
        print(f"ERROR: eatgame dir not found: {EATGAME_DIR}")
        sys.exit(1)

    entries = collect_files(EATGAME_DIR)
    print(f"Found {len(entries)} files in {EATGAME_DIR}")

    if not entries:
        print("ERROR: No files found!")
        sys.exit(1)

    build_pck(entries, OUTPUT_PCK)
    print("DONE")


if __name__ == "__main__":
    main()
