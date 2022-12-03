const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {maxHttpBufferSize:1e8});
const router = require('./router')


app.use('/public/', express.static('./public/'));
app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(router);


function getRooms() { 
    var roomsMap = io.sockets.adapter.rooms;
    let roomsArray = [...roomsMap.keys()];
    return roomsArray;
}
function getRoomsMap() {
    return io.sockets.adapter.rooms;
}


io.on('connection', (socket)=>{
    console.log("rooms: " + getRooms() );

    socket.on("set-id", (data) => {
        console.log("new client: " + data.uid);
        socket.join(data.uid);
    })

    socket.on('disconnect', ()=>{
        console.log('user disconnected.');
    })

    socket.on("query-rooms", ()=>{
    })

    socket.on("join-room",function(data){
		socket.join(data.roomid);
        const roomMembers = io.sockets.adapter.rooms.get(data.roomid);
        var res = {roomid:data.roomid, members:roomMembers, newmember:data.uid};
        socket.broadcast.to(data.roomid).emit("join-success", res);
        socket.emit("join-success", res);
        // console.log(socket.rooms);
	});

	socket.on("file-meta",function(data){
		socket.broadcast.to(data.metadata.roomid).emit("file-meta", data);
	});
	socket.on("file-ready",function(data){
		socket.in(data.metadata.sendid).emit("file-ready", data);
	});
	socket.on("file-share",function(data){
        console.log(data.buffer.length);
		socket.broadcast.to(data.metadata.roomid).emit("file-share", data);
	})

})

const port = 9000;
server.listen(port, ()=>{serverInit(port)} );



function serverInit(port) {
    console.log("WebFileShare start at port: " + String(port));
}
