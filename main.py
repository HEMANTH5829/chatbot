from abilities import url_for_uploaded_file
import logging
import os
from flask import Flask, render_template, session, request, jsonify
from flask_session import Session
from gunicorn.app.base import BaseApplication
from abilities import apply_sqlite_migrations, llm
from werkzeug.utils import secure_filename

from app_init import create_initialized_flask_app
from models import db, File

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app creation should be done by create_initialized_flask_app to avoid circular dependency problems.
app = create_initialized_flask_app()

# Configuring server-side session
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

@app.route("/")
def root_route():
    return render_template("template.html")

@app.route("/upload_file", methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        file_content = file.read()
        file_type = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        
        if file_type not in ['pdf', 'csv', 'txt'] and not file_type.startswith('image/'):
            return jsonify({'error': 'Unsupported file type'}), 400
        
        # Store file in database
        new_file = File(
            filename=filename,
            content=file_content,
            file_type=file_type
        )
        db.session.add(new_file)
        db.session.commit()
        
        return jsonify({'file_id': new_file.id, 'file_type': file_type})

@app.route("/send_message", methods=['POST'])
def send_message():
    data = request.json
    user_message = data['message']
    search_mode = data.get('mode', 'quick')
    model = data.get('model', 'gpt-4o')
    file_id = data.get('file_id')
    
    # Adjust temperature based on search mode
    temperature = 0.3 if search_mode == 'quick' else 0.7
    
    # Create a prompt that encourages search-engine-like responses
    prompt = f"Act as an AI search engine. Provide a comprehensive but concise answer to: {user_message}"
    
    # If there's a file, include its content in the prompt
    if file_id:
        file = File.query.get(file_id)
        if file:
            file_content = file.content
            file_type = file.file_type
            
            if file_type == 'txt':
                file_text = file_content.decode('utf-8')
            elif file_type == 'csv':
                import pandas as pd
                import io
                df = pd.read_csv(io.BytesIO(file_content))
                file_text = df.to_string()
            elif file_type == 'pdf':
                import PyPDF2
                import io
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                file_text = ""
                for page in pdf_reader.pages:
                    file_text += page.extract_text()
            elif file_type.startswith('image/'):
                # For images, we'll use the image_url parameter in the llm function
                image_url = url_for_uploaded_file(file_id)
                prompt = f"Analyze this image and {prompt}"
            else:
                file_text = "File content could not be processed"
            
            if not file_type.startswith('image/'):
                prompt = f"Based on this content:\n\n{file_text}\n\n{prompt}"
    
    if search_mode == 'pro':
        prompt += " Include detailed analysis and multiple perspectives in your response."
    
    response = llm(
        prompt=prompt,
        response_schema={
            "type": "object",
            "properties": {
                "response": {"type": "string"},
                "sources": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["response", "sources"]
        },
        model=model,
        temperature=temperature
    )
    
    return jsonify({
        "message": response["response"],
        "sources": response["sources"],
        "model": model
    })

class StandaloneApplication(BaseApplication):
    def __init__(self, app, options=None):
        self.application = app
        self.options = options or {}
        super().__init__()

    def load_config(self):
        config = {
            key: value
            for key, value in self.options.items()
            if key in self.cfg.settings and value is not None
        }
        for key, value in config.items():
            self.cfg.set(key.lower(), value)

    def load(self):
        return self.application

# Do not remove the main function while updating the app.
if __name__ == "__main__":
    options = {"bind": "%s:%s" % ("0.0.0.0", "8080"), "workers": 4, "loglevel": "info"}
    StandaloneApplication(app, options).run()