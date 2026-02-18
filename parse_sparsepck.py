import struct

data = open(r'c:\Users\Admin\Documents\MyProject\Ritmo\modules\expo-godot-view\android\src\main\assets\assets.sparsepck', 'rb').read()
print(f'Total file size: {len(data)} bytes')

# Pack version 3 header: standard 96 bytes + 8 extra bytes, then file_count at offset 104
offset = 104
file_count = struct.unpack_from('<I', data, offset)[0]
print(f'File count: {file_count}')
offset += 4

uid_entries = []
important = []
for i in range(file_count):
    path_len = struct.unpack_from('<I', data, offset)[0]; offset += 4
    path_bytes = data[offset:offset+path_len]
    path = path_bytes.decode('utf-8', errors='replace').rstrip('\x00')
    offset += path_len  # NOT padded based on what we see
    file_offset = struct.unpack_from('<q', data, offset)[0]; offset += 8
    file_size = struct.unpack_from('<q', data, offset)[0]; offset += 8
    md5 = data[offset:offset+16].hex(); offset += 16
    flags_entry = struct.unpack_from('<I', data, offset)[0]; offset += 4
    
    entry = (i, path, file_offset, file_size, flags_entry)
    
    if i < 5:
        print(f'  [{i}] path="{path}" offset={file_offset} size={file_size} flags={flags_entry}')
    
    if 'uid_cache' in path or 'global_script' in path:
        uid_entries.append(entry)
    if '.tscn' in path or 'main' in path.lower():
        important.append(entry)

print(f'\nParsed to offset {offset} / {len(data)}')
print(f'\nUID-related entries:')
for e in uid_entries:
    print(f'  [{e[0]}] path="{e[1]}" offset={e[2]} size={e[3]} flags={e[4]}')
print(f'\nScene/main entries:')
for e in important:
    print(f'  [{e[0]}] path="{e[1]}" offset={e[2]} size={e[3]} flags={e[4]}')
