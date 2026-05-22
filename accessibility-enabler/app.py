from flask import Flask, request, render_template, jsonify, session, Response
import requests
import uuid
from urllib.parse import urlparse
import logging

from database import init_db, insert_telemetry, get_session_history
from ml_engine import predict_profile, train_baseline_model
from accessibility_processor import modify_html

app = Flask(__name__)
app.secret_key = 'accessibility-secret-key-for-session'

# Setup basic logging
logging.basicConfig(level=logging.INFO)

# Initialize DB and Baseline ML Model on startup
with app.app_context():
    init_db()
    try:
        train_baseline_model()
    except Exception as e:
        logging.error(f"Failed to train baseline model: {e}")

@app.route('/')
def index():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return render_template('index.html')

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    if not url:
        return "URL is required", 400

    if not url.startswith('http://') and not url.startswith('https://'):
        url = 'https://' + url

    session_id = session.get('session_id', request.args.get('session_id', str(uuid.uuid4())))
    session['session_id'] = session_id
    
    # Get current profile for session
    history = get_session_history(session_id)
    profile = history[0]['suggested_profile'] if history else 'default'

    try:
        # Fetch the original page
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        content_type = response.headers.get('Content-Type', '')
        
        if 'text/html' in content_type:
            # Process HTML
            modified_html = modify_html(
                response.text, 
                url, 
                profile, 
                proxy_url_prefix='/proxy',
                session_id=session_id
            )
            return modified_html
        else:
            # For non-HTML (images, css, etc), just return the raw content
            # Note: A real proxy is more complex, but this handles basic assets if linked absolutely
            excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
            headers = [(name, value) for (name, value) in response.raw.headers.items()
                       if name.lower() not in excluded_headers]
            return Response(response.content, response.status_code, headers)

    except requests.exceptions.RequestException as e:
        return f"Error fetching URL: {e}", 500

@app.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    session_id = data.get('session_id') or session.get('session_id')
    target_url = data.get('target_url', '')

    if not session_id:
        return jsonify({"status": "error", "message": "No session ID"}), 400

    # ML Inference: Predict best profile based on behavior
    suggested_profile = predict_profile(data)
    
    # Store telemetry
    insert_telemetry(session_id, target_url, data, suggested_profile)

    return jsonify({
        "status": "success", 
        "suggested_profile": suggested_profile,
        "message": "Telemetry recorded"
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
