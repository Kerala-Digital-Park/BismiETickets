const isLogin = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect("/admin/login");
    }
}

const isLogout = (req, res, next) => {
    if (req.session.admin) {
        res.redirect("/admin");
    }
    next();
}

module.exports = { isLogin, isLogout };