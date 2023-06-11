$(document).ready(function() {
    const socket = io();
    const file_accept = {};

    function generateID() {
        return Math.trunc(Math.random() * 999).toString().padStart(3, "0") +
            "-" +
            Math.trunc(Math.random() * 999).toString().padStart(3, "0");
    }

    function createFileElement(filename) {
        const ele = document.createElement("div");
        ele.classList.add("item");
        ele.innerHTML = `
            <div class="progress">0%</div>
            <div class="filename">${filename}</div>
        `;
        return ele;
    }

    function shareFile(metadata, buffer, progress_node) {
        socket.once("file-ready", () => {
            sendChunks(buffer, metadata.buffersize, (chunk) => {
                const percentage = Math.trunc((metadata.filesize - buffer.length) / metadata.filesize * 100);
                progress_node.innerText = `${percentage}%`;
                if (chunk.length !== 0) {
                    socket.emit("file-share", {
                        metadata: metadata,
                        buffer: chunk
                    });
                } else {
                    console.log("File sent successfully.");
                }
            });
        });

        socket.emit("file-meta", {
            metadata: metadata
        });
    }

    function sendChunks(buffer, chunkSize, callback) {
        let offset = 0;
        while (offset < buffer.length) {
            const chunk = buffer.slice(offset, offset + chunkSize);
            offset += chunkSize;
            callback(chunk);
        }
        callback(new Uint8Array(0));
    }

    function processFileMeta(metadata) {
        file_accept.metadata = metadata;
        file_accept.transmitted = 0;
        file_accept.buffer = [];

        const el = createFileElement(metadata.filename);
        document.querySelector("#accept-files").appendChild(el);

        file_accept.progrss_node = el.querySelector(".progress");

        socket.emit("file-ready", {
            metadata: metadata
        });
    }

    function processFileShare(data) {
        file_accept.buffer.push(data.buffer);
        file_accept.transmitted += data.buffer.byteLength;

        const percentage = Math.trunc(file_accept.transmitted / file_accept.metadata.filesize * 100);
        file_accept.progrss_node.innerText = `${percentage}%`;

        if (file_accept.transmitted === file_accept.metadata.filesize) {
            download(new Blob(file_accept.buffer), file_accept.metadata.filename);
            file_accept.metadata = undefined;
            file_accept.buffer = [];
            file_accept.progrss_node = undefined;
        } else {
            socket.emit("file-ready", {
                metadata: file
