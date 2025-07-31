const isLogin = (req, res, next) => {
    if (req.session.adminId) {
        next();
    } else {
        res.redirect("/admin/login");
    }
}

const isLogout = (req, res, next) => {
    if (req.session.adminId) {
        res.redirect("/admin");
    }
    next();
}

module.exports = { isLogin, isLogout };