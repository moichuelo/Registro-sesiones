module.exports = (req, res, next) => {
    res.locals.lang = req.getLocale();


    next();
};