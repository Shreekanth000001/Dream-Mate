import sqlite3

conn = sqlite3.connect('dreammate.db')
cursor = conn.cursor()

# Get the last conversation
cursor.execute("SELECT id, user_id FROM conversations ORDER BY session_start DESC LIMIT 1")
conv = cursor.fetchone()
print(f"Latest Conversation: {conv}")

if conv:
    cursor.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conv[0],))
    messages = cursor.fetchall()
    print("\nMessages in this conversation:")
    for m in messages:
        print(f"[{m[0].upper()}] {m[1]}")

conn.close()
