from backend import app, db
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError

with app.app_context():
    try:
        # Check if column exists, if not, add it.
        # This raw SQL works for both SQLite and MariaDB for adding a simple VARCHAR column.
        db.session.execute(text("ALTER TABLE user ADD COLUMN plan VARCHAR(50);"))
        db.session.commit()
        print("SUCCESS: Added 'plan' column to user table.")
    except (OperationalError, ProgrammingError) as e:
        error_msg = str(e).lower()
        if "duplicate column" in error_msg or "already exists" in error_msg:
            print("SKIPPED: 'plan' column already exists in user table.")
        else:
            print(f"FAILED: Could not add column. {e}")
