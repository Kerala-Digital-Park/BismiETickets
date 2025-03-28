const isLogin = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/sign-in");
  }
}

const isLogout = (req, res, next) => {
    if (req.session.userId) {
      res.redirect("/");
    }
    next();
}

module.exports = { isLogin, isLogout };
