//   Client-A         Server                 Client-B
//   file-meta  ->  转发(file-meta)      ->   Received
//   Received   <-  转发(file-ready)     <-  file-ready
//  file-share  ->  转发(file-share)     ->   Received
//   Received   <-  转发(file-finished)  <-  file-finished

$(document).ready(function(){

	let myID = 0;
    let roomid;
	const socket = io();
    let sf = {i:0, num:0, data:null, progress_node:null, files:null, metadata:null};
    let af = {metadata:null, transmitted:0, buffer:null, progrss_node:null};
    // af:accept_file.   sf:send_file

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

	document.querySelector("#file-input").addEventListener("change", function(e){
		let files = e.target.files;
		if(files.length == 0){ return; }
        sf.num = files.length;
        sf.i = 0;
        sf.files = Array.from(files);
        console.log("input: "); console.log(sf);
        sendNewFile();

        e.target.value = '';  // then you can chose the same file again.
	});

    socket.on("join-success", function(data){
        roomid = data.roomid;
		document.querySelector("#room-info").innerHTML += `${data.newmember} joined the room:${data.roomid}\n`;
	});
    socket.on("join-failed", function(data){
		alert("There is no room: " + data.roomid);
    });


    // ==========================  Sender  ==========================

    function createFileElement(filename) {
        const ele = document.createElement("div");
        ele.classList.add("item");
        ele.innerHTML = `
            <div class="progress">0%</div>
            <div class="filename">${filename}</div>
        `;
        return ele;
    }

    function sendNewFile() {
        console.log("sendNewFile: "); console.log(sf);
        const file = sf.files[sf.i];
        console.log(file);
        let reader = new FileReader();
        reader.onload = function(e){
            sf.data = new Uint8Array(reader.result);
            let ele = createFileElement(file.name);
            sf.progress_node = ele.querySelector(".progress");
            document.querySelector("#send-files").appendChild(ele);

            file_meta = {
                sendid: myID,
                roomid: roomid,
                filename: file.name,
                filesize: sf.data.length,
                buffersize: 5*1024*1024,
            };
            sf.metadata = file_meta;
            socket.emit("file-meta", { metadata : file_meta });
        }
        reader.readAsArrayBuffer(file); 
    }

    socket.on("file-ready",function(data){
        let chunk = sf.data.slice(0, sf.metadata.buffersize);
        sf.data = sf.data.slice(sf.metadata.buffersize, sf.data.length);
        sf.progress_node.innerText = Math.trunc(((sf.metadata.filesize - sf.data.length) / sf.metadata.filesize * 100))+"%";
        if(chunk.length != 0){
            socket.emit("file-share", {metadata:sf.metadata, buffer:chunk});
        } else {
            console.log("Sent file successfully");
        }
    });

    socket.on("file-finished", function (data) {
        if (sf.i < sf.num-1) {
            sf.i = sf.i + 1;
            sendNewFile();
        }
    })

    // ==========================  End Sender  ==========================


    // ==========================  Receiver  ==========================

    socket.on("file-meta", function(data){
        af.metadata = data.metadata;
		af.transmitted = 0;
		af.buffer = [];

		let el = document.createElement("div");
		el.classList.add("item");
		el.innerHTML = `
				<div class="progress">0%</div>
				<div class="filename">${data.metadata.filename}</div>
		`;
		document.querySelector("#accept-files").appendChild(el);

		af.progrss_node = el.querySelector(".progress");

		socket.emit("file-ready", { metadata:data.metadata });
    });

    
    socket.on("file-share", function(data){
		af.buffer.push(data.buffer);
		af.transmitted += data.buffer.byteLength;
        let percentage = Math.trunc(af.transmitted/Number(af.metadata.filesize)*100)
        af.progrss_node.innerText = percentage.toString() + "%";

		if(af.transmitted == af.metadata.filesize){
			download(new Blob(af.buffer), af.metadata.filename);
			af = {};
            console.log("Download Finished");
            socket.emit("file-finished", { metadata:data.metadata });
		} else {
			socket.emit("file-ready", { metadata:data.metadata });
		}
	});

    // ==========================  End Receiver  ==========================



    myID = generateID();
    document.querySelector("#my-id").innerHTML = `${myID}`;
    socket.emit("set-id", {uid:myID});

});