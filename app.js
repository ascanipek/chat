var express = require('express')
var http = require('http')

const {ifLoggedin, ifNotLoggedin} = require("./middlewares/accessControl")

// cookie, bcrypt, database ve validation kütüphaneleri

    const cookieSession = require('cookie-session');
    const bcrypt = require('bcrypt');
    const dbConnection = require('./database');
    const { body, validationResult } = require('express-validator');

//  

var app = express()

// post edilen datayı yakalamk için
    app.use(express.urlencoded({extended:true}));
// 

var server = http.createServer(app)

// chat için gerekli
var io = require('socket.io')(server)
var path = require('path')


    app.set('views', path.join(__dirname,'./public/views'));
    app.set('view engine','ejs');

// Cookie için
    app.use(cookieSession({
        name: 'session',
        keys: ['key1', 'key2'],
        maxAge:  3600 * 1000 // 1hr
    })); 
// 

// Ana Sayfa Dikkat buradaki ifNotLoggedin middleware'i login olup olmama durumunu kontrol eder!
app.get('/', ifNotLoggedin, (req,res,next) => {
    dbConnection.execute("SELECT `name` FROM `users` WHERE `id`=?",[req.session.userID])
    .then(([rows]) => {
        res.render('home',{
            isim:rows[0].name
        });
    });
    
});// ana sayfa sonu


// Chat ile ilgili kodlar yani socket.io
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
        socket.broadcast.emit('chat mesaj', msg)
    })

})
//  chat kodlarının sonu

// login sayfası Oturum açma fonksyionu
app.post('/', ifLoggedin, [
    body('user_email').custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows]) => {
            if(rows.length == 1){
                return true;
            }
            else if(rows.length == 0)
                return Promise.reject('Hatalı E-Posta!'); 
        });
    }),
    body('user_pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {user_pass, user_email} = req.body;
    if(validation_result.isEmpty()){
        
        dbConnection.execute("SELECT * FROM `users` WHERE `email`=?",[user_email])
        .then(([rows]) => {
            bcrypt.compare(user_pass, rows[0].password).then(compare_result => {
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;

                    res.redirect('/');
                    // res.sendFile(__dirname + '/public/views/index.html')
                }
                else{
                    res.render('login-register',{
                        login_errors:['Hatalı Parola!']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });


        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
        res.render('login-register',{
            login_errors:allErrors
        });
    }
});
// login sayfası sonu

// Logout sayfası
app.get('/logout',(req,res)=>{
    //session destroy
    req.session = null;
    // ana sayfaya gönderir o da session olmadığı için login sayfasıan gönderir
    res.redirect('/');
});
// logout sayfasının sonu


// Kayıt sayfası
app.post('/register', ifLoggedin, 
// post data validation(using express-validator)
[
    body('user_email','Invalid email address!').isEmail().custom((value) => {
        return dbConnection.execute('SELECT `email` FROM `users` WHERE `email`=?', [value])
        .then(([rows]) => {
            if(rows.length == 1){
                return Promise.reject('Bu E-Posta Kullanılmakta! Başka Bir E-Posta deneyin');
            }
            return true;
        });
    }),
    body('user_name','Username is Empty!').trim().not().isEmpty(),
    body('user_pass','The password must be of minimum length 6 characters').trim().isLength({ min: 6 }),
],// end of post data validation
(req,res,next) => {

    const validation_result = validationResult(req);
    const {user_name, user_pass, user_email} = req.body;
    // IF validation_result HAS NO ERROR
    if(validation_result.isEmpty()){
        // password encryption (using bcryptjs)
        bcrypt.hash(user_pass, 12).then((hash_pass) => {
            // INSERTING USER INTO DATABASE
            dbConnection.execute("INSERT INTO `users`(`name`,`email`,`password`) VALUES(?,?,?)",[user_name,user_email, hash_pass])
            .then(result => {
                res.send(`your account has been created successfully, Now you can <a href="/">Login</a>`);
            }).catch(err => {
                // THROW INSERTING USER ERROR'S
                if (err) throw err;
            });
        })
        .catch(err => {
            // THROW HASING ERROR'S
            if (err) throw err;
        })
    }
    else{
        // COLLECT ALL THE VALIDATION ERRORS
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH VALIDATION ERRORS
        res.render('login-register',{
            register_error:allErrors,
            old_data:req.body
        });
    }
});// kayıt sayfası sonu





app.use('/', (req,res) => {
    res.status(404).send('<h1>404 Page Not Found!</h1>');
});


// Port tanımlama 8000 tanımlamamızın sebebi sunucuda yayınlandığında port belirtmeden çalışması için 
// öünkü http 8000 portundan çalışır
const PORT = process.env.PORT || 8000

server.listen(PORT, () => {
    console.log('Sunucu 8000 den başlatıldı')
    
})