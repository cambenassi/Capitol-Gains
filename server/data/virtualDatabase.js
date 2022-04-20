const { MongoClient } = require('mongodb');
const _ = import('lodash');
const fetch = require('node-fetch')
const dotenv = require('dotenv');
const { forEach } = require('lodash');
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
Async function, uniqueCongress, that returns an array of JSON objects which contains unique list of ids and mappings of unique senators 
and represenatives names. This function will make a call to the core mongoDB request function which will return the senate and house stock
watcher collections data in the mongoDB. The collections data is the "all_transactions" JSON file from the senate/house stock watcher API.
The collections data will then be givien to another function to extract the neccessary data that is wanted. Once having the unique names from
both collections, the names will be put into a single array of JSONs and will be sorted by the politician's first names. Afterwards, the names
will be id'ed and mapped into another array of JSONs which is returned for our request.
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
    const mongo_uri = "mongodb://localhost:27017";  // initialize uri with local mongoDB; this uri value will be replaced and initialized to our online mongoDB
    const client = new MongoClient(mongo_uri);  // initialize the client using the uri

    try {
        console.log("Connecting...");
        await client.connect();  // connect to the mongoDB cluster

        mongoRequest = await getMongoRequest(client);  // accessing the client, returns the senate and house stock watcher collections
        senateCollection = mongoRequest[0];
        houseColleciton = mongoRequest[1];

        var uniqueSenateNames = await getSenateStockWatcher(senateCollection);  // accessing the collection, returns a unique list of senator names
        var uniqueHouseNames = await getHouseStockWatcher(houseColleciton);  // accessing the collection, returns a unique list of represenative names

        var uniqueCongressNames = [];  // empty array that will contain JSON objects containing just the unique first and last names
        uniqueSenateNames.forEach(senatorName => {  // pushes each unique senator name into the array for all congress member names
            uniqueCongressNames.push(senatorName);
        })

        uniqueHouseNames.forEach(represenativeName => {  // pushes each unique represenative name into the array for all congress member names
            uniqueCongressNames.push(represenativeName);
        })

        uniqueCongressNames = uniqueCongressNames.sort(function (object1, object2) {  // sort the congress member names array by first names
            return object1.stockActFirstName.localeCompare(object2.stockActFirstName);
        });

        proPublicaRequest = await getProPublicaRequest();
        var senateProPublica = proPublicaRequest[0];
        var houseProPublica = proPublicaRequest[1];

        var uniqueCongress = [];  // empty array that will contain JSON objects containing unique ids and mapping to the unique names
        var id_count = 0;  // id count is initialized to 0, will be use to id the politicians in a forEach loop
        for (var i=0; i < uniqueCongressNames.length; i++) {
            var jsonData = {}
            id = id_count;

            stockActName = uniqueCongressNames[i].stockActFirstName + " " + uniqueCongressNames[i].stockActLastName;
            console.log(stockActName);

            politicianBio = await getPoliticianBio(stockActName, senateProPublica, houseProPublica);

            if (politicianBio) {
                mapping = {
                    stockActFirstName: uniqueCongressNames[i].stockActFirstName, 
                    stockActLastName: uniqueCongressNames[i].stockActLastName,
                    proPublicaFirstName: politicianBio.FirstName,
                    proPublicaLastName: politicianBio.LastName,
                    Chamber: politicianBio.Chamber,
                    Party: politicianBio.Party,
                    State: politicianBio.State,
                    Committees: politicianBio.Committees,
                    Subcommittees: politicianBio.Subcommittees
                };
                jsonData = {id, mapping};
                uniqueCongress.push(jsonData);
                id_count++;
            }
        }

    } catch (e) {
        console.error(e);  // will console log an error message if an error occurs
    } finally {
        await client.close();  // closes connection to mongoDB cluster
    }

    return uniqueCongress;
}

/*
    SUB CALLS FOR uniqueCongress REQUEST
*/

