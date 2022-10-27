const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let updateNote = document.getElementById("updatenote");
canvas.style.background = "black";
canvas.width = 1500;
canvas.height = 750;

let isVideo = false;
let model = null;
let showVideo = false;
let bubbleX = canvas.width / 2;
let bubbleY = canvas.height / 2;
let totalCircles = 75;
let circlesLeft = totalCircles;
let defaultSpeed = 100;
let radiusOfAttraction = 275;
let countCirclesNearHand = 0;
// using JavaScript built in hash table Map
const localPred = new Map();
const circleList = [];
const modelParams = {
    flipHorizontal: true,   // flip e.g for video  
    maxNumBoxes: 7,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.65,    // confidence threshold for predictions.
};

const circle = {
    isVisible : true,
    xCoords: canvas.width / 2,
    yCoords: canvas.height / 2,
    nearHand: false,
    radius: 40,
    yVelocity: defaultSpeed,
    xVelocity: defaultSpeed,
    r: 255,
    g: 165,
    b: 0,
    a: 1, 
    readyToLaunch: false,
    launching: false,
    // getNextCoords : function(){
    //     console.log(`My name is ${this.name}. Am I
    //       studying?: ${this.isStudying}.`)
    // }
}
const hand = {
    x: 0,
    y: 0,
    height: 0,
    width: 0,
    sinceConfirmed: 0,
    ID:0,
}

function end(){
    model.dispose();
    showVid();
}

// starts video
function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        if (status) {
            updateNote.innerText = "Video started. Now tracking";
            isVideo = true;
            // context.beginPath();
            // context.arc(95, 50, 40, 0, 2 * Math.PI);
            // // context.arc(predictions[0].bbox[0], predictions[0].bbox[1], 40, 0, 2 * Math.PI);
            // context.stroke();
            reset();
            runDetection();
        } else {
            updateNote.innerText = "Please enable video";
        }
    });
}

function initCircles() {
    bubbleRadius = (canvas.width / (totalCircles - 5)) / 1.5;
    for (let i = 0; i < totalCircles; i++){
        circleList[i] = Object.create(circle);
        circleList[i].xCoords = Math.floor(Math.random() * canvas.width);
        circleList[i].yCoords = Math.floor(Math.random() * canvas.height);
        circleList[i].radius = bubbleRadius;
        circleList[i].xVelocity = ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
        console.log(circleList[i].xVelocity);
        circleList[i].yVelocity = ((Math.random() * defaultSpeed * 2)- defaultSpeed) / getFPS();
    }
}

function getFPS(){
    //console.log(model.getFPS);
    return model.getFPS();
}

function startGame() {
    toggleVideo();
    
}
// button to turn video on or off
function toggleVideo() {
    if (!isVideo) {
        updateNote.innerText = "Starting video";
        startVideo();
    } else {
        updateNote.innerText = "Stopping video";
        handTrack.stopVideo(video);
        isVideo = false;
        updateNote.innerText = "Video stopped";
        // model.dispose();
    }
}

function showVid() {
    showVideo = !showVideo;
}

function updateLocalPred(predictions, mediasource, canvas){
    // used to track hands across frames
    if (predictions.length > 1){
        for (let i = 0; i < predictions.length; i++){
            if (predictions[i].label != 'face'){
                // create new hand object
                newHand = Object.create(hand);
                coords = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas);
                
                newHand.height = predictions[i].bbox[3] - predictions[i].bbox[1];
                newHand.width = predictions[i].bbox[2] - predictions[i].bbox[0];
                line = getLine(0, 0, newHand.width, canvas.width);
                // DOUBLE CHECK THIS
                newHand.x = coords[0] + line[0] * coords[0] + line[1];
                newHand.y = coords[1] + line[0] * coords[0] + line[1];
                newHand.sinceConfirmed = 0;
                newHand.ID = Math.random();
                mostLikely = 0;
                prevPercent = 0;
                // compare new hand with old hands
                for (let [key, value] of localPred){
                    probability = probabilityOfMatch(value, newHand);
                    if (probability > prevPercent){
                        mostLikely = key;
                        prevPercent = probability;
                    }
                    if (i == predictions.length - 1){
                        // we are at the last iteration, let's increase sinceConfirmed
                        value.sinceConfirmed = value.sinceConfirmed + 1; 
                    }
                    if (value.sinceConfirmed > 5){
                        // how many frames it's been gone.
                        localPred.delete(key);
                    }
                }
                // replace the object with updated info if it is likely related
                if (prevPercent > 75){
                    newHand.ID = mostLikely;
                    localPred.set(mostLikely, newHand);
                }
                else{
                    // if it's not related to anything, we'll add it
                    localPred.set(newHand.ID, newHand);
                }
            }
        }
    }else {
        localPred.clear();
    }
}

function probabilityOfMatch(old, cur){
    // returns the probability that the hand is the same from frame to frame based on several factors
    if (old.ID == cur.ID){
        return 100;
    }
    probability = 100;
    probability = probability - Math.abs(old.x - cur.x);
    probability = probability - Math.abs(old.y - cur.y);
    probability = probability - Math.abs(old.width - cur.width);
    probability = probability - Math.abs(old.height - cur.height);
    probability = probability - old.sinceConfirmed;
    return probability;
}


