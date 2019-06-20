'use strict';
const moment=require('moment');
var fs = require('fs');
const fsPromises=require('fs').promises;
var Throttle = require('throttle');
var throttle = new Throttle(16000);
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
require('dotenv').config({silent: true});
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const logger = require('./logger');
const path = require('path')


var transcripts = fs.createWriteStream(path.join('./transcripts','realtimeTranscript'));
var speechToText =  new SpeechToTextV1({
  iam_apikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY,
  url: process.env.SPEECH_TO_TEXT_URL
});

// Create the Discovery object
const discovery = new DiscoveryV1({
  version: '2019-04-02',
  url: process.env.DISCOVERY_URL || 'https://gateway.watsonplatform.net/discovery/api',
  iam_apikey: process.env.DISCOVERY_IAM_APIKEY
});

//***********speech2text **************************************************/

let speech2text ={

getTranscript: function(audioFileName){
    const setAudioParams = () => {
        return new Promise((resolve,reject)=>{
            var audioParams ={
                objectMode: true,
                //content_type: 'audio/webm;codecs=opus',
                content_type: 'audio/mp3',
                model: 'en-US_BroadbandModel',
                keywords: ['NASA'],
                keywords_threshold: 0.5,
                max_alternatives:1,
                smart_formatting: true,
                interim_results:true
            };
            resolve({msg:"sucess:set audioParams",audioParams:audioParams})
            reject();
        })
    }

    setAudioParams()
    .then((message)=>{
        //create the stream
        var recognizeStream = speechToText.recognizeUsingWebSocket(message.audioParams);
        logger.debug(message.msg)
        return startTranscription(recognizeStream)
    })
    .then((recognizeStream)=>{            
        //pipe in the audio
        fs.createReadStream('./public/' + audioFileName).pipe(throttle).pipe(recognizeStream);
        
        const transcriptData = fs.createWriteStream('transcriptData')

        //Listen for events
        recognizeStream.on('data',function(event){ 
            //console.log(event)
            if(event.results[0].final){
                event.time =  moment().format();
                event.results[0].alternatives[0].transcript += ".";
                let transcript =event.results[0].alternatives[0].transcript;
                ////print one sentence
                //console.log(transcript)
                transcripts.write(transcript,'utf8')
                logger.silly("New Sentence")
                //event.results[0].alternatives[0].transcript
            };
        });
        recognizeStream.on('error', function(event){ onEvent('error:', event,transcripts);})
        recognizeStream.on('close', function(event) { closeEvent('close:', event,transcripts); });
        function closeEvent(name,event,transcript){
            transcripts.end();
            logger.debug('Transcription done: file closed')
            };
    })

    let startTranscription = (recognizeStream)=>{
        return new Promise((resolve,reject)=>{
            let date = moment().format();
            var startStream = new Promise((resolve,reject)=>{
                resolve(date);
            })
            .then((date)=> {
                logger.debug("Start Transcription")
                resolve(recognizeStream)
            })
            .catch((err)=> reject(err))
        })
    }
},

discoveryUpload: function(uploadData,uploadCount){
    return new Promise((resolve,reject)=>{
    let fileName= "Transcript" + uploadCount + ".json";
    fsPromises.writeFile(path.join('./transcripts',fileName),JSON.stringify(
        {
            title:fileName,
            text: uploadData
        },null,2)
        ).then(()=>{
        logger.debug(fileName + ":ready for upload")
        setUploadParams(fileName)
        .then((message)=>{
          logger.silly(message.msg)
          discovery.addDocument(message.uploadParams)
          .then(documentAccepted => {
            let docID = documentAccepted.document_id;
            logger.debug(`document_id:${documentAccepted.document_id},status:${documentAccepted.status}`);
            return this.checkUpload(docID)
          })
          .then((message)=>{
            logger.debug(message.msg)
            resolve({msg:"Start Query" , newID: message.id})

          })
          .catch((err)=>{logger.error("Upload error",err)})
        })
    }).catch((err)=>{logger.error("Write error",err)})
  })
    function setUploadParams(fileName){
      return new Promise((resolve,reject)=>{
        const uploadParams = {
          environment_id: process.env.ENVIRONMENT_ID,
          collection_id: process.env.COLLECTION_ID,
          file: fs.createReadStream(path.join('./transcripts',fileName)) 
        
        };
          resolve({msg:"sucess:set upload Params",uploadParams:uploadParams})
          reject();
      })
    }
  },

  checkUpload: function(docID){
    const getDocumentStatusParams = {
      environment_id: process.env.ENVIRONMENT_ID,
      collection_id: process.env.COLLECTION_ID,
      document_id: docID,
    };

    return new Promise((resolve,reject)=>{

        
      let intervalObject = setInterval(()=>{
        discovery.getDocumentStatus(getDocumentStatusParams)
        .then(documentStatus => {
          logger.silly(documentStatus.status)
          if(documentStatus.status === "available"){
            let filterID =  documentStatus.document_id
            setImmediate(()=>{
              clearInterval(intervalObject)
            })
            resolve({msg:"Upload done", id:filterID})
          }
          
        })
        .catch(err => {
          logger.error('interval error:', err);
          reject(err);
        });
      },2000)
    })
  }
}

module.exports = speech2text;



