const { MongoClient } = require('mongodb');
const _ = import('lodash');
const fetch = require('node-fetch')
const dotenv = require('dotenv');
const { forEach, uniq } = require('lodash');
dotenv.config();

// public functions
module.exports = {
    // DESCRIPTION: main public function that gets sent a data request and returns a json variable
    // PROTOTYPE: sent a json w/ type of request and any data needed to make request
    getData: async function (dataSlug) {
        const data = await getDataVirtualDatabase(dataSlug);
        return data;
    }
}

// private functions

/*
    dataSlug JSON prototype:
    {
        requestType: "",
        requestData: {
        }
    }

    RequestTypes:
        Virtual Data Requests: requests that are combinatorial calls or built data object calls
            requestType:
            requestData:

        Core Data Requests: requests that go directly to specific databases/API calls
            requestType: mongo
            requestData:

            requestType: propublica
            requestData:

            requestType: polygon
            requestData:
*/

/*
    MAIN DATA REQUESTS: highest level virtual database call
*/


// DESCRIPTION: determines request type and routes appropriately, there should be no data processing in this function
// PROTOTYPE: input dataSlug, return data object
async function getDataVirtualDatabase(dataSlug) {
    // if statements to determine request type
    if (dataSlug.requestType == "uniqueCongress") { // this request will return a list of uniqueCongress members containing first and last names
        return await uniqueCongress();
    } else if (dataSlug.requestType == "politicianById") {
        return getPolitician(dataSlug.requestData.id);
    } else if (dataSlug.requestType == "testMongo") {
        return await getSenatorByLast(dataSlug.requestData.congressLastName);
    } else if (dataSlug.requestType == "testRequest") {
        return {
            test: "response1"
        }
    } else if (dataSlug.requestType == "allTransactions") {
        const trades = await getAllTransactions();
        return trades;
    }
}

/*
    VIRTUAL DATA REQUESTS: requests that are combinatorial calls or built data object calls
*/

/*
DESCRIPTION:
Async function, uniqueCongress, that returns an array of JSON objects from the mapping file in our mongoDB. The mapping file
is a file in our mongoDB that connects the stockAct API politician names with the propublica API politician names. With mapping
the names, the corresponding politician bio information for each unique politician is scrapped and will be available for the client.
An example JSON object in the array is provided below:
    {
        _id: "unique_object_id"
        id: "unique_id",
        mapping: {
            stockActFirstName: "stockAct_firstname",
            stockActLastName: "stockAct_lastname",
            proPublicaFirstName: "proPublica_firstname",
            proPublicaLastName: "proPublica_lastname",
            DoB: "date_of_birth",
            Chamber: "chamber",
            Party: "party",
            State: "state",
            Committees: "committees",  // this is an array of committees
            Subcommittees: "subcommittees"  // this is an array of subcommittees
        }
    }
*/   
async function uniqueCongress() {
    try {
        console.log("Connecting...");
        var client = await connectToDB();

        mongoRequest = await getMongoRequest(client);  // accessing the client, returns the mongoDB collections
        uniqueCongressCollection = mongoRequest[2];  // gets index 2, which is the uniqueCongress collection data
        var uniqueCongress = await getUniqueCongress(uniqueCongressCollection);

    } catch (e) {
        console.error(e);  // will console log an error message if an error occurs
    }

    console.log("Disconnecting");
    async() => {client.close();};

    return uniqueCongress;
}

/*
    SUBCALL FOR UNIQUECONGRESS REQUEST
*/

/*
DESCRIPTION:
Async function, getUniqueCongress, that returns all documents in the uniqueCongressCollection data which is
a list of unique politician names with their unique id's, and their bio information.
*/
async function getUniqueCongress(uniqueCongressCollection) {
    var uniqueCongress = await uniqueCongressCollection.find().toArray();

    return uniqueCongress;
}    

/*
    CORE DATA REQUESTS: requests that will be used constantly to retrieve data from the APIs
*/

/*
DESCRIPTION:
Async function, getMongoRequest, is a core request and returns the collections data in our mongoDB server.
Collections in placed and return in an array variable.
*/
async function getMongoRequest(client) {
    var mongoRequest = [];
    var senateCollection = await client.db("senate-trades").collection("sen-" + getDate());  // gets senate stock watcher collection data
    var houseCollection = await client.db("senate-trades").collection("house-" + getDate());  // gets house stock watcher collection data
    var uniqueCongressCollection = await client.db("senate-trades").collection("uniqueCongress");  // gets uniqueCongress collection data
    mongoRequest.push(senateCollection);
    mongoRequest.push(houseCollection);
    mongoRequest.push(uniqueCongressCollection);

    return mongoRequest;  // collection data is returned in an array
}

