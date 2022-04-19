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
            return object1.firstNameStockWatcher.localeCompare(object2.firstNameStockWatcher);
        });

        proPublicaRequest = await getProPublicaRequest();
        var senateProPublica = proPublicaRequest[0];
        var houseProPublica = proPublicaRequest[1];
 
        var uniqueCongress = [];  // empty array that will contain JSON objects containing unique ids and mapping to the unique names
        var id_count = 0;  // id count is initialized to 0, will be use to id the politicians in a forEach loop
        uniqueCongressNames.forEach(uniqueName => {  // creating our desired array of JSON objects of ids and mapping to unique first and last names
            var jsonData = {}
            id = id_count;

            firstNameSplited = uniqueName.firstNameStockWatcher.split();
            firstName = firstNameSplited[0];
            lastName = uniqueName.lastNameStockWatcher;

            politicianBio = await getPoliticianBio(firstName, lastName, senateProPublica, houseProPublica);

            var test = 0;
            mapping = {firstNameStockWatcher: uniqueName.firstNameStockWatcher, lastNameStockWatcher: uniqueName.lastNameStockWatcher, test};
            jsonData = {id, mapping};
            uniqueCongress.push(jsonData);
            id_count++;

            /*
            var test = 0;
            mapping = {firstNameStockWatcher: uniqueName.firstNameStockWatcher, lastNameStockWatcher: uniqueName.lastNameStockWatcher, test};
            jsonData = {id, mapping};
            uniqueCongress.push(jsonData);
            id_count++;
            */
        })

    } catch (e) {
        console.error(e);  // will console log an error message if an error occurs
    } finally {
        await client.close();  // closes connection to mongoDB cluster
    }

    var dummyVariable = 0;
    return dummyVariable;
}

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
/*
async function uniqueCongress() {
    const uri = "mongodb://localhost:27017";  // initialize uri with local mongoDB; this uri value will be replaced and initialized to our online mongoDB
    const client = new MongoClient(uri);  // initialize the client using the uri

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
            return object1.firstNameStockWatcher.localeCompare(object2.firstNameStockWatcher);
        });

        var uniqueCongress = [];  // empty array that will contain JSON objects containing unique ids and mapping to the unique names
        var id_count = 0;  // id count is initialized to 0, will be use to id the politicians in a forEach loop
        uniqueCongressNames.forEach(uniqueName => {  // creating our desired array of JSON objects of ids and mapping to unique first and last names
            var jsonData = {}
            id = id_count;
            mapping = uniqueName;

            jsonData = {id, mapping};
            uniqueCongress.push(jsonData);
            id_count++;
        })
    } catch (e) {
        console.error(e);  // will console log an error message if an error occurs
    } finally {
        await client.close();  // closes connection to mongoDB cluster
    }

    return uniqueCongress;
}
*/

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
        var firstName = "firstNameStockWatcher";
        var lastName = "lastNameStockWatcher";
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
        var firstName = "firstNameStockWatcher";
        var lastName = "lastNameStockWatcher";
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

async function getPoliticianBio(firstName, lastName, senateProPublica, houseProPublica) {
    memberID = getMemberID(firstName, lastName, senateProPublica, houseProPublica);
    
    if (memberID != -1)
        var politicianBioData = await getPoliticianBioData(memberID);

        let politicianBio = {
                    id: PoliticianBio.id,
                    politician_bio: {
                        FirstName: politicianBioData.first_name,
                        MiddleName: politicianBioData.middle_name,
                        LastName: politicianBioData.last_name,
                        Chamber: politicianBioData.roles[0].chamber,
                        Party: politicianBioData.roles[0].party,
                        State: politicianBioData.roles[0].state,
                        Committees: politicianBioData.roles[0].committees,
                        Subcommittees: politicianBioData.roles[0].subcommittees
                    }
                };

    return politicianBio;
}

/*
Function that will get the politician's id number in ProPublica by looping through the HouseMemberData
and SenateMemberData and checking if any names match with the provided name from the client.
*/
function getMemberID(firstName, lastName, senateProPublica, houseProPublica) {
    var memberID;

    for (i=0; i < senateProPublica.length; i++) {
        if (senateProPublica[i].first_name == firstName && senateProPublica[i].last_name == lastName) {
            memberID = senateProPublica[i].id;

            return memberID;
        }
    }

    for (i=0; i < houseProPublica.length; i++) {
        if (houseProPublica[i].first_name == firstName && houseProPublica[i].last_name == lastName) {
            memberID = houseProPublica[i].id;

            return memberID;
        }
    }
    
    return -1;
}

/*
Async function that takes the politician's member_id and make another call to the politician's specific json in ProPublica so that
it could return the politician's bio information.
*/
async function getPoliticianBioData(memberID) {
    const propublica_politician_bio_url = "https://api.propublica.org/congress/v1/members/" + memberID + ".json";
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

// DESCRIPTION: takes an API call to Alphavantage.co
// PROTOTYPE:
async function getAlphavantage() {
}







/*
    DEPRECIATED CALLS: phase these out, however good call structure for interim
*/

/*
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
*/