const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require ('fluent-ffmpeg');
const logger = require('./logger');
// logger.emitErrs = false;

function downloadVideo(videoURL){
  return new Promise((resolve,reject)=>{
    validateURL(videoURL)
    .then((URL)=>{
      logger.debug("valid URL")
      return download(URL)
    })
    .catch((err)=>{
      logger.error(err)
    })
    .then((message)=>{
      logger.debug(message)
      return convertmp3()
    })
    .catch((err)=>{
      logger.error(err)
    })
    .then((message)=>{
      logger.debug(message)
      resolve("ready for speech text")
    })
    .catch((err)=>{
      logger.error(err)
    })
  });
}

function convertmp3(){
    logger.debug("Started mp3 conversion using FFMPEG")
    return new Promise((resolve,reject)=>{
      var proc = new ffmpeg({ source: './public/video.mp4', nolog: true })
      proc.setFfmpegPath("/usr/bin/ffmpeg")
    .toFormat('mp3')
     .on('end', function() {
     resolve('file has been converted successfully');
     })
     .on('error', function(err) {
     logger.error('convert error: ' + err.message);
     })
     // save to file <-- the new file I want -->
     .saveToFile('./public/audio.mp3');     
    })
  }


function validateURL(videoURL){
  return new Promise((resolve,reject)=>{
    //validate if URL is valid on youtube if(validurl){return true}
    let validURL = ytdl.validateURL(videoURL)
    if(validURL){
      resolve(videoURL)
    }
    else{
      reject("Invalid URL")
    }
  })
}

function download(URL){
  return new Promise((resolve,reject)=>{
    let start = Date.now()
    logger.debug(`Start on  ${start}`)
    videoStream = fs.createWriteStream('./public/video.mp4');
    ytdl(URL)
      .pipe(videoStream);

    videoStream.on('close',() =>{
      resolve(`Download took  ${Math.floor((Date.now()-start)/1000)} seconds`)  
    })
    videoStream.on('error',(err)=>{reject(err)})
  })
}

module.exports = downloadVideo
