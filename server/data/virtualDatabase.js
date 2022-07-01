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

const alphaVantageKey = process.env.ALPHA_VANTAGE_KEY;

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
    } else if (dataSlug.requestType == "stockSector") {
        const stockTicker = dataSlug.requestData.ticker;
        return await getStockSector(stockTicker, alphaVantageKey);
    } else if (dataSlug.requestType == "unrealizedGainsLosses") {
        const stockTicker = dataSlug.requestData.ticker;
        const purchaseDate = dataSlug.requestData.stockTransactionDate;
        return await calculateUnrealizedGainsLosses(purchaseDate, stockTicker, alphaVantageKey);
    } else if (dataSlug.requestType == "allClosingPrices") {
        const stockTicker = dataSlug.requestData.ticker;
        return await getAllStockClosingPrices(stockTicker, alphaVantageKey);
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

        mongoRequest = await getMongoRequest(client, "uniqueCongress");  // accessing the client, returns the mongoDB collections
        uniqueCongressCollection = mongoRequest;  // gets index 2, which is the uniqueCongress collection data
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

//DESCRIPTION: getMongoRequest is a core data request for our MongoDB database. This function will connect to our
//datbase and return all data inside a desired collection.
//VARS: client- live client object from connectToDB() function | collectionName- the name of the collection the user
//wishes to access | mongoRequest- mongoRequest, a JSON object of your desired collection, is returned 
async function getMongoRequest(client, collectionName) {
    var mongoRequest = await client.db("senate-trades").collection(collectionName);

    return mongoRequest; 
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

/****************************************************************
*  Start of Alpha Vantage Functions 
****************************************************************/

/*
*   FUNCTION: getStockSector()
*   DESCRIPTION: Async function that uses Alpha Vantage to get a stock's sector
*   PARAMETERS: 
*       ticker: (String) The stock ticker (eg. for Apple, you pass in "AAPL")
*       apiKey: (String) The Alpha Vantage api key as a string (eg. "ABC123")
*   Return Value: (JSON) The stock's sector
*       {
*           sector: "NAME OF SECTOR"
*       }
*   // If something bad happened, then the JSON will be empty
*/

async function getStockSector(ticker, apiKey)
{
    let returnJSON = {};
    return fetch("https://www.alphavantage.co/query?function=OVERVIEW&symbol=" + ticker + "&apikey=" + apiKey)
    .then(result => result.json())
    .then(apiData => {
        //return apiData["Sector"];
        returnJSON["sector"] = apiData["Sector"];
        return returnJSON;
    })
    .catch(err => {
        console.error(err);
        return returnJSON;
    });
}

/*
*   FUNCTION: getFullStockHistory()
*   DESCRIPTION: Async function that uses Alpha Vantage to get a stock's industry
*   PARAMETERS: 
*       ticker: (String) The stock ticker (eg. for Apple, you pass in "AAPL")
*       apiKey: (String) The Alpha Vantage api key (eg. "ABC123")
*   Return Value: (JSON) The stock's info for every day since listing date up to now
*   {
*       '2022-01-02': {
*           '1. open': '123',
*           '2. high': '162.21',
*           '3. low': '156.72',
*           '4. close': '156.8',
*           '5. adjusted close': '156.8',
*           '6. volume': '94232517',
*           '7. dividend amount': '0.0000',
*           '8. split coefficient': '1.0'
*       },
*       '2022-01-01': {
*           '1. open': '123',
*           '2. high': '162.21',
*           '3. low': '156.72',
*           '4. close': '156.8',
*           '5. adjusted close': '156.8',
*           '6. volume': '94232517',
*           '7. dividend amount': '0.0000',
*           '8. split coefficient': '1.0'
*       },
*       ... and so on
*   }
*   USED IN THESE FUNCTIONS:
*       getAllStockClosingPrices()
*       getStockPriceOnDate()
*/

async function getFullStockHistory(ticker, apiKey) 
{
    
    // API call for stock data from past 100 days
    // return fetch("https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=" + ticker + "&apikey=" + apiKey)

    // API call for all stock data (from listing date to now)
    return fetch("https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=" + ticker + "&outputsize=full&apikey=" + apiKey)
    .then(result => result.json())
    .then(apiData => {
        return apiData["Time Series (Daily)"];
    })
    .catch(err => console.error(err));
}

/*
*   FUNCTION: getAllStockClosingPrices()
*   DESCRIPTION: Async function that uses Alpha Vantage to get a stock's closing price for all of the days it's been listed
*   PARAMETERS:
*       ticker: (String) The stock ticker (eg. for Apple, you pass in "AAPL")
*       apiKey: (String) The Alpha Vantage api key (eg. "ABC123")
*   Return Value: (JSON) Dates with the closing price of the stock, starting with most recent to oldest
*   {
*       '2022-04-26': '156.80',
*       '2022-04-25': '162.88',
*       '2022-04-22': '161.79',
*       ... and so on
*   }
*   References:
*       For info on how to iterate over JSON object: https://simplernerd.com/js-iterate-json/
*       Get key names of JSON: https://stackoverflow.com/questions/38397894/get-json-key-name
*   USES THESE FUNCTIONS:
*       getFullStockHistory()
*/

async function getAllStockClosingPrices(ticker, apiKey)
{
    let returnJSON = {};
    
    // Wait for getFullStockHistory() to return JSON of all stock info
    let allStockInfo = await getFullStockHistory(ticker, apiKey);
    // Get all the dates
    let allKeys = Object.keys(allStockInfo);
    
    // For each date, make a new entry in the JSON for that date with its closing price 
    for (let i = 0; i < allKeys.length; i++)
    {
        returnJSON[allKeys[i]] = Object.values(allStockInfo)[i]["4. close"];
    }
    
    return returnJSON;
}

/*
*   FUNCTION: getStockPriceOnDate()
*   DESCRIPTION: Async function that uses Alpha Vantage to get a stock's closing price for a specific date
*   PARAMETERS:
*       date: (String) The date you want the stock's closing price of 
*           - Date must be in "yyyy-mm-dd" format (eg. "2022-04-23" would be April 23, 2022)
*       ticker: (String) The stock ticker (eg. for Apple, you pass in "AAPL")
*       apiKey: (String) The Alpha Vantage api key (eg. "ABC123")
*   Return Value: (Number) or (Null) The stock price at the end of that day if it is a valid trading day, null if not
*       - Does not return a JSON because it is a helper function for another function
*   References:
*       Uses method from: https://stackoverflow.com/questions/1098040/checking-if-a-key-exists-in-a-javascript-object
*   USES THESE FUNCTIONS:
*       getFullStockHistory()
*   USED IN THESE FUNCTIONS:
*       calculateUnrealizedGainsLosses()
*/

async function getStockPriceOnDate(date, ticker, apiKey)
{
    // Wait for getFullStockHistory() to return JSON of all stock info
    let allStockInfo = await getFullStockHistory(ticker, apiKey);
    if ([date] in allStockInfo)
    {
        return allStockInfo[date]["4. close"];
    }
    else
    {
        return null;
    }
}

/*
*   FUNCTION: getMostRecentClosingPrice()
*   DESCRIPTION: Async function that uses Alpha Vantage API to get stock's most recent closing price
*   PARAMETERS:
*       ticker: (String) The stock ticker (eg. for Apple, you pass in "AAPL")
*       apiKey: (String) The Alpha Vantage api key (eg. "ABC123")
*   RETURN VALUE: (Number) The most recent stock closing price
*       - Does not return a JSON because it is a helper function for another function
*   USED IN THESE FUNCTIONS:
*       calculateUnrealizedGainsLosses()
*/

async function getMostRecentClosingPrice(ticker, apiKey)
{
    const stringBeginningIndexAdjustment = 11; // "4. close: " takes up 11 chars before the actual price string
    const stringEndIndexAdjustment = 3; // The price string ends 3 chars before "5. adjusted close"

    return fetch("https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=" + ticker + "&apikey=" + apiKey)
    .then(result => result.json())
    .then(apiData => {
        // Take all stock info in its JSON form
        let stockInfoJson = apiData["Time Series (Daily)"];
        // Turn it from a JSON to a string
        let stockInfoString = JSON.stringify(stockInfoJson);

        // Parse the string so we only get the indices of the closing price string
        let startOfClose = stockInfoString.indexOf("4. close");
        let endOfClose = startOfClose + stringBeginningIndexAdjustment;
        let startOfAdjustedClose = stockInfoString.indexOf("5. adjusted close") - stringEndIndexAdjustment;

        let recentClosingPrice = Number(stockInfoString.substring(endOfClose, startOfAdjustedClose)); 
        return recentClosingPrice;
    })
    .catch(err => console.error(err));
}

/*
*   FUNCTION: calculateUnrealizedGainsLosses()
*   DESCRIPTION: Async function that uses Alpha Vantage to get a stock's theoretical unrealized gains/losses based on buy date to now
*   PARAMETERS:
*       purchaseDate: (String) Date that the stock was purchased
*           - YOU WANT TO PASS IN THE TRANSACTION DATE, NOT THE DISCLOSURE DATE
*           - If date is in "mm/dd/yyyy" format, this function will change it so it is in "yyyy-mm-dd" format
*       ticker: (String) The stock ticker (eg. for Apple, you pass in "AAPL")
*       apiKey: (String) The Alpha Vantage api key (eg. "ABC123")
*   Return Value: (JSON) unrealizedGainLoss will represent unrealized gain (positive value) or loss (negative value)
*       {
*           unrealizedGainLoss: '123'
*       }
*   USES THESE FUNCTIONS:
*       getStockPriceOnDate()
*       getMostRecentClosingPrice()
*/

async function calculateUnrealizedGainsLosses(purchaseDate, ticker, apiKey)
{
    let formattedDate = purchaseDate;

    /*
    * If statement is for if we need to convert the date -
    * Old format: 01/31/2022 = datePart[0]/datePart[1]/datePart[2]
    * Format we want: 2022-01-31 = datePart[2]-datePart[0]-datePart[1]
    */
    if (purchaseDate.includes("/"))
    {
        let dateParts = purchaseDate.split("/");
        formattedDate = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
    }

    let purchasePrice = await getStockPriceOnDate(formattedDate, ticker, apiKey);
    let latestClosingPrice = await getMostRecentClosingPrice(ticker, apiKey);

    let returnJSON = {
        "unrealizedGainLoss": latestClosingPrice - purchasePrice
    };
    return returnJSON;
}