/*
DESCRIPTION:
Async function, getSenateStockWatcher, returns an array of JSON objects that will contain a unique list of senate member names.
This function accesses the senate stock watcher collection which contains the senate stock watcher "all_transactions" JSON file and then
uses the distinct method on "senator" to get the distinct names. The names are then split up using split function and everything before
the last index will be the labeled as the first name while the last index will be labeled as the last name. After going through each 
unique senator, the uniqueSenate list will be returned.
*/
async function getSenateStockWatcher(senateCollection) {
    var uniqueSenateNames = [];
    var uniqueSenateFullNames = await senateCollection.distinct("senator");  // grabs all unique senator names

    uniqueSenateFullNames.forEach(senatorName => {
        var jsonData = {};
        var firstName = "stockActFirstName";
        var lastName = "stockActLastName";
        nameArr = senatorName.split(" ");  // split up the full senator name so that the name can be separated into first and last names

        if (nameArr.length == 2) {  // if the full senator name only contains 2 names
            jsonData[firstName] = nameArr[0];  // this index will be the first name
            jsonData[lastName] = nameArr[1];  // this index will be the last name
            uniqueSenateNames.push(jsonData);
        } else if (nameArr.length == 3) {  // if the full senator name contains 3 names
            jsonData[firstName] = nameArr[0] + " " + nameArr[1];
            jsonData[lastName] = nameArr[2];
            uniqueSenateNames.push(jsonData);
        } else if (nameArr.length == 4) {  // if the full senator name contains 4 names
            jsonData[firstName] = nameArr[0] + " " + nameArr[1] + " " + nameArr[2];
            jsonData[lastName] = nameArr[3];
            uniqueSenateNames.push(jsonData);
        } else if (nameArr.length == 5) {  // if the full senator name contains 5 names
            jsonData[firstName] = nameArr[0] + " " + nameArr[1] + " " + nameArr[2] + " " + nameArr[3];
            jsonData[lastName] = nameArr[4];
            uniqueSenateNames.push(jsonData);
        }
    })

    return uniqueSenateNames;
}

/*
DESCRIPTION:
Async function, getHouseStockWatcher, returns an array of JSON objects that will contain a unique list of house member names.
This function accesses the house stock watcher collection which contains the senate stock watcher "all_transactions" JSON file 
and then uses the distinct method on "representative" to get the distinct names. The names are then split up using split function 
and everything before the last index and after the first index will be the labeled as the first name while the last index will be 
labeled as the last name. The first index is skipped because the first index contains the politician's prefix name. After going through 
each unique represenative, the uniqueSenate list will be returned.
*/
async function getHouseStockWatcher(houseCollection) {
    var uniqueHouseNames = [];
    var uniqueHouseFullNames = await houseCollection.distinct("representative");  // grabs all unique representative names

    uniqueHouseFullNames.forEach(represenativeName => {
        var jsonData = {};
        var firstName = "stockActFirstName";
        var lastName = "stockActLastName";
        nameArr = represenativeName.split(" ");    // split up the full representative name so that the name can be separated into first and last names

        /*
        NOTE: 
        This if statement section differs from the senate version and starts at name lengths of 3 due to having prefix names included.
        nameArr[0] is not used because we do not want to include the politician's prefix into the first name.
        */
        if (nameArr.length == 3) {  // if the full represenative name only contains 3 names
            jsonData[firstName] = nameArr[1];  // this index will be the first name
            jsonData[lastName] = nameArr[2];  // this index will be the last name
            uniqueHouseNames.push(jsonData);
        } else if (nameArr.length == 4) {  // if the full represenative name only contains 4 names
            jsonData[firstName] = nameArr[1] + " " + nameArr[2];
            jsonData[lastName] = nameArr[3];
            uniqueHouseNames.push(jsonData);
        } else if (nameArr.length == 5) {  // if the full represenative name only contains 5 names
            jsonData[firstName] = nameArr[1] + " " + nameArr[2] + " " + nameArr[3];
            jsonData[lastName] = nameArr[4];
            uniqueHouseNames.push(jsonData);
        }
    })

    return uniqueHouseNames;
}

async function getPoliticianBio(stockActName, senateProPublica, houseProPublica) {
    var memberID = getMemberID(stockActName, senateProPublica, houseProPublica);
    
    if (memberID != -1) {
        var politicianBioData = await getPoliticianBioData(memberID);
        var politicianBio = {
            Success: true,
            FirstName: politicianBioData.first_name,
            LastName: politicianBioData.last_name,
            Chamber: politicianBioData.roles[0].chamber,
            Party: politicianBioData.roles[0].party,
            State: politicianBioData.roles[0].state,
            Committees: politicianBioData.roles[0].committees,
            Subcommittees: politicianBioData.roles[0].subcommittees
        }
    } else {
        var politicianBio = {
            Success: false,
            FirstName: null,
            LastName: null,
            Chamber: null,
            Party: null,
            State: null,
            Committees: null,
            Subcommittees: null
        }
    }

    return politicianBio;
}

