const { MongoClient } = require('mongodb');
const _ = import('lodash');
const fetch = require('node-fetch')
const dotenv = require('dotenv');
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
    }
}

/*
    VIRTUAL DATA REQUESTS: requests that are combinatorial calls or built data object calls
*/

/*
DESCRIPTION:
Async function, uniqueCongress, that returns an array of JSON objects which contains a list of unique senators and represenatives.
This function will make a call to the sub MongoDB request functions which will return a JSON objects containing the neccessary data
from the all_transactions JSON files from senate/house stock watcher APIs that are in the mongoDB. Did not use the core MongoDB request
because just accessing the mongoDB and using the mongoDB methods, such as distinct, are easier to obtain the data we need. Once 
having that data, the uniqueCongress function will combine the JSON objects from the sub MongoDB request into one JSON object that will
be sent back for out request.
An example JSON object in the array is provided below:
    {
        id: "id_number",
        mapping: {
            firstNameStockWatcher: "politician_firstname",
            lastNameStockWatcher: "politician_lastname"
        }
    }
*/
async function uniqueCongress() {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    var uniqueCongress = [];  // empty array that will contain JSON objects
    var jsonData = {};
    var id_count = 0;  // id count is initialized to 0, will be use to id the politicians

    try {
        console.log("Connecting...");
        await client.connect();
        var senateStockWatcher = await getSenateStockWatcher(id_count, client);
        var houseStockWatcher = await getHouseStockWatcher(id_count, client);
        uniqueCongress = Object.assign(senateStockWatcher, houseStockWatcher);
    } catch (e) {
        console.error(e);
    } finally {
        // Close connection to MongoDB cluster
        await client.close();
    }

    return uniqueCongress;
}

/*
    CORE DATA REQUESTS: requests that go directly to specific databases/API calls
*/

/*
DESCRIPTION:
Async function, getMongoRequest, returns all of the senate/house stock watcher data in the mongoDB database.
*/
async function getMongoRequest() {

    return mongoRequest;
}

/*
    SUB CALLS FOR MONGODB REQUEST
*/

/*
DESCRIPTION:
Async function, getSenateStockWatcher, returns an array of JSON objects that will contain a unique list of id and senate member names.
This function accesses the senate stock watcher collection which contains the senate stock watcher "all_transactions" JSON file and then
uses the distinct method on "senator" to get the distinct names. The names are then split. 
*/
async function getSenateStockWatcher(id_count, client) {
    var uniqueSenate = [];
    var uniqueSenateNames = await client.db("congressStockWatcher").collection("senateStockWatcher").distinct("senator");

    uniqueSenateNames.forEach(senatorName => {
        var jsonData = {};
        var id = {};
        var mapping = {};
        var firstName = "firstNameStockWatcher";
        var lastName = "lastNameStockWatcher";
        nameArr = senatorName.split(" ");

        if (nameArr.length == 2) {
            id = id_count;
            mapping[firstName] = nameArr[0];
            mapping[lastName] = nameArr[1];
            jsonData = {id, mapping};
            uniqueSenate.push(jsonData);
        } else if (nameArr.length == 3) {
            id = id_count;
            mapping[firstName] = nameArr[0] + " " + nameArr[1];
            mapping[lastName] = nameArr[2];
            jsonData = {id, mapping};
            uniqueSenate.push(jsonData);
        } else if (nameArr.length == 4) {
            id = id_count;
            mapping[firstName] = nameArr[0] + " " + nameArr[1] + " " + nameArr[2];
            mapping[lastName] = nameArr[3];
            jsonData = {id, mapping};
            uniqueSenate.push(jsonData);
        } else if (nameArr.length == 5) {
            id = id_count;
            mapping[firstName] = nameArr[0] + " " + nameArr[1] + " " + nameArr[2] + " " + nameArr[3];
            mapping[lastName] = nameArr[4];
            jsonData = {id, mapping};
            uniqueSenate.push(jsonData);
        }

        id_count += 1;
    })

    return uniqueSenate;
}

