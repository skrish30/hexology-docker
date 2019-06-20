const express = require("express");
const rp = require("request-promise");
const cfenv = require("cfenv");
const app = express();
const server = require("http").createServer(app);
const io = require('socket.io')(server);
require('dotenv').config({silent: true});
const fs = require('fs');
const fsPromises=require('fs').promises;
const request = require('request');
const downloadVideo = require('./ytube.js')
//modules for V2 assistant
var bodyParser = require('body-parser'); // parser for post requests


//Import Watson Developer Cloud SDK
var AssistantV2 = require('watson-developer-cloud/assistant/v2'); // watson sdk
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js');

// Get the environment variables from Cloud Foundry
const appEnv = cfenv.getAppEnv();

// Serve the static files in the /public directory
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

// Create the Assistant object
  var assistant = new AssistantV2({
  version: '2018-11-08'
});

var newContext = {
  global : {
    system : {
      turn_count : 1
    }
  }
};

// Create the Discovery object
const discovery = new DiscoveryV1({
  version: '2019-04-02',
  url: process.env.DISCOVERY_URL || 'https://gateway.watsonplatform.net/discovery/api',
});

//Create the NLU object
const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  version: '2018-11-16',
  iam_apikey: process.env.NATURAL_LANGUAGE_UNDERSTANDING_IAM_APIKEY,
  url: process.env.NATURAL_LANGUAGE_UNDERSTANDING_URL
});

// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});

//creat necessary documents
fsPromises.writeFile("categories.json",'')
        .then(()=> console.log("categories created"))
        .catch(()=> console.log("failure"))

fsPromises.writeFile("data.json",'')
        .then(()=> console.log("data created"))
        .catch(()=> console.log("failure"))

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

//var filterid = "";

//create Events to set an order
const EventEmitter = require('events');
class MyEmitter extends EventEmitter{}
const myEmitter = new MyEmitter();

var videodone = 0

io.on('connection', function(socket) {
  //console.log('a user has connected')


  var assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
  if (!assistantId || assistantId === '<assistant-id>>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  assistant.createSession({
    assistant_id: process.env.ASSISTANT_ID || '{assistant_id}'
  })
    .then(res => {
      sessionId = res.session_id;
    })
    .catch(err => {
      console.log(err);
    });
    

  // Handle incomming chat messages
  socket.on('user message', function(msg) {

    console.log('user message: ' + msg);
    io.emit('user message', "You: " + msg);
    
    /*****************************
        Send text to Conversation
    ******************************/
    
  assistant.message({
    assistant_id: assistantId,
    session_id: sessionId,
    input: {
      'message_type': 'text',
      'text': msg,
      options: {
        return_context : true
      }
      }
    })
     .then(res => {
      if(res.output.generic[0].options){

        if(msg.indexOf('http') >= 0){
          setTimeout(()=>{
            io.emit('chat message', 'Video downloading...It might take up to 30 seconds.')
          },500)
          //console.log(test);
          downloadVideo(msg)
          .then((message)=>{
            console.log(message)
            io.emit('video', 'video.mp4')
            videodone = 1
            console.log(videodone);
          })

        }
        //console.log(res.output.generic[0]);
        reply = [];
        tex_reply = [];
        tex_reply.push("Please select the fields that you are interested in: \n");
        res.output.generic[0].options.forEach(option => {
          reply.push(option.label);
        });

        if(msg=="science"){
          reply = [];
          tex_reply = [];
          tex_reply.push("Please select which field in science that you are interested in: \n"); 
          res.output.generic[0].options.forEach(option => {
            reply.push(option.label);
          });
        }
        io.emit('chat message',"Companion BOT: " + tex_reply)
        io.emit('chat message',reply)
      } else if(res.output.generic[0].text){
        reply=(res.output.generic[0].text);
        var test = res.output.generic[0].text;

        io.emit('chat message',"Companion BOT: " + reply)
        if(reply=="Okay, concepts related to "+msg+" will be shown to you."){

          io.emit('chat message', 'Video downloaded, click to play and start querying')
          myEmitter.emit('event',msg);
        }
      }

      console.log(reply);

      socket.on('query', function(msg) {
        entityString = msg
        console.log(msg);
        //console.log(filterid);
        entityquery(entityString)
      })

    })
    .catch(err => {
      console.log(err);
    });
  });

});

