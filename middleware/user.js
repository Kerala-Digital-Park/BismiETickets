const User = require('../models/userModel'); 

const fetchUserDetails = async (req, res, next) => {
    
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId); 
            res.locals.user = user; 
        } catch (error) {
            console.error('Error fetching user details:', error);
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }
    next();
};

module.exports = fetchUserDetails;