async function getHouseStockWatcher(id_count, client) {
    var uniqueHouse = [];
    var uniqueHouseNames = await client.db("congressStockWatcher").collection("houseStockWatcher").distinct("representative");

    uniqueHouseNames.forEach(represenativeName => {
        var jsonData = {};
        var id = {};
        var mapping = {};
        var firstName = "firstNameStockWatcher";
        var lastName = "lastNameStockWatcher";
        nameArr = represenativeName.split(" ");

        if (nameArr.length == 3) {
            id = id_count;
            mapping[firstName] = nameArr[1];
            mapping[lastName] = nameArr[2];
            jsonData = {id, mapping};
            uniqueHouse.push(jsonData);
        } else if (nameArr.length == 4) {
            id = id_count;
            mapping[firstName] = nameArr[1] + " " + nameArr[2];
            mapping[lastName] = nameArr[3];
            jsonData = {id, mapping};
            uniqueHouse.push(jsonData);
        } else if (nameArr.length == 5) {
            id = id_count;
            mapping[firstName] = nameArr[1] + " " + nameArr[2] + " " + nameArr[3];
            mapping[lastName] = nameArr[4];
            jsonData = {id, mapping};
            uniqueHouse.push(jsonData);
        }

        id_count += 1;
    })

    return uniqueHouse;
}

// DESCRIPTION: takes an API call to ProPublica API and returns a json object containing politician's bio
// PROTOTYPE:

/*
async function getProPublicaRequest() {
    var congressMemberData = [];

    // when server starts, grab HouseMemberData and put it into the global variable
    getHouseMemberData().then(data => {
        console.log('Server-side: Grabbing HouseMemberData through ProPublica API call and putting it into a global variable.');
        houseMemberData = data;
        congressMemberData.append(houseMemberData);
        //console.log(congressMemberData);
    })

    // when server starts, grab SenateMemberData and put it into the global variable
    getSenateMemberData().then(data => {
        console.log('Server-side: Grabbing SenateMemberData through ProPublica API call and putting it into a global variable.');
        senateMemberData = data;
        congressMemberData.append(senateMemberData);
        //console.log(congressMemberData);
    })

    console.log("HELLO");
    console.log(congressMemberData);
}
*/

// NOTE TO SELF: MAYBE GET FULL LIST HOUSEMEMBERDATA AND SENATEMEMBERDATA IN THIS REQUEST, THEN MOVE THE TASKS TO THE VIRTUAL DATA REQUESTS LIKE POLITICIAN BIO
/*
async function getProPublicaRequest() {
    if (HouseMemberData && SenateMemberData) {
        var first_name = "Mitch";
        var last_name = "McConnell";

        if (first_name && last_name) {
            console.log("Server-side: Using the provided name to search through the member's list and returning the member's id, if possible.");
            member_id = return_id_both_names(HouseMemberData, SenateMemberData, first_name, last_name);
            
            if (member_id != -1) {
                console.log('Server-side: The name is valid so a member_id exists.')
                console.log('Server-side: Grabbing politician data using member_id through an API call.')
                const PoliticianBio = await getPoliticianBio(member_id);
                //console.log(test_data);

                let test_data = {
                    id: PoliticianBio.id,
                    politician_bio: {
                        FirstName: PoliticianBio.first_name,
                        MiddleName: PoliticianBio.middle_name,
                        LastName: PoliticianBio.last_name,
                        Chamber: PoliticianBio.roles[0].chamber,
                        Party: PoliticianBio.roles[0].party,
                        State: PoliticianBio.roles[0].state,
                        Committees: PoliticianBio.roles[0].committees,
                        Subcommittees: PoliticianBio.roles[0].subcommittees
                    }
                };
                return test_data;
            } else {
                console.log('Server-side: The name is invalid so a member_id does not exist.')
                console.log('Server-side: Sending a failure response back to the client-side\n')
                response.json({
                    status: 'failure',
                });
            }
        } else {
            console.log('Server-side: The name is invalid so a member_id does not exist.')
            console.log('Server-side: Sending a failure response back to the client-side\n')
            response.json({
                status: 'failure',
            });
        }
    }
}
*/

/*
    SUB CALLS FOR PROPUBLICA REQUEST
*/
// async function to fetch house member data from ProPublica
async function getHouseMemberData() {
    const propublica_house_url = "https://api.propublica.org/congress/v1/117/house/members.json";
    const response = await fetch(propublica_house_url, {
        method: "GET",  // gets data
        headers: {
            "X-API-Key": "jADs7ONXmGA9IGnzMDXTA8AH8Fb4WKBYKCuOk0dw"
        }
    })
    const data = await response.json();
    var HouseMemberData = data.results[0].members;

    return HouseMemberData;
}