// DESCRIPTION: function that connects to MongoDB database & returns a client object
// VARS: returns client- a MongoDB connection instance
// IMPORTANT: When storing client in a var, use this format- const client = await connectToDB();
// Caller must use async() => {client.close();}; after they are done with client object to close connection 
async function connectToDB(){
    const dbURI = process.env.DB_CON_STRING;
    const client = new MongoClient(dbURI);

    try{
        await client.connect();
        return client;
    } catch(e) {
        console.log(e);
    }
}

// DESCRIPTION: Pushes data into desired collection in MongoDB, if collection exists then data will be added to it,
// if collection does not exist it will be created and then added to it
// VARS: client- MongoDB connection instance from connectToDB() function | data- JSON object (if array of JSON then 
// loop through array outside of function and pass each object) | dbName- name of database | collectionName- desired name of collection
async function pushToDB(client, data, dbName, collectionName){
    const db = await client.db(dbName);
    const collectionArray = await client.db(dbName).listCollections({}, { nameOnly: true }).toArray()

    if(JSON.stringify(collectionArray).includes(collectionName)){
        db.collection(collectionName).insertOne(data, ((err, result) => {
            console.log(err);
        }));
    }else{
        db.createCollection(collectionName);
        db.collection(collectionName).insertOne(data, ((err, result) => {
            console.log(err);
        }));
    }
}

// DESCRIPTION: Stores todays date in todayDate for collection naming scheme
// VARS: returns todayDate - a string with todays date in mm_dd_yyyy format
function getDate(){
    const d = new Date();
    todayDate = d.getMonth() + 1;
    todayDate += "_" + d.getDate() + "_" + d.getFullYear();

    return todayDate;
}

// DESCRIPTION: Pulls the most recent version of "all transactions" from senate stock watcher. Uploads to MongoDB in a collection
// titled "sen-mm_dd_yyyy" where "mm_dd_yyyy" is a string of today's date from the getDate function. Function will check
// to see if today's data is already in MongoDB, either pulling and uploading if it is not up to date, or printing to the console if 
// data is already found in database.
// VARS: returns JSON object of all senate transactions
async function getSenateTransactions(){
    let collectionName = "sen-" + getDate();
    
    const client = await connectToDB();
    const collectionArray = await client.db("senate-trades").listCollections({}, { nameOnly: true }).toArray()

    if(JSON.stringify(collectionArray).includes(collectionName)){
        console.log("Most recent trades are already in MongoDB.");
    }else{
        await fetch('https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json')
        .then((response) => response.json())
        .then(async (response) => {
                console.log("Uploading trades to MongoDB, please wait...");
                for(i = 0; i < response.length; i++){
                    await pushToDB(client, response[i], "senate-trades", collectionName);
                }
                console.log("Upload Finished");
                async() => {client.close();};
        })
        .catch((e) => {
            console.log(e)
        })
    }

    return fetch('https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json')
        .then((response) => {
            return response.json().then((data) => {
                //console.log(data);
                return data;
            }).catch((err) => {
                console.log(err);
            })
        })
}

// DESCRIPTION: Pulls the most recent version of "all transactions" from house stock watcher. Uploads to MongoDB in a collection
// titled "house-mm_dd_yyyy" where "mm_dd_yyyy" is a string of today's date from the getDate function. Function will check
// to see if today's data is already in MongoDB, either pulling and uploading if it is not up to date, or printing to the console if 
// data is already found in database.
// VARS: returns JSON object of all house transactions
async function getHouseTransactions(){
    let collectionName = "house-" + getDate();

    const client = await connectToDB();
    const collectionArray = await client.db("senate-trades").listCollections({}, { nameOnly: true }).toArray()

    if(JSON.stringify(collectionArray).includes(collectionName)){
        console.log("Most recent trades are already in MongoDB.");
    }else{
        await fetch('https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json')
        .then((response) => response.json())
        .then(async (response) => {
                console.log("Uploading trades to MongoDB, please wait...");
                for(i = 0; i < response.length; i++){
                    await pushToDB(client, response[i], "senate-trades", collectionName);
                }
                console.log("Upload Finished");
                async() => {client.close();};
        })
        .catch((e) => {
            console.log(e)
        })
    }

    return fetch('https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json')
        .then((response) => {
            return response.json().then((data) => {
                //console.log(data);
                return data;
            }).catch((err) => {
                console.log(err);
            })
        })
}

// DESCRIPTION: takes an API call to Alphavantage.co
// PROTOTYPE:
async function getAlphavantage() {
}

// DESCRIPTION: Compiles the 2 JSON Objects from getSenateTransactions() & getHouseTransactions() into one large JSON Object.
// VARS: Returns allTrades, a JSON Object containing all trades from both websites
async function getAllTransactions(){
    let senate = [], house = [];
    
    await getSenateTransactions().then((data) => {
        senate.push(data);
    })
    await getHouseTransactions().then((data) => {
        house.push(data);
    })
    
    const allTrades = senate[0].concat(house[0]);

    return await allTrades;
}