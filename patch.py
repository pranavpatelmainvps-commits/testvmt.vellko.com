import re

with open('backend.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact block we want to replace
target_start = content.find('            # 1. ROTATE PASSWORD (SECURITY)')
if target_start == -1:
    print('Target start not found!')
else:
    target_end = content.find('        else:\n             log(\">>> [MODE] Bulk Onboarding')
    
    if target_end == -1:
        print('Target end not found!')
    else:
        # The block to indent
        block_to_indent = content[target_start:target_end]
        
        # Add 4 spaces to every line that is not empty
        indented_block = '\n'.join(('    ' + line if line.strip() else line) for line in block_to_indent.split('\n'))
        
        # Replace the unindented block with the indented block
        new_content = content[:target_start] + indented_block + content[target_end:]
        
        # Now update the else block to have the fast forward lines
        else_block = '''        else:
             log(">>> [MODE] Bulk Onboarding - Skipping Install/Fresh Checks.")
             # In onboarding mode, assume server is ready and we use the provided password (or temp pass if we knew it, but here we only have input pass)
             # User must provide current valid password for onboarding.
             update_progress("upload", "success", "Skipped - Already installed")
             update_progress("install", "success", "Skipped - Already installed")
             pass'''
             
        old_else = '''        else:
             log(">>> [MODE] Bulk Onboarding - Skipping Install/Fresh Checks.")
             # In onboarding mode, assume server is ready and we use the provided password (or temp pass if we knew it, but here we only have input pass)
             # User must provide current valid password for onboarding.
             pass'''
             
        new_content = new_content.replace(old_else, else_block)
        
        with open('backend.py', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Successfully indented block and updated else branch.')