// runs the model
function runDetection() {
    model.detect(video).then(predictions => {
        //console.log("Predictions: ", predictions);
        // model.renderPredictions(predictions, canvas, context, video);
        if (predictions.length != 0) {
            getMouseCoord(predictions, canvas, context, video);   
        }
        updateLocalPred(predictions, video, canvas);
        updateFrame(canvas, predictions, video);
        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });
}

function updateFrame(canvas, predictions, video){
    context.clearRect(0, 0, canvas.width, canvas.height);
    getNewCircleCoords(canvas, predictions, video);
    
}
function translateCoords(vidCoordsX, vidCoordsY, mediasource, canvas){
    // translates vid coords into canvas coords
    var x = vidCoordsX / mediasource.width * canvas.width;
    var y = vidCoordsY / mediasource.height * canvas.height;
    return [x, y];
}

function getMouseCoord(predictions, canvas, context, mediasource){
    if (!showVideo){
        context.clearRect(0, 0, canvas.width, canvas.height);
        // console.log("render", mediasource.width, mediasource.height);
        canvas.style.height =
        parseInt(canvas.style.width) *
            (mediasource.height / mediasource.width).toFixed(2) +
        "px";
        // console.log("render", canvas.style.width, canvas.style.height);
        context.save();
    }
    else{
        canvas.width = mediasource.width;
        canvas.height = mediasource.height;
        model.renderPredictions(predictions, canvas, context, video);
    }
    // creates the small circles for the predictions
    
}

function makeSmallCircles(){
    for (let [key, value] of localPred) {
        context.beginPath();
        // context.arc(95, 50, 40, 0, 2 * Math.PI);
        //coords = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas)
        context.arc(value.x, value.y, 5, 0, 2 * Math.PI);
        context.stroke();
    }
}

// function makeBubble(canvas, predictions, mediasource) {
//     for (let i = 0; i < predictions.length; i++) {
//         var convertedCoords = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas);
//         if (predictions[i].label != 'face'){    
//             var xDist = Math.abs(convertedCoords[0] - bubbleX);
//             var yDist = Math.abs(convertedCoords[1] - bubbleY)
//             if (xDist > 4 && xDist < 150 && bubbleX > 40 && bubbleX < canvas.width - 40 && xDist > 4 && yDist < 150 && bubbleY > 40 && bubbleY < canvas.height - 40){
//                 bubbleX = bubbleX - ((200 * Math.sign((convertedCoords[0] - bubbleX) * -1)) / xDist);
//                 bubbleY = bubbleY - ((200 * Math.sign((convertedCoords[1] - bubbleY) * -1)) / yDist);  
//             }
//         }
//     }
//     context.beginPath();
//     context.arc(bubbleX, bubbleY, 40, 0, 2 * Math.PI);
//     context.stroke();
// }

function setCircleColor(circle){
    if (circle.launching){
        circle.r = 255;
        circle.g = 0;
        circle.b = 0;
    } else if (circle.nearHand != -1){
        circle.r = 0;
        //circle.g = 255;
        //circle.b = 0;
        if (circle.xVelocity >= circle.yVelocity){
            // 10-50 yellow 255, 255, 0; green 0, 255, 0
            // 50 -> 255, 10 -> 0
            gline = getLine(0, 0, 30, 255);
            circle.g = (circle.xVelocity * gline[0]) + gline[1];
            // 50 -> 0, 10 -> 255
            bline = getLine(0, 255, 30, 0);
            circle.b = (circle.xVelocity * bline[0]) + bline[1];
        } else{
            // 50 -> 255, 10 -> 0
            gline = getLine(0, 0, 30, 255);
            circle.g = (circle.yVelocity * gline[0]) + gline[1];
            // 50 -> 0, 10 -> 255
            bline = getLine(0, 255, 30, 0);
            circle.b = (circle.yVelocity * bline[0]) + bline[1];
        }
    } else {
        circle.r = 255;
        circle.g = 255;
        circle.b = 255;
    }
}

function getLine(x1, y1, x2, y2){
    m = (y2 -y1)/(x2 -x1);
    b = (y1 - (m*x1));
    return [m, b];
}

function testFunc(){
    countCirclesNearHand = 75;
}

function getRandomSign(){
    if (Math.random() > 0.5){
        sign = 1;
    }else{
        sign = -1;
    }
    return sign;
}

