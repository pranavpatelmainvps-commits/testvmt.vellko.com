import sys
content = open('backend.py', 'r', encoding='utf-8').read()

bad_chunk = """    data = []
    for e in emails.items:
        data.append({
            "id": e.id,
            "subject": e.subject,
            "sender": e.sender,
            "domain": e.domain,
            "type": e.message_type,
            "timestamp": e.timestamp.isoformat(),
            "details": e.blob_data
def reset_password_page():"""

good_chunk = """    data = []
    for e in emails.items:
        data.append({
            "id": e.id,
            "subject": e.subject,
            "sender": e.sender,
            "domain": e.domain,
            "type": e.message_type,
            "timestamp": e.timestamp.isoformat(),
            "details": e.blob_data
        })
        
    return jsonify({
        "emails": data,
        "total": emails.total,
        "pages": emails.pages,
        "current_page": page
    })

@app.route("/reset-password")
def reset_password_page():"""

if bad_chunk in content:
    open('backend.py', 'w', encoding='utf-8').write(content.replace(bad_chunk, good_chunk))
    print('FIXED')
else:
    print('NOT FOUND')
