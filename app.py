"""Local Flask application. User text is never persisted by the server."""
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from ml.inference import analyze, MODEL

ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=str(ROOT / 'dist'), static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 300_000

@app.get('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.get('/api/health')
def health():
    return jsonify(status='ok', model_version=MODEL['version'], classes=len(MODEL['classes']))

@app.post('/api/analyze')
def analyze_route():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error='Send a JSON object with a text field.'), 400
    try:
        return jsonify(analyze(body.get('text')))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

@app.post('/api/batch')
def batch_route():
    body = request.get_json(silent=True)
    texts = body.get('texts') if isinstance(body, dict) else None
    if not isinstance(texts, list) or not 1 <= len(texts) <= 50:
        return jsonify(error='Provide between 1 and 50 strings in texts.'), 400
    try:
        return jsonify(results=[analyze(text) for text in texts])
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

@app.errorhandler(413)
def too_large(_error):
    return jsonify(error='Request too large.'), 413

@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'no-referrer'
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store'
    return response

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5000)
    args = parser.parse_args()
    print(f'Open CogniLens at http://127.0.0.1:{args.port}')
    app.run(host='127.0.0.1', port=args.port, debug=False)
