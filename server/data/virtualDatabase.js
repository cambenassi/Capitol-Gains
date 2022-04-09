const { MongoClient } = require('mongodb');
const _ = import('lodash');
const fetch = require('node-fetch')

// public functions
module.exports = {
    // DESCRIPTION: main public function that gets sent a data request and returns a json variable
    // PROTOTYPE: sent a json w/ type of request and any data needed to make request
    getData: async function (dataSlug) {
        const data = await getDataVirtualDatabase(dataSlug);
        //console.log("IN getData:", data);
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
    // determine request type

    // sample/depreciated data request using hardcoded json
    if (dataSlug.requestType == "uniqueCongress") {
        //return getPoliticians();
        getDataVirtualDatabase_data = await getProPublicaRequest();
        //console.log("IN getDataVirtualDatabase:", getDataVirtualDatabase_data);
        return getDataVirtualDatabase_data;
    } else if (dataSlug.requestType == "congressById") {
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
    CORE DATA REQUESTS: requests that go directly to specific databases/API calls
*/

// DESCRIPTION: takes a mongodb call
// PROTOTYPE:
async function getMongoRequest() {
}

// DESCRIPTION: takes an API call to ProPublica API and returns a json object containing politician's bio
// PROTOTYPE:
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

                let test_data = [{
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
                }];

                return test_data;

                /*
                getPoliticianBio(member_id).then(data => {
                    PoliticianBio = data;
                    console.log('Server-side: Sending a successful response containing politician data back to the client-side\n')
                    let test_data = [{
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
                    }];

                    console.log("INSIDE .THEN getProPublicaRequest:", test_data);
                    return test_data;
                    
                })*/
                console.log("OUTSIDE .THEN getProPublicaRequest:", test_data);
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

/*
    SUB CALLS FOR PROPUBLICA REQUEST
*/
// when server starts, grab HouseMemberData and put it into the global variable
getHouseMemberData().then(data => {
    console.log('Server-side: Grabbing HouseMemberData through ProPublica API call and putting it into a global variable.');
    HouseMemberData = data;
})

// when server starts, grab SenateMemberData and put it into the global variable
getSenateMemberData().then(data => {
    console.log('Server-side: Grabbing SenateMemberData through ProPublica API call and putting it into a global variable.');
    SenateMemberData = data;
})

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