const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    transaction_date: String,
    owner: String,
    ticker: String,
    asset_description: String,
    asset_type: String,
    type: String,
    amount: String,
    comment: String,
    senator: String,
    ptr_link: String,
    disclosure_date: String
})

module.exports = mongoose.model('trade', userSchema);