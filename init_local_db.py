"""One-time script to initialize local dev DB and create admin user."""
from backend import app, db, bcrypt
from sqlalchemy import text

with app.app_context():
    db.create_all()
    print("Tables created.")

    # Check if user exists
    row = db.session.execute(
        text("SELECT id FROM user WHERE email = :e"),
        {"e": "pranavpatel.mainvps@gmail.com"},
    ).fetchone()

    if row:
        print(f"Admin user already exists (id={row[0]})")
    else:
        hashed = bcrypt.generate_password_hash("admin123").decode("utf-8")
        db.session.execute(
            text(
                "INSERT INTO user (name, email, password, role, is_verified, is_active)"
                " VALUES (:n, :e, :p, :r, 1, 1)"
            ),
            {
                "n": "Pranav",
                "e": "pranavpatel.mainvps@gmail.com",
                "p": hashed,
                "r": "admin",
            },
        )
        db.session.commit()
        print("Admin user created: pranavpatel.mainvps@gmail.com / admin123")