app.get('/', function(req, res){
  res.sendFile('index.html');
});

/*****************************
    Print entities by type
******************************/
myEmitter.on('event',(msg)=>{
  //if(videodone == 1){
    //setTimeout(()=>{
    //},8000)

    //var filterid = filterid;
    
    setTimeout(()=>{

      readJson('data.json')
      .then((results)=> {
          elements = [];
          //console.log(concepts);
          results.forEach(concepts=>{
          const analyzeParams = {
              'text':'I am interested in ' + concepts,
              'features': {
                'categories': {
                  'limit': 3
                }
              }
            };
            //print all the concepts
            //console.log(analyzeParams.text);
            
            naturalLanguageUnderstanding.analyze(analyzeParams)
              .then(analysisResults => {
                  analysisResults.concepts = analyzeParams.text.slice(19);
                  elements.push(analysisResults)
              })
              .catch(err => {
                console.log('error:', err);
              });
          });

          setTimeout(function() {
                  //console.log(elements[0].categories[0].label)
                  console.log('matched interests');
                  //console.log(queryString);
                  userInterest = msg;
                  elements.forEach((concept)=>{
                      let interest = concept.categories[0].label;
                      interest = concept.categories[0].label.slice(1) + "\/";
                      num = interest.search('\/')
                      if(interest.includes('science')){
                          interest = interest.slice(num,-1)
                      } else{
                        interest =interest.slice(0,num);
                      }
                      console.log(interest)
                      if(interest.includes(userInterest)){
                          //console.log(filterid);
                          getDbpedia(concept.concepts.replace(/ /g,"_"))
                          //console.log(getDbpedia(concept.concepts.replace(/ /g,"_")));
                          //queryDiscoveryNews(concept)
                      }; 
                      //print out the avaliable interests
                      //console.log(concept.categories[0].label, "\t\t" + concept.concepts)
                  });
                  //return res.status(200).json({mes:'Successs'})
              }, 5000);
      })
      .catch((err)=> console.log("error:",err))
    
    },5000);

    var entityPromise = new Promise((resolve,reject)=>{
      entities.forEach((entity)=>{

        queryDiscoveryEntities(entity)
        // fsPromises.writeFile("data"+entitity+".json", data)
        // .then(()=> console.log("success"))
        // .catch(()=> console.log("failure"))
      });
      resolve("Entities found")
      reject(err);
    })
    .then((res)=>{
      console.log(res);
      setTimeout(()=>{
        READFile(Types)
      },2000)
      console.log("start emitting");
      queryConcepts();
    })
    .catch((err)=>{
      console.log("Entity Error", err);
    });
  //}
})

/*****************************
    Function Definitions
******************************/
function queryConcepts(){
  const queryParams = {
  environment_id: process.env.ENVIRONMENT_ID,
  collection_id: process.env.COLLECTION_ID,
  filter: "id::\"05feb44d3c30fe016a0a11cd090fb253\"",
};

discovery.query(queryParams)
  .then(queryResponse => {
    //print query results
    //console.log(JSON.stringify(queryResponse, null, 2));
  data = JSON.stringify(queryResponse, null, 2);
    fsPromises.writeFile("data.json", data)
  .then(()=> console.log("Query logged in data.json"))
  .catch(()=> console.log("failure"))
  })
  .catch(err => {
    console.log('error:', err);
  });
};

//get concepts from discovery and match with user interests

