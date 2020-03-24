"""Flask server for a ventilator X-Y gantry-based remote controller."""

# Built-in imports

import argparse

# Package imports

from flask import Flask, render_template

from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)


# Routes

@app.route('/')
def index():
    """Serve the integrated demo."""
    return render_template('index.html')


@app.route('/stream')
def stream():
    """Serve the WebRTC stream demo."""
    return render_template('stream.html')


@app.route('/coordinates')
def coordinates():
    """Serve the coordinates demo."""
    return render_template('coordinates.html')


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


@socketio.on('knob')
def receive_knob(data):
    """Handle received knob data."""
    print("received 'knob': " + str(data))


def main():
    """Run the app."""
    parser = argparse.ArgumentParser(
        description='Run server for remote ventilator UI.'
    )
    parser.add_argument(
        '--host', default='0.0.0.0',
        help='The hostname or IP address for the server to listen on.'
    )
    parser.add_argument(
        '--port', default=5000, help='The port for the server to listen on.'
    )
    args = parser.parse_args()
    socketio.run(app, host=args.host, port=args.port)


if __name__ == '__main__':
    main()
