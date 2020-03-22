# Setup

### backend

```
$ cd backend
$ python3 -m venv env
$ source env/bin/activate
$ pip3 install -r requirements.txt
```

# Architecture v0

* Python backend sends a webcam stream to a JavaScript frontend, which runs in the browser
* They communicate on a secure channel
  * SocketIO, which is a layer over websockets
* The frontend displays the video feed, with an overlay in Javascript
  * Coordinates of the clicks on the overlay are sent to backend
* Backend prints out the coordinates

# TODO

* [ ] encrypt the communication channel between the client and the server. this is important!
