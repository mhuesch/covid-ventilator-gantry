# Setup

### 1. Prerequisites

`pip3` and `python3` must be on your path. This *should* work with all python 3+, but it has only been tested with:

```
Python 3.7.6
pip 19.3.1 (python 3.7)
```

### 2. Backend

To use venv:
```
$ cd backend
$ python3 -m venv env
$ source env/bin/activate
$ pip3 install -r requirements.txt

# run it
$ python3 main.py
```

To use pipenv:
```
$ pipenv install

# run it
$ pipenv run python3 backend/main.py
```

### 3. Frontend

Browse to `http://localhost:5000/coordinates` for the SocketIO click event coordinates demo.

On a Raspberry Pi, start the webcam WebRTC streaming server with:
```
uv4l --driver raspicam --auto-video_nr --encoding h264
```

Then browse to `http://localhost:5000/stream` for the pi camera WebRTC streaming demo. Or browse to `http://localhost:5000` for the full demo with WebRTC streaming and click event coordinates.


### 4. Deployment

To deploy the app on port 80 with pipenv, run:
```
sudo pipenv run flask run --host=0.0.0.0 --port=80
```

If this fails, first run `sudo pipenv install` and then try again.

---

# Architecture v0

* Python backend sends a webcam stream to a JavaScript frontend, which runs in the browser
* They communicate on a secure channel
  * SocketIO, which is a layer over websockets
* The frontend displays the video feed, with an overlay in Javascript
  * Coordinates of the clicks on the overlay are sent to backend
* Backend prints out the coordinates

---

# TODO

* [ ] Important! : encrypt the communication channel between the client and the server.
* [ ] Render a video stream inside of the `contentContainer` div
