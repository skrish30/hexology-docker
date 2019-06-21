const express = require("express");
const rp = require("request-promise");
const cfenv = require("cfenv");
const app = express();
const server = require("http").createServer(app);
const io = require('socket.io')(server);
require('dotenv').config({silent: true});
const fs = require('fs');
const fsPromises=require('fs').promises;

console.log(process.env.ASSISTANT_ID);

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

// Create the Conversation object
//   var assistant = new AssistantV2({
//   version: '2018-11-08'
// });

// Create the Discovery object
const discovery = new DiscoveryV1({
  version: '2019-04-02',
  url: process.env.DISCOVERY_URL || 'https://gateway.watsonplatform.net/discovery/api',
});


// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

let Types=[
  "Person",
  "Location",
  "Quantity",
  "Company",
  "Facility",
  "JobTitle"
]

let entities=[
  "Person",
  "Location",
  "Quantity",
  "Company",
  "Facility",
  "JobTitle",
];



/////////////////////////////////////////////////////////////////////////////


  function queryDiscoveryEntities(entities){
  
    const queryParams = {
      environment_id: process.env.ENVIRONMENT_ID,
      collection_id: process.env.COLLECTION_ID,
      filter: "id::\"39f38b9c1cd046d3ac50d7f8ace63fe0\"",
      aggregation: "nested(enriched_text.entities).filter(enriched_text.entities.type::" + entities + ").term(enriched_text.entities.text,count:10)"
      
    };
    console.log(queryParams);
  
    discovery.query(queryParams)
      .then(queryResponse => {
        //console.log(JSON.stringify(queryResponse.aggregations[0], null, 2));
        data=JSON.stringify(queryResponse.aggregations[0], null, 2);
      fsPromises.writeFile("data"+entities+".json", data)
      .then(()=> console.log("successful query"))
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


/////////////////////////////////////////////////////////////////////////////

io.on('connection', function(socket) {
  console.log('a user has connected');

  io.emit('chat message', "you: " + "Someone connected")
  // Handle incomming chat messages
  socket.on('chat message', function(msg) {
    console.log('message: ' + msg);
    io.emit('chat message', "you: " + msg)
    })

    io.emit('Person','Darrel');
    io.emit('concept1', {
      concept: "Earth",
      abstract: "Earth is round"
    })
setTimeout(()=>{
  READFile(Types)
  console.log("start emitting")
},8000)

//Start Readfile
function READFile(Types){
  Types.forEach((Type)=>{
    
  fs.readFile('./data'+Type+'.json','utf8',(err,data)=>{
      data = JSON.parse(data);
      console.log(data)

      Entype = data.aggregations[0].aggregations[0].results;
      console.log(Entype);

      Entype.forEach((number)=>{
        entities = number.key;
        //console.log("Emit",Type,entities)

        //io.emit(Type, entities)
        if(Type=="Person"||Type=="Quantity"||Type=="Location"){
          io.emit(Type, entities)
          console.log("Emit",Type,entities)
        } else{
          io.emit("Other",entities+","+ Type)
          console.log("Other",entities +","+Type)
        }

      })
    })
  });
}
//end Readfile

  });
//   ///////////////////////

//   //let Type_Quantity = JSON.parse(fs.readFile('./dataQuantity.json', 'utf8'))
//   //let Type_Person = JSON.parse(fs.readFile('./dataPerson.json', 'utf8'))
//   //let Type_Location = JSON.parse(fs.readFile('./dataLocation.json', 'utf8'))
//   //let Type_Company = JSON.parse(fs.readFile('./dataCompany.json', 'utf8'))
//   //let Type_Facility = JSON.parse(fs.readFile('./dataFacility.json', 'utf8'))
//   //let Type_JobTitle = JSON.parse(fs.readFile('./dataJobTitle.json', 'utf8'))

//   quantity = Type_Quantity.aggregations[0].aggregations.results.key;
//   io.emit('Quantity', quantity)





//     // ***************************************

//    });


/*****************************
    Function Definitions
******************************/
function queryDiscovery(queryString, callback){
  //function to query Discovery
  let queryParams ={
    environment_id: process.env.ENVIRONMENT_ID,
    collection_id: process.env.COLLECTION_ID,
    query: queryString, 
    passages: true,
    passages_characters: 100,
    aggregation: "nested(enriched_text.entities).filter(enriched_text.entities.type::" + entities + ").term(enriched_text.entities.text,count:10)"
  };
  console.log(queryParams);
  discovery.query(queryParams)
    .then(queryResponse =>{
      //console.log(JSON.stringify(queryResponse, null, 2));
      /*
      fsPromises.writeFile("data.txt", JSON.stringify(queryResponse, null, 2))
        .then(()=> console.log("success"))
        .catch(()=> console.log("failure"))
      */
      console.log('successful query');
      callback(null,queryResponse);
    })
    .catch(err =>{
      console.log('error',err);
      callback(err,null);
    });
};