function getDbpedia(concept){
  let requestURL = "http://dbpedia.org/data/"+ concept + ".json";
  request(requestURL, { json: true }, (err, res, body) => {
  if (err) { return console.log(err); }
  let resourceURL = "http://dbpedia.org/resource/"+ concept;
  //All the languages
  //console.log(body[resourceURL]['http://dbpedia.org/ontology/abstract']);
  let found =body[resourceURL]['http://dbpedia.org/ontology/abstract'].filter( (abstract)=>{
      return abstract.lang == 'en' 
  });
  //abstract in the correct language
  //console.log(concept,"\n",found[0].value + "\n\n")
  io.emit('concept',
  {
    concept : concept,
    abstract: found[0].value.slice(0,500) + "..."
  });
  console.log(concept,found[0].value.slice(0,500));
  //return found[0].value;
  });
};

//search concepts in dbpedia

function readJson(fileName){
  var readableStream = fs.createReadStream(fileName);
  var data = '';
  // Return new promise 
  return new Promise(function(resolve, reject) {
      readableStream.on('data', function(chunk) {
          data+=chunk;
      });
      readableStream.on('end', function() {
          data = JSON.parse(data)
          elements = [];
          data.results[0].enriched_text.concepts.forEach(element => {
              elements.push(element.text);
          });
          resolve(elements)
      });
      readableStream.on('error', function(err){
          reject(err);
      });
  })
  };

//reads file and returns the JSON object

function queryDiscoveryEntities(entities){
  console.log(entities);
  const queryParams = {
    environment_id: process.env.ENVIRONMENT_ID,
    collection_id: process.env.COLLECTION_ID,
    filter: "id::\"05feb44d3c30fe016a0a11cd090fb253\"",
    aggregation: "nested(enriched_text.entities).filter(enriched_text.entities.type::" + entities + ").term(enriched_text.entities.text,count:10)"
    
  };

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

//categoise entities and send to the web page

function entityquery(entityString){
  //console.log(entityString)
  
  let queryParams ={
    environment_id: process.env.ENVIRONMENT_ID,
    collection_id: process.env.COLLECTION_ID,
    query: entityString, 
    passages: true,
    passages_characters: 150,
    filter: "id::\"05feb44d3c30fe016a0a11cd090fb253\"",
  }

  discovery.query(queryParams)
    .then(queryResponse =>{
      //console.log(JSON.stringify(queryResponse, null, 2));
      /*
      fsPromises.writeFile("data.txt", JSON.stringify(queryResponse, null, 2))
        .then(()=> console.log("success"))
        .catch(()=> console.log("failure"))
      */
      
      queryResponse = queryResponse.passages[0].passage_text;
      console.log('successful query');

      queryResponse = queryResponse.replace(entityString,entityString.toUpperCase())
      console.log(queryResponse)
      io.emit('passage',queryResponse)
      
    })
    .catch(err =>{
      console.log('error',err)
    });
}

//query the entity in discovery

function READFile(Types){
  Types.forEach((Type)=>{
    
  fs.readFile('./data'+Type+'.json','utf8',(err,data)=>{
      data = JSON.parse(data);

      Entype = data.aggregations[0].aggregations[0].results;

      Entype.forEach((number)=>{
        entities = number.key;
        console.log("Emit",Type,entities)

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

//create files with entities of all types
//queryDiscoveryNews("earth");

function queryDiscoveryNews(concept){
  let queryParams ={
    environment_id: "news-en",
    collection_id: "system",
    query: concept, 
    title: true,
    url: true,
  }
  discovery.query(queryParams)
    .then(queryResponse =>{
      //console.log(JSON.stringify(queryResponse, null, 2));
      /*
      fsPromises.writeFile("data.txt", JSON.stringify(queryResponse, null, 2))
        .then(()=> console.log("success"))
        .catch(()=> console.log("failure"))
      */
      
      queryResponse0 = queryResponse.results[0].title;
      queryResponse1 = queryResponse.results[0].url;

      console.log('successful query');

      queryResponse = queryResponse.replace(entityString,entityString.toUpperCase())
      console.log(queryResponse)
      io.emit('concept',queryResponse0, queryResponse1)
      
    })
    .catch(err =>{
      console.log('error',err)
    });

}

//query the concept in discovery news
