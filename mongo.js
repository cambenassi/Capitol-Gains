const { json } = require('express/lib/response');
const {MongoClient} = require('mongodb');
const Trade = require('./schemas/blog.js');
const dotenv = require('dotenv');
dotenv.config();

//get date
const d = new Date();
date = d.getMonth() + 1;
date += "-" + d.getDate() + "-" + d.getFullYear();

//connect to db
async function connectToDB(){
    //heroku env variable
    const dbURI = process.env.DB_CON_STRING;
    const client = new MongoClient(dbURI);

    try{
        await client.connect();
        checkTodayData(client);
    } catch(e) {
        console.log(e);
    } finally {
        //await client.close();
    }

}

module.exports = {connectToDB};


async function checkTodayData(client){
    const db = client.db();
    jsonObject = apiCall();

    try{
        const collection = db.collection(date);
        collection.deleteOne(jsonObject, ((err, result) => {
            console.log(err);
        }));
    }catch{
        const collection = db.createCollection(date);
        collection.deleteOne(jsonObject, ((err, result) => {
            console.log(err);
        }));
    }

}


function apiCall(){
    return {
        transaction_date: "new test",
        owner: "new test",
        ticker: "new test",
        asset_description: "new test",
        asset_type: "new test",
        type: "new test",
        amount: "new test",
        comment: "new test",
        senator: "new test",
        ptr_link: "new test",
        disclosure_date: "new test"
    }
}







/*
module.exports = async () => {
    await mongoose.connect(dbURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })

    return mongoose;
}


*/

/* OLD MONGODB CODE
// connect to mongodb & listen for requests on sucessful connection
const dbURI = "mongodb+srv://cam:GUIGroup8@cluster0.qc8sf.mongodb.net/senate-trades?retryWrites=true&w=majority";
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true })
    .then((result) => app.listen(port))
    .catch((err) => console.log(err));
*/


// connect to mongodb
/*
const connectToDB = async () => {
  await mongo().then(async (mongoose) => {
      console.log("Connected to DB")
  })
}
connectToDB();
*/

// querying for 1 result 
/*
Trade.findOne({'owner': 'Self'}, function (err, docs){
        if (err)
            console.log(err)
        else
            console.log(docs);
}) */