function getNewCircleCoords(canvas, predictions, mediasource){
    countCirclesNearHand = 0;
    for (let j = 0; j < totalCircles; j++) {
        if (circleList[j].xCoords > circleList[j].radius){
            onLeft = false;
        }else{
            onLeft = true;
        } 
        if (circleList[j].xCoords < canvas.width - circleList[j].radius){
            onRight = false;
        }
        else{
            onRight = true;
        }
        if (circleList[j].yCoords > circleList[j].radius){
            onBottom = false;
        } else{
            onBottom = true;   
        }    
        if (circleList[j].yCoords < canvas.height - circleList[j].radius){
            onTop = false;
        } else {
            onTop = true;
        }
        circleList[j].nearHand = -1;
        if (localPred.size > 0 && !circleList[j].launching){
            for (let [key, value] of localPred) {
                //var convertedCoords = translateCoords(value.bbox[0], value.bbox[1], mediasource, canvas);
                var xDist = value.x - circleList[j].xCoords;
                var yDist = value.y - circleList[j].yCoords;
                if (Math.abs(xDist) < radiusOfAttraction && Math.abs(yDist) < radiusOfAttraction && !onTop && !onBottom && !onRight && !onLeft){
                    circleList[j].nearHand = key;
                    //circleList[j].xVelocity = (200 * Math.sign((convertedCoords[0] - circleList[j].xCoords))) / xDist; // TODO calculate velocity
                    //circleList[j].yVelocity = (200 * Math.sign((convertedCoords[1] - circleList[j].yCoords))) / yDist;  
                    // px/frame frame/sec
                    if (Math.abs(xDist) < circleList[j].radius + 5){
                        circleList[j].xVelocity = circleList[j].xVelocity / 2;
                    }
                    else {
                        circleList[j].xVelocity = circleList[j].xVelocity + (Math.sign(xDist) * 1);//Math.sqrt(Math.pow(circleList[j].xVelocity, 2) + (1 * xDist)) / getFPS(); // (xDist * (-40/146)) + 51);
                    }
                    if (Math.abs(yDist) < circleList[j].radius + 5){
                        circleList[j].yVelocity = circleList[j].yVelocity / 2; 
                    }else{
                        circleList[j].yVelocity = circleList[j].yVelocity + (Math.sign(yDist) * 1);//Math.sqrt(Math.pow(circleList[j].yVelocity, 2) + (1 * yDist)) / getFPS();//(yDist * (-40/146)) + 51;
                    }
                    if (Math.abs(xDist) < circleList[j].radius + 5 && Math.abs(yDist) < circleList[j].radius + 5){
                        if (circleList[j].xVelocity < 10 && circleList[j].yVelocity < 10){
                            circleList[j].readyToLaunch = true;
                        }
                        
                    }else{
                        circleList[j].readyToLaunch = false;
                    }
                    if (circleList[j].readyToLaunch && (circleList[j].xVelocity > 10 || circleList[j].yVelocity > 10)){
                        circleList[j].launching = true;
                    }
                    if (countCirclesNearHand == circlesLeft){
                        circleList[j].launching = true;
                        circleList[j].xVelocity = getRandomSign() * defaultSpeed * 5 / getFPS();
                        circleList[j].yVelocity = getRandomSign() * defaultSpeed * 5 / getFPS();
                    }
                } else{
                    circleList[j].nearHand == -1;
                    circleList[j].xVelocity = Math.sign(circleList[j].xVelocity) * ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
                    circleList[j].yVelocity = Math.sign(circleList[j].yVelocity) * ((Math.random() * defaultSpeed * 2) - defaultSpeed) / getFPS();
                }            
            }
        }
        if (circleList[j].readyToLaunch){
            countCirclesNearHand += 1;
        }
        if (circleList[j].launching){
            circlesLeft -= 1; 
        }
        if (circleList[j].nearHand == -1 && !circleList[j].launching){
            if (Math.abs(circleList[j].xVelocity) < (defaultSpeed / getFPS())){
                circleList[j].xVelocity = circleList[j].xVelocity + Math.sign(circleList[j].xVelocity);
            }
            if (Math.abs(circleList[j].yVelocity) < (defaultSpeed / getFPS())){
                circleList[j].yVelocity = circleList[j].yVelocity + Math.sign(circleList[j].yVelocity);
            }
            if (onTop){
                circleList[j].yVelocity = circleList[j].yVelocity * -1;
                circleList[j].yCoords = canvas.height - circleList[j].radius;
            }
            if (onBottom){
                circleList[j].yCoords = circleList[j].radius;
                circleList[j].yVelocity = circleList[j].yVelocity * -1;
            }
            if (onLeft){
                circleList[j].xVelocity = circleList[j].xVelocity * -1;
                circleList[j].xCoords = circleList[j].radius;
            }
            if (onRight){
                circleList[j].xVelocity = circleList[j].xVelocity * -1;
                circleList[j].xCoords = canvas.width - circleList[j].radius;
            }
        }
        circleList[j].xCoords = circleList[j].xCoords + circleList[j].xVelocity;
        circleList[j].yCoords = circleList[j].yCoords + circleList[j].yVelocity;
        setCircleColor(circleList[j]);
        makeCircle(circleList[j]);
        makeSmallCircles(predictions, mediasource, canvas);
    }
}

function makeCircle(circleObj) {
    context.fillStyle = `rgba(
        ${circleObj.r},
        ${circleObj.g},
        ${circleObj.b}, 
        ${circleObj.a})`;
    context.beginPath();
    context.arc(circleObj.xCoords, circleObj.yCoords, circleObj.radius, 0, 2 * Math.PI);
    context.stroke();
    context.fill();
}

function reset(){
    initCircles();
    localPred.clear();
    countCirclesNearHand = 0;
    circlesLeft = totalCircles;
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});
