from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/stream')
def stream():
    return send_from_directory('static', 'stream.html')

@socketio.on('message')
def handle_message(message):
    print('received generic message: ' + message)

@socketio.on('my event')
def test_message(message):
    print("received 'my event': " + str(message))
    emit('my response', {'data': 'got it!'})

@socketio.on('coordinates')
def coordinates(data):
    print("received 'coordinates': " + str(data))

if __name__ == '__main__':
    socketio.run(app)
