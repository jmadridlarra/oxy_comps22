const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let updateNote = document.getElementById("updatenote");
canvas.style.background = "red";
canvas.width = 1500;
canvas.height = 750;

let isVideo = false;
let model = null;
let showVideo = false;
let bubbleX = canvas.width / 2;
let bubbleY = canvas.height / 2;
let totalCircles = 30;
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
    yVelocity: 10,
    xVelocity: 10,
    r: 255,
    g: 165,
    b: 0,
    a: 1, 
    // getNextCoords : function(){
    //     console.log(`My name is ${this.name}. Am I
    //       studying?: ${this.isStudying}.`)
    // }
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
    bubbleRadius = (canvas.width / totalCircles - 10) /2;
    for (let i = 0; i < totalCircles; i++){
        circleList[i] = Object.create(circle);
        circleList[i].xCoords = Math.floor(Math.random() * canvas.width);
        circleList[i].yCoords = Math.floor(Math.random() * canvas.height);
        circleList[i].radius = bubbleRadius;
    }
}

function startGame() {
    initCircles();
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


// runs the model
function runDetection() {
    model.detect(video).then(predictions => {
        console.log("Predictions: ", predictions);
        // model.renderPredictions(predictions, canvas, context, video);
        if (predictions.length != 0) {
            getMouseCoord(predictions, canvas, context, video);   
        }
        updateFrame(canvas, predictions, video);
        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });
}

function updateFrame(canvas, predictions, video){
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
    for (let i = 0; i < predictions.length; i++) {
        if (predictions[i].label != 'face'){
            context.beginPath();
            // context.arc(95, 50, 40, 0, 2 * Math.PI);
            coords = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas)
            context.arc(coords[0], coords[1], 5, 0, 2 * Math.PI);
            context.stroke();
        }
    }
}

function makeBubble(canvas, predictions, mediasource) {
    for (let i = 0; i < predictions.length; i++) {
        var convertedCoords = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas);
        if (predictions[i].label != 'face'){    
            var xDist = Math.abs(convertedCoords[0] - bubbleX);
            var yDist = Math.abs(convertedCoords[1] - bubbleY)
            if (xDist > 4 && xDist < 150 && bubbleX > 40 && bubbleX < canvas.width - 40 && xDist > 4 && yDist < 150 && bubbleY > 40 && bubbleY < canvas.height - 40){
                bubbleX = bubbleX - ((200 * Math.sign((convertedCoords[0] - bubbleX) * -1)) / xDist);
                bubbleY = bubbleY - ((200 * Math.sign((convertedCoords[1] - bubbleY) * -1)) / yDist);  
            }
        }
    }
    context.beginPath();
    context.arc(bubbleX, bubbleY, 40, 0, 2 * Math.PI);
    context.stroke();
}

function setCircleColor(circle){
    if (circle.nearHand){
        circle.r = 0;
        //circle.g = 255;
        //circle.b = 0;
        if (circle.xCoords >= circle.yCoords){
            // 10-50 yellow 255, 255, 0; green 0, 255, 0
            // 50 -> 255, 10 -> 0
            circle.g = ((circle.xCoords / 40) * 255) - 63.75;
            // 50 -> 0, 10 -> 255
            circle.b = (circle.xCoords * (-255/40)) + 318.75;
        }
        else{
            // 50 -> 255, 10 -> 0
            circle.g = ((circle.yCoords / 40) * 255) - 63.75;
            // 50 -> 0, 10 -> 255
            circle.b = (circle.yCoords * (-255/40)) + 318.75;
        }
    } else {
        circle.r = 255;
        circle.g = 165;
        circle.b = 0;
    }
}

function getNewCircleCoords(canvas, predictions, mediasource){
    for (let i = 0; i < predictions.length; i++) {
        var convertedCoords = translateCoords(predictions[i].bbox[0], predictions[i].bbox[1], mediasource, canvas);
          
        for (let j = 0; j < totalCircles; j++) {
            var xDist = convertedCoords[0] - circleList[j].xCoords;
            var yDist = convertedCoords[1] - circleList[j].yCoords;

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

            if (xDist < 150 && yDist < 150 && predictions[i].label != 'face' && !onTop && !onBottom && !onRight && !onLeft){
                circleList[j].nearHand = true;
                //circleList[j].xVelocity = (200 * Math.sign((convertedCoords[0] - circleList[j].xCoords))) / xDist; // TODO calculate velocity
                //circleList[j].yVelocity = (200 * Math.sign((convertedCoords[1] - circleList[j].yCoords))) / yDist;  
                circleList[j].xVelocity = Math.sqrt(Math.pow(circleList[j].xVelocity, 2) + (10 * xDist)); // (xDist * (-40/146)) + 51);
                circleList[j].yVelocity = Math.sqrt(Math.pow(circleList[j].yVelocity, 2) + (10 * yDist));//(yDist * (-40/146)) + 51;
            }
            else {
                circleList[j].nearHand = false;
                circleList[j].xVelocity = Math.sign(circleList[j].xVelocity) * 10;
                circleList[j].yVelocity = Math.sign(circleList[j].yVelocity) * 10;
                if (onTop || onBottom){
                    circleList[j].yVelocity = circleList[j].yVelocity * -1;
                }
                if (onLeft || onRight){
                    circleList[j].xVelocity = circleList[j].xVelocity * -1;
                }
            }
            circleList[j].xCoords = circleList[j].xCoords + circleList[j].xVelocity;
            circleList[j].yCoords = circleList[j].yCoords + circleList[j].yVelocity;
            setCircleColor(circleList[j]);
            makeCircle(circleList[j]);
        }
        
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
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});
