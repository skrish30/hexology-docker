// Author: Oliver Rodriguez

// Modules to import
const express = require("express");
const rp = require("request-promise");
const cfenv = require("cfenv");
const app = express();
const server = require("http").createServer(app);
const io = require('socket.io')(server);
const fsPromises=require('fs').promises;
const fs = require('fs');
require('dotenv').config({silent: true});

//modules for V2 assistant
var bodyParser = require('body-parser'); // parser for post requests


//Import Watson Developer Cloud SDK
var AssistantV2 = require('watson-developer-cloud/assistant/v2'); // watson sdk
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');


// Get the environment variables from Cloud Foundry
const appEnv = cfenv.getAppEnv();

// Serve the static files in the /public directory
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());


// Create the Discovery object
const discovery = new DiscoveryV1({
  version: '2019-04-02',
  url: process.env.DISCOVERY_URL || 'https://gateway.watsonplatform.net/discovery/api',
});

const environmentID = process.env.DISCOVERY_ENVIRONMENT_ID;
const collectionID = process.env.DISCOVERY_COLLECTION_ID;

// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});


app.get('/', function(req, res){
  res.sendFile('index.html');
});

let entities=[
  "Person",
  "Location",
  "Quantity",
  "Company",
  "Facility",
  "JobTitle",
];


/*****************************
    Function Definitions
******************************/
const discoveryUpload = (docName)=>{
const addDocumentParams = {
  environment_id: environmentID,
  collection_id: collectionID,
  file: fs.createReadStream(docName),
};

discovery.addDocument(addDocumentParams)
  .then(documentAccepted => {
    console.log(JSON.stringify(documentAccepted, null, 2));
  })
  .catch(err => {
    console.log('error:', err);
  });
};

//upload doc.json in the current directory
//discoveryUpload('./doc.json')


function queryDiscoveryEntities(entities){
  
  const queryParams = {
    environment_id: environmentID,
    collection_id: collectionID,
    filter: "id::\"39f38b9c1cd046d3ac50d7f8ace63fe0\"",
    aggregation: "nested(enriched_text.entities).filter(enriched_text.entities.type::" + entities + ").term(enriched_text.entities.text,count:10)"
    
  };
  console.log(queryParams);

  discovery.query(queryParams)
    .then(queryResponse => {
      console.log(JSON.stringify(queryResponse.aggregations[0], null, 2));
      data=JSON.stringify(queryResponse.aggregations[0], null, 2);
    fsPromises.writeFile("data"+entities+".json", data)
    .then(()=> console.log("success"))
    .catch(()=> console.log("failure"))
    })
    .catch(err => {
      console.log('errorssssss:', err);
    });
}


entities.forEach((entitity)=>{
   queryDiscoveryEntities(entitity)
    // fsPromises.writeFile("data"+entitity+".json", data)
    //   .then(()=> console.log("success"))
    //   .catch(()=> console.log("failure"))
    
});



