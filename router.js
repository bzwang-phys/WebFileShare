var fs = require('fs')
var url = require('url')
var path = require('path')
var express = require('express')
var router = express.Router()


router.get('/server', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/server.html'))
})

router.get('/client', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/client.html'));
})

router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/views/index.html'));
})





module.exports = router
