from backend import app, db, User
import traceback

with app.app_context():
    try:
        user = User.query.filter_by(email='pranavpatel.mainvps@gmail.com').first()
        print('User:', user)
    except Exception as e:
        with open('/app/db_error.txt', 'w') as f:
            f.write(traceback.format_exc())
        print('Error written to /app/db_error.txt')
