var express = require('express')
var http = require('http')

var app = express()
var server = http.createServer(app)

var io = require('socket.io')(server)
var path = require('path')

app.use(express.static(path.join(__dirname, './public')))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

var name;  

io.on('connection', (socket) => {
    
    socket.on('join', (username) => { // fe den gelen veriyi yakalar
        name = username 
        console.log('Yeni biri katıldı ismi: ' + username)
        // let mesaj = 'mesaj: ' + name + ' sohbete katıldı'
        io.emit('chat mesaj', `${name} sohebete katıldı. `) // backenden front ende veri gönderimi
    })

    socket.on('disconnect', () => {
        console.log('kullanıcı çıktı')
        io.emit('chat mesaj', `${name} sohebetten ayrıldı. `) // backenden front ende veri gönderimi
    })

    socket.on('chat mesaj', (msg) => { // önyüzden gelen mesaj yakalnıp herjese tekarar aynı kanaldan gönerilir
        io.emit('chat mesaj', msg)
    })

})


server.listen(8000, () => {
    console.log('Sunucu 8000 den başlatıldı')
    
})