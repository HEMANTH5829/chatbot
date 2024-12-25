from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from abilities import apply_sqlite_migrations  # Adjust the import path if necessary

db = SQLAlchemy()

def create_initialized_flask_app():
    app = Flask(__name__, static_folder='static')

    # Set Flask secret key
    app.config['SECRET_KEY'] = 'supersecretflaskskey'

    # Initialize database
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///your_database.db'
    db.init_app(app)

    # Apply database migrations
    with app.app_context():
        apply_sqlite_migrations(db.engine, db.Model, 'migrations')

    return app