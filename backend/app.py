"""Flask server for a ventilator X-Y gantry-based remote controller."""

# Built-in imports

# Package imports

from flask import Flask, send_from_directory

from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)


# Routes

@app.route('/')
def index():
    """Serve the integrated demo."""
    return send_from_directory('static', 'index.html')


@app.route('/stream')
def stream():
    """Serve the WebRTC stream demo."""
    return send_from_directory('static', 'stream.html')


@app.route('/coordinates')
def coordinates():
    """Serve the coordinates demo."""
    return send_from_directory('static', 'coordinates.html')


# SocketIO handlers

@socketio.on('message')
def receive_message(message):
    """Handle generic message."""
    print('received generic message: ' + message)


@socketio.on('my event')
def receive_test_message(message):
    """Handle generic custom message by sending a reply."""
    print("received 'my event': " + str(message))
    emit('my response', {'data': 'got it!'})


@socketio.on('coordinates')
def receive_coordinates(data):
    """Handle received coordinates."""
    print("received 'coordinates': " + str(data))


if __name__ == '__main__':
    socketio.run(app)
