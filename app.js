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
const path = require("path")
const fs_extra = require('fs-extra')

//Own Libraries
const logger = require('./libraries/logger');
const downloadVideo = require('./libraries/ytube.js')
const speech2text=require('./libraries/newspeechText');

//global parameters
const dataDir = './datas';
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
let userInterest = 'empty'
let uploadCount =0;
let audioFileName = "audio.mp3"
let filterID = null;

//modules for V2 assistant
var bodyParser = require('body-parser'); 
// parser for post requests

//Import Watson Developer Cloud SDK
var AssistantV2 = require('watson-developer-cloud/assistant/v2'); 
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1.js');

logger.info("Program started");

// Get the environment variables from Cloud Foundry
const appEnv = cfenv.getAppEnv();

// Serve the static files in the /public directory
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

// Create the Assistant object
  var assistant = new AssistantV2({
  version: '2018-11-08'
});

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

assistant.createSession({
  assistant_id: process.env.ASSISTANT_ID || '{assistant_id}'
})
  .then(res => {
    sessionId = res.session_id;
  })
  .catch(err => {
    logger.error(err)
  });

// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
  logger.info("server starting on " + appEnv.url);
});

//creat necessary documents
if (fs.existsSync(dataDir)){
    fs_extra.emptyDir(dataDir)
    .then(()=>{
      return fsPromises.rmdir(dataDir)
    })
    .catch((err)=>{logger.error(err)})
    .then(()=>{
      logger.debug('./datas folder removed')
      return fsPromises.mkdir(dataDir)
    })
    .catch((err)=>{logger.error(err)})
    .then(()=>{
      logger.debug('./datas folder created')
      fsPromises.writeFile("./datas/concept.json",'')
        .then(()=> {
          logger.debug("./datas/concept created")
          Types.forEach((Type)=>{
            fs.writeFileSync(path.join('./datas','data'+Type+'.json'),JSON.stringify('',null,2))
          })
        })
        .catch((err)=> logger.error(err))
       })
    .catch((err)=>{logger.error(err)})
}

fsPromises.writeFile('./public/video.mp4','')
  .then(()=>{logger.debug("video replaced")})
  .catch((err)=>{logger.error(err)})


//create Events to set an order
const EventEmitter = require('events');
class MyEmitter extends EventEmitter{}
const myEmitter = new MyEmitter();

io.on('connection', function(socket) {

  // Handle incomming chat messages
  socket.on('user message', function(msg) {
  
  io.emit('user message', "You: " + msg);
    
    /*****************************
        Send text to Watson Assistant 
    ******************************/
  setTimeout(()=>{
  assistant.message({
    assistant_id: process.env.ASSISTANT_ID,
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
          //Download the video with the specified URl link
          downloadVideo(msg)
          .then((message)=>{
            setTimeout(()=>{
              logger.info(message)
              io.emit('video', 'video.mp4')
              myEmitter.emit('video', 'audio.mp3') 
            },500)
          })
        }
        reply = [];
        text_reply = [];
        text_reply.push("Please select the fields that you are interested in: \n");
        res.output.generic[0].options.forEach(option => {
          reply.push(option.label);
        });

        if(msg=="science"){
          reply = [];
          text_reply = [];
          text_reply.push("Please select which field in science that you are interested in: \n"); 
          res.output.generic[0].options.forEach(option => {
            reply.push(option.label);
          });
        }
        io.emit('chat message',"Companion BOT: " + text_reply)
        io.emit('chat message',reply)
      } else if(res.output.generic[0].text){
        reply=(res.output.generic[0].text);
        io.emit('chat message',"Companion BOT: " + reply)
        if(reply=="Okay, concepts related to "+msg+" will be shown to you."){
          userInterest = msg
          io.emit('chat message', 'Video downloaded, click to play and start querying')
        }
      }
      socket.on('query', function(msg) {
        entityString = msg
        console.log(msg);
        entityquery(entityString)
      })
    })
    .catch(err => {
      console.log(err);
    });
  },300)

  });
});


/*****************************
  After streaming the video
******************************/
myEmitter.on('startQuery',(msg)=>{
    setTimeout(()=>{

      readJson('./datas/concept.json')
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
              
            naturalLanguageUnderstanding.analyze(analyzeParams)
              .then(analysisResults => {
                  analysisResults.concepts = analyzeParams.text.slice(19);
                  elements.push(analysisResults)
              })
              .catch(err => {
                console.log('error:', err);
              });
          });

          //get categories of concepts from NLU
          setTimeout(function() {
                  //console.log(elements[0].categories[0].label)
                  console.log('matched interests');
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
                          getDbpedia(concept.concepts.replace(/ /g,"_"))
                      }; 
                      //print out the avaliable interests
                      //console.log(concept.categories[0].label, "\t\t" + concept.concepts)
                  });
                  //return res.status(200).json({mes:'Successs'})
              }, 5000);
      })
      .catch((err)=> console.log("error:",err))
    },5000);
    //search concepts on DBpedia

    queryAllEntities()
    .then((message)=>{
      logger.debug(message)
      setTimeout(()=>{
        readEntity(Types)
        console.log("start emitting")
      },3000)
      queryConcepts();
    })
    .catch((err)=>{
      console.log("Entity Error", err);
    });
    //query the entities clicked by user
  })

  //***********Events **************************************************/