/*
Function that will get the politician's id number in ProPublica by looping through the HouseMemberData
and SenateMemberData and checking if any names match with the provided name from the client.
*/
function getMemberID(stockActName, senateProPublica, houseProPublica) {
    var memberID = -1;
    var stockActNameArr = stockActName.split(" ");
    var matches;
    var highestMatch = 0;

    for (i=0; i < senateProPublica.length; i++) {
        matches = 0;
        stockActNameArr.forEach(aName => {
            if (senateProPublica[i].first_name == aName) {
                matches++;
            }

            if (senateProPublica[i].middle_name == aName) {
                matches++;
            }

            if (senateProPublica[i].last_name == aName) {
                matches++;
            }

        })

        if (highestMatch < matches) {
            memberID = senateProPublica[i].id;
        }
    }

    for (i=0; i < houseProPublica.length; i++) {
        matches = 0;
        stockActNameArr.forEach(aName => {
            if (houseProPublica[i].first_name == aName) {
                matches++;
            }

            if (houseProPublica[i].middle_name == aName) {
                matches++;
            }

            if (houseProPublica[i].last_name == aName) {
                matches++;
            }
        })

        if (highestMatch < matches) {
            memberID = houseProPublica[i].id;
        }
    }

    return memberID;
}

/*
Async function that takes the politician's member_id and make another call to the politician's specific json in ProPublica so that
it could return the politician's bio information.
*/
async function getPoliticianBioData(memberID) {
    const url_memberID_ProProplica = "https://api.propublica.org/congress/v1/members/" + memberID + ".json";
    const response = await fetch(url_memberID_ProProplica, {
        method: "GET",
        headers: {
            "X-API-Key": "jADs7ONXmGA9IGnzMDXTA8AH8Fb4WKBYKCuOk0dw"
        }
    })
    const data = await response.json();
    politicianBioData = data.results[0];

    return politicianBioData;
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
    var senateCollection = await client.db("congressStockWatcher").collection("senateStockWatcher");  // gets senate stock watcher collection data
    var houseCollection = await client.db("congressStockWatcher").collection("houseStockWatcher");  // gets house stock watcher collection data
    mongoRequest.push(senateCollection);
    mongoRequest.push(houseCollection);

    return mongoRequest;  // collection data is returned in an array
}

/*
DESCRIPTION:
Async function, getProPublicaRequest, is a core request and returns senate and house member bio data from ProPublica's API.
The senate and house member bio data is placed and returned in an array variable.
*/
async function getProPublicaRequest() {
    var proPublicaRequest = [];

    // when this function is ran, grabs senate member's bio data from propublic
    await getSenateProPublica().then(data => {
        senateProPublica = data;
    })

    // when this function is ran, grabs house member's bio data from propublica
    await getHouseProPublica().then(data => {
        houseProPublica = data;
    })

    proPublicaRequest.push(senateProPublica);
    proPublicaRequest.push(houseProPublica);

    return proPublicaRequest;  // propublica data is returned in an array
}

/*
    SUB CALLS FOR PROPUBLICA REQUEST
*/

/*
DESCRIPTION:
Async function, getSenateProPublica, is a sub call for ProPublica's core request. It returns senate members bio data from ProPublica's API.
*/
async function getSenateProPublica() {
    const propublica_senate_url = "https://api.propublica.org/congress/v1/117/senate/members.json";
    const response = await fetch(propublica_senate_url, {  // fetches and get data from propublica's senate database
        method: "GET",
        headers: {
            "X-API-Key": "jADs7ONXmGA9IGnzMDXTA8AH8Fb4WKBYKCuOk0dw"  // propublica's API key; this key will be hidden in our env file
        }
    })
    const data = await response.json();
    var SenateMemberData = data.results[0].members;  // get the list of all senators

    return SenateMemberData;
}

/*
DESCRIPTION:
Async function, getHouseProPublica, is a sub call for ProPublica's core request. It returns senate members bio data from ProPublica's API.
*/
async function getHouseProPublica() {
    const propublica_house_url = "https://api.propublica.org/congress/v1/117/house/members.json";
    const response = await fetch(propublica_house_url, {  // fetches and get data from propublica's house database
        method: "GET",
        headers: {
            "X-API-Key": "jADs7ONXmGA9IGnzMDXTA8AH8Fb4WKBYKCuOk0dw"  // propublica's API key; this key will be hidden in our env file
        }
    })
    const data = await response.json();
    var HouseMemberData = data.results[0].members;  // gets the list of all representatives

    return HouseMemberData;
}

// DESCRIPTION: takes an API call to Alphavantage.co
// PROTOTYPE:
async function getAlphavantage() {
}