// async function to fetch senate member data from ProPublica
async function getSenateMemberData() {
    const propublica_senate_url = "https://api.propublica.org/congress/v1/117/senate/members.json";
    const response = await fetch(propublica_senate_url, {
        method: "GET",
        headers: {
            "X-API-Key": "jADs7ONXmGA9IGnzMDXTA8AH8Fb4WKBYKCuOk0dw"
        }
    })
    const data = await response.json();
    var SenateMemberData = data.results[0].members;

    return SenateMemberData;
}

/*
Function that will get the politician's id number in ProPublica by looping through the HouseMemberData
and SenateMemberData and checking if any names match with the provided name from the client.
*/
function return_id_both_names(HouseMemberData, SenateMemberData, first_name, last_name) {
    var member_id;
    for (i=0; i < HouseMemberData.length; i++) {
        if (HouseMemberData[i].first_name == first_name && HouseMemberData[i].last_name == last_name) {
            member_id = HouseMemberData[i].id;

            return member_id;
        }
    }

    for (i=0; i < SenateMemberData.length; i++) {
        if (SenateMemberData[i].first_name == first_name && SenateMemberData[i].last_name == last_name) {
            member_id = SenateMemberData[i].id;

            return member_id;
        }
    }
    
    console.log("Server-side: No match. The inputted name does not exist in the current congress.");
    return -1;
}

/*
Async function that takes the politician's member_id and make another call to the politician's specific json in ProPublica so that
it could return the politician's bio information.
*/
async function getPoliticianBio(member_id) {
    const propublica_politician_bio_url = "https://api.propublica.org/congress/v1/members/" + member_id + ".json";
    const response = await fetch(propublica_politician_bio_url, {
        method: "GET",
        headers: {
            "X-API-Key": "jADs7ONXmGA9IGnzMDXTA8AH8Fb4WKBYKCuOk0dw"
        }
    })
    const data = await response.json();
    PoliticianBio = data.results[0];

    return PoliticianBio;
}

// DESCRIPTION: takes an API call to Polygon.io
// PROTOTYPE:
async function getPolygon() {
}

/*
    DEPRECIATED CALLS: phase these out, however good call structure for interim
*/

async function getSenatorByLast(senator) {
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);

    try {
        console.log("Connecting...");
        await client.connect();
        const data = await findOneListingByName(client, senator);
        return data;
    } catch (e) {
        console.error(e);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
}

async function findOneListingByName(client, nameOfListing) {
    const result = await client.db("member_sorted").collection("stockwatcher").findOne({ last_name: nameOfListing });

    if (result) {
        console.log(`Found a listing in the collection with the name '${nameOfListing}'`);
        // console.log(result);
        return result;
    } else {
        console.log(`No listings found with the name of ${nameOfListing}`);
    }
}

let politicians = [
    {
        name: "Bernie Sanders",
        state: "VT",
        congressType: "Senator",
        party: "D",
        id: 1,
    },
    {
        name: "Mitch McConnell",
        state: "KY",
        congressType: "Senator",
        party: "R",
        id: 2,
    },
    {
        name: "Abraham Lincoln",
        state: "DC",
        congressType: "Representative",
        party: "N",
        id: 3,
    },
];

// return array of json objects of all politiicans
function getPoliticians() {
    return politicians;
}

// return a specific politician id
function getPolitician(id) {
    return politicians.find(
        (politician) => politician.id === id
    );
}

/*
(async() => {
    let variable = await getProPublicaRequest();
    console.log(variable);
})()
*/

/*
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
        //enters here when date is most recent and db does not exist console.log(date);
    }catch{
        const collection = db.createCollection(date);
        collection.insertOne(jsonObject, ((err, result) => {
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
*/

/*
NOTES:
  3. get API to generate a unique list
  4. get mapping to unique IDs

  3. You need to query a mongo file named mappings, then build an object similar to the json object in client/src/components/politicians.js
  4. You need to go into SenateStockWatcher and HouseStockWatcher .json files, you need to grab a list of unique names (they should already be unique), then build a mappings file in mongodb
the mappings file will contain
    id:
        firstNameStockWatcher:
        lastNameStockWatcher:
    
  we will generate unique ids based off the unique list of politicians in senatestockwatcher and housestockwatcher
determination of where MongoDB files are located (where the senatestockwatcher and housestockwatcher json files) are located, the mappings file location, and the core MongoDB call will be necessary
since 3. depends on 4., 4 needs to be done first.
*/