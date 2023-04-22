//   Client-A         Server        Client-B
//   file-meta  ->  file-meta  ->   Received
//   Received   <-  file-ready  <-  file-ready
//  file-share  ->  file-share ->   Received


$(document).ready(function(){

	let myID = 0;
    let roomid;
	const socket = io();
    let file_accept = {};

	function generateID(){
        n = 2;
        var array = new Array(n);
        for (let i = 0; i < array.length; i++) { 
            array[i] = String(Math.trunc(Math.random()*999)).padStart(3, '0');}
		return array.join("-");
	}

	document.querySelector("#join-room-btn").addEventListener("click",function(){
        room_id = document.querySelector("#room-id").value;
		if(room_id.length == 0 || myID == 0){ return; }
		socket.emit("join-room", {uid:myID, roomid:room_id});
	});

    socket.on("join-success", function(data){
        roomid = data.roomid;
		document.querySelector("#room-info").innerHTML += `${data.newmember} joined the room:${data.roomid}`;
	});

	document.querySelector("#file-input").addEventListener("change",function(e){
		let files = e.target.files;
		if(files.length == 0){ return; }
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let reader = new FileReader();
            reader.onload = function(e){
                let buffer = new Uint8Array(reader.result);
                let ele = document.createElement("div");
                ele.classList.add("item");
                ele.innerHTML = `
                        <div class="progress">0%</div>
                        <div class="filename">${file.name}</div>
                `;
                document.querySelector("#send-files").appendChild(ele);

                file_meta = {
                    sendid: myID,
                    roomid: roomid,
                    filename: file.name,
                    filesize: buffer.length,
                    buffersize: 5*1024*1024,
                };
                shareFile(file_meta, buffer, ele.querySelector(".progress"));
            }
            reader.readAsArrayBuffer(file); 
        };
	});
 
    socket.on("file-meta", function(data){
        console.log(data.metadata)
        console.log(data.metadata.filename)
        file_accept.metadata = data.metadata;
		file_accept.transmitted = 0;
		file_accept.buffer = [];

		let el = document.createElement("div");
		el.classList.add("item");
		el.innerHTML = `
				<div class="progress">0%</div>
				<div class="filename">${data.metadata.filename}</div>
		`;
		document.querySelector("#accept-files").appendChild(el);

		file_accept.progrss_node = el.querySelector(".progress");

		socket.emit("file-ready", { metadata:data.metadata });
    });

	function shareFile(metadata, buffer, progress_node){
		socket.emit("file-meta", { metadata : metadata });
		
		socket.on("file-ready",function(data){
			let chunk = buffer.slice(0, metadata.buffersize);
			buffer = buffer.slice(metadata.buffersize, buffer.length);
			progress_node.innerText = Math.trunc(((metadata.filesize - buffer.length) / metadata.filesize * 100));
			console.log(chunk.length);
            if(chunk.length != 0){
				socket.emit("file-share", {metadata:metadata, buffer:chunk});
			} else {
				console.log("Sent file successfully");
			}
		});
	}

    socket.on("file-share",function(data){
		file_accept.buffer.push(data.buffer);
		file_accept.transmitted += data.buffer.byteLength;
        let percentage = Math.trunc(file_accept.transmitted / file_accept.metadata.filesize * 100)
		file_accept.progrss_node.innerText = toString(percentage) + "%";
		if(file_accept.transmitted == file_accept.metadata.filesize){
			download(new Blob(file_accept.buffer), file_accept.metadata.filename);
			file_accept = {};
		} else {
			socket.emit("file-ready", { metadata:data.metadata });
		}
	});

    myID = generateID();
    document.querySelector("#my-id").innerHTML = `${myID}`;
    socket.emit("set-id", {uid:myID});

});