myEmitter.on('filterID',(newID)=>{
  filterID =  newID;
})

myEmitter.on('video',(audioFileName)=>{
  speech2text.getTranscript(audioFileName);
})

myEmitter.once('video',()=>{
  setInterval(()=>{
    uploadCount +=1;
    myEmitter.emit('readTranscript');
  },30000)
});

myEmitter.on('readTranscript', () => {
  logger.debug('Reading transcript');
  let outputRead = fs.createReadStream(path.join('./transcripts','realtimeTranscript'))
  outputRead.setEncoding('utf8')
  readTranscript(outputRead)
  .then((message)=>{
      logger.silly("Transcript ending in:"+message.slice(-40))
      //upload doc.json in the current directory
      speech2text.discoveryUpload(message,uploadCount)
      .then((message)=>{
          logger.silly(`Document ID changed to: ${message.newID}`)
          myEmitter.emit('filterID', message.newID);
          setTimeout(()=>{
            myEmitter.emit('startQuery');
          },1200)
      })
      .catch(()=>{"Upload error...."})
  })
  
  function readTranscript(readable){
      return new Promise((resolve,reject)=>{
          let data = null;
          readable.on('data', (chunk) => {
                  if(data==null){
                      data = chunk
                  } else{
                      data += chunk
                  }
              
              })
          
          readable.on('end', () => {
              resolve(data)
          });
      })
  }
});


/*****************************
    Function Definitions
******************************/
function queryConcepts(){

  function setqueryParams(){
    return new Promise((resolve,reject)=>{
      const queryParams = {
        environment_id: process.env.ENVIRONMENT_ID,
        collection_id: process.env.COLLECTION_ID,
        filter: "id::\"" +  filterID + "\""
      }
      resolve(queryParams)
    })
  }

  setqueryParams()
    .then((queryParams)=>{
      return discovery.query(queryParams)
    })
    .then(queryResponse => {
      //print query results
      //console.log(JSON.stringify(queryResponse, null, 2));
      data = JSON.stringify(queryResponse, null, 2);
      fsPromises.writeFile("./datas/concept.json", data)
      .then(()=> logger.debug("Query logged in ./datas/concept.json"))
      .catch(()=> logger.error("failure"))
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

function queryEntity(entities){
  function setqueryParams(){
    return new Promise((resolve,reject)=>{
      const queryParams = {
        environment_id: process.env.ENVIRONMENT_ID,
        collection_id: process.env.COLLECTION_ID,
        filter: "id::\"" +  filterID + "\"",
        aggregation: "nested(enriched_text.entities).filter(enriched_text.entities.type::" + entities + ").term(enriched_text.entities.text,count:10)"
      };
      resolve(queryParams)
    })
  }

  return new Promise((resolve,reject)=>{
    setqueryParams()
    .then((queryParams)=>{
      return discovery.query(queryParams)
    })
    .then(queryResponse => {
      //console.log(JSON.stringify(queryResponse.aggregations[0], null, 2));
      data=JSON.stringify(queryResponse.aggregations[0], null, 2);
      fsPromises.writeFile(path.join('./datas',"data"+entities+".json"), data)
      .then(()=> {
        resolve(entities + "successful query")
      })
      .catch(()=> logger.error("failure"))
      })
    .catch(err => {
      console.log('errorssssss:', err);
    });
  })
}
//categoise entities and send to the web page

function queryAllEntities(){
  return new Promise((resolve,reject)=>{
    entities.forEach((entity)=>{
      queryEntity(entity)
      .then((message)=>{
        logger.debug(message)
      })
    });
    resolve("All Entities found")
    reject(err);
  })
}

function entityquery(entityString){
  //console.log(entityString)
  
  let queryParams ={
    environment_id: process.env.ENVIRONMENT_ID,
    collection_id: process.env.COLLECTION_ID,
    query: entityString, 
    passages: true,
    passages_characters: 150,
    filter: "id::\"" +  filterID + "\""
  }

  discovery.query(queryParams)
    .then(queryResponse =>{
      
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

function readEntity(Types){

  Types.forEach((Type)=>{
  io.emit("clearList");
  fs.readFile(path.join('./datas','data'+Type+'.json'),'utf8',(err,data)=>{
      data = JSON.parse(data);
      Entype = data.aggregations[0].aggregations[0].results;
      Entype.forEach((number)=>{
        let entitybox = number.key;
        //console.log("Emit",Type,entitybox)

        //io.emit(Type, entitybox)
        if(Type=="Person"||Type=="Quantity"||Type=="Location"){
          io.emit(Type, entitybox)
          logger.silly(`Emit :${Type} :${entitybox}`)
        } else{
          io.emit("Other",entitybox+","+ Type)
          logger.silly("Other" + entitybox + "," + Type )
        }

      })
    })
  });
}
//create files with entities of all types
