// middleware tanımlarımız
// login olmadı ise
const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('login-register');
    }
    next();
}
// login oldu ise
const ifLoggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
        return res.redirect('/home');
    }
    next();
}

// yazdığımız middleware modüllerini export ediyoruz ki diğer sayfalardan kullanabilelim
module.exports = {
    ifNotLoggedin, ifLoggedin
}

// middleware tanımlarının sonu