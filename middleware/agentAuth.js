const isLogin = (req, res, next) => {
    if (req.session.userId) {
      next();
    } else {
      res.redirect("/agent/sign-in");
    }
  }
  
  const isLogout = (req, res, next) => {
      if (req.session.userId) {
        res.redirect("/agent");
      }
      next();
  }
  
  module.exports = { isLogin, isLogout };
  